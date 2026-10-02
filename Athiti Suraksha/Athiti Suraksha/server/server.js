require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const twilio = require("twilio");

const app = express();

// =====================================================
// TWILIO SMS CONFIGURATION
// =====================================================
// Put these values in server/.env:
//
// TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_AUTH_TOKEN=your_auth_token
// TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
// SOS_ALERT_PHONE=+91xxxxxxxxxx
//
// SOS_ALERT_PHONE can also contain multiple comma-separated
// E.164 numbers, for example:
// SOS_ALERT_PHONE=+919876543210,+9198123456789

const TWILIO_ACCOUNT_SID =
    process.env.TWILIO_ACCOUNT_SID || "";

const TWILIO_AUTH_TOKEN =
    process.env.TWILIO_AUTH_TOKEN || "";

const TWILIO_PHONE_NUMBER =
    process.env.TWILIO_PHONE_NUMBER || "";

const SOS_ALERT_PHONE =
    process.env.SOS_ALERT_PHONE ||
    process.env.SOS_ALERT_PHONES ||
    "";

let twilioClient = null;

if (
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN
) {
    twilioClient =
        twilio(
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN
        );

    console.log(
        "📱 Twilio SMS client configured."
    );
} else {
    console.warn(
        "⚠️ Twilio credentials are not configured. SMS will be disabled."
    );
}

// =====================================================
// TWILIO VERIFY OTP CONFIGURATION
// =====================================================
// Add this to server/.env:
// TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

const TWILIO_VERIFY_SERVICE_SID =
    process.env.TWILIO_VERIFY_SERVICE_SID ||
    process.env.VERIFICATION_SID ||
    "";

if (
    twilioClient &&
    TWILIO_VERIFY_SERVICE_SID
) {
    console.log(
        "🔐 Twilio Verify OTP configured."
    );
} else {
    console.warn(
        "⚠️ Twilio Verify OTP is not configured. Add TWILIO_VERIFY_SERVICE_SID to server/.env."
    );
}

// =====================================================
// PHONE NUMBER HELPERS
// =====================================================

function normalizePhoneNumber(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    let phone =
        String(value)
            .trim()
            .replace(/[\s()-]/g, "");

    if (!phone) {
        return null;
    }

    // Indian 10-digit number -> E.164
    if (
        /^\d{10}$/.test(phone)
    ) {
        phone =
            `+91${phone}`;
    }

    // 00XXXXXXXX -> +XXXXXXXX
    if (
        /^00\d{8,15}$/.test(phone)
    ) {
        phone =
            `+${phone.slice(2)}`;
    }

    if (
        !/^\+\d{8,15}$/.test(phone)
    ) {
        return null;
    }

    return phone;
}

function getSMSRecipients(
    data = {},
    tourist = null
) {

    const configured =
        SOS_ALERT_PHONE
            .split(",")
            .map(
                value =>
                    normalizePhoneNumber(value)
            )
            .filter(Boolean);

    const requested =
        [
            data.alertPhone,
            data.smsTo,
            data.adminPhone
        ]
            .map(
                value =>
                    normalizePhoneNumber(value)
            )
            .filter(Boolean);

    // Explicit request/body recipient first,
    // then the configured admin/helper recipient.
    const recipients =
        [
            ...requested,
            ...configured
        ];

    return [
        ...new Set(recipients)
    ];
}

