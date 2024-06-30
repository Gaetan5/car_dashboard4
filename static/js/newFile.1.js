document.addEventListener("DOMContentLoaded", function () {
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('updateData', function (data) {
        // Mise à jour immédiate des valeurs
        document.getElementById('speedValue').innerText = data.speed;
        document.getElementById('batteryPercent').innerText = `${data.battery}%`;

        // Animation de la vitesse
        anime({
            targets: '#speedValue',
            innerHTML: [0, data.speed],
            easing: 'linear',
            round: 1,
            duration: 2000  // Durée de 2 secondes pour la vitesse
        });

        // Animation du niveau de batterie
        anime({
            targets: '#batteryLevel',
            innerHTML: ['0%', `${data.battery}%`],
            easing: 'linear',
            round: 1,
            duration: 4000  // Durée de 4 secondes pour la batterie
        });

        // Mise à jour du pourcentage de batterie après l'animation
        document.getElementById('batteryPercent').innerText = `${data.battery}%`;
    });
});
