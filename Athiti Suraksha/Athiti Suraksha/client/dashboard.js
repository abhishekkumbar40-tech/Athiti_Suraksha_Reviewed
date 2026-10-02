// =====================================================
// ATHITI SURAKSHA
// DASHBOARD JAVASCRIPT
// GPS LOCATION + HISTORIC PLACES + HOTELS
// =====================================================

let userLatitude = null;
let userLongitude = null;
let userLocationName = "Location not detected";


// =====================================================
// SIDEBAR
// =====================================================

function toggleSidebar() {

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.toggle("closed");
    }
}


// =====================================================
// OPEN PAGE
// =====================================================

function openPage(page) {

    window.location.href = page;
}


// =====================================================
// GET REAL GPS LOCATION
// =====================================================

function getUserLocation() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation is not supported by this browser."
        );

        return;
    }


    const locationName =
        document.getElementById("locationName");

    if (locationName) {
        locationName.textContent =
            "Getting GPS location...";
    }


    navigator.geolocation.getCurrentPosition(

        function(position) {

            userLatitude =
                position.coords.latitude;

            userLongitude =
                position.coords.longitude;


            console.log(
                "GPS Latitude:",
                userLatitude
            );

            console.log(
                "GPS Longitude:",
                userLongitude
            );


            reverseGeocode(
                userLatitude,
                userLongitude
            );

        },


        function(error) {

            console.error(
                "GPS Error:",
                error
            );


            if (locationName) {

                locationName.textContent =
                    "Location permission required";
            }


            alert(
                "Please allow location permission in your browser."
            );

        },


        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


// =====================================================
// REVERSE GEOCODING
// GPS → CITY + STATE
// =====================================================

async function reverseGeocode(lat, lon) {

    try {

        const url =
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Reverse geocoding failed"
            );
        }


        const data =
            await response.json();


        const address =
            data.address || {};


        const city =

            address.city ||

            address.town ||

            address.village ||

            address.municipality ||

            address.county ||

            "Unknown City";


        const state =
            address.state || "";


        userLocationName =
            state
                ? `${city}, ${state}`
                : city;


        // HEADER

        const locationElement =
            document.getElementById(
                "locationName"
            );

        if (locationElement) {

            locationElement.textContent =
                userLocationName;
        }


        // HERO

        const heroLocation =
            document.getElementById(
                "heroLocation"
            );

        if (heroLocation) {

            heroLocation.textContent =
                userLocationName;
        }


        // FOOTER

        const bottomLocation =
            document.getElementById(
                "bottomLocation"
            );

        if (bottomLocation) {

            bottomLocation.textContent =
                userLocationName;
        }


        console.log(
            "User location:",
            userLocationName
        );


        // LOAD NEARBY DATA

        await Promise.allSettled([

            loadHistoricPlaces(),

            loadHotels()

        ]);

    }


    catch(error) {

        console.error(
            "Reverse geocoding error:",
            error
        );


        const locationElement =
            document.getElementById(
                "locationName"
            );

        if (locationElement) {

            locationElement.textContent =
                "GPS location detected";
        }


        loadHistoricPlaces();

        loadHotels();
    }
}


// =====================================================
// GOOGLE MAPS DIRECTIONS
// =====================================================

function getDirections(lat, lon) {

    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        alert(
            "Please allow your GPS location first."
        );

        getUserLocation();

        return;
    }


    const url =
        `https://www.google.com/maps/dir/?api=1&origin=${userLatitude},${userLongitude}&destination=${lat},${lon}`;


    window.open(
        url,
        "_blank"
    );
}


// =====================================================
// DISTANCE CALCULATION
// =====================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;


    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;


    const a =

        Math.sin(dLat / 2) *
        Math.sin(dLat / 2)

        +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);


    const c =

        2 *

        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;
}


// =====================================================
// RESET SHOW MORE BUTTON
// =====================================================

