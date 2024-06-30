document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('updateData', function (data) {
        document.getElementById('speedValue').innerText = data.speed;
        document.getElementById('batteryPercent').innerText = '${data.battery}%';
    });
});