async function sendSOSSMS(
    sos,
    data = {},
    tourist = null
) {

    const result = {
        enabled:
            Boolean(twilioClient),
        attempted: false,
        sent: false,
        recipients: [],
        messages: [],
        error: null
    };

    if (!twilioClient) {
        result.error =
            "Twilio is not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
        return result;
    }

    if (!TWILIO_PHONE_NUMBER) {
        result.error =
            "TWILIO_PHONE_NUMBER is not configured.";
        return result;
    }

    const from =
        normalizePhoneNumber(
            TWILIO_PHONE_NUMBER
        );

    if (!from) {
        result.error =
            "TWILIO_PHONE_NUMBER must be a valid E.164 number, for example +1234567890.";
        return result;
    }

    const recipients =
        getSMSRecipients(
            data,
            tourist
        );

    result.recipients =
        recipients;

    if (!recipients.length) {
        result.error =
            "No SOS SMS recipient configured. Add SOS_ALERT_PHONE to server/.env or send alertPhone in the SOS request.";
        return result;
    }

    const mapsUrl =
        `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;

    const body =
        [
            "🚨 ATHITI SURAKSHA - EMERGENCY SOS",
            `Tourist: ${sos.name || "Unknown Tourist"}`,
            `Mobile: ${sos.mobile || sos.phone || "Not available"}`,
            `Country: ${sos.country || "Not available"}`,
            `Message: ${sos.message || "Emergency SOS activated."}`,
            `Location: ${mapsUrl}`,
            `SOS ID: ${sos.id}`
        ].join("\n");

    result.attempted = true;

    for (
        const to of recipients
    ) {

        try {

            const message =
                await twilioClient.messages.create({
                    body,
                    from,
                    to
                });

            result.sent = true;

            result.messages.push({
                to,
                sid:
                    message.sid,
                status:
                    message.status
            });

            console.log(
                `📱 SOS SMS SENT -> ${to} | SID: ${message.sid} | STATUS: ${message.status}`
            );

        } catch (error) {

            result.messages.push({
                to,
                sid: null,
                status: "FAILED",
                error:
                    error.message,
                code:
                    error.code || null
            });

            console.error(
                `❌ SOS SMS FAILED -> ${to}`,
                {
                    code:
                        error.code || null,
                    message:
                        error.message
                }
            );
        }
    }

    if (!result.sent) {
        result.error =
            "Twilio could not send the SOS SMS to any configured recipient.";
    }

    return result;
}


// =====================================================
// BASIC CONFIGURATION
// =====================================================

app.use(cors());

app.use(
    express.json({
        limit: "15mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "15mb"
    })
);

// =====================================================
// PATH CONFIGURATION
// =====================================================

const clientPath = path.join(
    __dirname,
    "../client"
);

const dataFile = path.join(
    __dirname,
    "tourists.json"
);

// =====================================================
// STATIC CLIENT FILES
// =====================================================

if (fs.existsSync(clientPath)) {
    app.use(
        express.static(clientPath)
    );
}

// =====================================================
// TOURIST DATA
// =====================================================

let tourists = [];

function loadTourists() {

    try {

        if (!fs.existsSync(dataFile)) {

            fs.writeFileSync(
                dataFile,
                "[]",
                "utf8"
            );

            tourists = [];

            return;
        }

        const fileData =
            fs.readFileSync(
                dataFile,
                "utf8"
            );

        if (!fileData.trim()) {

            tourists = [];

            return;
        }

        const parsed =
            JSON.parse(fileData);

        tourists =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Unable to load tourists.json:",
            error.message
        );

        tourists = [];
    }
}

function saveTourists() {

    fs.writeFileSync(
        dataFile,
        JSON.stringify(
            tourists,
            null,
            2
        ),
        "utf8"
    );
}

loadTourists();

// =====================================================
// BASIC SERVER TEST
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Athiti Suraksha server is running.",

            port:
                process.env.PORT || 5000,

            touristCount:
                tourists.length
        });
    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status: "online",

            service:
                "Athiti Suraksha API",

            timestamp:
                new Date().toISOString()
        });
    }
);

// =====================================================
// GET ALL TOURISTS
// GET /api/tourists
// =====================================================

app.get(
    "/api/tourists",
    (req, res) => {

        try {

            return res.json({

                success: true,

                count:
                    tourists.length,

                tourists:
                    tourists
            });

        } catch (error) {

            console.error(
                "Get tourists error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch tourists.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GET TOURIST BY ID
// GET /api/tourists/:id
// =====================================================

app.get(
    "/api/tourists/:id",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            return res.json({

                success: true,

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Get tourist error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch tourist.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADD TOURIST
// POST /api/tourists
// =====================================================

app.post(
    "/api/tourists",
    (req, res) => {

        try {

            const data =
                req.body || {};

            const tourist = {

                id:
                    data.id ||
                    `T-${Date.now()}`,

                name:
                    data.name ||
                    `${data.firstName || ""} ${data.lastName || ""}`.trim(),

                firstName:
                    data.firstName ||
                    "",

                lastName:
                    data.lastName ||
                    "",

                email:
                    data.email ||
                    "",

                phone:
                    data.phone ||
                    data.mobile ||
                    "",

                mobile:
                    data.mobile ||
                    data.phone ||
                    "",

                gender:
                    data.gender ||
                    "",

                touristType:
                    data.touristType ||
                    "",

                country:
                    data.country ||
                    "",

                aadhaar:
                    data.aadhaar ||
                    "",

                passport:
                    data.passport ||
                    "",

                visa:
                    data.visa ||
                    "",

                photo:
                    data.photo ||
                    data.facePhoto ||
                    "",

                facePhoto:
                    data.facePhoto ||
                    data.photo ||
                    "",

                latitude:
                    data.latitude ||
                    null,

                longitude:
                    data.longitude ||
                    null,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };

            tourists.push(
                tourist
            );

            saveTourists();

            return res.status(201).json({

                success: true,

                message:
                    "Tourist registered successfully.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Add tourist error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to register tourist.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// UPDATE TOURIST
// PUT /api/tourists/:id
// =====================================================

app.put(
    "/api/tourists/:id",
    (req, res) => {

        try {

            const index =
                tourists.findIndex(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (index === -1) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            tourists[index] = {

                ...tourists[index],

                ...(req.body || {}),

                updatedAt:
                    new Date().toISOString()
            };

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist updated successfully.",

                tourist:
                    tourists[index]
            });

        } catch (error) {

            console.error(
                "Update tourist error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update tourist.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// DELETE TOURIST
// DELETE /api/tourists/:id
// =====================================================

app.delete(
    "/api/tourists/:id",
    (req, res) => {

        try {

            const index =
                tourists.findIndex(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (index === -1) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            const deleted =
                tourists.splice(
                    index,
                    1
                )[0];

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist deleted successfully.",

                tourist:
                    deleted
            });

        } catch (error) {

            console.error(
                "Delete tourist error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete tourist.",

                error:
                    error.message
            });
        }
    }
);
// =====================================================
// TOURIST LOGIN
// POST /api/login
// =====================================================

app.post(
    "/api/login",
    (req, res) => {

        try {

            const data =
                req.body || {};

            const identifier =
                String(
                    data.email ||
                    data.phone ||
                    data.mobile ||
                    data.aadhaar ||
                    data.passport ||
                    ""
                )
                .trim()
                .toLowerCase();

            const password =
                String(
                    data.password ||
                    ""
                );

            if (!identifier || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email/mobile and password are required."
                });
            }

            const tourist =
                tourists.find(
                    item => {

                        const email =
                            String(
                                item.email || ""
                            )
                            .trim()
                            .toLowerCase();

                        const phone =
                            String(
                                item.phone ||
                                item.mobile ||
                                ""
                            )
                            .trim();

                        const mobile =
                            String(
                                item.mobile ||
                                item.phone ||
                                ""
                            )
                            .trim();

                        const aadhaar =
                            String(
                                item.aadhaar || ""
                            )
                            .trim()
                            .toLowerCase();

                        const passport =
                            String(
                                item.passport || ""
                            )
                            .trim()
                            .toLowerCase();

                        const storedPassword =
                            String(
                                item.password || ""
                            );

                        const identifierMatch =
                            identifier === email ||
                            identifier === phone.toLowerCase() ||
                            identifier === mobile.toLowerCase() ||
                            identifier === aadhaar ||
                            identifier === passport;

                        return (
                            identifierMatch &&
                            storedPassword === password
                        );
                    }
                );

            if (!tourist) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid login credentials."
                });
            }

            return res.json({

                success: true,

                message:
                    "Login successful.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to process login.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// UPDATE TOURIST LOCATION
// POST /api/tourists/:id/location
// =====================================================

app.post(
    "/api/tourists/:id/location",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            const latitude =
                Number(
                    req.body.latitude
                );

            const longitude =
                Number(
                    req.body.longitude
                );

            const accuracy =
                Number(
                    req.body.accuracy
                );

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            tourist.latitude =
                latitude;

            tourist.longitude =
                longitude;

            tourist.accuracy =
                Number.isFinite(accuracy)
                    ? accuracy
                    : null;

            tourist.locationUpdatedAt =
                new Date().toISOString();

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist location updated successfully.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Location update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update tourist location.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GET TOURIST LOCATION
// GET /api/tourists/:id/location
// =====================================================

app.get(
    "/api/tourists/:id/location",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            return res.json({

                success: true,

                touristId:
                    tourist.id,

                name:
                    tourist.name ||
                    `${tourist.firstName || ""} ${tourist.lastName || ""}`.trim(),

                latitude:
                    tourist.latitude ??
                    null,

                longitude:
                    tourist.longitude ??
                    null,

                accuracy:
                    tourist.accuracy ??
                    null,

                updatedAt:
                    tourist.locationUpdatedAt ||
                    tourist.updatedAt ||
                    null
            });

        } catch (error) {

            console.error(
                "Get location error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch tourist location.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// SEARCH TOURISTS
// GET /api/tourists/search?q=
// =====================================================

app.get(
    "/api/tourists/search",
    (req, res) => {

        try {

            const query =
                String(
                    req.query.q ||
                    ""
                )
                .trim()
                .toLowerCase();

            if (!query) {

                return res.json({

                    success: true,

                    count:
                        tourists.length,

                    tourists:
                        tourists
                });
            }

            const results =
                tourists.filter(
                    tourist => {

                        const searchable = [

                            tourist.id,

                            tourist.name,

                            tourist.firstName,

                            tourist.lastName,

                            tourist.email,

                            tourist.phone,

                            tourist.mobile,

                            tourist.aadhaar,

                            tourist.passport,

                            tourist.country,

                            tourist.touristType

                        ]
                        .filter(
                            value =>
                                value !== undefined &&
                                value !== null
                        )
                        .join(" ")
                        .toLowerCase();

                        return searchable.includes(
                            query
                        );
                    }
                );

            return res.json({

                success: true,

                count:
                    results.length,

                tourists:
                    results
            });

        } catch (error) {

            console.error(
                "Tourist search error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to search tourists.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// TOURIST PROFILE PASSWORD UPDATE
// PUT /api/tourists/:id/password
// =====================================================

app.put(
    "/api/tourists/:id/password",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            const currentPassword =
                String(
                    req.body.currentPassword ||
                    ""
                );

            const newPassword =
                String(
                    req.body.newPassword ||
                    ""
                );

            if (!newPassword) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password is required."
                });
            }

            if (
                tourist.password &&
                tourist.password !==
                currentPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Current password is incorrect."
                });
            }

            tourist.password =
                newPassword;

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Password updated successfully."
            });

        } catch (error) {

            console.error(
                "Password update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update password.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN TOURIST STATISTICS
// GET /api/admin/stats
// =====================================================

app.get(
    "/api/admin/stats",
    (req, res) => {

        try {

            const indian =
                tourists.filter(
                    tourist =>
                        String(
                            tourist.touristType ||
                            ""
                        )
                        .toLowerCase() ===
                        "indian"
                ).length;

            const foreign =
                tourists.filter(
                    tourist =>
                        String(
                            tourist.touristType ||
                            ""
                        )
                        .toLowerCase() ===
                        "foreign"
                ).length;

            const withLocation =
                tourists.filter(
                    tourist =>
                        Number.isFinite(
                            Number(
                                tourist.latitude
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                tourist.longitude
                            )
                        )
                ).length;

            return res.json({

                success: true,

                totalTourists:
                    tourists.length,

                indianTourists:
                    indian,

                foreignTourists:
                    foreign,

                touristsWithLocation:
                    withLocation
            });

        } catch (error) {

            console.error(
                "Admin statistics error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to calculate statistics.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// SERVE CLIENT INDEX
// =====================================================

app.get(
    "/app",
    (req, res) => {

        const indexFile =
            path.join(
                clientPath,
                "index.html"
            );

        if (
            fs.existsSync(indexFile)
        ) {

            return res.sendFile(
                indexFile
            );
        }

        return res.status(404).json({

            success: false,

            message:
                "Client index.html not found."
        });
    }
);

// =====================================================
// GENERIC API STATUS
// =====================================================

app.get(
    "/api",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Athiti Suraksha API",

            endpoints: {

                tourists:
                    "/api/tourists",

                tourist:
                    "/api/tourists/:id",

                login:
                    "/api/login",

                location:
                    "/api/tourists/:id/location",

                sos:
                    "/api/sos"
            }
        });
    }
);
// =====================================================
// GOOGLE MAPS / PLACES CONFIGURATION
// =====================================================

const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

// =====================================================
// GOOGLE MAPS GEOCODING
// GET /api/geocode
// =====================================================

app.get(
    "/api/geocode",
    async (req, res) => {

        try {

            const address =
                String(
                    req.query.address ||
                    ""
                ).trim();

            if (!address) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Address is required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const url =
                "https://maps.googleapis.com/maps/api/geocode/json" +
                `?address=${encodeURIComponent(address)}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status ===
                    "OK",

                status:
                    result.status,

                results:
                    result.results || [],

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Geocoding error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to perform geocoding.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GOOGLE PLACES SEARCH
// GET /api/places
// =====================================================

app.get(
    "/api/places",
    async (req, res) => {

        try {

            const query =
                String(
                    req.query.query ||
                    req.query.q ||
                    ""
                ).trim();

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const radius =
                Number(
                    req.query.radius ||
                    5000
                );

            if (!query) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Search query is required."
                });
            }

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                `?query=${encodeURIComponent(query)}` +
                `&location=${latitude},${longitude}` +
                `&radius=${radius}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status ===
                    "OK" ||
                    result.status ===
                    "ZERO_RESULTS",

                status:
                    result.status,

                results:
                    result.results || [],

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Places search error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to search places.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// NEARBY POLICE STATIONS
// GET /api/police-stations
// =====================================================

app.get(
    "/api/police-stations",
    async (req, res) => {

        try {

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const radius =
                Number(
                    req.query.radius ||
                    10000
                );

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const query =
                "police station";

            const url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                `?query=${encodeURIComponent(query)}` +
                `&location=${latitude},${longitude}` +
                `&radius=${radius}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status ===
                    "OK" ||
                    result.status ===
                    "ZERO_RESULTS",

                status:
                    result.status,

                count:
                    (result.results || []).length,

                stations:
                    result.results || [],

                results:
                    result.results || [],

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Police station search error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to find nearby police stations.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// NEARBY HOSPITALS
// GET /api/hospitals
// =====================================================

app.get(
    "/api/hospitals",
    async (req, res) => {

        try {

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const radius =
                Number(
                    req.query.radius ||
                    10000
                );

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const query =
                "hospital";

            const url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                `?query=${encodeURIComponent(query)}` +
                `&location=${latitude},${longitude}` +
                `&radius=${radius}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status ===
                    "OK" ||
                    result.status ===
                    "ZERO_RESULTS",

                status:
                    result.status,

                count:
                    (result.results || []).length,

                hospitals:
                    result.results || [],

                results:
                    result.results || [],

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Hospital search error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to find nearby hospitals.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GENERIC NEARBY PLACES
// GET /api/nearby
// =====================================================

app.get(
    "/api/nearby",
    async (req, res) => {

        try {

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const type =
                String(
                    req.query.type ||
                    "tourist attraction"
                ).trim();

            const radius =
                Number(
                    req.query.radius ||
                    10000
                );

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const url =
                "https://maps.googleapis.com/maps/api/place/textsearch/json" +
                `?query=${encodeURIComponent(type)}` +
                `&location=${latitude},${longitude}` +
                `&radius=${radius}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status ===
                    "OK" ||
                    result.status ===
                    "ZERO_RESULTS",

                status:
                    result.status,

                results:
                    result.results || [],

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Nearby places error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to find nearby places.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// WEATHER API
// GET /api/weather
// =====================================================

app.get(
    "/api/weather",
    async (req, res) => {

        try {

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const city =
                String(
                    req.query.city ||
                    ""
                ).trim();

            const weatherApiKey =
                process.env.WEATHER_API_KEY ||
                process.env.OPENWEATHER_API_KEY ||
                "";

            if (!weatherApiKey) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Weather API key is not configured."
                });
            }

            let url;

            if (
                Number.isFinite(latitude) &&
                Number.isFinite(longitude)
            ) {

                url =
                    "https://api.openweathermap.org/data/2.5/weather" +
                    `?lat=${latitude}` +
                    `&lon=${longitude}` +
                    `&appid=${encodeURIComponent(weatherApiKey)}` +
                    "&units=metric";

            } else if (city) {

                url =
                    "https://api.openweathermap.org/data/2.5/weather" +
                    `?q=${encodeURIComponent(city)}` +
                    `&appid=${encodeURIComponent(weatherApiKey)}` +
                    "&units=metric";

            } else {

                return res.status(400).json({

                    success: false,

                    message:
                        "Latitude/longitude or city is required."
                });
            }

            const response =
                await fetch(url);

            const result =
                await response.json();

            if (!response.ok) {

                return res.status(
                    response.status
                ).json({

                    success: false,

                    message:
                        result.message ||
                        "Unable to fetch weather.",

                    data:
                        result
                });
            }

            return res.json({

                success: true,

                weather:
                    result
            });

        } catch (error) {

            console.error(
                "Weather error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch weather.",

                error:
                    error.message
            });
        }
    }
);
// =====================================================
// WEATHER FORECAST
// GET /api/weather/forecast
// =====================================================

