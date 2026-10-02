/* =====================================================
   ATHITI SURAKSHA
   TOURIST REGISTRATION JS
   COMPLETE UPDATED VERSION
   ===================================================== */

const API_URL = "https://athiti-suraksha-reviewed.onrender.com".replace(/\/$/, "");

/* Convert browser's vague "Failed to fetch" into a useful deployment hint.
   A real fix for CORS/server outages must be made on the backend/Render. */
async function apiFetch(url, options = {}) {
    try {
        return await fetch(url, options);
    } catch (error) {
        if (
            error instanceof TypeError ||
            /failed to fetch|networkerror/i.test(error?.message || "")
        ) {
            throw new Error(
                `Cannot reach the Athiti Suraksha API (${API_URL}). Check that the Render service is live, its URL is correct, and CORS allows this frontend origin.`
            );
        }
        throw error;
    }
}



/* =====================================================
   BASIC DOM ELEMENTS
   ===================================================== */

const form = document.getElementById("registerForm");
const message = document.getElementById("message");

const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

const faceButton = document.getElementById("faceButton");
const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const capturedPhoto = document.getElementById("capturedPhoto");
const facePhoto = document.getElementById("facePhoto");


/* =====================================================
   TOURIST / IDENTITY / COUNTRY / MOBILE
   ===================================================== */

const touristType = document.getElementById("touristType");

const aadhaarGroup = document.getElementById("aadhaarGroup");
const passportGroup = document.getElementById("passportGroup");
const countryGroup = document.getElementById("countryGroup");

const aadhaarInput = document.getElementById("aadhaar");
const passportInput = document.getElementById("passport");

const countryInput = document.getElementById("country");
const countryList = document.getElementById("countryList");

const countryCodeSelect = document.getElementById("countryCode");
const phoneInput = document.getElementById("phone");
const phoneHint = document.getElementById("phoneHint");


/* =====================================================
   OTP ELEMENTS
   ===================================================== */

const sendOtpButton = document.getElementById("sendOtpButton");
const otpArea = document.getElementById("otpArea");
const otpEntry = document.getElementById("otpEntry");
const otpCode = document.getElementById("otpCode");
const verifyOtpButton = document.getElementById("verifyOtpButton");
const otpTimer = document.getElementById("otpTimer");
const otpMessage = document.getElementById("otpMessage");
const phoneVerified = document.getElementById("phoneVerified");

let otpVerified = false;
let otpVerifiedPhone = "";
let otpCountdown = null;
let otpSending = false;


/* =====================================================
   COUNTRY DATA
   ===================================================== */

