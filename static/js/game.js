// ── State ─────────────────────────────────────────────────────────────────────
let gameState = { active: false, maxAttempts: 0, attempts: 0, difficulty: "medium" };
let selectedDiff = "medium";

// ── DOM References ─────────────────────────────────────────────────────────────
const setupPanel    = document.getElementById("setup-panel");
const gamePanel     = document.getElementById("game-panel");
const startBtn      = document.getElementById("start-btn");
const guessBtn      = document.getElementById("guess-btn");
const guessInput    = document.getElementById("guess-input");
const hintBtn       = document.getElementById("hint-btn");
const hintBox       = document.getElementById("hint-box");
const feedback      = document.getElementById("feedback");
const historyList   = document.getElementById("history-list");
const attemptDots   = document.getElementById("attempt-dots");
const attCount      = document.getElementById("attempts-count");
const resultOverlay = document.getElementById("result-overlay");
const resultIcon    = document.getElementById("result-icon");
const resultTitle   = document.getElementById("result-title");
const resultDetail  = document.getElementById("result-detail");
const playAgainBtn  = document.getElementById("play-again-btn");

// ── Difficulty Picker ──────────────────────────────────────────────────────────
document.querySelectorAll(".diff-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDiff = btn.dataset.diff;
  });
});

// ── Start Game ─────────────────────────────────────────────────────────────────
startBtn.addEventListener("click", async () => {
  const player = document.getElementById("player-name").value.trim() || "Player";
  startBtn.textContent = "▶ INITIALIZING...";
  startBtn.disabled = true;

  try {
    const res = await fetch("/api/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: selectedDiff, player })
    });
    const data = await res.json();

    gameState = {
      active: true,
      maxAttempts: data.max_attempts,
      attempts: 0,
      difficulty: data.difficulty,
      player: data.player,
      min: data.min,
      max: data.max
    };

    document.getElementById("info-player").textContent = `👤 ${data.player}`;
    document.getElementById("info-diff").textContent   = `⚡ ${data.difficulty.toUpperCase()}`;
    document.getElementById("info-range").textContent  = `🎯 ${data.min}–${data.max}`;

    buildDots(data.max_attempts);
    attCount.textContent = `0 / ${data.max_attempts}`;

    feedback.textContent = "";
    feedback.className = "feedback-box";
    historyList.innerHTML = "";
    hintBox.classList.add("hidden");
    resultOverlay.classList.add("hidden");

    setupPanel.classList.add("hidden");
    gamePanel.classList.remove("hidden");
    guessInput.focus();
    guessInput.min = data.min;
    guessInput.max = data.max;

  } catch (e) {
    alert("Failed to start game. Make sure Flask server is running.");
  }

  startBtn.textContent = "▶ START GAME";
  startBtn.disabled = false;
});

// ── Build Attempt Dots ─────────────────────────────────────────────────────────
function buildDots(max) {
  attemptDots.innerHTML = "";
  for (let i = 0; i < max; i++) {
    const d = document.createElement("div");
    d.className = "attempt-dot";
    d.id = `dot-${i}`;
    attemptDots.appendChild(d);
  }
}

function markDot(index, type) {
  const d = document.getElementById(`dot-${index}`);
  if (d) d.classList.add(type);
}

// ── Submit Guess ───────────────────────────────────────────────────────────────
async function submitGuess() {
  const val = guessInput.value.trim();
  if (val === "") return;

  guessBtn.disabled = true;
  guessInput.disabled = true;

  try {
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: parseInt(val) })
    });
    const data = await res.json();

    gameState.attempts = data.attempts;
    attCount.textContent = `${data.attempts} / ${gameState.maxAttempts}`;

    feedback.textContent = data.message;
    feedback.className = "feedback-box";

    if (data.status === "low") {
      feedback.classList.add("low");
      markDot(data.attempts - 1, "used");
      addHistory(val, "low", `⬇ ${val}`);

    } else if (data.status === "high") {
      feedback.classList.add("high");
      markDot(data.attempts - 1, "used");
      addHistory(val, "high", `⬆ ${val}`);

    } else if (data.status === "out_of_range") {
      feedback.classList.add("out");
      gameState.attempts--;
      attCount.textContent = `${gameState.attempts} / ${gameState.maxAttempts}`;

    } else if (data.status === "won") {
      feedback.classList.add("win");
      markDot(data.attempts - 1, "correct");
      addHistory(val, "correct", `✓ ${val}`);
      showResult(true, data.attempts, data.number);
      refreshLeaderboard();

    } else if (data.status === "lost") {
      feedback.classList.add("lose");
      for (let i = data.attempts - 1; i < gameState.maxAttempts; i++) {
        markDot(i, "lost");
      }
      showResult(false, data.attempts, data.number);
      refreshLeaderboard();
    }

  } catch (e) {
    feedback.textContent = "Error connecting to server.";
    feedback.className = "feedback-box out";
  }

  guessInput.value = "";
  if (!resultOverlay.classList.contains("hidden")) return;
  guessBtn.disabled = false;
  guessInput.disabled = false;
  guessInput.focus();
}