function resetMoreResultsButton(buttonId) {

    const button =
        document.getElementById(buttonId);


    if (!button) {
        return;
    }


    button.style.display = "";

    button.disabled = false;


    if (
        buttonId ===
        "showMoreHistoricBtn"
    ) {

        button.textContent =
            "➕ Show More Historical Places";
    }


    if (
        buttonId ===
        "showMoreHotelsBtn"
    ) {

        button.textContent =
            "➕ Show More Hotels & Lodges";
    }
}


// =====================================================
// LOAD HISTORIC PLACES
// OPENSTREETMAP + OVERPASS
// =====================================================

async function loadHistoricPlaces() {

    const container =
        document.getElementById(
            "historicPlaces"
        );


    if (!container) {
        return;
    }


    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        container.innerHTML =

            `
            <div class="loading">
                📍 Please allow GPS location...
            </div>
            `;

        return;
    }


    resetMoreResultsButton(
        "showMoreHistoricBtn"
    );


    container.innerHTML =

        `
        <div class="loading">
            🏛️ Finding historic places within 100 km...
        </div>
        `;


    // 100 KM SEARCH

    const query = `

[out:json][timeout:60];

(

  node(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["historic"];

  way(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["historic"];

  relation(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["historic"];

);

out center tags;

`;


    try {

        const response =
            await fetch(
                "https://overpass-api.de/api/interpreter",
                {
                    method: "POST",
                    body: query
                }
            );


        if (!response.ok) {

            throw new Error(
                "Historic places API failed"
            );
        }


        const data =
            await response.json();


        let places =
            data.elements || [];


        // =================================================
        // CONVERT DATA
        // =================================================

        places = places

            .map(place => {

                const lat =
                    place.lat ||
                    place.center?.lat;


                const lon =
                    place.lon ||
                    place.center?.lon;


                if (
                    lat === undefined ||
                    lon === undefined
                ) {

                    return null;
                }


                const distance =
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        lat,
                        lon
                    );


                return {

                    name:

                        place.tags?.name ||

                        place.tags?.["name:en"] ||

                        "Historic Place",


                    lat: lat,

                    lon: lon,

                    distance: distance,


                    type:

                        place.tags?.historic ||

                        "historic"
                };

            })


            .filter(Boolean)


            // ONLY WITHIN 100 KM

            .filter(place =>

                place.distance <= 100

            )


            // NEAREST FIRST

            .sort(
                (a, b) =>

                    a.distance -
                    b.distance
            );


        // REMOVE DUPLICATES

        places =
            removeDuplicates(
                places
            );


        // =================================================
        // KEEP UP TO 25 RESULTS
        // =================================================

        places =
            places.slice(
                0,
                25
            );


        if (
            places.length === 0
        ) {

            container.innerHTML =

                `
                <div class="loading">
                    No historic places found within 100 km.
                </div>
                `;

            hideMoreButton(
                "showMoreHistoricBtn"
            );

            return;
        }


        container.innerHTML = "";


        // =================================================
        // DISPLAY RESULTS
        // FIRST 5 VISIBLE
        // REST HIDDEN
        // =================================================

        for (
            let i = 0;
            i < places.length;
            i++
        ) {

            const place =
                places[i];


            const image =
                await getPlaceImage(
                    place.name
                );


            const hiddenStyle =
                i >= 5
                    ? "display:none;"
                    : "";


            container.innerHTML +=

                `
                <div
                    class="place nearby-result-card"
                    data-result-index="${i}"
                    style="${hiddenStyle}"
                >

                    <img
                        class="place-image"
                        src="${image}"
                        alt="${escapeHTML(
                            place.name
                        )}"
                    >


                    <div class="place-info">

                        <h3>
                            ${escapeHTML(
                                place.name
                            )}
                        </h3>


                        <div class="distance">
                            📍
                            ${place.distance.toFixed(1)}
                            km
                        </div>


                        <div class="description">
                            Historic / tourist attraction
                        </div>

                    </div>


                    <button
                        class="direction-btn"
                        onclick="getDirections(
                            ${place.lat},
                            ${place.lon}
                        )"
                    >

                        ➤ Directions

                    </button>

                </div>
                `;
        }


        updateShowMoreButton(
            "historicPlaces",
            "showMoreHistoricBtn"
        );

    }


    catch(error) {

        console.error(
            "Historic places error:",
            error
        );


        container.innerHTML =

            `
            <div class="loading">

                Unable to load historic places.

                <br><br>

                Please check your internet connection.

            </div>
            `;

    }
}


