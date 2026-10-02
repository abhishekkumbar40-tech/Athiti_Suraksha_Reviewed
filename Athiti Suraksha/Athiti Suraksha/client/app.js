function sendSOS() {
    navigator.geolocation.getCurrentPosition((position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        document.getElementById("location").innerHTML =
            "Latitude: " + lat + "<br>Longitude: " + lng;

        fetch('http://localhost:3000/sendSOS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lat, lng })
        })
        .then(res => res.text())
        .then(data => alert(data));
    });
}
