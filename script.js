/*
==============================================================
                    LOCAL DATABASE & STATE
==============================================================
*/

const DB_KEY = "CALL_BREAK_4_PLAYER_DB_V2";

let db = {
    players: [
        "Player 1",
        "Player 2",
        "Player 3",
        "Player 4"
    ],
    rounds: [],
    gameLimit: 5,
    gameStarted: true
};

// Store current suit selection for each player in round form (default ♠)
let currentSuitSelections = ["♠", "♠", "♠", "♠"];


/*
==============================================================
                    LOAD DATABASE (WITH SAFE MIGRATION)
==============================================================
*/

function loadDB() {
    const saved = localStorage.getItem(DB_KEY);
    if (!saved) {
        return;
    }

    try {
        const parsed = JSON.parse(saved);

        if (parsed && typeof parsed === "object") {
            // Safe fallback for players (Feature 16)
            if (Array.isArray(parsed.players) && parsed.players.length === 4) {
                db.players = parsed.players.map((p, idx) => {
                    const trimmed = String(p || "").trim();
                    return trimmed || `Player ${idx + 1}`;
                });
            }

            // Safe fallback for rounds (Feature 15 & Suit support)
            if (Array.isArray(parsed.rounds)) {
                db.rounds = parsed.rounds.map((round, rIdx) => {
                    const rPlayers = (round.players || []).map((p) => {
                        const call = Number(p.call) || 0;
                        const tricks = Number(p.tricks) || 0;
                        const validSuits = ["♠", "♥", "♦", "♣"];
                        const suit = validSuits.includes(p.suit) ? p.suit : "♠";
                        const score = typeof p.score === "number" ? p.score : calculateScore(call, tricks);

                        return {
                            suit,
                            call,
                            tricks,
                            score
                        };
                    });

                    return {
                        id: round.id || (Date.now() + rIdx),
                        round: round.round || (rIdx + 1),
                        date: round.date || new Date().toLocaleString(),
                        players: rPlayers
                    };
                });
            }

            // Safe fallback for gameLimit
            if (typeof parsed.gameLimit === "number" && parsed.gameLimit > 0) {
                db.gameLimit = parsed.gameLimit;
            } else {
                db.gameLimit = db.rounds.length > 0 ? Math.max(db.rounds.length, 5) : 5;
            }

            // Safe fallback for gameStarted
            db.gameStarted = parsed.gameStarted !== undefined
                ? Boolean(parsed.gameStarted)
                : true;
        }
    } catch(error) {
        console.error("Database loading error:", error);
    }
}


/*
==============================================================
                    SAVE DATABASE
==============================================================
*/

function saveDB() {
    try {
        localStorage.setItem(
            DB_KEY,
            JSON.stringify(db)
        );
    } catch(error) {
        console.error("Database saving error:", error);
        showToast("Error saving data to local storage.", "error");
    }
}


