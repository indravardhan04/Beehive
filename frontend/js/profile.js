// backendUrl is defined in js/config.js (loaded first in HTML)
const profileId = document.getElementById("profileId");
const profileLevel = document.getElementById("profileLevel");
const profileThreads = document.getElementById("profileThreads");
const profileUpvotes = document.getElementById("profileUpvotes");
const profileFeedContainer = document.getElementById("profileFeedContainer");

// Auth Check Helper
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return null;
    }
    return token;
}

// Redirect on expired Session
function handleAuthError(res) {
    if (res.status === 401 || res.status === 403) {
        alert("Session Expired. The Hive forces re-authentication for security.");
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return true;
    }
    return false;
}

// Time Format Helper
function timeAgo(dateString) {
    const time = new Date(dateString).getTime();
    const now = Date.now();
    const diff = (now - time) / 1000;
    if (diff < 60) return "JUST NOW";
    if (diff < 3600) return Math.floor(diff / 60) + "M AGO";
    if (diff < 86400) return Math.floor(diff / 3600) + "H AGO";
    return Math.floor(diff / 86400) + "D AGO";
}

// Fetch Identity Stats
async function fetchProfileStats() {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        const data = await res.json();
        
        // Render Stats
        profileId.textContent = data.beeId;
        profileThreads.textContent = data.totalThreads;
        profileUpvotes.textContent = data.totalUpvotes;
        
        // Calculate Level (1 Level per 5 Upvotes hypothetically)
        const level = Math.floor(data.totalUpvotes / 5) + 1;
        profileLevel.textContent = level;

        // Automatically trigger History fetch
        fetchHistoricalFeed(data.beeId);
        
    } catch (err) {
        console.error("Failed to fetch profile settings", err);
    }
}

// Cycle Avatar Emojis on click
const AVATARS = ['🐝','🐛','🦋','🐞','🦊','🐼','🦁','🐯','🐧','🦅','🦉','🐙'];
async function cycleAvatar() {
    const avatarEl = document.getElementById('avatarDisplay');
    const current = avatarEl.textContent;
    const idx = AVATARS.indexOf(current);
    const next = AVATARS[(idx + 1) % AVATARS.length];
    avatarEl.textContent = next;

    // Persist to backend
    const token = checkAuth();
    if (!token) return;
    try {
        await fetch(`${backendUrl}/api/profile/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatar: next })
        });
    } catch (err) {
        console.error('Avatar save failed', err);
    }
}

// Fetch Private Transmission History
async function fetchHistoricalFeed(beeId) {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/profile/${beeId}/threads`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        const threads = await res.json();
        renderProfileFeed(threads);
    } catch (err) {
        console.error("Failed to fetch historical feed", err);
        profileFeedContainer.innerHTML = `<div class="loading-state">Connection to archives failed.</div>`;
    }
}

function renderProfileFeed(threads) {
    profileFeedContainer.innerHTML = "";

    if (threads.length === 0) {
        profileFeedContainer.innerHTML = `<div class="loading-state">No historical transmissions found for this Bee.</div>`;
        return;
    }

    threads.forEach(t => {
        const article = document.createElement("article");
        article.className = "thread-card";
        article.innerHTML = `
            <div class="thread-votes">
                <span class="vote-count" style="color:var(--primary); font-size:16px;">${t.votes}</span>
                <span style="font-size:9px; color:var(--text-muted); font-weight:bold;">XP</span>
            </div>
            <div class="thread-content">
                <div class="thread-meta">
                    <span class="thread-tag">${t.tag || 'GENERAL'}</span>
                    <span class="thread-time">${timeAgo(t.createdAt)}</span>
                </div>
                <h3 class="thread-title">${t.title}</h3>
                <p class="thread-preview">${t.content}</p>
                <div class="thread-actions">
                    <span class="action-btn" style="cursor:default;">💬 ${t.commentCount} REPLIES</span>
                    <button class="action-btn" style="color:#ef4444;" onclick="deleteThread('${t.id}', this.closest('article'))">🗑 DELETE</button>
                </div>
            </div>
        `;
        profileFeedContainer.appendChild(article);
    });
}

// Profile Navigation & Tabs
async function switchTab(tabName) {
    document.querySelectorAll(".profile-nav-item").forEach(btn => btn.classList.remove("active"));
    
    if (tabName === 'threads') {
        document.querySelector(".profile-nav-item:nth-child(1)").classList.add("active");
        document.getElementById("activeTabTitle").textContent = "My Transmissions";
        fetchHistoricalFeed(profileId.textContent);
    } else if (tabName === 'saved') {
        document.querySelector(".profile-nav-item:nth-child(2)").classList.add("active");
        document.getElementById("activeTabTitle").textContent = "Saved Intel";
        fetchSavedFeed();
    }
}

// Delete thread (from profile page — always owner's own threads)
async function deleteThread(threadId, cardEl) {
    if (!confirm("Permanently delete this transmission? This cannot be undone.")) return;
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            alert("Session expired. Please log in again.");
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        if (res.ok && cardEl) {
            cardEl.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            cardEl.style.opacity = "0";
            cardEl.style.transform = "translateX(-10px)";
            setTimeout(() => cardEl.remove(), 300);
            const countEl = document.getElementById("profileThreads");
            if (countEl) countEl.textContent = Math.max(0, parseInt(countEl.textContent, 10) - 1);
        } else {
            const data = await res.json();
            alert(data.message || "Failed to delete.");
        }
    } catch (err) {
        console.error("Delete failed", err);
    }
}


