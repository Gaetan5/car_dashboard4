document.addEventListener('DOMContentLoaded', (event) => {
    console.log("Document prêt");

    // Configuration de Mapbox
    mapboxgl.accessToken = 'pk.eyJ1IjoiaGFuczIxMDQiLCJhIjoiY2x3azJiMWZqMTF4OTJqcGYwajN3dDhhZSJ9.F91A-tc6Tau0jqgU4Tx08w';
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [103.851959, 1.290270],
        zoom: 15.5,
        pitch: 48.5,
        bearing: -17.5
    });

    map.addControl(new mapboxgl.NavigationControl());

    // Chargement initial de la carte
    map.on('load', () => {
        console.log("Carte chargée");
        ajouterCoucheTrafic();
        ajouterCouchePOI('Carrefour', 'https://example.com/carrefours.geojson', 'couche-carrefours', '#ff0000');
        ajouterCouchePOI('Station Essence', 'https://example.com/stations-essence.geojson', 'couche-stations-essence', '#00ff00');
    });

    // Définition des points de départ et d'arrivée
    let pointDepart = [103.851959, 1.290270];
    let pointArrivee = [103.8185, 1.3521];
    let routeLayer = null;

    // Ajout d'un marqueur pour le point de départ
    const marqueurDepart = ajouterMarqueur(pointDepart, 'green', 'Point de départ');
    let marqueurDestination = null;

    // Vérification et mise à jour de la position actuelle
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(mettreAJourPosition, (error) => {
            console.error('Erreur de géolocalisation :', error);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        console.error('La géolocalisation n\'est pas supportée par ce navigateur.');
    }

    // Gestion des événements de recherche
    const boutonRecherche = document.getElementById('searchButton');
    const champRecherche = document.getElementById('searchInput');

    boutonRecherche.addEventListener('click', () => traiterRecherche(champRecherche.value));
    champRecherche.addEventListener('input', () => obtenirSuggestions(champRecherche.value));

    // Connexion au serveur Socket.IO
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // Réception des données en temps réel via Socket.IO
    socket.on('updateData', function (data) {
        document.getElementById('speedValue').innerText = `Vitesse : ${data.speed}`;
        document.getElementById('batteryPercent').innerText = `Batterie : ${data.battery}%`;
        estimerEnergieNecessaire(data.battery, pointArrivee);
    });

    // Ajout de la couche de trafic
    function ajouterCoucheTrafic() {
        map.addLayer({
            id: 'traffic',
            type: 'line',
            source: {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1'
            },
            'source-layer': 'traffic',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': [
                    'case',
                    ['==', ['get', 'congestion'], 'low'], '#00ff00',
                    ['==', ['get', 'congestion'], 'moderate'], '#ffff00',
                    ['==', ['get', 'congestion'], 'heavy'], '#ff0000',
                    '#000000'
                ],
                'line-width': 2
            }
        });
    }

    // Obtention des informations de lieu via OpenCageData
    async function obtenirInfoLieu(lat, lon) {
        const apiKey = '6fbe06b1b8044fb18c9a61d3b703ee6d';
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].formatted;
            } else {
                console.error('Aucune donnée disponible pour ces coordonnées.');
                return 'Adresse inconnue';
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des informations de localisation :', error);
            return 'Erreur de localisation';
        }
    }

    // Mise à jour de la position actuelle
    async function mettreAJourPosition(position) {
        const { latitude: lat, longitude: lon } = position.coords;
        pointDepart = [lon, lat];
        marqueurDepart.setLngLat(pointDepart);
        const infoLieu = await obtenirInfoLieu(lat, lon);
        map.setCenter([lon, lat]);

        const infoPosition = document.getElementById('infoPosition');
        infoPosition.innerText = `Position actuelle : ${infoLieu}`;
        if (pointArrivee) {
            ajouterRoute(pointDepart, pointArrivee);
        }
    }

    // Traitement de la recherche d'une adresse
    async function traiterRecherche(adresse) {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${adresse}&key=6fbe06b1b8044fb18c9a61d3b703ee6d`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                pointArrivee = [data.results[0].geometry.lng, data.results[0].geometry.lat];
                if (marqueurDestination) {
                    marqueurDestination.remove();
                }
                marqueurDestination = ajouterMarqueur(pointArrivee, 'red', 'Destination');
                ajouterRoute(pointDepart, pointArrivee);
            } else {
                console.error('Aucun résultat trouvé pour la recherche.');
            }
        } catch (error) {
            console.error('Erreur lors de la recherche de l\'adresse :', error);
        }
    }

    // Ajout d'un itinéraire entre deux points
    async function ajouterRoute(depart, arrivee) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${depart.join(',')};${arrivee.join(',')}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0].geometry;
                if (routeLayer) {
                    map.removeLayer(routeLayer.id);
                    map.removeSource('route');
                }
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: route
                    }
                });
                routeLayer = {
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-color': '#ff0000',
                        'line-width': 3
                    }
                };
                map.addLayer(routeLayer);
                afficherInfosRoute(data.routes[0]);
            } else {
                console.error('Aucune route trouvée entre les points spécifiés.');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération de la route :', error);
        }
    }

    // Ajout d'un marqueur sur la carte
    function ajouterMarqueur(coordonnees, couleur, description) {
        return new mapboxgl.Marker({ color: couleur })
            .setLngLat(coordonnees)
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(description))
            .addTo(map);
    }

    // Affichage des informations de l'itinéraire
    function afficherInfosRoute(route) {
        const distanceKm = (route.distance / 1000).toFixed(2);
        const dureeMin = Math.ceil(route.duration / 60);
        const infosDistance = document.getElementById('distance-info');
        infosDistance.innerText = `Distance : ${distanceKm} km, Durée estimée : ${dureeMin} min`;
    }

    // Estimation de l'énergie nécessaire pour atteindre la destination
    async function estimerEnergieNecessaire(batterieRestante, destination) {
        try {
            const response = await fetch('/api/estimation_energie', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ batterie: batterieRestante, destination })
            });
            const data = await response.json();
            console.log(`Energie estimée pour atteindre la destination : ${data.energie_estimee}`);
        } catch (error) {
            console.error('Erreur lors de l\'estimation de l\'énergie :', error);
        }
    }

    // Ajout de points d'intérêt (POI) sur la carte
    function ajouterCouchePOI(type, urlGeoJson, idCouche, couleur) {
        map.addSource(idCouche, {
            type: 'geojson',
            data: urlGeoJson
        });
        map.addLayer({
            id: idCouche,
            type: 'circle',
            source: idCouche,
            paint: {
                'circle-radius': 6,
                'circle-color': couleur
            }
        });
        map.on('click', idCouche, (e) => {
            const coordonnees = e.features[0].geometry.coordinates.slice();
            const description = `${type} : ${e.features[0].properties.nom}`;
            new mapboxgl.Popup()
                .setLngLat(coordonnees)
                .setHTML(description)
                .addTo(map);
        });
        map.on('mouseenter', idCouche, () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', idCouche, () => {
            map.getCanvas().style.cursor = '';
        });
    }

    // Obtention de suggestions pour l'adresse
    async function obtenirSuggestions(adresse) {
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${adresse}&key=6fbe06b1b8044fb18c9a61d3b703ee6d&limit=5`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const suggestions = data.results.map(result => result.formatted);
            // Afficher les suggestions dans une liste déroulante ou une boîte de suggestions
            console.log(suggestions);
        } catch (error) {
            console.error('Erreur lors de la récupération des suggestions :', error);
        }
    }
});