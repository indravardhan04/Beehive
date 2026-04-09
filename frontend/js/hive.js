// backendUrl is defined in js/config.js (loaded first in HTML)
// DOM refs — populated after DOMContentLoaded
let feedContainer, threadModal, createThreadBtn, closeThreadModal, createThreadForm, threadMessage;
let trendingList, sidebarRepText, sidebarRepFill;

// Decode current user's beeId from JWT for ownership checks
let currentBeeId = null;
try {
    const _t = localStorage.getItem("token");
    if (_t) currentBeeId = JSON.parse(atob(_t.split('.')[1])).beeId || null;
} catch (e) {}

// Helper for relative time
function timeAgo(dateString) {
    const time = new Date(dateString).getTime();
    const now = Date.now();
    const diff = (now - time) / 1000;

    if (diff < 60) return "JUST NOW";
    if (diff < 3600) return Math.floor(diff / 60) + "M AGO";
    if (diff < 86400) return Math.floor(diff / 3600) + "H AGO";
    return Math.floor(diff / 86400) + "D AGO";
}

// Ensure user is authenticated
function checkAuth() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "login.html";
        return null;
    }
    return token;
}

// Display Session Expired elegantly
function handleAuthError(res) {
    if (res.status === 401 || res.status === 403) {
        alert("Session Expired. The Hive forces re-authentication for security."); // Fallback
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return true;
    }
    return false;
}

// Fetch Identity Stats (Reputation) for Sidebar
async function fetchSidebarReputation() {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (handleAuthError(res)) return;

        const data = await res.json();
        const level = Math.floor(data.totalUpvotes / 5) + 1;
        sidebarRepText.textContent = `Level ${level} • ${data.totalUpvotes} XP`;
        
        // Cap visual fill at 100%
        const fillPercent = Math.min((data.totalUpvotes / (level * 5)) * 100, 100);
        sidebarRepFill.style.width = `${fillPercent}%`;
    } catch(e) {
        console.error("Reputation failed to load", e);
    }
}

// Fetch Trending Topics
async function fetchTrendingTopics() {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/trending`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (handleAuthError(res)) return;

        const tags = await res.json();
        
        if (tags.length === 0) {
            trendingList.innerHTML = `<li style="color:#9ca3af; font-size:12px;">No active trends</li>`;
            return;
        }

        trendingList.innerHTML = tags.map(t => 
            `<li><span class="trend-hashtag">#${t.tag}</span> <span class="trend-count">${t.count}</span></li>`
        ).join("");
    } catch(e) {
        console.error("Trending failed to load", e);
    }
}

// Track active filter
let activeFilter = 'LATEST';

// Fetch Threads from API
async function fetchFeed(filter = 'LATEST') {
    activeFilter = filter;
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads?filter=${filter}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        const data = await res.json();
        renderFeed(data);
    } catch (err) {
        console.error("Failed to fetch feed", err);
        feedContainer.innerHTML = `<div class="loading-state">Connection to collective intel failed.</div>`;
    }
}

// Global Search
async function fetchSearch(query) {
    const token = checkAuth();
    if (!token) return;

    feedContainer.innerHTML = `<div class="loading-state">Scanning the hive for "${query}"...</div>`;

    try {
        const res = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        const data = await res.json();

        if (data.length === 0) {
            feedContainer.innerHTML = `<div class="loading-state">No intel found for "${query}". Try a different query.</div>`;
            return;
        }

        renderFeed(data);
    } catch (err) {
        console.error("Search failed", err);
        feedContainer.innerHTML = `<div class="loading-state">Search signal lost. Try again.</div>`;
    }
}