const COUNTRY_DATA = [
    ["AF","Afghanistan","+93"],
    ["AL","Albania","+355"],
    ["DZ","Algeria","+213"],
    ["AS","American Samoa","+1"],
    ["AD","Andorra","+376"],
    ["AO","Angola","+244"],
    ["AI","Anguilla","+1"],
    ["AQ","Antarctica","+672"],
    ["AG","Antigua and Barbuda","+1"],
    ["AR","Argentina","+54"],
    ["AM","Armenia","+374"],
    ["AW","Aruba","+297"],
    ["AU","Australia","+61"],
    ["AT","Austria","+43"],
    ["AZ","Azerbaijan","+994"],
    ["BS","Bahamas","+1"],
    ["BH","Bahrain","+973"],
    ["BD","Bangladesh","+880"],
    ["BB","Barbados","+1"],
    ["BY","Belarus","+375"],
    ["BE","Belgium","+32"],
    ["BZ","Belize","+501"],
    ["BJ","Benin","+229"],
    ["BM","Bermuda","+1"],
    ["BT","Bhutan","+975"],
    ["BO","Bolivia","+591"],
    ["BA","Bosnia and Herzegovina","+387"],
    ["BW","Botswana","+267"],
    ["BR","Brazil","+55"],
    ["IO","British Indian Ocean Territory","+246"],
    ["BN","Brunei","+673"],
    ["BG","Bulgaria","+359"],
    ["BF","Burkina Faso","+226"],
    ["BI","Burundi","+257"],
    ["KH","Cambodia","+855"],
    ["CM","Cameroon","+237"],
    ["CA","Canada","+1"],
    ["CV","Cape Verde","+238"],
    ["CF","Central African Republic","+236"],
    ["TD","Chad","+235"],
    ["CL","Chile","+56"],
    ["CN","China","+86"],
    ["CX","Christmas Island","+61"],
    ["CC","Cocos Islands","+61"],
    ["CO","Colombia","+57"],
    ["KM","Comoros","+269"],
    ["CK","Cook Islands","+682"],
    ["CR","Costa Rica","+506"],
    ["HR","Croatia","+385"],
    ["CU","Cuba","+53"],
    ["CW","Curacao","+599"],
    ["CY","Cyprus","+357"],
    ["CZ","Czechia","+420"],
    ["CI","Cote d'Ivoire","+225"],
    ["CD","Democratic Republic of the Congo","+243"],
    ["DK","Denmark","+45"],
    ["DJ","Djibouti","+253"],
    ["DM","Dominica","+1"],
    ["DO","Dominican Republic","+1"],
    ["EC","Ecuador","+593"],
    ["EG","Egypt","+20"],
    ["SV","El Salvador","+503"],
    ["GQ","Equatorial Guinea","+240"],
    ["ER","Eritrea","+291"],
    ["EE","Estonia","+372"],
    ["SZ","Eswatini","+268"],
    ["ET","Ethiopia","+251"],
    ["FK","Falkland Islands","+500"],
    ["FO","Faroe Islands","+298"],
    ["FJ","Fiji","+679"],
    ["FI","Finland","+358"],
    ["FR","France","+33"],
    ["GF","French Guiana","+594"],
    ["PF","French Polynesia","+689"],
    ["GA","Gabon","+241"],
    ["GM","Gambia","+220"],
    ["GE","Georgia","+995"],
    ["DE","Germany","+49"],
    ["GH","Ghana","+233"],
    ["GI","Gibraltar","+350"],
    ["GR","Greece","+30"],
    ["GL","Greenland","+299"],
    ["GD","Grenada","+1"],
    ["GP","Guadeloupe","+590"],
    ["GU","Guam","+1"],
    ["GT","Guatemala","+502"],
    ["GG","Guernsey","+44"],
    ["GN","Guinea","+224"],
    ["GW","Guinea-Bissau","+245"],
    ["GY","Guyana","+592"],
    ["HT","Haiti","+509"],
    ["HN","Honduras","+504"],
    ["HK","Hong Kong","+852"],
    ["HU","Hungary","+36"],
    ["IS","Iceland","+354"],
    ["IN","India","+91"],
    ["ID","Indonesia","+62"],
    ["IR","Iran","+98"],
    ["IQ","Iraq","+964"],
    ["IE","Ireland","+353"],
    ["IM","Isle of Man","+44"],
    ["IL","Israel","+972"],
    ["IT","Italy","+39"],
    ["JM","Jamaica","+1"],
    ["JP","Japan","+81"],
    ["JE","Jersey","+44"],
    ["JO","Jordan","+962"],
    ["KZ","Kazakhstan","+7"],
    ["KE","Kenya","+254"],
    ["KI","Kiribati","+686"],
    ["KW","Kuwait","+965"],
    ["KG","Kyrgyzstan","+996"],
    ["LA","Laos","+856"],
    ["LV","Latvia","+371"],
    ["LB","Lebanon","+961"],
    ["LS","Lesotho","+266"],
    ["LR","Liberia","+231"],
    ["LY","Libya","+218"],
    ["LI","Liechtenstein","+423"],
    ["LT","Lithuania","+370"],
    ["LU","Luxembourg","+352"],
    ["MO","Macao","+853"],
    ["MG","Madagascar","+261"],
    ["MW","Malawi","+265"],
    ["MY","Malaysia","+60"],
    ["MV","Maldives","+960"],
    ["ML","Mali","+223"],
    ["MT","Malta","+356"],
    ["MH","Marshall Islands","+692"],
    ["MQ","Martinique","+596"],
    ["MR","Mauritania","+222"],
    ["MU","Mauritius","+230"],
    ["YT","Mayotte","+262"],
    ["MX","Mexico","+52"],
    ["FM","Micronesia","+691"],
    ["MD","Moldova","+373"],
    ["MC","Monaco","+377"],
    ["MN","Mongolia","+976"],
    ["ME","Montenegro","+382"],
    ["MS","Montserrat","+1"],
    ["MA","Morocco","+212"],
    ["MZ","Mozambique","+258"],
    ["MM","Myanmar","+95"],
    ["NA","Namibia","+264"],
    ["NR","Nauru","+674"],
    ["NP","Nepal","+977"],
    ["NL","Netherlands","+31"],
    ["NC","New Caledonia","+687"],
    ["NZ","New Zealand","+64"],
    ["NI","Nicaragua","+505"],
    ["NE","Niger","+227"],
    ["NG","Nigeria","+234"],
    ["NU","Niue","+683"],
    ["NF","Norfolk Island","+672"],
    ["KP","North Korea","+850"],
    ["MK","North Macedonia","+389"],
    ["MP","Northern Mariana Islands","+1"],
    ["NO","Norway","+47"],
    ["OM","Oman","+968"],
    ["PK","Pakistan","+92"],
    ["PW","Palau","+680"],
    ["PS","Palestine","+970"],
    ["PA","Panama","+507"],
    ["PG","Papua New Guinea","+675"],
    ["PY","Paraguay","+595"],
    ["PE","Peru","+51"],
    ["PH","Philippines","+63"],
    ["PN","Pitcairn","+64"],
    ["PL","Poland","+48"],
    ["PT","Portugal","+351"],
    ["PR","Puerto Rico","+1"],
    ["QA","Qatar","+974"],
    ["CG","Republic of the Congo","+242"],
    ["RO","Romania","+40"],
    ["RU","Russia","+7"],
    ["RW","Rwanda","+250"],
    ["RE","Reunion","+262"],
    ["BL","Saint Barthelemy","+590"],
    ["SH","Saint Helena","+290"],
    ["KN","Saint Kitts and Nevis","+1"],
    ["LC","Saint Lucia","+1"],
    ["MF","Saint Martin","+590"],
    ["PM","Saint Pierre and Miquelon","+508"],
    ["VC","Saint Vincent and the Grenadines","+1"],
    ["WS","Samoa","+685"],
    ["SM","San Marino","+378"],
    ["ST","Sao Tome and Principe","+239"],
    ["SA","Saudi Arabia","+966"],
    ["SN","Senegal","+221"],
    ["RS","Serbia","+381"],
    ["SC","Seychelles","+248"],
    ["SL","Sierra Leone","+232"],
    ["SG","Singapore","+65"],
    ["SX","Sint Maarten","+1"],
    ["SK","Slovakia","+421"],
    ["SI","Slovenia","+386"],
    ["SB","Solomon Islands","+677"],
    ["SO","Somalia","+252"],
    ["ZA","South Africa","+27"],
    ["GS","South Georgia and South Sandwich Islands","+500"],
    ["KR","South Korea","+82"],
    ["SS","South Sudan","+211"],
    ["ES","Spain","+34"],
    ["LK","Sri Lanka","+94"],
    ["SD","Sudan","+249"],
    ["SR","Suriname","+597"],
    ["SJ","Svalbard and Jan Mayen","+47"],
    ["SE","Sweden","+46"],
    ["CH","Switzerland","+41"],
    ["SY","Syria","+963"],
    ["TW","Taiwan","+886"],
    ["TJ","Tajikistan","+992"],
    ["TZ","Tanzania","+255"],
    ["TH","Thailand","+66"],
    ["TL","Timor-Leste","+670"],
    ["TG","Togo","+228"],
    ["TK","Tokelau","+690"],
    ["TO","Tonga","+676"],
    ["TT","Trinidad and Tobago","+1"],
    ["TN","Tunisia","+216"],
    ["TR","Turkey","+90"],
    ["TM","Turkmenistan","+993"],
    ["TC","Turks and Caicos Islands","+1"],
    ["TV","Tuvalu","+688"],
    ["UG","Uganda","+256"],
    ["UA","Ukraine","+380"],
    ["AE","United Arab Emirates","+971"],
    ["GB","United Kingdom","+44"],
    ["US","United States","+1"],
    ["UY","Uruguay","+598"],
    ["UZ","Uzbekistan","+998"],
    ["VU","Vanuatu","+678"],
    ["VA","Vatican City","+39"],
    ["VE","Venezuela","+58"],
    ["VN","Vietnam","+84"],
    ["VG","Virgin Islands, British","+1"],
    ["VI","Virgin Islands, U.S.","+1"],
    ["WF","Wallis and Futuna","+681"],
    ["EH","Western Sahara","+212"],
    ["YE","Yemen","+967"],
    ["ZM","Zambia","+260"],
    ["ZW","Zimbabwe","+263"],
    ["AX","Aland Islands","+358"]
];


