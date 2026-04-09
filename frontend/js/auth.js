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
    
    const authMessage = document.getElementById("authMessage");
    authMessage.style.display = "none";

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

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;
    const authMessage = document.getElementById("authMessage");
    
    const showMessage = (msg, type) => {
        authMessage.textContent = msg;
        authMessage.className = `auth-message ${type}`;
        authMessage.style.display = "block";
    };

    authMessage.style.display = "none";

    if (isRegisterMode && password !== confirmPassword) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    // backendUrl from js/config.js
    const endpoint = isRegisterMode ? `${backendUrl}/api/auth/register` : `${backendUrl}/api/auth/login`;
    
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Processing...";
    submitBtn.disabled = true;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            showMessage(data.message || "Success!", "success");
            if (!isRegisterMode) {
                localStorage.setItem("token", data.token);
                setTimeout(() => window.location.href = "hive.html", 1000);
            } else {
                setTimeout(() => toggleAuth(), 1500);
            }
        } else {
            showMessage(data.message || "Something went wrong.", "error");
        }

    } catch (err) {
        showMessage("Server error. Please try again later.", "error");
    } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