// Save / Unsave a Thread
async function saveThread(threadId, btn) {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}/save`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        if (res.ok) {
            const data = await res.json();
            const isSaved = data.message === "Thread saved.";
            btn.textContent = isSaved ? "🔖 SAVED" : "🔖 SAVE";
            btn.style.color = isSaved ? "var(--primary)" : "";
        }
    } catch (err) {
        console.error("Save failed", err);
    }
}

// Render Thread Cards into DOM
function renderFeed(threads) {
    feedContainer.innerHTML = "";

    if (threads.length === 0) {
        feedContainer.innerHTML = `<div class="loading-state">The Hive is silent. Broadcast intelligence to start a thread.</div>`;
        return;
    }

    threads.forEach(t => {
        const article = document.createElement("article");
        article.className = "thread-card";
        article.id = `thread-${t.id}`;
        
        article.innerHTML = `
            <div class="thread-votes">
                <button class="vote-btn up" onclick="vote('${t.id}', 'UP')">▲</button>
                <span class="vote-count">${t.votes}</span>
                <button class="vote-btn down" onclick="vote('${t.id}', 'DOWN')">▼</button>
            </div>
            <div class="thread-content" style="width:100%;">
                <div class="thread-meta">
                    <span class="thread-tag">${t.tag ? t.tag.toUpperCase() : 'GENERAL'}</span>
                    <a href="profile.html?id=${t.author}" class="thread-author" style="text-decoration:none;">${t.author || 'UNKNOWN'}</a>
                    <span class="thread-time">${timeAgo(t.createdAt)}</span>
                </div>
                <h3 class="thread-title">${t.title}</h3>
                <p class="thread-preview">${t.content}</p>
                <div class="thread-actions">
                    <button class="action-btn" id="replyBtn-${t.id}" onclick="toggleCommentSection('${t.id}')">💬 <span id="replyCount-${t.id}">${t.commentCount}</span> REPLIES</button>
                    <button class="action-btn" id="saveBtn-${t.id}" onclick="saveThread('${t.id}', this)">🔖 SAVE</button>
                    ${t.author === currentBeeId ? `<button class="action-btn" style="color:#ef4444;" onclick="deleteThread('${t.id}')">🗑 DELETE</button>` : ''}
                </div>
                
                <!-- Inline Comment Section (Hidden by Default) -->
                <div class="comments-section" id="comments-${t.id}" style="display:none; margin-top:20px; border-top:1px solid rgba(255,255,255,0.05); padding-top:15px;">
                    <div class="comments-list" id="commentList-${t.id}" style="margin-bottom:15px; font-size:13px; color:#94a3b8;">
                        Loading chatter...
                    </div>
                    <form onsubmit="submitComment(event, '${t.id}')" style="display:flex; gap:10px; width:100%;">
                        <input type="text" id="commentInput-${t.id}" placeholder="Add to the collective..." required style="flex:1; background:#111; color:#fff; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:6px; outline:none;">
                        <button type="submit" style="background:var(--primary); color:#000; font-weight:bold; border:none; padding:0 15px; border-radius:6px; cursor:pointer;">REPLY</button>
                    </form>
                </div>
            </div>
        `;
        feedContainer.appendChild(article);
    });
}

// Fetch Comments for Inline Expansion
async function toggleCommentSection(threadId) {
    const section = document.getElementById(`comments-${threadId}`);
    if (section.style.display === "block") {
        section.style.display = "none";
        return;
    }
    
    // Open section
    section.style.display = "block";
    const commentsList = document.getElementById(`commentList-${threadId}`);

    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}/comments`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (handleAuthError(res)) return;
        
        const comments = await res.json();
        
        if (comments.length === 0) {
            commentsList.innerHTML = "No replies yet. Be the first.";
            return;
        }

        commentsList.innerHTML = comments.map(c => `
            <div style="margin-bottom:10px;">
                <span style="color:var(--primary); font-weight:bold; margin-right:5px;">${c.author}</span> 
                <span style="color:#f1f1f1;">${c.content}</span>
                <div style="font-size:10px; margin-top:3px; opacity:0.6;">${timeAgo(c.createdAt)}</div>
            </div>
        `).join("");
        
    } catch(err) {
        commentsList.innerHTML = "Error rendering comments.";
    }
}

// Submit a new Comment inline
async function submitComment(e, threadId) {
    e.preventDefault();
    const token = checkAuth();
    if (!token) return;

    const inputField = document.getElementById(`commentInput-${threadId}`);
    const content = inputField.value;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
        
        if (res.ok) {
            inputField.value = "";

            // --- Realtime counter: increment DOM instantly ---
            const countEl = document.getElementById(`replyCount-${threadId}`);
            if (countEl) {
                const current = parseInt(countEl.textContent, 10);
                countEl.textContent = isNaN(current) ? 1 : current + 1;
            }

            // Refresh comment list in-place without closing the section
            const commentsList = document.getElementById(`commentList-${threadId}`);
            if (commentsList) {
                commentsList.innerHTML = "Syncing...";
                const commentsRes = await fetch(`${backendUrl}/api/threads/${threadId}/comments`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (commentsRes.ok) {
                    const comments = await commentsRes.json();
                    commentsList.innerHTML = comments.length === 0
                        ? "No replies yet. Be the first."
                        : comments.map(c => `
                            <div style="margin-bottom:10px;">
                                <span style="color:var(--primary); font-weight:bold; margin-right:5px;">${c.author}</span>
                                <span style="color:#f1f1f1;">${c.content}</span>
                                <div style="font-size:10px; margin-top:3px; opacity:0.6;">${timeAgo(c.createdAt)}</div>
                            </div>
                        `).join("");
                }
            }

            fetchSidebarReputation();
        }
    } catch(err) {
        console.error("Comment submission failed", err);
    }
}


