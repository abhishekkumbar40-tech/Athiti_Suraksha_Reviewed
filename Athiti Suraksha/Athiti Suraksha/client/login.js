// =====================================================
// ATHITI SURAKSHA
// TOURIST LOGIN JAVASCRIPT
// =====================================================

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");


// =====================================================
// SHOW / HIDE PASSWORD
// =====================================================

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        togglePassword.textContent = "🙈";

    } else {

        passwordInput.type = "password";
        togglePassword.textContent = "👁";

    }

});


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message " + type;

}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!email) {

        showMessage(
            "Please enter your email address.",
            "error"
        );

        emailInput.focus();
        return;
    }

    if (!password) {

        showMessage(
            "Please enter your password.",
            "error"
        );

        passwordInput.focus();
        return;
    }


    // ---------------------------------------------
    // DISABLE BUTTON
    // ---------------------------------------------

    loginButton.disabled = true;

    loginButton.textContent =
        "Logging in...";

    showMessage(
        "Connecting to Athiti Suraksha server...",
        "loading"
    );


    try {

        // -----------------------------------------
        // SEND LOGIN REQUEST
        // -----------------------------------------

        const response = await 
        fetch("https://athiti-suraksha-reviewed.onrender.com/api/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );


        // -----------------------------------------
        // READ SERVER RESPONSE
        // -----------------------------------------

        const text =
            await response.text();

        let data = {};

        try {

            data = text
                ? JSON.parse(text)
                : {};

        } catch (jsonError) {

            console.error(
                "Invalid server response:",
                text
            );

            throw new Error(
                "Server returned an invalid response."
            );
        }


        // -----------------------------------------
        // LOGIN SUCCESS
        // -----------------------------------------

        if (
            response.ok &&
            data.success
        ) {

            showMessage(
                "✓ Login successful! Redirecting...",
                "success"
            );


            // Save tourist information
            localStorage.setItem(
                "tourist",
                JSON.stringify(
                    data.tourist || {
                        email: email
                    }
                )
            );


            // Save login status
            localStorage.setItem(
                "isLoggedIn",
                "true"
            );


            // Save login email
            localStorage.setItem(
                "touristEmail",
                email
            );


            // -------------------------------------
            // REDIRECT TO DASHBOARD
            // -------------------------------------

            setTimeout(function () {

                window.location.href =
                    "dashboard.html";

            }, 1000);

            return;
        }


        // -----------------------------------------
        // INVALID LOGIN
        // -----------------------------------------

        showMessage(
            data.message ||
            "Invalid email or password.",
            "error"
        );


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        showMessage(
            "Unable to connect to server. Please make sure server.js is running.",
            "error"
        );

    }


    // ---------------------------------------------
    // ENABLE BUTTON AGAIN
    // ---------------------------------------------

    loginButton.disabled = false;

    loginButton.textContent =
        "Login";

});