/* =====================================================
   COUNTRY NAME LIST
   ===================================================== */

const COUNTRY_NAMES = COUNTRY_DATA
    .map(item => item[1])
    .sort((a, b) => a.localeCompare(b));


/* =====================================================
   FILL COUNTRY SEARCH LIST
   ===================================================== */

if (countryList) {

    countryList.innerHTML = "";

    COUNTRY_NAMES.forEach(function (countryName) {

        const option = document.createElement("option");

        option.value = countryName;

        countryList.appendChild(option);

    });

}


/* =====================================================
   FILL MOBILE COUNTRY CODE SELECTOR
   ===================================================== */

if (countryCodeSelect) {

    countryCodeSelect.innerHTML = "";

    const sortedCountries = [...COUNTRY_DATA].sort(
        (a, b) => a[1].localeCompare(b[1])
    );

    sortedCountries.forEach(function (item) {

        const option = document.createElement("option");

        option.value = item[2];

        option.textContent =
            `${item[1]} (${item[2]})`;

        option.dataset.iso = item[0];

        option.dataset.country = item[1];

        countryCodeSelect.appendChild(option);

    });

}


/* =====================================================
   COUNTRY CODE SELECT
   ===================================================== */

function selectCountryCode(iso) {

    if (!countryCodeSelect) return;

    const option =
        Array.from(countryCodeSelect.options)
            .find(function (item) {
                return item.dataset.iso === iso;
            });

    if (option) {

        countryCodeSelect.value = option.value;

        updatePhoneHint();

    }

}


/* =====================================================
   PHONE HINT
   ===================================================== */

function updatePhoneHint() {

    if (!countryCodeSelect || !phoneHint) return;

    const option =
        countryCodeSelect.options[
            countryCodeSelect.selectedIndex
        ];

    if (!option) return;

    phoneHint.textContent =
        `${option.dataset.country} (${option.value}) selected`;

}


/* =====================================================
   FULL PHONE NUMBER
   ===================================================== */