// Delete a Thread (owner only)
async function deleteThread(threadId) {
    if (!confirm("Permanently delete this transmission? This cannot be undone.")) return;
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (handleAuthError(res)) return;

        if (res.ok) {
            // Animate removal
            const card = document.getElementById(`thread-${threadId}`);
            if (card) {
                card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                card.style.opacity = "0";
                card.style.transform = "translateX(-10px)";
                setTimeout(() => card.remove(), 300);
            }
            fetchSidebarReputation();
            fetchTrendingTopics();
        } else {
            const data = await res.json();
            alert(data.message || "Failed to delete thread.");
        }
    } catch (err) {
        console.error("Delete failed", err);
    }
}

// Voting Mechanism
async function vote(threadId, type) {
    const token = checkAuth();
    if (!token) return;

    try {
        const res = await fetch(`${backendUrl}/api/threads/${threadId}/vote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ voteType: type })
        });
        if (handleAuthError(res)) return;

        if (res.ok) {
            fetchFeed();
            fetchSidebarReputation();
        }
    } catch (err) {
        console.error("Vote failed", err);
    }
}


// Initial Bootup
document.addEventListener("DOMContentLoaded", () => {
    // Bind DOM refs
    feedContainer    = document.getElementById("feedContainer");
    threadModal      = document.getElementById("threadModal");
    createThreadBtn  = document.querySelector(".create-thread");
    closeThreadModal = document.getElementById("closeThreadModal");
    createThreadForm = document.getElementById("createThreadForm");
    threadMessage    = document.getElementById("threadMessage");
    trendingList     = document.getElementById("trendingList");
    sidebarRepText   = document.getElementById("sidebarRepText");
    sidebarRepFill   = document.getElementById("sidebarRepFill");

    // Modal bindings (safe now that DOM refs exist)
    createThreadBtn.addEventListener("click", () => {
        threadModal.style.display = "flex";
        threadMessage.style.display = "none";
    });
    closeThreadModal.addEventListener("click", () => {
        threadModal.style.display = "none";
    });

    // Wire Create Thread form
    createThreadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = checkAuth();
        if (!token) return;

        const title   = document.getElementById("threadTitle").value;
        const content = document.getElementById("threadContent").value;
        const tag     = document.getElementById("threadTag").value;

        const btn = createThreadForm.querySelector("button[type=submit]");
        btn.textContent = "TRANSMITTING...";
        btn.disabled = true;

        try {
            const res = await fetch(`${backendUrl}/api/threads`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ title, content, tag })
            });
            if (handleAuthError(res)) return;
            if (res.ok) {
                createThreadForm.reset();
                threadModal.style.display = "none";
                fetchFeed(activeFilter);
                fetchSidebarReputation();
                fetchTrendingTopics();
            } else {
                const data = await res.json();
                threadMessage.textContent = data.message || "Failed to broadcast.";
                threadMessage.style.display = "block";
            }
        } catch (err) {
            threadMessage.textContent = "Network error. Try again.";
            threadMessage.style.display = "block";
        } finally {
            btn.textContent = "TRANSMIT";
            btn.disabled = false;
        }
    });

    // Populate Bee ID in navbar from JWT
    const token = localStorage.getItem("token");
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const navBeeId = document.getElementById("navBeeId");
            if (navBeeId && payload.beeId) navBeeId.textContent = payload.beeId;
        } catch (e) {
            console.warn("Could not decode JWT for navbar", e);
        }
    }

    // Set Feed nav item as active
    document.getElementById("filterFeedBtn")?.classList.add("active");

    // Initial data fetch
    fetchFeed();
    fetchSidebarReputation();
    fetchTrendingTopics();

    // --- Wire up Feed Filter Pills ---
    document.querySelectorAll(".filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            const filter = pill.dataset.filter || pill.textContent.trim();
            fetchFeed(filter);
        });
    });

    // --- Wire up Search Bar ---
    const searchInput = document.querySelector(".nav-search input");
    if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && searchInput.value.trim()) {
                document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
                fetchSearch(searchInput.value.trim());
            }
        });
    }
});