/*
==============================================================
                    TOAST NOTIFICATIONS & CONFIRM DIALOG
==============================================================
*/

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `
        <span style="font-size:18px;">${icon}</span>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => {
            if (toast.remove) {
                toast.remove();
            } else if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3200);
}

let confirmCallback = null;

function showConfirm({ title, message, icon = "⚠️", okText = "Confirm", okClass = "danger", onConfirm }) {
    const modal = document.getElementById("confirmModal");
    document.getElementById("confirmModalTitle").textContent = title;
    document.getElementById("confirmModalMessage").textContent = message;
    document.getElementById("confirmModalIcon").textContent = icon;

    const okBtn = document.getElementById("confirmModalOkBtn");
    okBtn.textContent = okText;
    okBtn.className = okClass;

    confirmCallback = onConfirm;
    okBtn.onclick = function() {
        const action = confirmCallback;
        closeConfirmModal();
        if (typeof action === "function") {
            action();
        }
    };

    modal.style.display = "flex";
}

function closeConfirmModal() {
    document.getElementById("confirmModal").style.display = "none";
    confirmCallback = null;
}


/*
==============================================================
                    PLAYER NAMES (FEATURE 16)
==============================================================
*/

function getCurrentPlayerNames() {
    const names = [];
    for(let i = 0; i < 4; i++) {
        const inputEl = document.getElementById("player" + i);
        const val = inputEl ? inputEl.value.trim() : "";
        names.push(val || (db.players && db.players[i]) || `Player ${i + 1}`);
    }
    return names;
}

function loadPlayersToUI() {
    for(let i = 0; i < 4; i++) {
        const input = document.getElementById("player" + i);
        if (input) {
            input.value = db.players[i] || `Player ${i + 1}`;
        }
    }
}

function savePlayers() {
    for(let i = 0; i < 4; i++) {
        const value = document.getElementById("player" + i).value.trim();
        db.players[i] = value || `Player ${i + 1}`;
    }

    saveDB();
    render();
    showToast("Player names saved successfully.", "success");
}


/*
==============================================================
        NEW CALL BREAK SCORING RULE (FEATURE 15)
==============================================================

SUCCESS CONDITION:
    tricks >= bid
    AND
    tricks < bid * 2

If condition is true:
    score = bid + ((tricks - bid) / 10)

Otherwise:
    score = -bid
==============================================================
*/

function isCallSuccessful(bid, tricks) {
    const b = Number(bid);
    const t = Number(tricks);
    return t >= b && t < (b * 2);
}

function calculateScore(bid, tricks) {
    const b = Number(bid);
    const t = Number(tricks);

    if (isCallSuccessful(b, t)) {
        const extra = t - b;
        return Number((b + (extra / 10)).toFixed(1));
    }

    return -b;
}


/*
==============================================================
                    FORMAT SCORE
==============================================================
*/

function formatScore(score) {
    const num = Number(score);
    if (isNaN(num)) return "0";

    // If negative integer, return without decimals (e.g. -4, -2, -3)
    if (num < 0 && Number.isInteger(num)) {
        return num.toString();
    }

    // Otherwise show 1 decimal place (e.g. 5.3, 3.0, 3.2, 0.0)
    return num.toFixed(1);
}


/*
==============================================================
                    CREATE ROUND FORM
==============================================================
*/

function createRoundForm() {
    const form = document.getElementById("roundForm");
    if (!form) return;

    form.innerHTML = "";

    const isCompleted = Boolean(db.gameLimit && db.rounds.length >= db.gameLimit);

    for(let i = 0; i < 4; i++) {
        const card = document.createElement("div");
        card.className = "player-round";

        const currentSuit = currentSuitSelections[i] || "♠";

        card.innerHTML = `
            <h3>
                ♠ ${escapeHTML(db.players[i])}
            </h3>

            <div class="field" style="margin-bottom: 12px;">
                <label>CARD SUIT</label>
                <div class="suit-selector">
                    <button
                        type="button"
                        class="suit-btn ${currentSuit === '♠' ? 'selected' : ''}"
                        data-player="${i}"
                        data-suit="♠"
                        ${isCompleted ? 'disabled' : ''}
                        onclick="selectSuit(${i}, '♠', this)">
                        ♠
                    </button>
                    <button
                        type="button"
                        class="suit-btn ${currentSuit === '♥' ? 'selected' : ''}"
                        data-player="${i}"
                        data-suit="♥"
                        ${isCompleted ? 'disabled' : ''}
                        onclick="selectSuit(${i}, '♥', this)">
                        ♥
                    </button>
                    <button
                        type="button"
                        class="suit-btn ${currentSuit === '♦' ? 'selected' : ''}"
                        data-player="${i}"
                        data-suit="♦"
                        ${isCompleted ? 'disabled' : ''}
                        onclick="selectSuit(${i}, '♦', this)">
                        ♦
                    </button>
                    <button
                        type="button"
                        class="suit-btn ${currentSuit === '♣' ? 'selected' : ''}"
                        data-player="${i}"
                        data-suit="♣"
                        ${isCompleted ? 'disabled' : ''}
                        onclick="selectSuit(${i}, '♣', this)">
                        ♣
                    </button>
                </div>
                <input
                    type="hidden"
                    id="suit-${i}"
                    value="${currentSuit}">
            </div>

            <div class="two-col">
                <div class="field">
                    <label>CALL / BID (1 - 13)</label>
                    <input
                        id="call-${i}"
                        type="number"
                        min="1"
                        max="13"
                        placeholder="Bid (1-13)"
                        ${isCompleted ? 'disabled' : ''}
                        oninput="previewScore(${i})">
                </div>

                <div class="field">
                    <label>ACTUAL TRICKS (0 - 13)</label>
                    <input
                        id="tricks-${i}"
                        type="number"
                        min="0"
                        max="13"
                        placeholder="Tricks (0-13)"
                        ${isCompleted ? 'disabled' : ''}
                        oninput="previewScore(${i})">
                </div>
            </div>

            <div class="current-round-score" id="preview-${i}">
                Current round score: —
            </div>
        `;

        form.appendChild(card);
    }

    // Toggle form buttons based on game completion
    const saveBtn = document.getElementById("saveRoundBtn");
    const clearBtn = document.getElementById("clearRoundBtn");

    if (saveBtn) {
        saveBtn.disabled = isCompleted;
    }
    if (clearBtn) {
        clearBtn.disabled = isCompleted;
    }
}

function selectSuit(index, suit, button) {
    currentSuitSelections[index] = suit;

    const suitInput = document.getElementById(`suit-${index}`);
    if (suitInput) {
        suitInput.value = suit;
    }

    const buttons = document.querySelectorAll(`.suit-btn[data-player="${index}"]`);
    buttons.forEach(btn => btn.classList.remove("selected"));

    if (button) {
        button.classList.add("selected");
    }
}


/*
==============================================================
            LIVE SCORE PREVIEW (FEATURE 15)
==============================================================
*/

function previewScore(index) {
    const callInput = document.getElementById(`call-${index}`);
    const tricksInput = document.getElementById(`tricks-${index}`);
    const preview = document.getElementById(`preview-${index}`);

    if (!callInput || !tricksInput || !preview) return;

    const callVal = callInput.value.trim();
    const tricksVal = tricksInput.value.trim();

    if (callVal === "" || tricksVal === "") {
        preview.textContent = "Current round score: —";
        return;
    }

    const call = Number(callVal);
    const tricks = Number(tricksVal);

    if (!Number.isInteger(call) || !Number.isInteger(tricks)) {
        preview.innerHTML = '<span class="negative">Score: Invalid numbers</span>';
        return;
    }

    if (call < 1 || call > 13 || tricks < 0 || tricks > 13) {
        preview.innerHTML = '<span class="negative">Score: Out of range (Bid: 1-13, Tricks: 0-13)</span>';
        return;
    }

    const score = calculateScore(call, tricks);
    const isSuccess = isCallSuccessful(call, tricks);

    let statusNote = "";
    if (tricks >= call * 2) {
        statusNote = `<div style="color:var(--yellow); font-size:11px; margin-top:3px;">⚠ Double bid reached (${tricks} &ge; ${call * 2}) &rarr; Penalty score: -${call}</div>`;
    } else if (tricks < call) {
        statusNote = `<div style="color:var(--muted); font-size:11px; margin-top:3px;">Under-tricks (${tricks} &lt; ${call}) &rarr; Penalty score: -${call}</div>`;
    } else {
        const extra = tricks - call;
        statusNote = `<div style="color:var(--green); font-size:11px; margin-top:3px;">Bid fulfilled${extra > 0 ? ` (+${extra} overtrick${extra > 1 ? 's' : ''})` : ' (exact)'} &rarr; Score: +${formatScore(score)}</div>`;
    }

    preview.innerHTML = `
        Current round score:
        <strong class="${score >= 0 ? "positive" : "negative"}">
            ${score > 0 ? "+" : ""}${formatScore(score)}
        </strong>
        ${statusNote}
    `;
}


/*
==============================================================
                    ADD ROUND
==============================================================
*/

function addRound() {
    // Check if game is completed
    if (db.gameLimit && db.rounds.length >= db.gameLimit) {
        const leaders = getLeaderInfo().leaders;
        const isTie = leaders.length > 1;

        showToast(
            `Game completed! Maximum ${db.gameLimit} rounds are already completed.`,
            "warning"
        );

        if (isTie) {
            openExtendGameModal();
        }
        return;
    }

    const playersData = [];
    let totalTricks = 0;

    for(let i = 0; i < 4; i++) {
        const callInput = document.getElementById(`call-${i}`);
        const tricksInput = document.getElementById(`tricks-${i}`);
        const suitInput = document.getElementById(`suit-${i}`);

        const callVal = callInput ? callInput.value.trim() : "";
        const tricksVal = tricksInput ? tricksInput.value.trim() : "";

        if (callVal === "") {
            showToast(`${db.players[i]}: Please enter Call/Bid (1-13).`, "error");
            if (callInput) callInput.focus();
            return;
        }

        if (tricksVal === "") {
            showToast(`${db.players[i]}: Please enter Actual Tricks (0-13).`, "error");
            if (tricksInput) tricksInput.focus();
            return;
        }

        const call = Number(callVal);
        const tricks = Number(tricksVal);

        if (!Number.isInteger(call) || call < 1 || call > 13) {
            showToast(`${db.players[i]}: Call must be an integer between 1 and 13.`, "error");
            if (callInput) callInput.focus();
            return;
        }

        if (!Number.isInteger(tricks) || tricks < 0 || tricks > 13) {
            showToast(`${db.players[i]}: Tricks must be an integer between 0 and 13.`, "error");
            if (tricksInput) tricksInput.focus();
            return;
        }

        const suit = suitInput ? suitInput.value : (currentSuitSelections[i] || "♠");
        const score = calculateScore(call, tricks);

        totalTricks += tricks;

        playersData.push({
            suit,
            call,
            tricks,
            score
        });
    }

    // Standard Call Break round normally has 13 tricks
    if (totalTricks !== 13) {
        showConfirm({
            title: "Tricks Warning",
            message: `Total tricks entered = ${totalTricks}.\nStandard Call Break rounds normally total exactly 13 tricks.\n\nDo you still want to save this round?`,
            icon: "⚠️",
            okText: "Save Anyway",
            okClass: "warning",
            onConfirm: () => {
                commitRound(playersData);
            }
        });
        return;
    }

    commitRound(playersData);
}

function commitRound(playersData) {
    const round = {
        id: Date.now(),
        round: db.rounds.length + 1,
        date: new Date().toLocaleString(),
        players: playersData
    };

    db.rounds.push(round);
    saveDB();
    clearForm();
    render();

    showToast(`Round #${round.round} saved successfully!`, "success");

    // Check if the game just finished
    if (db.gameLimit && db.rounds.length >= db.gameLimit) {
        const info = getLeaderInfo();
        if (info.leaders.length > 1) {
            showToast("Game Completed! Players are tied for 1st place! Extend game to break the tie.", "warning");
        } else {
            showToast(`Game Completed! Winner: ${db.players[info.leaders[0]]}`, "success");
        }
    }
}