guessBtn.addEventListener("click", submitGuess);
guessInput.addEventListener("keydown", e => { if (e.key === "Enter") submitGuess(); });

// ── Add to History ─────────────────────────────────────────────────────────────
function addHistory(val, cls, label) {
  const item = document.createElement("span");
  item.className = `hist-item ${cls}`;
  item.textContent = label;
  historyList.appendChild(item);
  historyList.scrollTop = historyList.scrollHeight;
}

// ── Show Result Overlay ────────────────────────────────────────────────────────
function showResult(won, attempts, number) {
  resultOverlay.classList.remove("hidden");
  if (won) {
    resultIcon.textContent   = "🏆";
    resultTitle.textContent  = "YOU WIN!";
    resultTitle.style.color  = "var(--green)";
    resultDetail.textContent = `Cracked it in ${attempts} attempt${attempts !== 1 ? "s" : ""}! The number was ${number}.`;
  } else {
    resultIcon.textContent   = "💀";
    resultTitle.textContent  = "GAME OVER";
    resultTitle.style.color  = "var(--red)";
    resultDetail.textContent = `The secret number was ${number}. Better luck next time!`;
  }
}


// ── Play Again ─────────────────────────────────────────────────────────────────
playAgainBtn.addEventListener("click", () => {
  resultOverlay.classList.add("hidden");
  gamePanel.classList.add("hidden");
  setupPanel.classList.remove("hidden");

  gameState = { active: false, maxAttempts: 0, attempts: 0, difficulty: "medium" };
  feedback.textContent = "";
  feedback.className = "feedback-box";
  historyList.innerHTML = "";
  attemptDots.innerHTML = "";
  attCount.textContent = "0 / 0";
  hintBox.classList.add("hidden");
  guessInput.value = "";
  guessBtn.disabled = false;
  guessInput.disabled = false;
});

// ── Hint ───────────────────────────────────────────────────────────────────────
hintBtn.addEventListener("click", async () => {
  try {
    const res  = await fetch("/api/hint");
    const data = await res.json();
    hintBox.textContent = `💡 ${data.hint}`;
    hintBox.classList.remove("hidden");
    setTimeout(() => hintBox.classList.add("hidden"), 5000);
  } catch (e) {}
});

// ── Refresh Leaderboard (called by button onclick and after game ends) ─────────
function refreshLeaderboard() {
  const btn = document.getElementById("refresh-lb");
  btn.textContent = "⟳ LOADING...";

  fetch("/api/leaderboard")
    .then(res => res.json())
    .then(data => {
      const s = data.stats;

      if (s && s.total_games) {
        document.getElementById("stats-row").innerHTML = `
          <div class="stat-card">
            <div class="stat-val">${s.total_games}</div>
            <div class="stat-lbl">TOTAL GAMES</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${s.total_wins}</div>
            <div class="stat-lbl">TOTAL WINS</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${s.win_rate}%</div>
            <div class="stat-lbl">WIN RATE</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">${s.avg_attempts}</div>
            <div class="stat-lbl">AVG ATTEMPTS</div>
          </div>`;
      } else {
        document.getElementById("stats-row").innerHTML =
          `<span style="color:var(--muted);font-size:0.75rem">Play a game to see stats!</span>`;
      }

      const tbody = document.getElementById("lb-body");
      if (!data.leaderboard || data.leaderboard.length === 0) {
        tbody.innerHTML =
          `<tr><td colspan="3" class="empty-row">No records yet. Play to appear!</td></tr>`;
      } else {
        tbody.innerHTML = data.leaderboard.map((row, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${String(row.player).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</td>
            <td>${row.best_attempts}</td>
          </tr>
        `).join("");
      }

      btn.textContent = "⟳ REFRESH";
    })
    .catch(() => {
      document.getElementById("lb-body").innerHTML =
        `<tr><td colspan="3" class="empty-row">Error loading data.</td></tr>`;
      btn.textContent = "⟳ REFRESH";
    });
}
function clearLeaderboard() {
  if (!confirm("Delete ALL player data? This cannot be undone!")) return;
  fetch("/api/clear_leaderboard", { method: "POST" })
    .then(res => res.json())
    .then(() => {
      document.getElementById("stats-row").innerHTML =
        `<span style="color:var(--muted);font-size:0.75rem">Leaderboard cleared! Play a game to see stats.</span>`;
      document.getElementById("lb-body").innerHTML =
        `<tr><td colspan="3" class="empty-row">No records yet. Play to appear!</td></tr>`;
    });
}
// ── Init ───────────────────────────────────────────────────────────────────────
refreshLeaderboard();