function getSelectedCountryCode() {

    if (!countryCodeSelect) {
        return "+91";
    }

    return countryCodeSelect.value || "+91";
}


function getFullPhoneNumber() {

    const code =
        getSelectedCountryCode()
            .replace(/\s/g, "");

    const phone =
        phoneInput
            ? phoneInput.value.replace(/\D/g, "")
            : "";

    if (!phone) {
        return "";
    }

    return `${code}${phone}`;
}


/* =====================================================
   OTP MESSAGE
   ===================================================== */

function setOtpMessage(text, type = "") {

    if (!otpMessage) return;

    otpMessage.textContent = text;

    if (type === "success") {

        otpMessage.style.color = "#11743f";

    } else if (type === "error") {

        otpMessage.style.color = "#b42318";

    } else {

        otpMessage.style.color = "#667085";

    }

}


/* =====================================================
   RESET OTP
   ===================================================== */

function resetOtpVerification(clearMessage = true) {

    otpVerified = false;

    otpVerifiedPhone = "";

    if (otpCountdown) {

        clearInterval(otpCountdown);

        otpCountdown = null;

    }

    if (otpTimer) {
        otpTimer.textContent = "";
    }

    if (otpEntry) {
        otpEntry.style.display = "none";
    }

    if (otpCode) {
        otpCode.value = "";
    }

    if (phoneVerified) {
        phoneVerified.style.display = "none";
    }

    if (sendOtpButton) {

        sendOtpButton.disabled = false;

        sendOtpButton.textContent =
            "📲 Send OTP";

    }

    if (verifyOtpButton) {

        verifyOtpButton.disabled = false;

        verifyOtpButton.textContent =
            "Verify OTP";

    }

    if (clearMessage) {
        setOtpMessage("");
    }

}


/* =====================================================
   OTP COUNTDOWN
   ===================================================== */

function startOtpCountdown(seconds = 60) {

    if (!otpTimer) return;

    if (otpCountdown) {

        clearInterval(otpCountdown);

        otpCountdown = null;

    }

    let remaining = seconds;

    otpTimer.textContent =
        `Resend available in ${remaining}s`;

    otpCountdown =
        setInterval(function () {

            remaining--;

            if (remaining <= 0) {

                clearInterval(otpCountdown);

                otpCountdown = null;

                otpTimer.textContent =
                    "You can send OTP again.";

                if (
                    sendOtpButton &&
                    !otpVerified
                ) {

                    sendOtpButton.disabled =
                        false;

                    sendOtpButton.textContent =
                        "📲 Resend OTP";

                }

                return;
            }

            otpTimer.textContent =
                `Resend available in ${remaining}s`;

        }, 1000);

}


/* =====================================================
   VALIDATE PHONE FOR OTP
   ===================================================== */

function validatePhoneForOtp() {

    if (!touristType || !phoneInput) {

        return {
            valid: false,
            message: "Mobile number fields are missing."
        };

    }

    const type =
        touristType.value;

    const phone =
        phoneInput.value.trim();

    if (!type) {

        return {
            valid: false,
            message:
                "Please select Indian Tourist or Foreign Tourist first."
        };

    }


    /* Indian */

    if (
        type === "Indian Tourist" &&
        !/^[0-9]{10}$/.test(phone)
    ) {

        return {
            valid: false,
            message:
                "Enter a valid 10-digit Indian mobile number."
        };

    }


    /* Foreign */

    if (
        type === "Foreign Tourist" &&
        !/^[0-9]{6,15}$/.test(phone)
    ) {

        return {
            valid: false,
            message:
                "Enter a valid mobile number between 6 and 15 digits."
        };

    }


    const fullPhone =
        getFullPhoneNumber();


    /* E.164 basic validation */

    if (
        !/^\+[1-9]\d{6,14}$/.test(fullPhone)
    ) {

        return {
            valid: false,
            message:
                "Invalid international phone number. Check the country code and mobile number."
        };

    }


    return {
        valid: true,
        phone: phone,
        fullPhone: fullPhone
    };

}


/* =====================================================
   SEND OTP
   ===================================================== */

