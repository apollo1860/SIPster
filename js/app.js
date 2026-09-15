// SIPster Spiellogik & UI-Steuerung

const START_LIVES = 4;
const MAX_LIVES = 4;

const state = {
  players: [], // { name, lives }
  currentPlayerIndex: 0,
  pool: [], // gemischte, noch nicht gezogene Songs
  currentSong: null, // { title, artist, year, videoId }
  roundPhase: "idle", // idle -> drawing -> ready -> playing -> revealed
};

// ---------- Helpers ----------

function $(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  $(`screen-${name}`).classList.remove("hidden");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function alivePlayers() {
  return state.players.filter((p) => p.lives > 0);
}

// ---------- Setup-Screen ----------

function refreshPlayerList() {
  const ul = $("playerList");
  ul.innerHTML = "";
  state.players.forEach((p, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(p.name)}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.className = "remove-btn";
    btn.addEventListener("click", () => {
      state.players.splice(idx, 1);
      refreshPlayerList();
    });
    li.appendChild(btn);
    ul.appendChild(li);
  });
  $("startGameBtn").disabled = state.players.length < 2;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function initSetupScreen() {
  const apiInput = $("apiKeyInput");
  if (YTM.hasApiKey()) {
    apiInput.value = localStorage.getItem("sipster_yt_api_key") || "";
    $("apiKeyStatus").textContent = "✅ API-Key gespeichert";
  }

  $("saveApiKeyBtn").addEventListener("click", () => {
    YTM.setApiKey(apiInput.value);
    $("apiKeyStatus").textContent = YTM.hasApiKey() ? "✅ API-Key gespeichert" : "";
  });

  $("clearCacheBtn").addEventListener("click", () => {
    YTM.clearVideoCache();
    $("apiKeyStatus").textContent = "🗑️ Video-Cache geleert";
  });

  $("addPlayerBtn").addEventListener("click", addPlayerFromInput);
  $("playerNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addPlayerFromInput();
  });

  $("startGameBtn").addEventListener("click", startGame);

  $("songPoolCount").textContent = SONGS.length;
}

function addPlayerFromInput() {
  const input = $("playerNameInput");
  const name = input.value.trim();
  if (!name) return;
  state.players.push({ name, lives: START_LIVES });
  input.value = "";
  refreshPlayerList();
  input.focus();
}

// ---------- Game-Screen ----------

function startGame() {
  state.pool = shuffle(SONGS);
  state.currentPlayerIndex = 0;
  state.currentSong = null;
  state.roundPhase = "idle";
  showScreen("game");
  renderScoreboard();
  resetRoundUI();
}

function renderScoreboard() {
  const box = $("scoreboard");
  box.innerHTML = "";
  state.players.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "player-card" + (p.lives <= 0 ? " out" : "") + (idx === state.currentPlayerIndex ? " active" : "");
    const hearts = "❤️".repeat(p.lives) + "🖤".repeat(MAX_LIVES - p.lives);
    card.innerHTML = `<div class="player-name">${escapeHtml(p.name)}</div><div class="player-lives">${hearts}</div>`;
    box.appendChild(card);
  });
  $("songsLeft").textContent = state.pool.length;
}

function resetRoundUI() {
  state.roundPhase = "idle";
  $("drawSongBtn").classList.remove("hidden");
  $("playBtn").classList.add("hidden");
  $("pauseBtn").classList.add("hidden");
  $("pauseBtn").textContent = "⏸️ Pause";
  $("guessControls").classList.add("hidden");
  $("revealBox").classList.add("hidden");
  $("nextRoundBtn").classList.add("hidden");
  $("blindOverlay").classList.add("hidden");
  $("chkTitle").checked = false;
  $("chkArtist").checked = false;
  $("chkYear").checked = false;
  $("roundStatus").textContent = "";
  const p = state.players[state.currentPlayerIndex];
  $("currentPlayerBanner").textContent = p ? `🎤 ${p.name} ist dran` : "";
  YTM.stop();
}

async function drawSong() {
  if (state.pool.length === 0) {
    endGame();
    return;
  }
  if (!YTM.hasApiKey()) {
    $("roundStatus").textContent = "⚠️ Bitte zuerst im Setup einen YouTube-API-Key hinterlegen.";
    return;
  }
  state.currentSong = state.pool.pop();
  state.roundPhase = "drawing";
  $("drawSongBtn").classList.add("hidden");
  $("roundStatus").textContent = "🔎 Song wird gesucht …";
  renderScoreboard();

  try {
    const videoId = await YTM.resolveVideoId(state.currentSong);
    state.currentSong.videoId = videoId;
    state.roundPhase = "ready";
    $("roundStatus").textContent = "Bereit! Drückt Play, sobald alle raten dürfen.";
    $("playBtn").classList.remove("hidden");
  } catch (e) {
    $("roundStatus").textContent = "❌ " + e.message;
    $("drawSongBtn").classList.remove("hidden");
    // Song zurück in den Pool legen, da er nicht abgespielt wurde
    state.pool.push(state.currentSong);
    state.currentSong = null;
  }
}