// =====================================================
// LOAD HOTELS + LODGES
// =====================================================

async function loadHotels() {

    const container =
        document.getElementById(
            "hotels"
        );


    if (!container) {
        return;
    }


    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        container.innerHTML =

            `
            <div class="loading">
                📍 Please allow GPS location...
            </div>
            `;

        return;
    }


    resetMoreResultsButton(
        "showMoreHotelsBtn"
    );


    container.innerHTML =

        `
        <div class="loading">
            🛏️ Finding hotels and lodges within 100 km...
        </div>
        `;


    // =================================================
    // HOTEL QUERY
    // =================================================

    const query = `

[out:json][timeout:60];

(

  node(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="hotel"];


  way(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="hotel"];


  relation(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="hotel"];


  node(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="hostel"];


  way(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="hostel"];


  node(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="guest_house"];


  way(
      around:100000,
      ${userLatitude},
      ${userLongitude}
  )["tourism"="guest_house"];

);

out center tags;

`;


    try {

        const response =
            await fetch(
                "https://overpass-api.de/api/interpreter",
                {
                    method: "POST",
                    body: query
                }
            );


        if (!response.ok) {

            throw new Error(
                "Hotels API failed"
            );
        }


        const data =
            await response.json();


        let hotels =
            data.elements || [];


        // =================================================
        // CONVERT HOTEL DATA
        // =================================================

        hotels = hotels

            .map(hotel => {

                const lat =
                    hotel.lat ||
                    hotel.center?.lat;


                const lon =
                    hotel.lon ||
                    hotel.center?.lon;


                if (
                    lat === undefined ||
                    lon === undefined
                ) {

                    return null;
                }


                return {

                    name:

                        hotel.tags?.name ||

                        hotel.tags?.["name:en"] ||

                        "Hotel / Lodge",


                    lat: lat,

                    lon: lon,


                    distance:

                        calculateDistance(

                            userLatitude,

                            userLongitude,

                            lat,

                            lon

                        )

                };

            })


            .filter(Boolean)


            // WITHIN 100 KM

            .filter(hotel =>

                hotel.distance <= 100

            )


            // NEAREST FIRST

            .sort(
                (a, b) =>

                    a.distance -
                    b.distance
            );


        // REMOVE DUPLICATES

        hotels =
            removeDuplicates(
                hotels
            );


        // =================================================
        // KEEP UP TO 25 HOTELS
        // =================================================

        hotels =
            hotels.slice(
                0,
                25
            );


        if (
            hotels.length === 0
        ) {

            container.innerHTML =

                `
                <div class="loading">
                    No hotels or lodges found within 100 km.
                </div>
                `;

            hideMoreButton(
                "showMoreHotelsBtn"
            );

            return;
        }


        container.innerHTML = "";


        // =================================================
        // FIRST 5 VISIBLE
        // REST HIDDEN
        // =================================================

        for (
            let i = 0;
            i < hotels.length;
            i++
        ) {

            const hotel =
                hotels[i];


            const image =
                await getHotelImage(
                    hotel.name
                );


            const hiddenStyle =
                i >= 5
                    ? "display:none;"
                    : "";


            container.innerHTML +=

                `
                <div
                    class="place nearby-result-card"
                    data-result-index="${i}"
                    style="${hiddenStyle}"
                >

                    <img
                        class="place-image"
                        src="${image}"
                        alt="${escapeHTML(
                            hotel.name
                        )}"
                    >


                    <div class="place-info">

                        <h3>
                            ${escapeHTML(
                                hotel.name
                            )}
                        </h3>


                        <div class="distance">

                            📍
                            ${hotel.distance.toFixed(1)}
                            km

                        </div>


                        <div class="description">

                            Hotel / Lodge available nearby

                        </div>

                    </div>


                    <button
                        class="direction-btn"
                        onclick="getDirections(
                            ${hotel.lat},
                            ${hotel.lon}
                        )"
                    >

                        🛏️ View

                    </button>

                </div>
                `;
        }


        updateShowMoreButton(
            "hotels",
            "showMoreHotelsBtn"
        );

    }


    catch(error) {

        console.error(
            "Hotel loading error:",
            error
        );


        container.innerHTML =

            `
            <div class="loading">

                Unable to load hotels.

                <br><br>

                Please check your internet connection.

            </div>
            `;

    }
}