async function sendOTP() {

    if (otpSending) return;

    const validation =
        validatePhoneForOtp();

    if (!validation.valid) {

        showMessage(
            validation.message,
            "error"
        );

        return;

    }


    const currentPhone =
        validation.fullPhone;


    if (
        otpVerified &&
        otpVerifiedPhone === currentPhone
    ) {

        showMessage(
            "This mobile number is already verified.",
            "success"
        );

        return;

    }


    if (otpCountdown) {

        showMessage(
            "Please wait before requesting another OTP.",
            "error"
        );

        return;

    }


    otpSending = true;


    if (sendOtpButton) {

        sendOtpButton.disabled =
            true;

        sendOtpButton.textContent =
            "⏳ Sending OTP...";

    }


    setOtpMessage(
        "Sending OTP..."
    );


    try {

        const response =
            await fetch(
                `${API_URL}/api/otp/send`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            phone:
                                validation.phone,

                            countryCode:
                                getSelectedCountryCode(),

                            fullPhone:
                                validation.fullPhone

                        })

                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to send OTP."
            );

        }


        /* Reset verification */

        otpVerified = false;

        otpVerifiedPhone = "";


        if (otpEntry) {

            otpEntry.style.display =
                "block";

        }


        if (otpCode) {

            otpCode.value = "";

            otpCode.focus();

        }


        if (phoneVerified) {

            phoneVerified.style.display =
                "none";

        }


        setOtpMessage(
            data.message ||
            "OTP sent successfully. Enter the 6-digit OTP.",
            "success"
        );


        if (sendOtpButton) {

            sendOtpButton.textContent =
                "📲 OTP Sent";

        }


        startOtpCountdown(60);


        showMessage(
            "OTP sent to your mobile number. Please enter the OTP to continue.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "OTP send error:",
            error
        );


        setOtpMessage(
            error.message ||
            "Unable to send OTP.",
            "error"
        );


        showMessage(
            error.message ||
            "Unable to send OTP. Check the server and Twilio configuration.",
            "error"
        );


        if (sendOtpButton) {

            sendOtpButton.disabled =
                false;

            sendOtpButton.textContent =
                "📲 Send OTP";

        }

    }

    finally {

        otpSending = false;

    }

}


/* =====================================================
   VERIFY OTP
   ===================================================== */

async function verifyOTP() {

    const validation =
        validatePhoneForOtp();


    if (!validation.valid) {

        showMessage(
            validation.message,
            "error"
        );

        return;

    }


    const code =
        otpCode
            ? otpCode.value.trim()
            : "";


    if (!/^\d{6}$/.test(code)) {

        setOtpMessage(
            "Enter the 6-digit OTP received on your mobile.",
            "error"
        );

        showMessage(
            "Please enter the 6-digit OTP received on your mobile.",
            "error"
        );

        return;

    }


    if (verifyOtpButton) {

        verifyOtpButton.disabled =
            true;

        verifyOtpButton.textContent =
            "⏳ Verifying...";

    }


    setOtpMessage(
        "Verifying OTP..."
    );


    try {

        const response =
            await fetch(
                `${API_URL}/api/otp/verify`,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            phone:
                                validation.phone,

                            countryCode:
                                getSelectedCountryCode(),

                            fullPhone:
                                validation.fullPhone,

                            otp:
                                code,

                            code:
                                code

                        })

                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            data = {};

        }


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Invalid OTP."
            );

        }


        /* OTP VERIFIED */

        otpVerified =
            true;

        otpVerifiedPhone =
            validation.fullPhone;


        if (phoneVerified) {

            phoneVerified.style.display =
                "block";

        }


        if (verifyOtpButton) {

            verifyOtpButton.disabled =
                true;

            verifyOtpButton.textContent =
                "✓ Verified";

        }


        if (sendOtpButton) {

            sendOtpButton.disabled =
                true;

            sendOtpButton.textContent =
                "✓ Mobile Verified";

        }


        if (otpCountdown) {

            clearInterval(
                otpCountdown
            );

            otpCountdown = null;

        }


        if (otpTimer) {

            otpTimer.textContent = "";

        }


        setOtpMessage(
            data.message ||
            "Mobile number verified successfully.",
            "success"
        );


        showMessage(
            "✓ Mobile number verified successfully. You can now register.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "OTP verification error:",
            error
        );


        setOtpMessage(
            error.message ||
            "OTP verification failed.",
            "error"
        );


        showMessage(
            error.message ||
            "OTP verification failed.",
            "error"
        );


        if (verifyOtpButton) {

            verifyOtpButton.disabled =
                false;

            verifyOtpButton.textContent =
                "Verify OTP";

        }

    }

}


/* =====================================================
   OTP BUTTON EVENTS
   ===================================================== */

if (sendOtpButton) {

    sendOtpButton.addEventListener(
        "click",
        sendOTP
    );

}


if (verifyOtpButton) {

    verifyOtpButton.addEventListener(
        "click",
        verifyOTP
    );

}


if (otpCode) {

    otpCode.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

        }
    );


    otpCode.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                verifyOTP();

            }

        }
    );

}


/* =====================================================
   TOURIST TYPE / IDENTITY MODE
   ===================================================== */

