 // Initialisation de Mapbox
 mapboxgl.accessToken = 'pk.eyJ1IjoiaGFuczIxMDQiLCJhIjoiY2x3azJiMWZqMTF4OTJqcGYwajN3dDhhZSJ9.F91A-tc6Tau0jqgU4Tx08w';
 const map = new mapboxgl.Map({
     container: 'map', // ID du conteneur
     style: 'mapbox://styles/mapbox/outdoors-v11', // URL du style
     center: [103.851959, 1.290270], // Position initiale [longitude, latitude]
     zoom: 15.5, // Zoom initial
     pitch: 48.5, // Inclinaison de la carte
     bearing: -17.5 // Orientation de la carte
 });

 // Ajouter la couche de trafic
 map.on('load', () => {
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
                 ['==', ['get', 'congestion'], 'severe'], '#800000',
                 '#00ff00' // Default color if no congestion data
             ],
             'line-width': 2
         }
     });
 });

 // Marqueurs de départ et d'arrivée (à modifier selon vos besoins)
 const startPoint = [103.851959, 1.290270];
 const endPoint = [103.8185, 1.3521];
 
 const startMarker = new mapboxgl.Marker({ color: 'green' })
     .setLngLat(startPoint)
     .setPopup(new mapboxgl.Popup().setText('Point de départ'))
     .addTo(map);

 const endMarker = new mapboxgl.Marker({ color: 'red' })
     .setLngLat(endPoint)
     .setPopup(new mapboxgl.Popup().setText('Point d\'arrivée'))
     .addTo(map);

 // Fonction pour calculer la distance entre deux points (en km)
 function calculateDistance(lat1, lon1, lat2, lon2) {
     const R = 6371; // Rayon de la Terre en km
     const dLat = (lat2 - lat1) * Math.PI / 180;
     const dLon = (lon2 - lon1) * Math.PI / 180;
     const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
               Math.sin(dLon/2) * Math.sin(dLon/2);
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
     return R * c;
 }

 // Fonction pour mettre à jour la position en temps réel
 function updatePosition(position) {
     const lat = position.coords.latitude;
     const lon = position.coords.longitude;

     // Marqueur de la position actuelle
     if (!map.currentPositionMarker) {
         map.currentPositionMarker = new mapboxgl.Marker({ color: 'blue' })
             .setLngLat([lon, lat])
             .addTo(map)
             .on('click', () => {
                 map.zoomTo(map.getZoom() * 1.3, { duration: 1000 });
             });
     } else {
         map.currentPositionMarker.setLngLat([lon, lat]);
     }

     // Mettre à jour la vue de la carte
     map.setCenter([lon, lat]);

     // Calculer les distances
     const distanceToStart = calculateDistance(lat, lon, startPoint[1], startPoint[0]);
     const distanceToEnd = calculateDistance(lat, lon, endPoint[1], endPoint[0]);

     // Afficher les distances
     document.querySelector('.location-info').innerHTML = `
         <span>Votre position: [${lat.toFixed(5)}, ${lon.toFixed(5)}]</span>
         <span>Distance au point de départ: ${distanceToStart.toFixed(2)} km</span>
         <span>Distance au point d'arrivée: ${distanceToEnd.toFixed(2)} km</span>
     `;
 }

 // Vérifier si la géolocalisation est disponible
 if (navigator.geolocation) {
     navigator.geolocation.watchPosition(updatePosition, (error) => {
         console.error('Erreur de géolocalisation:', error);
     }, {
         enableHighAccuracy: true,
         timeout: 5000,
         maximumAge: 0
     });
 } else {
     console.error('La géolocalisation n\'est pas supportée par ce navigateur.');
 }