app.get(
    "/api/weather/forecast",
    async (req, res) => {

        try {

            const latitude =
                Number(
                    req.query.latitude
                );

            const longitude =
                Number(
                    req.query.longitude
                );

            const days =
                Math.min(
                    Number(
                        req.query.days || 5
                    ),
                    7
                );

            const weatherApiKey =
                process.env.WEATHER_API_KEY ||
                process.env.OPENWEATHER_API_KEY ||
                "";

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            if (!weatherApiKey) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Weather API key is not configured."
                });
            }

            const url =
                "https://api.openweathermap.org/data/2.5/forecast" +
                `?lat=${latitude}` +
                `&lon=${longitude}` +
                `&appid=${encodeURIComponent(weatherApiKey)}` +
                "&units=metric";

            const response =
                await fetch(url);

            const result =
                await response.json();

            if (!response.ok) {

                return res.status(
                    response.status
                ).json({

                    success: false,

                    message:
                        result.message ||
                        "Unable to fetch weather forecast.",

                    data:
                        result
                });
            }

            return res.json({

                success: true,

                days:
                    days,

                forecast:
                    result
            });

        } catch (error) {

            console.error(
                "Weather forecast error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch weather forecast.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GOOGLE PLACE DETAILS
// GET /api/place-details
// =====================================================

app.get(
    "/api/place-details",
    async (req, res) => {

        try {

            const placeId =
                String(
                    req.query.placeId ||
                    req.query.place_id ||
                    ""
                ).trim();

            if (!placeId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Google Place ID is required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const url =
                "https://maps.googleapis.com/maps/api/place/details/json" +
                `?place_id=${encodeURIComponent(placeId)}` +
                "&fields=name,formatted_address,geometry,rating,user_ratings_total," +
                "formatted_phone_number,website,opening_hours,photos,types" +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            const result =
                await response.json();

            return res.json({

                success:
                    result.status === "OK",

                status:
                    result.status,

                result:
                    result.result || null,

                error_message:
                    result.error_message || null
            });

        } catch (error) {

            console.error(
                "Place details error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch place details.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GOOGLE PLACE PHOTO
// GET /api/place-photo
// =====================================================

app.get(
    "/api/place-photo",
    async (req, res) => {

        try {

            const photoReference =
                String(
                    req.query.photo_reference ||
                    req.query.photoReference ||
                    ""
                ).trim();

            const maxWidth =
                Number(
                    req.query.maxwidth ||
                    800
                );

            if (!photoReference) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Photo reference is required."
                });
            }

            if (!GOOGLE_MAPS_API_KEY) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Google Maps API key is not configured."
                });
            }

            const url =
                "https://maps.googleapis.com/maps/api/place/photo" +
                `?maxwidth=${maxWidth}` +
                `&photo_reference=${encodeURIComponent(photoReference)}` +
                `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

            const response =
                await fetch(url);

            if (!response.ok) {

                return res.status(
                    response.status
                ).json({

                    success: false,

                    message:
                        "Unable to fetch place photo."
                });
            }

            const contentType =
                response.headers.get(
                    "content-type"
                ) ||
                "image/jpeg";

            const buffer =
                Buffer.from(
                    await response.arrayBuffer()
                );

            res.set(
                "Content-Type",
                contentType
            );

            return res.send(
                buffer
            );

        } catch (error) {

            console.error(
                "Place photo error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch place photo.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// TOURIST LOCATION HISTORY
// =====================================================

const locationHistoryFile =
    path.join(
        __dirname,
        "location_history.json"
    );

let locationHistory = [];

function loadLocationHistory() {

    try {

        if (
            !fs.existsSync(
                locationHistoryFile
            )
        ) {

            fs.writeFileSync(
                locationHistoryFile,
                "[]",
                "utf8"
            );

            locationHistory = [];

            return;
        }

        const fileData =
            fs.readFileSync(
                locationHistoryFile,
                "utf8"
            );

        if (!fileData.trim()) {

            locationHistory = [];

            return;
        }

        const parsed =
            JSON.parse(
                fileData
            );

        locationHistory =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Unable to load location history:",
            error.message
        );

        locationHistory = [];
    }
}

function saveLocationHistory() {

    fs.writeFileSync(
        locationHistoryFile,
        JSON.stringify(
            locationHistory,
            null,
            2
        ),
        "utf8"
    );
}

loadLocationHistory();

// =====================================================
// SAVE TOURIST LOCATION HISTORY
// POST /api/location-history
// =====================================================

app.post(
    "/api/location-history",
    (req, res) => {

        try {

            const data =
                req.body || {};

            const touristId =
                data.touristId ||
                data.userId ||
                data.id ||
                null;

            const latitude =
                Number(
                    data.latitude
                );

            const longitude =
                Number(
                    data.longitude
                );

            if (
                !touristId ||
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Tourist ID, latitude and longitude are required."
                });
            }

            const record = {

                id:
                    `LOC-${Date.now()}-${Math.floor(
                        Math.random() * 10000
                    )}`,

                touristId:
                    touristId,

                latitude:
                    latitude,

                longitude:
                    longitude,

                accuracy:
                    Number.isFinite(
                        Number(
                            data.accuracy
                        )
                    )
                        ? Number(
                            data.accuracy
                        )
                        : null,

                timestamp:
                    new Date().toISOString()
            };

            locationHistory.push(
                record
            );

            // Keep the file from growing indefinitely.
            if (
                locationHistory.length >
                10000
            ) {

                locationHistory =
                    locationHistory.slice(
                        -10000
                    );
            }

            saveLocationHistory();

            return res.status(201).json({

                success: true,

                message:
                    "Location history saved.",

                location:
                    record
            });

        } catch (error) {

            console.error(
                "Location history error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to save location history.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GET TOURIST LOCATION HISTORY
// GET /api/location-history/:touristId
// =====================================================

app.get(
    "/api/location-history/:touristId",
    (req, res) => {

        try {

            const results =
                locationHistory
                .filter(
                    item =>
                        String(
                            item.touristId
                        ) ===
                        String(
                            req.params.touristId
                        )
                )
                .sort(
                    (a, b) =>
                        new Date(
                            b.timestamp
                        ) -
                        new Date(
                            a.timestamp
                        )
                );

            return res.json({

                success: true,

                count:
                    results.length,

                locations:
                    results
            });

        } catch (error) {

            console.error(
                "Get location history error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch location history.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// DELETE TOURIST LOCATION HISTORY
// DELETE /api/location-history/:touristId
// =====================================================

app.delete(
    "/api/location-history/:touristId",
    (req, res) => {

        try {

            const before =
                locationHistory.length;

            locationHistory =
                locationHistory.filter(
                    item =>
                        String(
                            item.touristId
                        ) !==
                        String(
                            req.params.touristId
                        )
                );

            saveLocationHistory();

            return res.json({

                success: true,

                message:
                    "Location history deleted.",

                deleted:
                    before -
                    locationHistory.length
            });

        } catch (error) {

            console.error(
                "Delete location history error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete location history.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// TOURIST PROFILE PHOTO UPDATE
// PUT /api/tourists/:id/photo
// =====================================================

app.put(
    "/api/tourists/:id/photo",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            const photo =
                req.body.photo ||
                req.body.facePhoto ||
                "";

            if (!photo) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Photo is required."
                });
            }

            tourist.photo =
                photo;

            tourist.facePhoto =
                photo;

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist photo updated successfully.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Photo update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update tourist photo.",

                error:
                    error.message
            });
        }
    }
);
// =====================================================
// TOURIST PROFILE DATA UPDATE
// PUT /api/tourists/:id/profile
// =====================================================

app.put(
    "/api/tourists/:id/profile",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            const allowedFields = [

                "name",
                "firstName",
                "lastName",
                "email",
                "phone",
                "mobile",
                "gender",
                "country",
                "address",
                "city",
                "state",
                "district",
                "emergencyContact",
                "emergencyPhone"

            ];

            allowedFields.forEach(
                field => {

                    if (
                        req.body[field] !==
                        undefined
                    ) {

                        tourist[field] =
                            req.body[field];
                    }
                }
            );

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist profile updated successfully.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Profile update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update tourist profile.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// TOURIST EMERGENCY CONTACT
// PUT /api/tourists/:id/emergency-contact
// =====================================================

app.put(
    "/api/tourists/:id/emergency-contact",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            tourist.emergencyContact =
                req.body.emergencyContact ||
                tourist.emergencyContact ||
                "";

            tourist.emergencyPhone =
                req.body.emergencyPhone ||
                tourist.emergencyPhone ||
                "";

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Emergency contact updated.",

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Emergency contact update error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update emergency contact.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// TOURIST ACCOUNT STATUS
// PUT /api/tourists/:id/status
// =====================================================

app.put(
    "/api/tourists/:id/status",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            tourist.accountStatus =
                req.body.status ||
                req.body.accountStatus ||
                tourist.accountStatus ||
                "ACTIVE";

            tourist.updatedAt =
                new Date().toISOString();

            saveTourists();

            return res.json({

                success: true,

                message:
                    "Tourist account status updated.",

                status:
                    tourist.accountStatus,

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Account status error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to update account status.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN TOURIST DETAILS
// GET /api/admin/tourists/:id
// =====================================================

app.get(
    "/api/admin/tourists/:id",
    (req, res) => {

        try {

            const tourist =
                tourists.find(
                    item =>
                        String(item.id) ===
                        String(req.params.id)
                );

            if (!tourist) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Tourist not found."
                });
            }

            return res.json({

                success: true,

                tourist:
                    tourist
            });

        } catch (error) {

            console.error(
                "Admin tourist details error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch tourist details.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ACTIVE TOURISTS
// GET /api/admin/active-tourists
// =====================================================

app.get(
    "/api/admin/active-tourists",
    (req, res) => {

        try {

            const activeTourists =
                tourists.filter(
                    tourist => {

                        const status =
                            String(
                                tourist.accountStatus ||
                                "ACTIVE"
                            )
                            .toUpperCase();

                        return status !==
                            "BLOCKED";
                    }
                );

            return res.json({

                success: true,

                count:
                    activeTourists.length,

                tourists:
                    activeTourists
            });

        } catch (error) {

            console.error(
                "Active tourists error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch active tourists.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// SOS STATISTICS
// GET /api/admin/sos-stats
// =====================================================

app.get(
    "/api/admin/sos-stats",
    (req, res) => {

        try {

            const total =
                sosRequests.length;

            const active =
                sosRequests.filter(
                    item =>
                        item.status ===
                        "ACTIVE"
                ).length;

            const responding =
                sosRequests.filter(
                    item =>
                        item.status ===
                        "RESPONDING"
                ).length;

            const resolved =
                sosRequests.filter(
                    item =>
                        item.status ===
                        "RESOLVED"
                ).length;

            return res.json({

                success: true,

                total:
                    total,

                active:
                    active,

                responding:
                    responding,

                resolved:
                    resolved
            });

        } catch (error) {

            console.error(
                "SOS statistics error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to fetch SOS statistics.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN CLEAR RESOLVED SOS RECORDS
// DELETE /api/admin/sos/resolved
// =====================================================

app.delete(
    "/api/admin/sos/resolved",
    (req, res) => {

        try {

            const before =
                sosRequests.length;

            sosRequests =
                sosRequests.filter(
                    item =>
                        item.status !==
                        "RESOLVED"
                );

            saveSOSRequests();

            return res.json({

                success: true,

                message:
                    "Resolved SOS records cleared.",

                deleted:
                    before -
                    sosRequests.length
            });

        } catch (error) {

            console.error(
                "Clear resolved SOS error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to clear resolved SOS records.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN EXPORT TOURISTS
// GET /api/admin/export/tourists
// =====================================================

app.get(
    "/api/admin/export/tourists",
    (req, res) => {

        try {

            res.setHeader(
                "Content-Type",
                "application/json"
            );

            res.setHeader(
                "Content-Disposition",
                'attachment; filename="tourists.json"'
            );

            return res.send(
                JSON.stringify(
                    tourists,
                    null,
                    2
                )
            );

        } catch (error) {

            console.error(
                "Tourist export error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to export tourists.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN EXPORT SOS
// GET /api/admin/export/sos
// =====================================================

app.get(
    "/api/admin/export/sos",
    (req, res) => {

        try {

            res.setHeader(
                "Content-Type",
                "application/json"
            );

            res.setHeader(
                "Content-Disposition",
                'attachment; filename="sos_requests.json"'
            );

            return res.send(
                JSON.stringify(
                    sosRequests,
                    null,
                    2
                )
            );

        } catch (error) {

            console.error(
                "SOS export error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to export SOS records.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// FILE EXISTENCE CHECK
// GET /api/system/files
// =====================================================

app.get(
    "/api/system/files",
    (req, res) => {

        try {

            return res.json({

                success: true,

                files: {

                    tourists:
                        fs.existsSync(
                            dataFile
                        ),

                    sos:
                        fs.existsSync(
                            sosDataFile
                        ),

                    locationHistory:
                        fs.existsSync(
                            locationHistoryFile
                        )
                }
            });

        } catch (error) {

            console.error(
                "System files error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to check system files.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// API VERSION
// GET /api/version
// =====================================================

app.get(
    "/api/version",
    (req, res) => {

        return res.json({

            success: true,

            application:
                "Athiti Suraksha",

            version:
                "1.0.0",

            emergencySystem:
                true,

            liveLocation:
                true,

            timestamp:
                new Date().toISOString()
        });
    }
);
// =====================================================
// ATHITI SURAKSHA - SOS EMERGENCY SYSTEM
// =====================================================

const sosDataFile = path.join(
    __dirname,
    "sos_requests.json"
);

let sosRequests = [];

// =====================================================
// LOAD SOS REQUESTS
// =====================================================

function loadSOSRequests() {

    try {

        if (
            !fs.existsSync(
                sosDataFile
            )
        ) {

            fs.writeFileSync(
                sosDataFile,
                "[]",
                "utf8"
            );

            sosRequests = [];

            return;
        }

        const fileData =
            fs.readFileSync(
                sosDataFile,
                "utf8"
            );

        if (!fileData.trim()) {

            sosRequests = [];

            return;
        }

        const parsed =
            JSON.parse(
                fileData
            );

        sosRequests =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Unable to read sos_requests.json:",
            error.message
        );

        sosRequests = [];
    }
}

// =====================================================
// SAVE SOS REQUESTS
// =====================================================

function saveSOSRequests() {

    fs.writeFileSync(
        sosDataFile,
        JSON.stringify(
            sosRequests,
            null,
            2
        ),
        "utf8"
    );
}

loadSOSRequests();

// =====================================================
// FIND TOURIST FOR SOS
// =====================================================

function findTouristForSOS(
    touristId
) {

    if (
        touristId === undefined ||
        touristId === null ||
        touristId === ""
    ) {

        return null;
    }

    return tourists.find(
        tourist =>
            String(
                tourist.id
            ) ===
            String(
                touristId
            )
    ) || null;
}

// =====================================================
// GET SOS TOURIST NAME
// =====================================================

function getSOSName(
    data,
    tourist
) {

    if (
        data &&
        data.name
    ) {

        return String(
            data.name
        ).trim();
    }

    if (
        tourist &&
        tourist.name
    ) {

        return String(
            tourist.name
        ).trim();
    }

    if (tourist) {

        const first =
            tourist.firstName ||
            tourist.firstname ||
            "";

        const last =
            tourist.lastName ||
            tourist.lastname ||
            "";

        const fullName =
            `${first} ${last}`.trim();

        if (fullName) {

            return fullName;
        }
    }

    return "Unknown Tourist";
}

// =====================================================
// SOS NUMBER HELPER
// =====================================================

function getSOSNumber(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;
    }

    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : null;
}

// =====================================================
// CREATE SOS REQUEST
// POST /api/sos
// =====================================================

app.post(
    "/api/sos",
    async (req, res) => {

        try {

            const data =
                req.body || {};

            const touristId =
                data.touristId ??
                data.userId ??
                data.id ??
                null;

            const tourist =
                findTouristForSOS(
                    touristId
                );

            const latitude =
                getSOSNumber(
                    data.latitude ??
                    tourist?.latitude
                );

            const longitude =
                getSOSNumber(
                    data.longitude ??
                    tourist?.longitude
                );

            if (
                latitude === null ||
                longitude === null
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Valid GPS latitude and longitude are required."
                });
            }

            const now =
                new Date()
                .toISOString();

            const sosId =
                `SOS-${Date.now()}-${Math.floor(
                    Math.random() * 10000
                )}`;

            const sos = {

                id:
                    sosId,

                touristId:
                    touristId,

                name:
                    getSOSName(
                        data,
                        tourist
                    ),

                email:
                    data.email ||
                    tourist?.email ||
                    "",

                phone:
                    data.phone ||
                    data.mobile ||
                    tourist?.phone ||
                    tourist?.mobile ||
                    "",

                mobile:
                    data.mobile ||
                    data.phone ||
                    tourist?.mobile ||
                    tourist?.phone ||
                    "",

                touristType:
                    data.touristType ||
                    tourist?.touristType ||
                    "",

                country:
                    data.country ||
                    tourist?.country ||
                    "",

                gender:
                    data.gender ||
                    tourist?.gender ||
                    "",

                photo:
                    data.photo ||
                    data.facePhoto ||
                    tourist?.photo ||
                    tourist?.facePhoto ||
                    "",

                facePhoto:
                    data.facePhoto ||
                    data.photo ||
                    tourist?.facePhoto ||
                    tourist?.photo ||
                    "",

                message:
                    data.message ||
                    "Emergency SOS activated.",

                latitude:
                    latitude,

                longitude:
                    longitude,

                accuracy:
                    getSOSNumber(
                        data.accuracy
                    ),

                status:
                    "ACTIVE",

                createdAt:
                    now,

                updatedAt:
                    now,

                respondingAt:
                    null,

                resolvedAt:
                    null,

                adminId:
                    null,

                adminName:
                    null,

                adminMessage:
                    null,

                smsStatus:
                    "PENDING",

                smsRecipients:
                    [],

                smsMessages:
                    [],

                smsError:
                    null
            };

            sosRequests.unshift(
                sos
            );

            saveSOSRequests();

            // Send the emergency SMS after the SOS has been
            // safely stored. SMS failure does not cancel the SOS.
            const smsResult =
                await sendSOSSMS(
                    sos,
                    data,
                    tourist
                );

            sos.smsStatus =
                smsResult.sent
                    ? "SENT"
                    : smsResult.attempted
                        ? "FAILED"
                        : "NOT_CONFIGURED";

            sos.smsRecipients =
                smsResult.recipients || [];

            sos.smsMessages =
                smsResult.messages || [];

            sos.smsError =
                smsResult.error || null;

            sos.updatedAt =
                new Date().toISOString();

            saveSOSRequests();

            console.log(
                `🚨 SOS ACTIVATED: ${sos.name} (${sos.id})`
            );

            console.log(
                `📱 SMS STATUS: ${sos.smsStatus}`
            );

            return res.status(
                201
            ).json({

                success: true,

                message:
                    "SOS emergency request created successfully.",

                sms:
                    {
                        status:
                            sos.smsStatus,
                        recipients:
                            sos.smsRecipients,
                        messages:
                            sos.smsMessages,
                        error:
                            sos.smsError
                    },

                sos:
                    sos
            });

        } catch (error) {

            console.error(
                "SOS creation error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Failed to create SOS request.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GET ALL SOS REQUESTS
// GET /api/sos
// =====================================================

app.get(
    "/api/sos",
    (req, res) => {

        try {

            const sorted =
                [...sosRequests]
                .sort(
                    (a, b) =>
                        new Date(
                            b.createdAt
                        ) -
                        new Date(
                            a.createdAt
                        )
                );

            const activeCount =
                sorted.filter(
                    sos =>
                        sos.status ===
                        "ACTIVE"
                ).length;

            const respondingCount =
                sorted.filter(
                    sos =>
                        sos.status ===
                        "RESPONDING"
                ).length;

            return res.json({

                success: true,

                count:
                    sorted.length,

                activeCount:
                    activeCount,

                respondingCount:
                    respondingCount,

                sos:
                    sorted
            });

        } catch (error) {

            console.error(
                "Get SOS error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to fetch SOS requests.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// GET SINGLE SOS
// GET /api/sos/:id
// =====================================================

app.get(
    "/api/sos/:id",
    (req, res) => {

        try {

            const sos =
                sosRequests.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            req.params.id
                        )
                );

            if (!sos) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "SOS request not found."
                });
            }

            return res.json({

                success: true,

                sos:
                    sos
            });

        } catch (error) {

            console.error(
                "Get single SOS error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to fetch SOS request.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// UPDATE LIVE SOS LOCATION
// POST /api/sos/:id/location
// =====================================================

app.post(
    "/api/sos/:id/location",
    (req, res) => {

        try {

            const sos =
                sosRequests.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            req.params.id
                        )
                );

            if (!sos) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "SOS request not found."
                });
            }

            const latitude =
                getSOSNumber(
                    req.body.latitude
                );

            const longitude =
                getSOSNumber(
                    req.body.longitude
                );

            const accuracy =
                getSOSNumber(
                    req.body.accuracy
                );

            if (
                latitude === null ||
                longitude === null
            ) {

                return res.status(
                    400
                ).json({

                    success: false,

                    message:
                        "Valid latitude and longitude are required."
                });
            }

            sos.latitude =
                latitude;

            sos.longitude =
                longitude;

            sos.accuracy =
                accuracy;

            sos.updatedAt =
                new Date()
                .toISOString();

            saveSOSRequests();

            return res.json({

                success: true,

                message:
                    "SOS location updated.",

                sos:
                    sos
            });

        } catch (error) {

            console.error(
                "SOS location update error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to update SOS location.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// ADMIN RESPOND TO SOS
// POST /api/sos/:id/respond
// =====================================================

app.post(
    "/api/sos/:id/respond",
    (req, res) => {

        try {

            const sos =
                sosRequests.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            req.params.id
                        )
                );

            if (!sos) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "SOS request not found."
                });
            }

            const now =
                new Date()
                .toISOString();

            sos.status =
                "RESPONDING";

            if (
                !sos.respondingAt
            ) {

                sos.respondingAt =
                    now;
            }

            sos.updatedAt =
                now;

            sos.adminId =
                req.body.adminId ||
                "ADMIN";

            sos.adminName =
                req.body.adminName ||
                "Administrator";

            sos.adminMessage =
                req.body.message ||
                "Admin is responding to your emergency.";

            saveSOSRequests();

            console.log(
                `🚔 ADMIN RESPONDING: ${sos.id}`
            );

            return res.json({

                success: true,

                message:
                    "Admin is responding to the SOS.",

                sos:
                    sos
            });

        } catch (error) {

            console.error(
                "SOS respond error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to respond to SOS.",

                error:
                    error.message
            });
        }
    }
);

// =====================================================
// RESOLVE SOS
// POST /api/sos/:id/resolve
// =====================================================

app.post(
    "/api/sos/:id/resolve",
    (req, res) => {

        try {

            const sos =
                sosRequests.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            req.params.id
                        )
                );

            if (!sos) {

                return res.status(
                    404
                ).json({

                    success: false,

                    message:
                        "SOS request not found."
                });
            }

            const now =
                new Date()
                .toISOString();

            sos.status =
                "RESOLVED";

            sos.resolvedAt =
                now;

            sos.updatedAt =
                now;

            sos.adminId =
                req.body.adminId ||
                sos.adminId ||
                "ADMIN";

            sos.adminName =
                req.body.adminName ||
                sos.adminName ||
                "Administrator";

            sos.adminMessage =
                req.body.message ||
                "Emergency resolved by administrator.";

            saveSOSRequests();

            console.log(
                `✅ SOS RESOLVED: ${sos.id}`
            );

            return res.json({

                success: true,

                message:
                    "SOS request resolved successfully.",

                sos:
                    sos
            });

        } catch (error) {

            console.error(
                "SOS resolve error:",
                error
            );

            return res.status(
                500
            ).json({

                success: false,

                message:
                    "Unable to resolve SOS.",

                error:
                    error.message
            });
        }
    }
);
// =====================================================
// TWILIO VERIFY OTP - SEND
// POST /api/otp/send
// =====================================================

app.post(
    "/api/otp/send",
    async (req, res) => {

        try {

            if (!twilioClient) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Twilio is not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in server/.env."
                });
            }

            if (!TWILIO_VERIFY_SERVICE_SID) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Twilio Verify Service is not configured. Add TWILIO_VERIFY_SERVICE_SID=VA... to server/.env."
                });
            }

            const fullPhone =
                normalizePhoneNumber(
                    req.body?.fullPhone ||
                    req.body?.phone
                );

            if (!fullPhone) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Enter a valid phone number in international format, for example +919606550477."
                });
            }

            const verification =
                await twilioClient.verify.v2
                    .services(TWILIO_VERIFY_SERVICE_SID)
                    .verifications.create({
                        channel: "sms",
                        to: fullPhone
                    });

            console.log(
                `📲 OTP SENT -> ${fullPhone} | SID: ${verification.sid} | STATUS: ${verification.status}`
            );

            return res.json({
                success: true,
                message:
                    "OTP sent successfully to your mobile number.",
                status:
                    verification.status,
                sid:
                    verification.sid,
                to:
                    fullPhone
            });

        } catch (error) {

            console.error(
                "❌ OTP SEND FAILED:",
                {
                    code:
                        error.code || null,
                    status:
                        error.status || null,
                    message:
                        error.message
                }
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to send OTP.",
                error:
                    error.message,
                code:
                    error.code || null,
                status:
                    error.status || null
            });
        }
    }
);

// =====================================================
// TWILIO VERIFY OTP - VERIFY
// POST /api/otp/verify
// =====================================================

app.post(
    "/api/otp/verify",
    async (req, res) => {

        try {

            if (!twilioClient) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Twilio is not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in server/.env."
                });
            }

            if (!TWILIO_VERIFY_SERVICE_SID) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Twilio Verify Service is not configured. Add TWILIO_VERIFY_SERVICE_SID=VA... to server/.env."
                });
            }

            const fullPhone =
                normalizePhoneNumber(
                    req.body?.fullPhone ||
                    req.body?.phone
                );

            const code =
                String(
                    req.body?.otp ||
                    req.body?.code ||
                    ""
                ).trim();

            if (!fullPhone) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid international phone number is required."
                });
            }

            if (!/^\d{4,10}$/.test(code)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Enter the OTP received on your mobile."
                });
            }

            const verificationCheck =
                await twilioClient.verify.v2
                    .services(TWILIO_VERIFY_SERVICE_SID)
                    .verificationChecks.create({
                        to: fullPhone,
                        code
                    });

            const approved =
                verificationCheck.status ===
                "approved";

            console.log(
                `${approved ? "✅" : "❌"} OTP VERIFY -> ${fullPhone} | STATUS: ${verificationCheck.status}`
            );

            if (!approved) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid or expired OTP. Please request a new OTP and try again.",
                    status:
                        verificationCheck.status
                });
            }

            return res.json({
                success: true,
                message:
                    "Mobile number verified successfully.",
                status:
                    verificationCheck.status,
                verified: true,
                to:
                    fullPhone
            });

        } catch (error) {

            console.error(
                "❌ OTP VERIFY FAILED:",
                {
                    code:
                        error.code || null,
                    status:
                        error.status || null,
                    message:
                        error.message
                }
            );

            return res.status(500).json({
                success: false,
                message:
                    "OTP verification failed.",
                error:
                    error.message,
                code:
                    error.code || null,
                status:
                    error.status || null
            });
        }
    }
);

// =====================================================
// TEST TWILIO SMS
// POST /api/sms/test
// =====================================================

app.post(
    "/api/sms/test",
    async (req, res) => {

        try {

            if (!twilioClient) {
                return res.status(500).json({
                    success: false,
                    message:
                        "Twilio is not configured. Check server/.env."
                });
            }

            const to =
                normalizePhoneNumber(
                    req.body?.to ||
                    SOS_ALERT_PHONE
                        .split(",")[0]
                );

            if (!to) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Provide a valid destination phone number in E.164 format, e.g. +919876543210."
                });
            }

            const from =
                normalizePhoneNumber(
                    TWILIO_PHONE_NUMBER
                );

            if (!from) {
                return res.status(500).json({
                    success: false,
                    message:
                        "TWILIO_PHONE_NUMBER is missing or invalid."
                });
            }

            const message =
                await twilioClient.messages.create({
                    body:
                        req.body?.message ||
                        "Athiti Suraksha Twilio SMS test successful.",
                    from,
                    to
                });

            console.log(
                `📱 TEST SMS SENT -> ${to} | SID: ${message.sid} | STATUS: ${message.status}`
            );

            return res.json({
                success: true,
                message:
                    "Test SMS sent successfully.",
                sid:
                    message.sid,
                status:
                    message.status,
                to:
                    to,
                from:
                    from
            });

        } catch (error) {

            console.error(
                "Twilio test SMS error:",
                {
                    code:
                        error.code || null,
                    message:
                        error.message
                }
            );

            return res.status(500).json({
                success: false,
                message:
                    "Twilio test SMS failed.",
                error:
                    error.message,
                code:
                    error.code || null
            });
        }
    }
);

// =====================================================
// TOURIST REGISTRATION
// POST /api/register
// =====================================================
// This route matches register_updated_complete.js exactly.
// It keeps password, OTP status and face photo so the tourist
// can log in after registration.
app.post(
    "/api/register",
    (req, res) => {

        try {

            const data = req.body || {};

            const name = String(data.name || "").trim();
            const email = String(data.email || "").trim();
            const phone = String(data.phone || data.mobile || "").trim();
            const fullPhone = String(data.fullPhone || "").trim();
            const password = String(data.password || "");
            const touristType = String(data.touristType || "").trim();
            const aadhaar = String(data.aadhaar || "").trim();
            const passport = String(data.passport || "").trim().toUpperCase();
            const country = String(data.country || "").trim();
            const facePhoto = String(data.facePhoto || data.photo || "").trim();

            if (!name || !email || !phone || !password || !touristType) {
                return res.status(400).json({
                    success: false,
                    message: "Required registration fields are missing."
                });
            }

            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must contain at least 6 characters."
                });
            }

            if (touristType === "Indian Tourist") {
                if (!/^\d{12}$/.test(aadhaar)) {
                    return res.status(400).json({
                        success: false,
                        message: "Aadhaar number must contain exactly 12 digits."
                    });
                }
            } else if (touristType === "Foreign Tourist") {
                if (!/^[A-Z0-9]{6,15}$/.test(passport)) {
                    return res.status(400).json({
                        success: false,
                        message: "Passport number must contain only letters and numbers and be 6-15 characters long."
                    });
                }
                if (!country) {
                    return res.status(400).json({
                        success: false,
                        message: "Country is required for foreign tourists."
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Invalid tourist type."
                });
            }

            if (data.phoneVerified !== true) {
                return res.status(400).json({
                    success: false,
                    message: "Mobile number must be verified with OTP before registration."
                });
            }

            if (!facePhoto) {
                return res.status(400).json({
                    success: false,
                    message: "Live face photo is required."
                });
            }

            const normalizedEmail = email.toLowerCase();
            const normalizedPhone = phone.replace(/\D/g, "");
            const normalizedFullPhone = fullPhone || normalizePhoneNumber(phone);

            const duplicate = tourists.find(item => {
                const itemEmail = String(item.email || "").trim().toLowerCase();
                const itemPhone = String(item.phone || item.mobile || "").replace(/\D/g, "");
                const itemFullPhone = String(item.fullPhone || "").trim();
                const itemAadhaar = String(item.aadhaar || "").trim();
                const itemPassport = String(item.passport || "").trim().toUpperCase();

                return (
                    (itemEmail && itemEmail === normalizedEmail) ||
                    (itemPhone && itemPhone === normalizedPhone) ||
                    (itemFullPhone && normalizedFullPhone && itemFullPhone === normalizedFullPhone) ||
                    (aadhaar && itemAadhaar && itemAadhaar === aadhaar) ||
                    (passport && itemPassport && itemPassport === passport)
                );
            });

            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    message: "A tourist account with the same email, mobile number, Aadhaar or passport already exists."
                });
            }

            const now = new Date().toISOString();

            const tourist = {
                id: data.id || `T-${Date.now()}`,
                name,
                email,
                age: Number(data.age) || null,
                gender: data.gender || "",
                touristType,
                aadhaar,
                passport,
                country,
                countryCode: data.countryCode || "",
                phone,
                mobile: phone,
                fullPhone: normalizedFullPhone,
                phoneVerified: true,
                password,
                facePhoto,
                photo: facePhoto,
                latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
                longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
                accountStatus: "ACTIVE",
                registeredAt: data.registeredAt || now,
                createdAt: now,
                updatedAt: now
            };

            tourists.push(tourist);
            saveTourists();

            console.log(`✅ TOURIST REGISTERED: ${tourist.id} | ${tourist.name}`);

            return res.status(201).json({
                success: true,
                message: "Tourist registered successfully.",
                tourist
            });

        } catch (error) {

            console.error("Tourist registration error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to register tourist.",
                error: error.message
            });
        }
    }
);

// =====================================================
// 404 API HANDLER
// =====================================================

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith("/api/")
        ) {

            return res.status(
                404
            ).json({

                success: false,

                message:
                    "API endpoint not found.",

                path:
                    req.originalUrl
            });
        }

        next();
    }
);

// =====================================================
// SERVE CLIENT INDEX FOR FRONTEND ROUTES
// =====================================================

app.get(
    "*",
    (req, res) => {

        const indexFile =
            path.join(
                clientPath,
                "index.html"
            );

        if (
            fs.existsSync(indexFile)
        ) {

            return res.sendFile(
                indexFile
            );
        }

        return res.status(
            404
        ).send(
            "Athiti Suraksha client application not found."
        );
    }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "GLOBAL SERVER ERROR:",
            err
        );

        if (
            res.headersSent
        ) {

            return next(err);
        }

        return res.status(
            500
        ).json({

            success: false,

            message:
                "Internal server error.",

            error:
                process.env.NODE_ENV ===
                "production"
                    ? undefined
                    : err.message
        });
    }
);

// =====================================================
// SERVER START
// =====================================================

const PORT =
    Number(
        process.env.PORT
    ) ||
    5000;

app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "=============================================="
        );

        console.log(
            "       ATHITI SURAKSHA SERVER"
        );

        console.log(
            "=============================================="
        );

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 Local URL: http://localhost:${PORT}`
        );

        console.log(
            `📡 API URL: http://localhost:${PORT}/api`
        );

        console.log(
            `👥 Tourists: ${tourists.length}`
        );

        console.log(
            `🚨 SOS Requests: ${sosRequests.length}`
        );

        console.log(
            `📍 Location History: ${locationHistory.length}`
        );

        console.log(
            "=============================================="
        );

        console.log(
            "Available SOS APIs:"
        );

        console.log(
            "POST   /api/sos"
        );

        console.log(
            "GET    /api/sos"
        );

        console.log(
            "GET    /api/sos/:id"
        );

        console.log(
            "POST   /api/sos/:id/location"
        );

        console.log(
            "POST   /api/sos/:id/respond"
        );

        console.log(
            "POST   /api/sos/:id/resolve"
        );

        console.log(
            "POST   /api/otp/send"
        );

        console.log(
            "POST   /api/otp/verify"
        );

        console.log(
            "POST   /api/sms/test"
        );

        console.log(
            "POST   /api/sms/test"
        );

        console.log(
            "=============================================="
        );

        console.log("");
    }
);

// =====================================================
// PROCESS ERROR HANDLING
// =====================================================

process.on(
    "uncaughtException",
    error => {

        console.error(
            "UNCAUGHT EXCEPTION:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "UNHANDLED PROMISE REJECTION:",
            error
        );
    }
);

// =====================================================
// END OF SERVER.JS
// =====================================================