function setIdentityMode() {

    if (!touristType) return;

    const type =
        touristType.value;

    const isIndian =
        type === "Indian Tourist";

    const isForeign =
        type === "Foreign Tourist";


    /* Show / hide */

    if (aadhaarGroup) {

        aadhaarGroup.style.display =
            isIndian
                ? "block"
                : "none";

    }


    if (passportGroup) {

        passportGroup.style.display =
            isForeign
                ? "block"
                : "none";

    }


    if (countryGroup) {

        countryGroup.style.display =
            isForeign
                ? "block"
                : "none";

    }


    /* Required */

    if (aadhaarInput) {

        aadhaarInput.required =
            isIndian;

    }


    if (passportInput) {

        passportInput.required =
            isForeign;

    }


    if (countryInput) {

        countryInput.required =
            isForeign;

    }


    /* Indian Tourist */

    if (isIndian) {

        if (countryInput) {

            countryInput.value =
                "India";

        }


        if (passportInput) {

            passportInput.value =
                "";

        }


        selectCountryCode("IN");


        if (phoneInput) {

            phoneInput.maxLength =
                10;

            phoneInput.placeholder =
                "Enter 10-digit mobile number";

        }


        updatePhoneHint();

        return;

    }


    /* Foreign Tourist */

    if (isForeign) {

        if (aadhaarInput) {

            aadhaarInput.value =
                "";

        }


        if (countryInput) {

            countryInput.value =
                "";

        }


        if (
            countryCodeSelect &&
            !countryCodeSelect.value
        ) {

            selectCountryCode("IN");

        }


        if (phoneInput) {

            phoneInput.maxLength =
                15;

            phoneInput.placeholder =
                "Enter mobile number";

        }


        updatePhoneHint();

        return;

    }


    /* No tourist type */

    if (aadhaarInput) {

        aadhaarInput.value =
            "";

    }


    if (passportInput) {

        passportInput.value =
            "";

    }


    if (countryInput) {

        countryInput.value =
            "";

    }


    selectCountryCode("IN");


    if (phoneInput) {

        phoneInput.maxLength =
            15;

        phoneInput.placeholder =
            "Enter mobile number";

    }


    updatePhoneHint();

}


/* =====================================================
   TOURIST TYPE CHANGE
   ===================================================== */

if (touristType) {

    touristType.addEventListener(
        "change",
        function () {

            resetOtpVerification();

            setIdentityMode();

        }
    );

}


/* =====================================================
   AADHAAR VALIDATION
   EXACTLY 12 DIGITS
   ===================================================== */

if (aadhaarInput) {

    aadhaarInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(/\D/g, "")
                    .slice(0, 12);

        }
    );

}


/* =====================================================
   PASSPORT VALIDATION
   LETTERS + NUMBERS
   6–15 CHARACTERS
   ===================================================== */

if (passportInput) {

    passportInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(
                        /[^a-zA-Z0-9]/g,
                        ""
                    )
                    .slice(0, 15)
                    .toUpperCase();

        }
    );

}


/* =====================================================
   MOBILE NUMBER VALIDATION
   ===================================================== */

if (phoneInput) {

    phoneInput.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(/\D/g, "")
                    .slice(0, 15);

            /*
             * Any change to mobile number
             * invalidates previous OTP verification.
             */

            resetOtpVerification();

        }
    );

}


/* =====================================================
   COUNTRY CODE CHANGE
   ===================================================== */

if (countryCodeSelect) {

    countryCodeSelect.addEventListener(
        "change",
        function () {

            resetOtpVerification();

            updatePhoneHint();

        }
    );

}


/* =====================================================
   COUNTRY SEARCH / VALIDATION
   ===================================================== */

if (countryInput) {

    countryInput.addEventListener(
        "change",
        function () {

            const value =
                this.value
                    .trim()
                    .toLowerCase();

            const exact =
                COUNTRY_NAMES.find(
                    function (name) {

                        return (
                            name.toLowerCase() ===
                            value
                        );

                    }
                );


            if (exact) {

                this.value =
                    exact;

            }

        }
    );

}


/* =====================================================
   INITIAL MODE
   ===================================================== */

setIdentityMode();

selectCountryCode("IN");

updatePhoneHint();


/* =====================================================
   PASSWORD SHOW / HIDE
   ===================================================== */

if (
    togglePassword &&
    password
) {

    togglePassword.addEventListener(
        "click",
        function () {

            if (
                password.type ===
                "password"
            ) {

                password.type =
                    "text";

                togglePassword.textContent =
                    "🙈";

            } else {

                password.type =
                    "password";

                togglePassword.textContent =
                    "👁";

            }

        }
    );

}


/* =====================================================
   FACE CAMERA
   ===================================================== */

let cameraStream = null;


if (
    faceButton &&
    camera
) {

    faceButton.addEventListener(
        "click",
        async function () {

            try {

                if (!cameraStream) {

                    if (
                        !navigator.mediaDevices ||
                        !navigator.mediaDevices.getUserMedia
                    ) {

                        throw new Error(
                            "Camera is not supported by this browser."
                        );

                    }


                    cameraStream =
                        await navigator
                            .mediaDevices
                            .getUserMedia({

                                video: {

                                    facingMode:
                                        "user",

                                    width:
                                        720,

                                    height:
                                        720

                                },

                                audio:
                                    false

                            });


                    camera.srcObject =
                        cameraStream;


                    camera.style.display =
                        "block";


                    faceButton.textContent =
                        "📸 Capture Live Photo";

                }

                else {

                    captureFacePhoto();

                }

            }

            catch (error) {

                console.error(
                    "Camera error:",
                    error
                );


                showMessage(
                    error.message ||
                    "Camera permission is required for face verification.",
                    "error"
                );

            }

        }
    );

}


/* =====================================================
   CAPTURE FACE PHOTO
   ===================================================== */