// =====================================================
// UPDATE SHOW MORE BUTTON
// =====================================================

function updateShowMoreButton(
    containerId,
    buttonId
) {

    const container =
        document.getElementById(
            containerId
        );


    const button =
        document.getElementById(
            buttonId
        );


    if (
        !container ||
        !button
    ) {

        return;
    }


    const items =
        Array.from(
            container.querySelectorAll(
                ".nearby-result-card"
            )
        );


    const hiddenItems =
        items.filter(
            item =>
                item.style.display === "none"
        );


    if (
        hiddenItems.length > 0
    ) {

        button.style.display =
            "";

        button.disabled =
            false;


        button.textContent =
            `➕ Show More (${hiddenItems.length})`;

    }

    else {

        button.style.display =
            "none";
    }
}


// =====================================================
// SHOW MORE HISTORIC PLACES
// =====================================================

function showMoreHistoricPlaces() {

    revealAdditionalItems(
        "historicPlaces",
        "showMoreHistoricBtn"
    );
}


// =====================================================
// SHOW MORE HOTELS
// =====================================================

function showMoreHotels() {

    revealAdditionalItems(
        "hotels",
        "showMoreHotelsBtn"
    );
}


// =====================================================
// REVEAL 5 MORE RESULTS
// =====================================================

function revealAdditionalItems(
    containerId,
    buttonId
) {

    const container =
        document.getElementById(
            containerId
        );


    const button =
        document.getElementById(
            buttonId
        );


    if (
        !container ||
        !button
    ) {

        return;
    }


    const items =
        Array.from(
            container.querySelectorAll(
                ".nearby-result-card"
            )
        );


    if (
        items.length === 0
    ) {

        alert(
            "No additional results are available yet."
        );

        return;
    }


    const hiddenItems =
        items.filter(
            item =>
                item.style.display === "none"
        );


    // SHOW NEXT 5

    hiddenItems
        .slice(0, 5)
        .forEach(
            item => {

                item.style.display =
                    "";
            }
        );


    updateShowMoreButton(
        containerId,
        buttonId
    );
}


// =====================================================
// HIDE SHOW MORE BUTTON
// =====================================================

function hideMoreButton(buttonId) {

    const button =
        document.getElementById(
            buttonId
        );


    if (button) {

        button.style.display =
            "none";
    }
}


// =====================================================
// GET HISTORIC PLACE IMAGE
// WIKIMEDIA COMMONS
// =====================================================

async function getPlaceImage(name) {

    try {

        const url =

            `https://commons.wikimedia.org/w/api.php` +

            `?action=query` +

            `&generator=search` +

            `&gsrsearch=${encodeURIComponent(
                name
            )}` +

            `&gsrnamespace=6` +

            `&prop=imageinfo` +

            `&iiprop=url` +

            `&iiurlwidth=300` +

            `&format=json` +

            `&origin=*`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Image API failed"
            );
        }


        const data =
            await response.json();


        const pages =
            data.query?.pages;


        if (pages) {

            const first =
                Object.values(
                    pages
                )[0];


            if (
                first &&
                first.imageinfo &&
                first.imageinfo[0] &&
                first.imageinfo[0].thumburl
            ) {

                return first
                    .imageinfo[0]
                    .thumburl;
            }
        }

    }


    catch(error) {

        console.log(
            "Historic image not found:",
            name
        );
    }


    return getFallbackImage();
}


