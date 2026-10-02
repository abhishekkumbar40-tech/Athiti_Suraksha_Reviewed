// ======================================================
// ATHITI SURAKSHA - BACKGROUND WEATHER MONITOR
// Automatically checks rain after user login
// ======================================================

const WEATHER_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

let weatherMonitorStarted = false;
let lastRainNotification = null;


// ------------------------------------------------------
// START BACKGROUND WEATHER MONITOR
// ------------------------------------------------------

function startBackgroundWeatherMonitor() {

    if (weatherMonitorStarted) return;

    weatherMonitorStarted = true;

    console.log("🌦️ Athiti Suraksha Weather Monitor Started");

    // Ask notification permission
    requestNotificationPermission();

    // Get GPS immediately
    getUserLocationForWeather();

    // Continue checking every 10 minutes
    setInterval(() => {
        getUserLocationForWeather();
    }, WEATHER_CHECK_INTERVAL);
}


// ------------------------------------------------------
// NOTIFICATION PERMISSION
// ------------------------------------------------------

async function requestNotificationPermission() {

    if (!("Notification" in window)) {
        console.log("Browser notifications are not supported.");
        return;
    }

    if (Notification.permission === "default") {

        try {

            const permission = await Notification.requestPermission();

            console.log(
                "Notification permission:",
                permission
            );

        } catch (error) {

            console.error(
                "Notification permission error:",
                error
            );
        }
    }
}


// ------------------------------------------------------
// GET USER GPS LOCATION
// ------------------------------------------------------

function getUserLocationForWeather() {

    if (!navigator.geolocation) {

        console.error(
            "Geolocation is not supported by this browser."
        );

        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            console.log(
                "📍 Background GPS:",
                latitude,
                longitude
            );

            // Save latest location
            localStorage.setItem(
                "athitiLatitude",
                latitude
            );

            localStorage.setItem(
                "athitiLongitude",
                longitude
            );

            // Check weather
            checkRainForecast(
                latitude,
                longitude
            );
        },

        function(error) {

            console.error(
                "GPS error:",
                error.message
            );

            // Try previously saved location
            const latitude =
                localStorage.getItem(
                    "athitiLatitude"
                );

            const longitude =
                localStorage.getItem(
                    "athitiLongitude"
                );

            if (latitude && longitude) {

                checkRainForecast(
                    latitude,
                    longitude
                );
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        }
    );
}


// ------------------------------------------------------
// CHECK RAIN FORECAST
// ------------------------------------------------------

async function checkRainForecast(
    latitude,
    longitude
) {

    try {

        console.log(
            "🌧️ Checking weather..."
        );

        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude}` +
            `&longitude=${longitude}` +
            `&hourly=` +
            `precipitation_probability,` +
            `precipitation,` +
            `rain,` +
            `weather_code` +
            `&forecast_hours=6` +
            `&timezone=auto`;

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                "Weather API failed"
            );
        }

        const data =
            await response.json();

        analyzeRainForecast(data);

    } catch (error) {

        console.error(
            "Weather monitor error:",
            error
        );
    }
}


// ------------------------------------------------------
// ANALYZE NEXT 6 HOURS
// ------------------------------------------------------

function analyzeRainForecast(data) {

    if (!data.hourly) return;

    const times =
        data.hourly.time || [];

    const probabilities =
        data.hourly
            .precipitation_probability || [];

    const precipitation =
        data.hourly
            .precipitation || [];

    const rain =
        data.hourly
            .rain || [];

    const weatherCodes =
        data.hourly
            .weather_code || [];


    let rainDetected = false;

    let highestProbability = 0;

    let rainHour = null;

    let rainAmount = 0;


    for (
        let i = 0;
        i < Math.min(times.length, 6);
        i++
    ) {

        const probability =
            probabilities[i] || 0;

        const precipitationAmount =
            precipitation[i] || 0;

        const rainAmountThisHour =
            rain[i] || 0;

        const weatherCode =
            weatherCodes[i];


        // Rain conditions
        const rainCondition =
            probability >= 60 ||
            precipitationAmount >= 0.2 ||
            rainAmountThisHour >= 0.2 ||
            isRainWeatherCode(weatherCode);


        if (rainCondition) {

            rainDetected = true;

            if (
                probability >
                highestProbability
            ) {

                highestProbability =
                    probability;

                rainHour =
                    times[i];

                rainAmount =
                    precipitationAmount;
            }
        }
    }


    if (rainDetected) {

        console.log(
            "🌧️ Rain detected in forecast"
        );

        sendRainNotification(
            rainHour,
            highestProbability,
            rainAmount
        );

    } else {

        console.log(
            "☀️ No significant rain expected."
        );
    }
}


// ------------------------------------------------------
// WEATHER CODE CHECK
// WMO RAIN / SHOWERS / THUNDERSTORM
// ------------------------------------------------------

function isRainWeatherCode(code) {

    return [

        51, 53, 55, // Drizzle

        56, 57,     // Freezing drizzle

        61, 63, 65, // Rain

        66, 67,     // Freezing rain

        80, 81, 82, // Rain showers

        95, 96, 99  // Thunderstorm

    ].includes(code);
}


// ------------------------------------------------------
// SEND NOTIFICATION
// ------------------------------------------------------

function sendRainNotification(
    rainHour,
    probability,
    amount
) {

    if (
        !("Notification" in window)
    ) {
        return;
    }

    if (
        Notification.permission !==
        "granted"
    ) {

        console.log(
            "Notification permission not granted."
        );

        return;
    }


    // Prevent repeated notification
    const now =
        Date.now();

    if (
        lastRainNotification &&
        now - lastRainNotification <
        60 * 60 * 1000
    ) {

        console.log(
            "Rain notification already sent recently."
        );

        return;
    }


    // Check localStorage as well
    const previous =
        localStorage.getItem(
            "lastRainNotification"
        );

    if (previous) {

        const previousTime =
            Number(previous);

        if (
            now - previousTime <
            60 * 60 * 1000
        ) {

            return;
        }
    }


    lastRainNotification =
        now;

    localStorage.setItem(
        "lastRainNotification",
        now
    );


    let formattedTime =
        "soon";

    if (rainHour) {

        try {

            const date =
                new Date(rainHour);

            formattedTime =
                date.toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

        } catch (error) {

            console.log(
                "Time formatting error"
            );
        }
    }


    const title =
        "🌧️ Rain Alert - Athiti Suraksha";


    const message =
        `Rain is expected near your location ` +
        `around ${formattedTime}. ` +
        `Rain probability: ${probability}%. ` +
        `Please plan your travel safely.`;


    const notification =
        new Notification(
            title,
            {
                body: message,

                icon:
                    "/logo.jpg",

                badge:
                    "/logo.jpg",

                tag:
                    "athiti-rain-alert",

                requireInteraction:
                    true
            }
        );


    notification.onclick =
        function() {

            window.focus();

            window.location.href =
                "/weather.html";
        };


    console.log(
        "🔔 Rain notification sent."
    );
}


// ------------------------------------------------------
// START AUTOMATICALLY
// ------------------------------------------------------

startBackgroundWeatherMonitor();