function onPlayClick() {
  if (!state.currentSong || !state.currentSong.videoId) return;
  YTM.loadAndPlay(state.currentSong.videoId);
  state.roundPhase = "playing";
  $("playBtn").classList.add("hidden");
  $("pauseBtn").classList.remove("hidden");
  $("blindOverlay").classList.remove("hidden");
  $("guessControls").classList.remove("hidden");
  $("roundStatus").textContent = "🙈 Keiner darf mitlesen – nur zuhören und raten!";
}

function onPauseClick() {
  if ($("pauseBtn").textContent.includes("Pause")) {
    YTM.pause();
    $("pauseBtn").textContent = "▶️ Weiter";
  } else {
    YTM.play();
    $("pauseBtn").textContent = "⏸️ Pause";
  }
}

function evaluateRound() {
  const titleOk = $("chkTitle").checked;
  const artistOk = $("chkArtist").checked;
  const yearOk = $("chkYear").checked;
  const success = titleOk || artistOk;

  const player = state.players[state.currentPlayerIndex];
  let resultText;
  if (!success) {
    player.lives = Math.max(0, player.lives - 1);
    resultText = "💧 Weder Titel noch Interpret korrekt – ein Leben verloren!";
  } else if (yearOk) {
    const before = player.lives;
    player.lives = Math.min(MAX_LIVES, player.lives + 1);
    resultText =
      player.lives > before
        ? "🎉 Titel/Interpret + Jahr korrekt – Extra-Leben!"
        : "🎉 Titel/Interpret + Jahr korrekt – aber schon bei maximal 4 Leben.";
  } else {
    resultText = "✅ Titel oder Interpret korrekt – kein Leben verloren.";
  }

  YTM.pause();
  $("blindOverlay").classList.add("hidden");
  $("guessControls").classList.add("hidden");

  const song = state.currentSong;
  $("revealBox").classList.remove("hidden");
  $("revealBox").innerHTML = `
    <div class="reveal-title">${escapeHtml(song.title)}</div>
    <div class="reveal-artist">${escapeHtml(song.artist)}</div>
    <div class="reveal-year">${song.year}</div>
    <div class="reveal-result">${resultText}</div>
  `;

  renderScoreboard();

  if (alivePlayers().length <= 1 || state.pool.length === 0) {
    $("nextRoundBtn").textContent = "🏁 Spiel beenden";
  } else {
    $("nextRoundBtn").textContent = "Nächste Runde ➡️";
  }
  $("nextRoundBtn").classList.remove("hidden");
}

function advanceToNextPlayer() {
  const alive = alivePlayers();
  if (alive.length <= 1) return;
  let idx = state.currentPlayerIndex;
  do {
    idx = (idx + 1) % state.players.length;
  } while (state.players[idx].lives <= 0);
  state.currentPlayerIndex = idx;
}

function nextRound() {
  if (alivePlayers().length <= 1 || state.pool.length === 0) {
    endGame();
    return;
  }
  advanceToNextPlayer();
  resetRoundUI();
  renderScoreboard();
}

function endGame() {
  YTM.stop();
  showScreen("end");
  const sorted = [...state.players].sort((a, b) => b.lives - a.lives);
  const maxLives = sorted[0] ? sorted[0].lives : 0;
  const winners = sorted.filter((p) => p.lives === maxLives);

  $("finalHeadline").textContent =
    winners.length === 1 ? `🏆 ${winners[0].name} gewinnt!` : `🏆 Unentschieden: ${winners.map((w) => w.name).join(", ")}`;

  const box = $("finalScoreboard");
  box.innerHTML = "";
  sorted.forEach((p) => {
    const row = document.createElement("div");
    row.className = "final-row";
    const hearts = "❤️".repeat(p.lives) + "🖤".repeat(MAX_LIVES - p.lives);
    row.innerHTML = `<span>${escapeHtml(p.name)}</span><span>${hearts}</span>`;
    box.appendChild(row);
  });
}

function restart() {
  state.players = [];
  state.pool = [];
  state.currentSong = null;
  state.currentPlayerIndex = 0;
  refreshPlayerList();
  showScreen("setup");
}

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  initSetupScreen();
  refreshPlayerList();

  $("drawSongBtn").addEventListener("click", drawSong);
  $("playBtn").addEventListener("click", onPlayClick);
  $("pauseBtn").addEventListener("click", onPauseClick);
  $("evaluateBtn").addEventListener("click", evaluateRound);
  $("nextRoundBtn").addEventListener("click", nextRound);
  $("restartBtn").addEventListener("click", restart);
});