// =====================================================
// GET HOTEL IMAGE
// =====================================================

async function getHotelImage(name) {

    try {

        const url =

            `https://commons.wikimedia.org/w/api.php` +

            `?action=query` +

            `&generator=search` +

            `&gsrsearch=${encodeURIComponent(
                name + " hotel"
            )}` +

            `&gsrnamespace=6` +

            `&prop=imageinfo` +

            `&iiprop=url` +

            `&iiurlwidth=300` +

            `&format=json` +

            `&origin=*`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Hotel image API failed"
            );
        }


        const data =
            await response.json();


        const pages =
            data.query?.pages;


        if (pages) {

            const first =
                Object.values(
                    pages
                )[0];


            if (
                first &&
                first.imageinfo &&
                first.imageinfo[0] &&
                first.imageinfo[0].thumburl
            ) {

                return first
                    .imageinfo[0]
                    .thumburl;
            }
        }

    }


    catch(error) {

        console.log(
            "Hotel image not found:",
            name
        );
    }


    return getFallbackImage();
}


// =====================================================
// FALLBACK IMAGE
// =====================================================

function getFallbackImage() {

    return (

        "https://images.unsplash.com/" +

        "photo-1564501049412-61c2a3083791" +

        "?auto=format&fit=crop&w=500&q=80"

    );
}


// =====================================================
// REMOVE DUPLICATES
// =====================================================

function removeDuplicates(items) {

    const seen =
        new Set();


    return items.filter(
        item => {

            const key =
                String(
                    item.name || ""
                )
                .trim()
                .toLowerCase();


            if (
                seen.has(key)
            ) {

                return false;
            }


            seen.add(key);

            return true;
        }
    );
}


// =====================================================
// HTML SECURITY
// =====================================================

function escapeHTML(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// TRACK MY LOCATION
// =====================================================

function trackLocation() {

    if (
        userLatitude !== null &&
        userLongitude !== null
    ) {

        window.open(

            `https://www.google.com/maps?q=` +

            `${userLatitude},${userLongitude}`,

            "_blank"
        );

        return;
    }


    getUserLocation();
}


// =====================================================
// SHOW HISTORIC PLACES
// =====================================================

function showHistoricPlaces() {

    const element =
        document.getElementById(
            "historicPlaces"
        );


    if (element) {

        element.scrollIntoView({

            behavior:
                "smooth",

            block:
                "center"

        });
    }


    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        getUserLocation();

    }

    else {

        loadHistoricPlaces();

    }
}


// =====================================================
// SHOW HOTELS
// =====================================================

function showHotels() {

    const element =
        document.getElementById(
            "hotels"
        );


    if (element) {

        element.scrollIntoView({

            behavior:
                "smooth",

            block:
                "center"

        });
    }


    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        getUserLocation();

    }

    else {

        loadHotels();

    }
}


// =====================================================
// SEARCH
// =====================================================

function performSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (!searchInput) {
        return;
    }


    const search =
        searchInput.value.trim();


    if (!search) {

        alert(
            "Please enter something to search."
        );

        return;
    }


    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        alert(
            "Please allow your GPS location first."
        );

        getUserLocation();

        return;
    }


    const url =

        `https://www.google.com/maps/search/` +

        `${encodeURIComponent(search)}` +

        `/@${userLatitude},${userLongitude},10z`;


    window.open(
        url,
        "_blank"
    );
}


// =====================================================
// START DASHBOARD
// =====================================================

window.addEventListener(
    "load",
    function() {

        console.log(
            "Athiti Suraksha Dashboard Started"
        );


        // Automatically detect GPS

        getUserLocation();

    }
);