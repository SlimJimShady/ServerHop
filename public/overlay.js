const titleElement = document.getElementById("overlayTitle");
const statusElement = document.getElementById("overlayStatus");
const subtitleElement = document.getElementById("overlaySubtitle");
const timerBox = document.getElementById("timerBox");
const stakesBanner = document.getElementById("stakesBanner");
const emptyState = document.getElementById("emptyState");
const participantList = document.getElementById("participantList");
const participantPill = document.getElementById("participantPill");
const eventPill = document.getElementById("eventPill");
const winnerBanner = document.getElementById("winnerBanner");

let latestState = null;
let countdownTimer = null;
const stakeOverride = new URLSearchParams(window.location.search).get("stake");

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDisplayCountdown(state) {
  if (state?.round?.status !== "running") {
    return Number(state?.round?.timeRemaining || 0);
  }

  if (!state.round.endsAt) {
    return Number(state.round.timeRemaining || 0);
  }

  return Math.max(0, Math.ceil((state.round.endsAt - Date.now()) / 1000));
}

function renderParticipants(participants) {
  if (!participants.length) {
    emptyState.classList.remove("hidden");
    participantList.classList.add("hidden");
    participantList.innerHTML = "";
    return;
  }

  emptyState.classList.add("hidden");
  participantList.classList.remove("hidden");
  participantList.innerHTML = participants
    .slice(0, 8)
    .map(
      (participant) => `
        <article class="overlay-participant">
          <div class="overlay-participant-main">
            <span class="mini-rank">#${participant.rank}</span>
            <div>
              <strong>${escapeHtml(participant.nickname)}</strong>
              <span>@${escapeHtml(participant.uniqueId)}</span>
            </div>
          </div>
          <div class="overlay-score">
            <strong>${participant.totalCoins}</strong>
            <span>${escapeHtml(participant.lastGiftName || "Gift")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderWinner(state) {
  if (state.round.status !== "ended" || !state.round.winner) {
    winnerBanner.classList.add("hidden");
    winnerBanner.textContent = "";
    return;
  }

  winnerBanner.classList.remove("hidden");
  winnerBanner.textContent = `${state.round.winner.nickname} wins with ${state.round.winner.totalCoins} coins`;
}

function updateTimerOnly() {
  if (!latestState) {
    return;
  }

  timerBox.textContent = formatTimer(getDisplayCountdown(latestState));
}

function renderState(state) {
  latestState = state;
  titleElement.textContent = state.round.title;
  stakesBanner.textContent = stakeOverride || state.round.stakeText || "100,000 Robux!";
  updateTimerOnly();
  participantPill.textContent = `${state.totals.participants} Participant${
    state.totals.participants === 1 ? "" : "s"
  }`;

  if (state.round.status === "running") {
    statusElement.textContent = "Live";
    statusElement.dataset.state = "running";
    subtitleElement.textContent = state.connection.uniqueId
      ? `Listening to @${state.connection.uniqueId}`
      : "Round is running";
  } else if (state.round.status === "ended") {
    statusElement.textContent = "Finished";
    statusElement.dataset.state = "ended";
    subtitleElement.textContent = "Round complete";
  } else {
    statusElement.textContent = "Waiting";
    statusElement.dataset.state = "idle";
    subtitleElement.textContent = state.connection.uniqueId
      ? `Connected to @${state.connection.uniqueId}. Start the round when ready.`
      : "Connect your TikTok LIVE and start a round.";
  }

  if (state.lastGift) {
    const event = state.lastGift;
    eventPill.textContent = `${event.nickname}: ${event.giftName} x${event.repeatCount}`;
  } else {
    eventPill.textContent = "Waiting for gifts";
  }

  renderParticipants(state.participants);
  renderWinner(state);
}

async function fetchState() {
  const response = await fetch("/api/state", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Unable to load overlay state.");
  }

  const state = await response.json();
  renderState(state);
}

async function pollStateLoop() {
  try {
    await fetchState();
  } catch (_error) {
    // Keep the last known state on screen if polling temporarily fails.
  } finally {
    window.setTimeout(pollStateLoop, 1000);
  }
}

function startTimerLoop() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
  }

  countdownTimer = window.setInterval(updateTimerOnly, 250);
}

async function init() {
  if (new URLSearchParams(window.location.search).get("transparent") === "1") {
    document.body.classList.add("transparent-overlay");
  }

  startTimerLoop();
  await fetchState();
  pollStateLoop();
}

init().catch(() => {
  pollStateLoop();
});
