const authContainer = document.getElementById("authContainer");
const toggleBtn = document.querySelector(".switch-btn");
const formTitle = document.getElementById("formTitle");
const creativeTitle = document.getElementById("creativeTitle");
const creativeText = document.getElementById("creativeText");
const authForm = document.getElementById("authForm");
const submitBtn = authForm.querySelector("button");

let isRegisterMode = false;

function toggleAuth() {
    isRegisterMode = !isRegisterMode;
    authContainer.classList.toggle("active");

    if (isRegisterMode) {
        formTitle.textContent = "Register";
        creativeTitle.textContent = "Become a Bee.";
        creativeText.textContent = "Join the collective and amplify your anonymous voice.";
        submitBtn.textContent = "Join Hive";
        toggleBtn.textContent = "Already a Bee?";
    } else {
        formTitle.textContent = "Login";
        creativeTitle.textContent = "Welcome Back, Bee.";
        creativeText.textContent = "Re-enter the hive and sync with the collective intelligence.";
        submitBtn.textContent = "Access Hive";
        toggleBtn.textContent = "Become a Bee";
    }
}

authForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (isRegisterMode && password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const endpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            if (!isRegisterMode) {
                localStorage.setItem("token", data.token);
                window.location.href = "dashboard.html";
            } else {
                toggleAuth();
            }
        } else {
            alert(data.message || "Something went wrong.");
        }

    } catch (err) {
        alert("Server error.");
    }
});