function captureFacePhoto() {

    if (
        !canvas ||
        !camera ||
        !facePhoto
    ) {

        showMessage(
            "Camera elements are missing.",
            "error"
        );

        return;

    }


    if (
        !camera.videoWidth ||
        !camera.videoHeight
    ) {

        showMessage(
            "Camera is not ready yet. Please wait a moment.",
            "error"
        );

        return;

    }


    const context =
        canvas.getContext("2d");


    canvas.width =
        camera.videoWidth;


    canvas.height =
        camera.videoHeight;


    context.drawImage(
        camera,
        0,
        0,
        canvas.width,
        canvas.height
    );


    const photoData =
        canvas.toDataURL(
            "image/jpeg",
            0.75
        );


    facePhoto.value =
        photoData;


    if (capturedPhoto) {

        capturedPhoto.src =
            photoData;

        capturedPhoto.style.display =
            "block";

    }


    camera.style.display =
        "none";


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(function (track) {

                track.stop();

            });

        cameraStream =
            null;

    }


    faceButton.textContent =
        "✓ Face Verification Completed";


    faceButton.style.background =
        "linear-gradient(90deg,#13a05a,#07834b)";


    showMessage(
        "✓ Live photo captured successfully.",
        "success"
    );

}


/* =====================================================
   SHOW MESSAGE
   ===================================================== */

function showMessage(
    text,
    type = "error"
) {

    if (!message) return;

    message.textContent =
        text;

    message.className =
        `message ${type}`;

    message.style.display =
        "block";

}