/*
==============================================================
                    CLEAR FORM
==============================================================
*/

function clearForm() {
    for(let i = 0; i < 4; i++) {
        const call = document.getElementById(`call-${i}`);
        const tricks = document.getElementById(`tricks-${i}`);
        const preview = document.getElementById(`preview-${i}`);
        const suitInput = document.getElementById(`suit-${i}`);

        if (call) call.value = "";
        if (tricks) tricks.value = "";
        if (preview) preview.textContent = "Current round score: —";

        // Reset suit selection back to ♠
        currentSuitSelections[i] = "♠";
        if (suitInput) suitInput.value = "♠";

        const suitButtons = document.querySelectorAll(`.suit-btn[data-player="${i}"]`);
        suitButtons.forEach(btn => {
            if (btn.dataset.suit === "♠") {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });
    }
}


/*
==============================================================
                    TOTAL SCORE CALCULATION
==============================================================
*/

function getTotals() {
    const totals = [0, 0, 0, 0];

    db.rounds.forEach(round => {
        round.players.forEach((player, index) => {
            totals[index] += player.score;
        });
    });

    return totals.map(score => Number(score.toFixed(1)));
}


/*
==============================================================
        PLAYER STATISTICS (WITH FEATURE 15 RULE)
==============================================================
*/

function getPlayerStats(index) {
    let totalScore = 0;
    let totalCalls = 0;
    let totalTricks = 0;
    let successful = 0;
    let failed = 0;
    let overtricks = 0;
    let bestRound = null;

    db.rounds.forEach(round => {
        const player = round.players[index];
        totalScore += player.score;
        totalCalls += player.call;
        totalTricks += player.tricks;

        if (isCallSuccessful(player.call, player.tricks)) {
            successful++;
            overtricks += (player.tricks - player.call);
        } else {
            failed++;
        }

        if (bestRound === null || player.score > bestRound.score) {
            bestRound = {
                round: round.round,
                score: player.score
            };
        }
    });

    const rounds = db.rounds.length;
    const average = rounds > 0 ? (totalScore / rounds) : 0;
    const successRate = rounds > 0 ? ((successful / rounds) * 100) : 0;
    const trickEfficiency = totalCalls > 0 ? ((totalTricks / totalCalls) * 100) : 0;

    return {
        totalScore: Number(totalScore.toFixed(1)),
        totalCalls,
        totalTricks,
        successful,
        failed,
        overtricks,
        average,
        successRate,
        trickEfficiency,
        bestRound
    };
}


/*
==============================================================
                    LEADER ANALYSIS & TIE DETECTION
==============================================================
*/

function getLeaderInfo() {
    const totals = getTotals();
    const max = Math.max(...totals);
    const leaders = [];

    totals.forEach((score, index) => {
        if (score === max) {
            leaders.push(index);
        }
    });

    return {
        score: max,
        leaders,
        totals
    };
}


/*
==============================================================
                    RENDER TOTAL SCORE
==============================================================
*/

function renderStats() {
    const totals = getTotals();
    const container = document.getElementById("statsGrid");
    if (!container) return;

    container.innerHTML = "";

    totals.forEach((score, index) => {
        const card = document.createElement("div");
        card.className = "stat";

        const cls = score > 0 ? "positive" : score < 0 ? "negative" : "neutral";

        card.innerHTML = `
            <div class="stat-name">
                ${escapeHTML(db.players[index])}
            </div>

            <div class="stat-score ${cls}">
                ${formatScore(score)}
            </div>

            <div style="margin-top:7px; color:var(--muted); font-size:11px;">
                Total Score
            </div>
        `;

        container.appendChild(card);
    });
}


/*
==============================================================
        RENDER LEADER / GAME COMPLETION / EXTENSION (FEATURE 14)
==============================================================
*/

function renderLeader() {
    const box = document.getElementById("leaderBox");
    if (!box) return;

    const isCompleted = Boolean(db.gameLimit && db.rounds.length >= db.gameLimit);

    if (db.rounds.length === 0) {
        if (db.gameLimit) {
            box.innerHTML = `
                <div class="leader-card">
                    <div class="leader-icon">🎮</div>
                    <div class="leader-status-badge">READY TO PLAY</div>
                    <div class="leader-name">Game Limit: ${db.gameLimit} Rounds</div>
                    <div class="leader-meta">
                        Enter calls, tricks, and card suits in the form below to begin.
                    </div>
                </div>
                <div style="height:20px"></div>
            `;
        } else {
            box.innerHTML = "";
        }
        return;
    }

    const info = getLeaderInfo();
    const names = info.leaders.map(index => escapeHTML(db.players[index]));
    const isTie = info.leaders.length > 1;

    // SCENARIO 1: GAME COMPLETED & TIED FOR 1ST PLACE (FEATURE 14)
    if (isCompleted && isTie) {
        box.innerHTML = `
            <div class="leader-card tie-card">
                <div class="leader-icon">⚔️</div>
                <div class="leader-status-badge">GAME COMPLETED • TIE FOR 1ST PLACE</div>
                <div class="leader-name">
                    ${names.join(" & ")}
                </div>
                <div class="leader-meta">
                    Tied at <strong style="color:white;">${formatScore(info.score)}</strong> points after completing all <strong>${db.gameLimit}</strong> rounds!
                    <br>
                    <span style="color:var(--yellow); font-weight:bold;">A tie-breaker is required! Click below to add extra round(s).</span>
                </div>
                <div class="leader-actions">
                    <button class="warning extend-action-btn" onclick="openExtendGameModal()">
                        ➕ Add Extra Rounds (Extend Game)
                    </button>
                    <button class="secondary" onclick="openNewGameModal(true)">
                        🎮 Start New Game
                    </button>
                </div>
            </div>
            <div style="height:20px"></div>
        `;
        return;
    }

    // SCENARIO 2: GAME COMPLETED WITH A CLEAR WINNER
    if (isCompleted && !isTie) {
        const secondScores = info.totals.filter((_, idx) => idx !== info.leaders[0]);
        const second = secondScores.length > 0 ? Math.max(...secondScores) : 0;
        const diff = info.score - second;

        box.innerHTML = `
            <div class="leader-card winner-card">
                <div class="leader-icon">🏆</div>
                <div class="leader-status-badge">GAME COMPLETED • FINAL WINNER</div>
                <div class="leader-name">
                    ${names[0]}
                </div>
                <div class="leader-meta">
                    Final Score: <strong style="color:white;">${formatScore(info.score)}</strong> points
                    &nbsp; • &nbsp;
                    Won by ${formatScore(diff)} point(s) in ${db.gameLimit} rounds!
                </div>
                <div class="leader-actions">
                    <button class="primary" onclick="openNewGameModal(true)">
                        🎮 Start New Game
                    </button>
                    <button class="secondary" onclick="openExtendGameModal()" title="Add more rounds if you want to keep playing">
                        ➕ Extend Game
                    </button>
                </div>
            </div>
            <div style="height:20px"></div>
        `;
        return;
    }

    // SCENARIO 3: GAME IN PROGRESS
    let differenceText = "";
    if (!isTie) {
        const leader = info.leaders[0];
        const secondScores = info.totals.filter((_, index) => index !== leader);
        const second = Math.max(...secondScores);
        const difference = info.score - second;
        differenceText = `Leading by ${formatScore(difference)} point(s)`;
    } else {
        differenceText = "Currently tied for the lead";
    }

    box.innerHTML = `
        <div class="leader-card">
            <div class="leader-icon">🏆</div>
            <div class="leader-status-badge">ROUND ${db.rounds.length} OF ${db.gameLimit || 5}</div>
            <div class="leader-name">
                ${names.join(" & ")}
            </div>
            <div class="leader-meta">
                Current Score: <strong style="color:white">${formatScore(info.score)}</strong>
                &nbsp; • &nbsp;
                ${differenceText}
            </div>
        </div>
        <div style="height:20px"></div>
    `;
}


/*
==============================================================
                    RENDER ANALYSIS
==============================================================
*/

function renderAnalysis() {
    const container = document.getElementById("analysisGrid");
    if (!container) return;

    container.innerHTML = "";

    for(let i = 0; i < 4; i++) {
        const stats = getPlayerStats(i);
        const card = document.createElement("div");
        card.className = "analysis-card";

        card.innerHTML = `
            <h3>
                ${escapeHTML(db.players[i])}
            </h3>

            <div class="analysis-row">
                <span>Total Score</span>
                <strong>
                    ${formatScore(stats.totalScore)}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Total Calls</span>
                <strong>
                    ${stats.totalCalls}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Total Tricks</span>
                <strong>
                    ${stats.totalTricks}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Successful Calls</span>
                <strong class="positive">
                    ${stats.successful}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Failed Calls</span>
                <strong class="negative">
                    ${stats.failed}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Overtricks</span>
                <strong>
                    ${stats.overtricks}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Success Rate</span>
                <strong>
                    ${stats.successRate.toFixed(1)}%
                </strong>
            </div>

            <div class="analysis-row">
                <span>Avg. Score/Round</span>
                <strong>
                    ${stats.average.toFixed(2)}
                </strong>
            </div>

            <div class="analysis-row">
                <span>Best Round</span>
                <strong>
                    ${
                        stats.bestRound
                        ? `R${stats.bestRound.round} (${formatScore(stats.bestRound.score)})`
                        : "—"
                    }
                </strong>
            </div>
        `;

        container.appendChild(card);
    }
}


/*
==============================================================
            RENDER HISTORY TABLE (SUITS & FEATURE 15)
==============================================================
*/

function renderHistory() {
    const head = document.getElementById("historyHead");
    const body = document.getElementById("historyBody");
    if (!head || !body) return;

    head.innerHTML = `
        <tr>
            <th>Round</th>
            ${db.players.map(
                name => `
                    <th>
                        ${escapeHTML(name)}
                        <br>
                        <small>
                            Suit • Call / Tricks / Score
                        </small>
                    </th>
                `
            ).join("")}
            <th>Actions</th>
        </tr>
    `;

    body.innerHTML = "";

    if (db.rounds.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    No rounds recorded yet.
                </td>
            </tr>
        `;
        return;
    }

    [...db.rounds]
        .reverse()
        .forEach(round => {
            const tr = document.createElement("tr");

            let html = `
                <td>
                    <strong>Round ${round.round}</strong>
                    <br>
                    <small style="color:var(--muted)">
                        ${escapeHTML(round.date)}
                    </small>
                </td>
            `;

            round.players.forEach(player => {
                const success = isCallSuccessful(player.call, player.tricks);
                const scoreClass = player.score >= 0 ? "score-positive" : "score-negative";
                const isRedSuit = player.suit === "♥" || player.suit === "♦";
                const isDoubleBid = player.tricks >= (player.call * 2);

                html += `
                    <td>
                        <div style="font-size:22px; color:${isRedSuit ? '#ff5577' : '#00d9ff'}; margin-bottom:4px;">
                            ${escapeHTML(player.suit || "♠")}
                        </div>

                        <div>
                            Call: <strong>${player.call}</strong>
                            &nbsp;|&nbsp;
                            Tricks: <strong>${player.tricks}</strong>
                        </div>

                        <div class="${scoreClass}" style="margin-top:5px; font-size:14px;">
                            ${player.score > 0 ? "+" : ""}${formatScore(player.score)}
                        </div>

                        <div style="margin-top:4px;">
                            <span class="badge ${success ? "badge-success" : "badge-fail"}">
                                ${success ? "SUCCESS" : isDoubleBid ? "FAILED (DOUBLE)" : "FAILED"}
                            </span>
                        </div>
                    </td>
                `;
            });

            html += `
                <td>
                    <button
                        class="danger mini-btn"
                        onclick="deleteRound(${round.id})">
                        Delete
                    </button>
                </td>
            `;

            tr.innerHTML = html;
            body.appendChild(tr);
        });
}


/*
==============================================================
                    DELETE ROUND
==============================================================
*/

function deleteRound(id) {
    const roundToDelete = db.rounds.find(r => r.id === id);
    const roundNumber = roundToDelete ? roundToDelete.round : "";

    showConfirm({
        title: "Delete Round",
        message: `Are you sure you want to delete Round ${roundNumber}? Scores and subsequent round numbers will be updated.`,
        icon: "🗑️",
        okText: "Delete",
        okClass: "danger",
        onConfirm: () => {
            db.rounds = db.rounds.filter(round => round.id !== id);

            // Re-number remaining rounds
            db.rounds.forEach((round, index) => {
                round.round = index + 1;
            });

            saveDB();
            render();
            showToast(`Round ${roundNumber} deleted.`, "info");
        }
    });
}


/*
==============================================================
            NEW GAME FLOW (FEATURE 16 & GAME RESET)
==============================================================
*/

function openNewGameModal(bypassConfirm = false) {
    const isCompleted = Boolean(db.gameLimit && db.rounds.length >= db.gameLimit);
    const isGameRunning = db.rounds && db.rounds.length > 0 && !isCompleted;

    if (!bypassConfirm && isGameRunning) {
        showConfirm({
            title: "Start New Game?",
            message: "This will clear the current game's rounds, scores and history.\n\nPlayer names will be kept.",
            icon: "🎮",
            okText: "Start New Game",
            okClass: "primary",
            onConfirm: () => {
                showNewGameDialog();
            }
        });
        return;
    }

    showNewGameDialog();
}

function showNewGameDialog() {
    const modal = document.getElementById("newGameModal");
    const limitInput = document.getElementById("gameLimitInput");
    const preview = document.getElementById("newGamePlayersPreview");

    if (limitInput) {
        limitInput.value = 5;
    }

    if (preview) {
        const names = getCurrentPlayerNames();
        preview.innerHTML = `
            <strong style="color:var(--cyan);">Preserved Players:</strong>
            <div style="color:var(--text); margin-top:4px; font-size:13px; font-weight:500;">
                ${names.map(name => `<span style="display:inline-block; margin-right:10px;">👤 ${escapeHTML(name)}</span>`).join("")}
            </div>
        `;
    }

    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            if (limitInput) {
                limitInput.focus();
                limitInput.select();
            }
        }, 50);
    }
}

function closeNewGameModal() {
    const modal = document.getElementById("newGameModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function confirmNewGame() {
    const input = document.getElementById("gameLimitInput");
    const gameLimit = Number(input ? input.value : 5);

    if (!Number.isInteger(gameLimit) || gameLimit < 1 || gameLimit > 100) {
        showToast("Please enter a valid round limit between 1 and 100.", "error");
        if (input) input.focus();
        return;
    }

    startFreshGame(gameLimit);
}

function startFreshGame(gameLimit) {
    // 1. MUST PERSIST: Player names only (Feature 16)
    const existingPlayers = getCurrentPlayerNames();

    // 2. MUST RESET COMPLETELY: Brand new database object (separate player config from game state)
    db = {
        players: [...existingPlayers],
        rounds: [],
        gameLimit: gameLimit,
        gameStarted: true
    };

    // 3. Reset temporary card suit selections back to default ♠
    currentSuitSelections = ["♠", "♠", "♠", "♠"];

    // 4. Overwrite localStorage completely with clean fresh database
    saveDB();

    // 5. Keep preserved player names visible in setup inputs
    loadPlayersToUI();

    // 6. Reset round entry form, score previews & suit buttons
    clearForm();

    // 7. Close New Game modal
    closeNewGameModal();

    // 8. Re-render the entire application from Round #1 with zero previous rounds
    render();

    // 9. Feedback toast
    showToast(`New game started! (${gameLimit} rounds). Players retained.`, "success");
}

// Single unified trigger for new game
function newGame() {
    openNewGameModal();
}

/*
==============================================================
            REFRESH / RESTART GAME (ROUND 1)
==============================================================
*/

function refreshGame(bypassConfirm = false) {
    const roundsPlayed = db.rounds ? db.rounds.length : 0;

    if (!bypassConfirm && roundsPlayed > 0) {
        showConfirm({
            title: "Restart Game from Round 1?",
            message: `Current game progress (${roundsPlayed} round${roundsPlayed > 1 ? "s" : ""} played) will be reset. The game will start fresh from Round 1.\n\nPlayer names will be preserved.`,
            icon: "🔄",
            okText: "Restart Game",
            okClass: "warning",
            onConfirm: () => {
                executeRestartGame();
            }
        });
        return;
    }

    executeRestartGame();
}

function executeRestartGame() {
    const existingPlayers = getCurrentPlayerNames();
    const currentLimit = (db && db.gameLimit) ? db.gameLimit : 5;

    db = {
        players: [...existingPlayers],
        rounds: [],
        gameLimit: currentLimit,
        gameStarted: true
    };

    currentSuitSelections = ["♠", "♠", "♠", "♠"];
    saveDB();
    loadPlayersToUI();
    clearForm();
    closeNewGameModal();
    render();

    showToast("Game refreshed! Starting from Round 1.", "success");
}


/*
==============================================================
        EXTEND GAME / ADD EXTRA ROUNDS (FEATURE 14)
==============================================================
*/

function openExtendGameModal() {
    const modal = document.getElementById("extendGameModal");
    const currentLimitSpan = document.getElementById("extendCurrentLimit");
    const completedSpan = document.getElementById("extendCompletedRounds");
    const extraInput = document.getElementById("extraRoundsInput");

    const currentLimit = db.gameLimit || db.rounds.length || 5;
    if (currentLimitSpan) currentLimitSpan.textContent = currentLimit;
    if (completedSpan) completedSpan.textContent = db.rounds.length;
    if (extraInput) extraInput.value = 2;

    updateExtendPreview();

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeExtendGameModal() {
    const modal = document.getElementById("extendGameModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function updateExtendPreview() {
    const extraInput = document.getElementById("extraRoundsInput");
    const newLimitSpan = document.getElementById("extendNewLimit");
    const currentLimit = db.gameLimit || db.rounds.length || 5;

    const extra = Number(extraInput.value) || 0;
    const newLimit = currentLimit + (extra > 0 ? extra : 0);

    if (newLimitSpan) {
        newLimitSpan.textContent = newLimit;
    }
}

function confirmExtendGame() {
    const extraInput = document.getElementById("extraRoundsInput");
    const extraRounds = Number(extraInput.value);

    if (!Number.isInteger(extraRounds) || extraRounds < 1 || extraRounds > 50) {
        showToast("Please enter extra rounds between 1 and 50.", "error");
        if (extraInput) extraInput.focus();
        return;
    }

    const oldLimit = db.gameLimit || db.rounds.length || 5;
    const newLimit = oldLimit + extraRounds;

    db.gameLimit = newLimit;
    saveDB();

    closeExtendGameModal();
    render();

    showToast(`Extra rounds added! New limit is ${newLimit} rounds.`, "success");
}

// Function alias for external triggers
function extendGame() {
    openExtendGameModal();
}


/*
==============================================================
                    EXPORT EXCEL
==============================================================
*/

function downloadExcel() {
    if (db.rounds.length === 0) {
        showToast("No game data available to export.", "warning");
        return;
    }

    const rows = [];

    db.rounds.forEach(round => {
        const row = {
            Round: round.round,
            Date: round.date
        };

        round.players.forEach((player, index) => {
            const name = db.players[index];
            row[`${name} Suit`] = player.suit || "♠";
            row[`${name} Call`] = player.call;
            row[`${name} Tricks`] = player.tricks;
            row[`${name} Score`] = formatScore(player.score);
            row[`${name} Status`] = isCallSuccessful(player.call, player.tricks) ? "SUCCESS" : "FAILED";
        });

        rows.push(row);
    });

    // Summary totals row
    const totals = getTotals();
    const summaryRow = {
        Round: "TOTAL",
        Date: `Completed ${db.rounds.length} / ${db.gameLimit || db.rounds.length} Rounds`
    };
    db.players.forEach((name, index) => {
        summaryRow[`${name} Suit`] = "—";
        summaryRow[`${name} Call`] = "—";
        summaryRow[`${name} Tricks`] = "—";
        summaryRow[`${name} Score`] = formatScore(totals[index]);
        summaryRow[`${name} Status`] = "—";
    });
    rows.push(summaryRow);

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Call Break Results"
    );

    XLSX.writeFile(
        workbook,
        "call-break-results.xlsx"
    );

    showToast("Excel exported successfully!", "success");
}


/*
==============================================================
                    EXPORT PDF
==============================================================
*/

function downloadPDF() {
    if (db.rounds.length === 0) {
        showToast("No game data available to export.", "warning");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("landscape");

        doc.setFontSize(18);
        doc.text("Call Break Game Results", 14, 15);

        doc.setFontSize(10);
        doc.text(
            `Rounds: ${db.rounds.length} / ${db.gameLimit || db.rounds.length}   |   Date: ${new Date().toLocaleDateString()}`,
            14,
            22
        );

        const tableData = db.rounds.map(round => {
            return [
                `R${round.round}`,
                ...round.players.flatMap(player => [
                    player.suit || "♠",
                    player.call,
                    player.tricks,
                    formatScore(player.score)
                ])
            ];
        });

        // Totals row
        const totals = getTotals();
        tableData.push([
            "TOTAL",
            ...totals.flatMap(score => ["—", "—", "—", formatScore(score)])
        ]);

        const headers = ["Round"];
        db.players.forEach(name => {
            headers.push(
                `${name} Suit`,
                `${name} Call`,
                `${name} Tricks`,
                `${name} Score`
            );
        });

        doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 28,
            styles: {
                fontSize: 8,
                halign: "center"
            },
            headStyles: {
                fillColor: [13, 27, 42]
            }
        });

        doc.save("call-break-results.pdf");
        showToast("PDF report exported successfully!", "success");
    } catch(err) {
        console.error("PDF export error:", err);
        showToast("Failed to generate PDF.", "error");
    }
}


/*
==============================================================
                    EXPORT / IMPORT JSON BACKUP
==============================================================
*/

function exportData() {
    const data = JSON.stringify(db, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "call-break-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast("Database backup exported successfully.", "success");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            if (!imported || typeof imported !== "object") {
                throw new Error("Invalid format");
            }

            if (!Array.isArray(imported.players) || imported.players.length !== 4) {
                throw new Error("Invalid player data");
            }

            if (!Array.isArray(imported.rounds)) {
                throw new Error("Invalid rounds data");
            }

            db = {
                players: imported.players.map((p, idx) => String(p || `Player ${idx + 1}`).trim() || `Player ${idx + 1}`),
                rounds: imported.rounds.map((r, rIdx) => ({
                    id: r.id || (Date.now() + rIdx),
                    round: r.round || (rIdx + 1),
                    date: r.date || new Date().toLocaleString(),
                    players: (r.players || []).map(p => ({
                        suit: ["♠", "♥", "♦", "♣"].includes(p.suit) ? p.suit : "♠",
                        call: Number(p.call) || 0,
                        tricks: Number(p.tricks) || 0,
                        score: typeof p.score === "number" ? p.score : calculateScore(p.call || 0, p.tricks || 0)
                    }))
                })),
                gameLimit: typeof imported.gameLimit === "number" && imported.gameLimit > 0 ? imported.gameLimit : 5,
                gameStarted: imported.gameStarted !== undefined ? Boolean(imported.gameStarted) : true
            };

            saveDB();
            loadPlayersToUI();
            render();

            showToast("Backup imported successfully.", "success");
        } catch(error) {
            console.error("Import error:", error);
            showToast("Invalid Call Break backup file.", "error");
        }
    };

    reader.readAsText(file);
    event.target.value = "";
}


/*
==============================================================
                    HTML ESCAPE
==============================================================
*/

function escapeHTML(value) {
    return String(value)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}


/*
==============================================================
                    RENDER APPLICATION
==============================================================
*/

function render() {
    createRoundForm();
    renderLeader();
    renderStats();
    renderAnalysis();
    renderHistory();

    const isCompleted = Boolean(db.gameLimit && db.rounds.length >= db.gameLimit);

    // Update Round Number Heading in Add Round card
    const roundNumberEl = document.getElementById("roundNumber");
    if (roundNumberEl) {
        if (isCompleted) {
            roundNumberEl.textContent = "— GAME COMPLETED";
            roundNumberEl.style.color = "var(--yellow)";
        } else {
            roundNumberEl.textContent = `#${db.rounds.length + 1}`;
            roundNumberEl.style.color = "var(--cyan)";
        }
    }

    // Update Round Counter Badge
    const counterBadge = document.getElementById("roundCounterBadge");
    if (counterBadge) {
        if (isCompleted) {
            counterBadge.textContent = `Game Completed — ${db.rounds.length} / ${db.gameLimit}`;
            counterBadge.style.background = "rgba(255,200,87,.15)";
            counterBadge.style.color = "var(--yellow)";
            counterBadge.style.borderColor = "rgba(255,200,87,.35)";
        } else {
            counterBadge.textContent = `Round ${db.rounds.length} / ${db.gameLimit || 5}`;
            counterBadge.style.background = "rgba(0,217,255,.12)";
            counterBadge.style.color = "var(--cyan)";
            counterBadge.style.borderColor = "rgba(0,217,255,.25)";
        }
    }

    // Update History Round Count
    const roundCountEl = document.getElementById("roundCount");
    if (roundCountEl) {
        if (isCompleted) {
            roundCountEl.textContent = `${db.rounds.length} / ${db.gameLimit} Rounds (Completed)`;
        } else if (db.rounds.length === 0) {
            roundCountEl.textContent = "0 Round(s)";
        } else {
            roundCountEl.textContent = `${db.rounds.length} / ${db.gameLimit || 5} Round(s)`;
        }
    }

    // Update Completion Banner inside Add Round card
    const banner = document.getElementById("completionBanner");
    if (banner) {
        if (isCompleted) {
            const info = getLeaderInfo();
            const isTie = info.leaders.length > 1;

            if (isTie) {
                const names = info.leaders.map(idx => escapeHTML(db.players[idx])).join(" & ");
                banner.className = "completion-banner tie-banner";
                banner.innerHTML = `
                    <span>⚔️ <strong>Game Completed:</strong> ${names} tied for 1st place! Extend game to break the tie.</span>
                    <button class="warning mini-btn" onclick="openExtendGameModal()">➕ Add Extra Rounds</button>
                `;
            } else {
                const winner = escapeHTML(db.players[info.leaders[0]]);
                banner.className = "completion-banner";
                banner.innerHTML = `
                    <span>🏆 <strong>Game Completed:</strong> All ${db.gameLimit} rounds completed. Winner: <strong>${winner}</strong>.</span>
                    <button class="secondary mini-btn" onclick="openExtendGameModal()">➕ Extend Game</button>
                `;
            }
            banner.style.display = "flex";
        } else {
            banner.style.display = "none";
            banner.innerHTML = "";
        }
    }
}