async function fetchSavedFeed() {
    const token = checkAuth();
    if (!token) return;

    profileFeedContainer.innerHTML = `<div class="loading-state">Decrypting saved archives...</div>`;
    
    try {
        const res = await fetch(`${backendUrl}/api/profile/saved`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        const threads = await res.json();
        renderProfileFeed(threads);
    } catch (err) {
        console.error("Failed to fetch saved feed", err);
        profileFeedContainer.innerHTML = `<div class="loading-state">Connection to archives failed.</div>`;
    }
}

// Settings Modal
function openSettings() {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) settingsModal.style.display = "flex";
}

function closeSettings() {
    const settingsModal = document.getElementById("settingsModal");
    if (settingsModal) settingsModal.style.display = "none";
}

// Wire Settings Form → change-password endpoint
document.addEventListener("DOMContentLoaded", () => {
    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = checkAuth();
            if (!token) return;

            const oldPassword = document.getElementById("oldPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const msgEl = document.getElementById("settingsMessage");

            try {
                const res = await fetch(`${backendUrl}/api/auth/change-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ oldPassword, newPassword })
                });

                const data = await res.json();
                msgEl.style.display = "block";
                if (res.ok) {
                    msgEl.style.color = "#10b981";
                    msgEl.textContent = "✓ " + data.message;
                    settingsForm.reset();
                    setTimeout(closeSettings, 2000);
                } else {
                    msgEl.style.color = "#ef4444";
                    msgEl.textContent = "✗ " + data.message;
                }
            } catch (err) {
                msgEl.style.display = "block";
                msgEl.style.color = "#ef4444";
                msgEl.textContent = "✗ Network error. Try again.";
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // If we wanted public profiles we'd read URL Params, e.g. ?id=B-4567. 
    // Right now, fetching the personal profile dashboard by default.
    const urlParams = new URLSearchParams(window.location.search);
    const publicBeeId = urlParams.get('id');

    if (publicBeeId) {
        // Just fetch public history
        profileId.textContent = publicBeeId;
        
        // Hide private controls
        document.getElementById("sidebarControls").style.display = "none";
        
        fetchHistoricalFeed(publicBeeId);
    } else {
        // Fetch private full auth profile
        fetchProfileStats();
    }
});