/* =====================================================
   REGISTER
   ===================================================== */

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* =================================================
               GET DATA
               ================================================= */

            const tourist = {

                name:
                    document
                        .getElementById("name")
                        .value
                        .trim(),

                email:
                    document
                        .getElementById("email")
                        .value
                        .trim(),

                age:
                    Number(
                        document
                            .getElementById("age")
                            .value
                    ),

                gender:
                    document
                        .getElementById("gender")
                        .value,

                touristType:
                    document
                        .getElementById("touristType")
                        .value,

                aadhaar:
                    document
                        .getElementById("aadhaar")
                        .value
                        .trim(),

                passport:
                    document
                        .getElementById("passport")
                        .value
                        .trim(),

                country:
                    document
                        .getElementById("country")
                        .value
                        .trim(),

                countryCode:
                    document
                        .getElementById("countryCode")
                        .value,

                phone:
                    document
                        .getElementById("phone")
                        .value
                        .trim(),

                fullPhone:
                    getFullPhoneNumber(),

                phoneVerified:
                    otpVerified,

                password:
                    document
                        .getElementById("password")
                        .value,

                facePhoto:
                    document
                        .getElementById("facePhoto")
                        .value,

                registeredAt:
                    new Date().toISOString()

            };


            /* =================================================
               BASIC VALIDATION
               ================================================= */

            if (!tourist.name) {

                showMessage(
                    "Please enter your full name.",
                    "error"
                );

                return;

            }


            if (!tourist.email) {

                showMessage(
                    "Please enter your email.",
                    "error"
                );

                return;

            }


            if (
                !tourist.age ||
                tourist.age < 1 ||
                tourist.age > 120
            ) {

                showMessage(
                    "Please enter a valid age.",
                    "error"
                );

                return;

            }


            if (!tourist.gender) {

                showMessage(
                    "Please select gender.",
                    "error"
                );

                return;

            }


            if (!tourist.touristType) {

                showMessage(
                    "Please select tourist type.",
                    "error"
                );

                return;

            }


            /* =================================================
               INDIAN TOURIST
               ================================================= */

            if (
                tourist.touristType ===
                "Indian Tourist"
            ) {


                /* Aadhaar */

                if (
                    !/^[0-9]{12}$/.test(
                        tourist.aadhaar
                    )
                ) {

                    showMessage(
                        "Aadhaar number must contain exactly 12 digits.",
                        "error"
                    );

                    return;

                }


                /* Force India */

                tourist.country =
                    "India";

                tourist.countryCode =
                    "+91";


                /* Indian mobile */

                if (
                    !/^[0-9]{10}$/.test(
                        tourist.phone
                    )
                ) {

                    showMessage(
                        "Enter a valid 10-digit Indian mobile number.",
                        "error"
                    );

                    return;

                }

            }


            /* =================================================
               FOREIGN TOURIST
               ================================================= */

            else if (
                tourist.touristType ===
                "Foreign Tourist"
            ) {


                /* Passport */

                if (
                    !/^[A-Z0-9]{6,15}$/.test(
                        tourist.passport
                    )
                ) {

                    showMessage(
                        "Passport number must contain only letters and numbers and be 6–15 characters long.",
                        "error"
                    );

                    return;

                }


                /* Country */

                if (!tourist.country) {

                    showMessage(
                        "Please search and select your country.",
                        "error"
                    );

                    return;

                }


                const validCountry =
                    COUNTRY_NAMES.some(
                        function (name) {

                            return (
                                name.toLowerCase() ===
                                tourist.country.toLowerCase()
                            );

                        }
                    );


                if (!validCountry) {

                    showMessage(
                        "Please select a valid country from the country list.",
                        "error"
                    );

                    return;

                }


                /* Foreign mobile */

                if (
                    !/^[0-9]{6,15}$/.test(
                        tourist.phone
                    )
                ) {

                    showMessage(
                        "Enter a valid mobile number between 6 and 15 digits.",
                        "error"
                    );

                    return;

                }

            }


            /* =================================================
               INVALID TOURIST TYPE
               ================================================= */

            else {

                showMessage(
                    "Please select Indian Tourist or Foreign Tourist.",
                    "error"
                );

                return;

            }


            /* =================================================
               OTP VERIFICATION
               ================================================= */

            const submittedFullPhone =
                getFullPhoneNumber();


            if (
                !otpVerified ||
                otpVerifiedPhone !==
                submittedFullPhone
            ) {

                showMessage(
                    "Please verify your mobile number with OTP before registration.",
                    "error"
                );

                return;

            }


            /* =================================================
               PASSWORD
               ================================================= */

            if (
                tourist.password.length < 6
            ) {

                showMessage(
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;

            }


            /* =================================================
               FACE PHOTO
               ================================================= */

            if (!tourist.facePhoto) {

                showMessage(
                    "Please complete Live Face Verification before registration.",
                    "error"
                );

                return;

            }


            /* =================================================
               TERMS
               ================================================= */

            const terms =
                document.getElementById("terms");


            if (
                terms &&
                !terms.checked
            ) {

                showMessage(
                    "Please accept the Terms & Conditions and Privacy Policy.",
                    "error"
                );

                return;

            }


            /* =================================================
               REGISTER BUTTON
               ================================================= */

            const registerButton =
                document.querySelector(
                    ".register-button"
                );


            if (registerButton) {

                registerButton.disabled =
                    true;

                registerButton.innerHTML =
                    "⏳ Registering Tourist...";

            }


            /* =================================================
               SEND DATA TO SERVER
               ================================================= */

            try {

                const response =
                    await fetch(
                        `${API_URL}/api/register`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    tourist
                                )

                        }
                    );


                let data = {};

                try {

                    data =
                        await response.json();

                } catch (error) {

                    data = {};

                }


                /* =================================================
                   SUCCESS
                   ================================================= */

                /*
                 * REGISTRATION SUCCESS
                 *
                 * The server may return:
                 *   { success: true, ... }
                 * or a successful 2xx response with a message.
                 *
                 * Treat every successful HTTP response as a
                 * successful registration unless the server
                 * explicitly returns success: false.
                 */
                if (
                    response.ok &&
                    data.success !== false
                ) {

                    console.log(
                        "✅ Registration API successful:",
                        data
                    );


                    showMessage(
                        "✓ Registration successful! Redirecting to login...",
                        "success"
                    );


                    if (registerButton) {

                        registerButton.disabled =
                            true;

                        registerButton.innerHTML =
                            "✓ Registration Successful";

                    }


                    /*
                     * Build login.html relative to the current
                     * registration page. This works when the
                     * project is opened through localhost:5000
                     * and when register.html is inside a folder.
                     */

                    /* =================================================
                       FINAL LOGIN REDIRECT
                       register.html and login.html are in the same client folder.
                       Works with Live Server and Node server.
                       ================================================= */

                    const loginURL = new URL(
                        "./login.html",
                        window.location.href
                    ).href;

                    console.log("========================================");
                    console.log("REGISTRATION SUCCESSFUL");
                    console.log("CURRENT PAGE:", window.location.href);
                    console.log("LOGIN PAGE:", loginURL);
                    console.log("========================================");

                    sessionStorage.setItem(
                        "athitiRegistrationSuccess",
                        "true"
                    );

                    localStorage.setItem(
                        "athitiRegistrationSuccess",
                        "true"
                    );

                    /* Navigate immediately to the login page. */
                    window.location.replace(loginURL);

                    /* Fallback navigation. */
                    setTimeout(function () {

                        if (!window.location.pathname.toLowerCase().endsWith("/login.html")) {
                            window.location.assign(loginURL);
                        }

                    }, 1500);

                    return;

                }


                /* =================================================
                   SERVER ERROR
                   ================================================= */

                throw new Error(
                    data.message ||
                    "Registration failed."
                );

            }


            /* =================================================
               CONNECTION ERROR
               ================================================= */

            catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                showMessage(
                    error.message ||
                    "❌ Unable to connect to server. Make sure Node.js server is running.",
                    "error"
                );


                if (registerButton) {

                    registerButton.disabled =
                        false;

                    registerButton.innerHTML =
                        "👤 Register Tourist →";

                }

            }

        }
    );

}


/* =====================================================
   PAGE LOAD COMPLETE
   ===================================================== */

console.log(
    "✅ Athiti Suraksha registration JavaScript loaded."
);

console.log(
    "✅ OTP verification enabled."
);

console.log(
    "✅ API:",
    API_URL
);