/*
==============================================================
                    INITIALIZE ON LOAD
==============================================================
*/

loadDB();
loadPlayersToUI();
render();


/*
==============================================================
   DYNAMIC BACKGROUND THEME SYSTEM (PURE UI EXTENSION)
==============================================================
*/

const BG_STORAGE_KEY = "CALL_BREAK_CUSTOM_BG_V1";

function initBackgroundSystem() {
    try {
        const saved = localStorage.getItem(BG_STORAGE_KEY);
        if (saved) {
            applyBackground(saved);
            // Highlight active preset if matches
            if (saved === "bg.jpg") {
                highlightActivePreset("presetClassic");
            } else if (saved === "bg_bright.jpg") {
                highlightActivePreset("presetBright");
            } else if (saved === "bg_neon.jpg") {
                highlightActivePreset("presetNeon");
            }
        }
    } catch(e) {
        console.warn("Background system init:", e);
    }
}

function highlightActivePreset(presetId) {
    document.querySelectorAll(".bg-preset-card").forEach(c => c.classList.remove("active"));
    const el = document.getElementById(presetId);
    if (el) el.classList.add("active");
}

function applyBackground(bgValue) {
    const formatted = bgValue.startsWith("url(") || bgValue.startsWith("data:") ? (bgValue.startsWith("url(") ? bgValue : `url('${bgValue}')`) : `url('${bgValue}')`;
    const bgLayer = document.getElementById("bgLayer");
    if (bgLayer) {
        bgLayer.style.backgroundImage = formatted;
    }
    document.documentElement.style.setProperty("--active-bg-image", formatted);
}

function openBgModal() {
    const modal = document.getElementById("bgModal");
    if (modal) modal.style.display = "flex";
}

function closeBgModal() {
    const modal = document.getElementById("bgModal");
    if (modal) modal.style.display = "none";
}

function setPresetBg(url, presetId) {
    applyBackground(url);
    try {
        localStorage.setItem(BG_STORAGE_KEY, url);
    } catch(e) {}

    highlightActivePreset(presetId);
    showToast("Background theme updated!", "success");
}

function handleCustomBgUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select a valid image file.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const result = e.target.result;
        applyBackground(result);
        try {
            localStorage.setItem(BG_STORAGE_KEY, result);
        } catch(err) {
            console.warn("Could not save custom background to localStorage (quota exceeded):", err);
        }
        document.querySelectorAll(".bg-preset-card").forEach(c => c.classList.remove("active"));
        showToast("Custom background applied successfully!", "success");
    };
    reader.readAsDataURL(file);
}

function resetBgDefault() {
    applyBackground("bg.jpg");
    try {
        localStorage.removeItem(BG_STORAGE_KEY);
    } catch(e) {}
    highlightActivePreset("presetClassic");
    showToast("Background reset to default!", "info");
}

initBackgroundSystem();
