
  
(() => {
  const STARTING_BALANCE = 1000;
  const MIN_POINTS = 10;
  const MAX_HISTORY = 8;

  const $ = (id) => document.getElementById(id);

  const balanceEl = $("balance");
  const amountEl = $("play-amount");
  const playButton = $("play-button");
  const resetButton = $("reset-button");
  const multiplierEl = $("multiplier");
  const statusEl = $("flight-status");
  const roundEl = $("round-number");
  const messageEl = $("round-message");
  const lastFlightEl = $("last-flight");
  const countdownEl = $("countdown");
  const planeEl = $("plane");
  const pathEl = $("flight-path");
  const historyEl = $("history-list");
  const toastEl = $("toast");

  let balance = STARTING_BALANCE;
  let round = 1;
  let state = "ready";
  let stake = 0;
  let multiplier = 1;
  let crashAt = 1;
  let flightStart = 0;
  let animationId = null;
  let countdownTimer = null;
  let toastTimer = null;
  let history = [];

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, 2400);
  }

  function updateBalance() {
    balanceEl.textContent = Math.floor(balance).toLocaleString();
  }

  function getAmount() {
    const amount = Number(amountEl.value);
    if (!Number.isFinite(amount)) return 0;
    return Math.floor(amount);
  }

  function updateControls() {
    const active = state === "countdown" || state === "flying";
    amountEl.disabled = active;
    $("minus-button").disabled = active;
    $("plus-button").disabled = active;
    resetButton.disabled = active;

    if (state === "flying") {
      playButton.textContent = "CASH OUT POINTS";
      playButton.classList.add("cashout");
      playButton.disabled = false;
    } else if (state === "countdown") {
      playButton.textContent = "GET READY...";
      playButton.classList.remove("cashout");
      playButton.disabled = true;
    } else {
      playButton.textContent = "START FLIGHT";
      playButton.classList.remove("cashout");
      playButton.disabled = false;
    }
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function setPlanePosition(progress) {
    const p = Math.max(0, Math.min(progress, 1));
    const x = 12 + p * 576;
    const y = 360 - 100 * Math.sin(p * Math.PI / 2) - p * 125;
    const angle = -8 - p * 16;

    planeEl.setAttribute(
      "transform",
      `translate(${x} ${y}) rotate(${angle})`
    );

    const curve = `M0 360 Q${x * 0.52} ${360 - p * 165} ${x} ${y}`;
    const fullPath = `M0 360 Q${x * 0.52} ${360 - p * 165} ${x} ${y} T600 235`;
    pathEl.setAttribute("d", p < 0.98 ? fullPath : curve);
  }

  function makeCrashPoint() {
    // Arcade-only simulated outcome; not a prediction or a real betting system.
    const random = Math.random();
    if (random < 0.12) return 1.1 + Math.random() * 0.4;
    if (random < 0.72) return 1.5 + Math.random() * 2.5;
    return 4 + Math.random() * 6;
  }

  function startFlight() {
    if (state !== "ready") return;

    const amount = getAmount();

    if (!Number.isInteger(amount) || amount < MIN_POINTS) {
      showToast(`Enter at least ${MIN_POINTS} virtual points.`);
      return;
    }

    if (amount > balance) {
      showToast("You don't have enough virtual points.");
      return;
    }

    stake = amount;
    balance -= stake;
    updateBalance();

    multiplier = 1;
    crashAt = makeCrashPoint();
    state = "countdown";
    countdownEl.classList.remove("hidden");
    let count = 3;
    countdownEl.textContent = count;
    multiplierEl.textContent = "1.00x";
    setStatus("PREPARING FOR TAKEOFF");
    messageEl.textContent = "Flight is preparing...";
    updateControls();

    countdownTimer = setInterval(() => {
      count--;

      if (count > 0) {
        countdownEl.textContent = count;
      } else {
        clearInterval(countdownTimer);
        countdownTimer = null;
        countdownEl.classList.add("hidden");
        beginFlight();
      }
    }, 700);
  }

  function beginFlight() {
    state = "flying";
    flightStart = performance.now();
    setStatus("PLANE IN FLIGHT");
    messageEl.textContent = "Flight in progress — cash out your points!";
    updateControls();
    animationId = requestAnimationFrame(tickFlight);
  }

  function tickFlight(now) {
    if (state !== "flying") return;

    const elapsed = (now - flightStart) / 1000;

    // Smoothly rising arcade multiplier.
    multiplier = Math.exp(elapsed * 0.22);
    multiplierEl.textContent = multiplier.toFixed(2) + "x";

    // Plane gradually moves across the scene.
    const progress = Math.min(elapsed / 12, 1);
    setPlanePosition(progress);

    if (multiplier >= crashAt) {
      multiplier = crashAt;
      multiplierEl.textContent = multiplier.toFixed(2) + "x";
      finishCrash();
      return;
    }

    animationId = requestAnimationFrame(tickFlight);
  }

  function cashOut() {
    if (state !== "flying") return;

    const result = multiplier;
    const pointsReturned = Math.floor(stake * result);

    balance += pointsReturned;
    updateBalance();

    state = "ready";
    cancelAnimationFrame(animationId);
    animationId = null;

    multiplierEl.textContent = result.toFixed(2) + "x";
    setStatus("POINTS COLLECTED!");
    messageEl.textContent =
      `You collected ${pointsReturned.toLocaleString()} virtual points at ${result.toFixed(2)}x.`;

    lastFlightEl.textContent = result.toFixed(2) + "x";
    addHistory(result, "CASHED OUT");
    round++;
    roundEl.textContent = `ROUND #${round}`;
    updateControls();
    showToast(`Collected ${pointsReturned.toLocaleString()} virtual points!`);
  }

  function finishCrash() {
    state = "ready";
    cancelAnimationFrame(animationId);
    animationId = null;

    setStatus("FLIGHT ENDED");
    messageEl.textContent =
      `The plane flew to ${multiplier.toFixed(2)}x. Try another arcade flight!`;

    lastFlightEl.textContent = multiplier.toFixed(2) + "x";
    addHistory(multiplier, "FLIGHT ENDED");
    round++;
    roundEl.textContent = `ROUND #${round}`;
    updateControls();
    showToast("Flight ended. No points were collected this round.");
  }

  function addHistory(result, outcome) {
    history.unshift({
      result: result.toFixed(2),
      outcome
    });
    history = history.slice(0, MAX_HISTORY);
    renderHistory();
  }

  function renderHistory() {
    historyEl.replaceChildren();

    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted empty-history";
      empty.textContent = "Your flight results will appear here.";
      historyEl.appendChild(empty);
      return;
    }

    history.forEach((item) => {
      const chip = document.createElement("div");
      chip.className = "history-chip " +
        (item.outcome === "CASHED OUT" ? "good" : "low");
      chip.textContent = `${item.result}x`;
      chip.title = item.outcome;
      historyEl.appendChild(chip);
    });
  }

  function resetGame() {
    if (state === "flying" || state === "countdown") {
      showToast("Finish the current flight before resetting.");
      return;
    }

    balance = STARTING_BALANCE;
    round = 1;
    history = [];
    stake = 0;
    multiplier = 1;

    updateBalance();
    renderHistory();
    roundEl.textContent = "ROUND #1";
    multiplierEl.textContent = "1.00x";
    lastFlightEl.textContent = "—";
    messageEl.textContent = "Ready for the next flight?";
    setStatus("READY FOR TAKEOFF");
    setPlanePosition(0);
    pathEl.setAttribute("d", "M0 360 Q300 260 600 360");
    updateControls();
    showToast("Virtual points reset to 1,000.");
  }

  $("minus-button").addEventListener("click", () => {
    amountEl.value = Math.max(
      MIN_POINTS,
      getAmount() - 10
    );
  });

  $("plus-button").addEventListener("click", () => {
    amountEl.value = Math.min(
      Math.max(balance, MIN_POINTS),
      getAmount() + 10
    );
  });

  amountEl.addEventListener("change", () => {
    const amount = getAmount();
    amountEl.value = Math.max(MIN_POINTS, amount || MIN_POINTS);
  });

  playButton.addEventListener("click", () => {
    if (state === "ready") {
      startFlight();
    } else if (state === "flying") {
      cashOut();
    }
  });

  resetButton.addEventListener("click", resetGame);

  updateBalance();
  updateControls();
  setPlanePosition(0);
})();
      
