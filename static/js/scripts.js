document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des tokens et variables nécessaires
    const mapboxToken = 'pk.eyJ1IjoiaGFuczIxMDQiLCJhIjoiY2x3azJiMWZqMTF4OTJqcGYwajN3dDhhZSJ9.F91A-tc6Tau0jqgU4Tx08w';
    const weatherApiKey = 'da470b23db27b43abb06c65810ff4714';
    const openCageApiKey = '6fbe06b1b8044fb18c9a61d3b703ee6d';

    let currentLocation = null;
    let destinationLocation = null;
    let currentLocationMarker = null;
    let destinationMarker = null;
    let routeLine = null;

    // Fonction pour obtenir les données météo
    async function getWeatherData(lat, lon) {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();
        return data;
    }

    // Mise à jour des informations météo sur l'interface
    function updateWeather(data) {
        const weatherIcon = document.getElementById('weatherIcon');
        const weatherDescription = document.getElementById('weatherDescription');
        const temperature = document.getElementById('temperature');
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherDescription.textContent = data.weather[0].description;
        temperature.textContent = `${Math.round(data.main.temp)}°C`;
    }

    // Fonction pour obtenir la position de l'utilisateur
    function getUserLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    resolve({ lat, lon });
                }, error => {
                    console.error('Erreur lors de l\'obtention de la localisation:', error);
                    reject(error);
                });
            } else {
                console.error('La géolocalisation n\'est pas supportée par votre navigateur.');
                reject(new Error('Géolocalisation non supportée'));
            }
        });
    }

    // Initialisation de la carte Mapbox
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [103.851959, 1.290270],
        zoom: 15.5,
        pitch: 48.5,
        bearing: -17.5
    });

    // Ajout des contrôles de navigation et de géolocalisation à la carte
    map.addControl(new mapboxgl.NavigationControl());
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

    // Fonction pour mettre à jour la localisation et l'itinéraire
    async function updateLocationAndRoute() {
        try {
            const position = await getUserLocation();
            const { lat, lon } = position;
            currentLocation = { lat, lon };

            if (currentLocationMarker) {
                currentLocationMarker.setLngLat([lon, lat]);
            } else {
                currentLocationMarker = new mapboxgl.Marker({ color: 'blue' })
                    .setLngLat([lon, lat])
                    .addTo(map);
            }

            map.flyTo({ center: [lon, lat], essential: true });
            document.getElementById('startLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i></br> <strong>${lat.toFixed(5)}, ${lon.toFixed(5)}</strong>`;

            const weatherData = await getWeatherData(lat, lon);
            updateWeather(weatherData);

            if (destinationLocation) {
                const routeData = await getRouteData([lon, lat], destinationLocation);
                updateRoute(routeData);
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la localisation et de l\'itinéraire:', error);
        }
    }

    // Fonction pour obtenir les données de route entre deux points
    async function getRouteData(start, end) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxToken}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.routes[0];
    }

    // Fonction pour mettre à jour l'affichage de l'itinéraire
    function updateRoute(route) {
        const routeCoordinates = route.geometry.coordinates;

        // Suppression de l'ancienne source et couche de route
        if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
        }

        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates
                }
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#1db7dd',
                'line-width': 6
            }
        });

        const distance = route.distance / 1000; // distance en km
        const duration = route.duration / 60; // durée en minutes
        document.getElementById('distance').innerHTML = `<i class="fas fa-ruler"></i></br> <strong>${distance.toFixed(2)} km</strong>`;
        document.getElementById('energyConsumption').innerHTML = `<i class="fas fa-clock"></i></br> <strong>${duration.toFixed(2)} min</strong>`;
    }

    // Fonction pour gérer la recherche de destination
    async function searchDestination() {
        console.log('Recherche de destination lancée');
        const query = document.getElementById('searchInput').value;
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${openCageApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results.length > 0) {
            const result = data.results[0];
            const { lat, lng } = result.geometry;
            destinationLocation = [lng, lat];

            if (destinationMarker) {
                destinationMarker.setLngLat([lng, lat]);
            } else {
                destinationMarker = new mapboxgl.Marker({ color: 'red' })
                    .setLngLat([lng, lat])
                    .addTo(map);
            }

            map.flyTo({ center: [lng, lat], essential: true });
            document.getElementById('endLocation').innerHTML = `<i class="fas fa-flag"></i></br> <strong>${result.formatted}</strong>`;
            document.getElementById('searchInput').value = '';  // Réinitialiser la barre de recherche
            if (currentLocation) {
                const routeData = await getRouteData([currentLocation.lon, currentLocation.lat], destinationLocation);
                updateRoute(routeData);
            }
        } else {
            alert('Destination non trouvée.');
        }
    }

    // Gestion des suggestions de recherche de destination
    async function updateSuggestions() {
        const query = document.getElementById('searchInput').value;
        if (query.length < 3) return;

        const url = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${openCageApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        const suggestions = document.getElementById('suggestions');

        suggestions.innerHTML = '';
        data.results.forEach(result => {
            const option = document.createElement('option');
            option.value = result.formatted;
            suggestions.appendChild(option);
        });
    }

    // Gestion du changement de style de carte
    document.getElementById('mapStyle').addEventListener('change', (event) => {
        const style = event.target.value;
        map.setStyle(`mapbox://styles/mapbox/${style}`);
    });

    // Gestion de la recherche avec le bouton et la touche "Entrée"
    document.getElementById('searchButton').addEventListener('click', searchDestination);
    document.getElementById('searchInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            console.log('Touche Entrée pressée');
            searchDestination();
        }
    });

    // Mise à jour des suggestions de recherche en temps réel
    document.getElementById('searchInput').addEventListener('input', updateSuggestions);

    // Mise à jour de la localisation toutes les 5 secondes
    setInterval(updateLocationAndRoute, 5000);
    updateLocationAndRoute();

    // Initialisation de la date et de l'heure
    function updateDateTime() {
        const now = new Date();
        const date = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const time = now.toLocaleTimeString('fr-FR');
        document.getElementById('currentDate').textContent = date;
        document.getElementById('currentTime').textContent = time;
    }

    setInterval(updateDateTime, 1000);
    updateDateTime();
});