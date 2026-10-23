
const balanceEl = document.getElementById("balance");
const multiplierEl = document.getElementById("multiplier");
const statusEl = document.getElementById("status");
const planeEl = document.getElementById("plane");
const pathEl = document.getElementById("flightPath");
const playBtn = document.getElementById("playBtn");
const stakeInput = document.getElementById("stake");
const historyEl = document.getElementById("history");
const roundNumberEl = document.getElementById("roundNumber");
const roundMessageEl = document.getElementById("roundMessage");
const lastResultEl = document.getElementById("lastResult");

let balance = 1000;
let roundNumber = 1;
let multiplier = 1;
let crashPoint = 1;
let flightStart = 0;
let timer = null;
let playing = false;
let history = [];

function updateBalance() {
  balanceEl.textContent = balance.toFixed(0);
}

function setStake(value) {
  stakeInput.value = Math.max(10, Math.min(1000, value));
}

document.getElementById("minusBtn").addEventListener("click", () => {
  setStake(Number(stakeInput.value || 50) - 10);
});

document.getElementById("plusBtn").addEventListener("click", () => {
  setStake(Number(stakeInput.value || 50) + 10);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (playing) return;
  balance = 1000;
  updateBalance();
  roundMessageEl.textContent = "Virtual points reset.";
});

function addHistory(value, crashed) {
  history.unshift({ value, crashed });
  history = history.slice(0, 8);

  historyEl.innerHTML = "";

  history.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "history-chip" +
      (item.crashed ? " crashed" : "");
    chip.textContent = item.value.toFixed(2) + "×";
    historyEl.appendChild(chip);
  });
}

function prepareNextRound() {
  playing = false;
  multiplier = 1;
  multiplierEl.textContent = "1.00×";
  statusEl.textContent = "READY FOR TAKEOFF";
  statusEl.style.color = "#ff7d85";
  planeEl.style.left = "11%";
  planeEl.style.bottom = "16%";
  pathEl.style.width = "0px";
  pathEl.style.transform = "rotate(-25deg)";
  playBtn.disabled = false;
  playBtn.textContent = "START FLIGHT";
  roundNumberEl.textContent = "ROUND #" + roundNumber;
}

function startFlight() {
  const stake = Math.floor(Number(stakeInput.value));

  if (!Number.isFinite(stake) || stake < 10 || stake > 1000) {
    roundMessageEl.textContent = "Enter 10–1000 virtual points.";
    return;
  }

  if (stake > balance) {
    roundMessageEl.textContent = "Not enough virtual points. Reset your balance to replay.";
    return;
  }

  balance -= stake;
  updateBalance();

  playing = true;
  multiplier = 1;
  flightStart = Date.now();

  // A random result for this local practice round.
  crashPoint = 1.15 + Math.random() * 5.85;

  playBtn.textContent = "CASH OUT (VIRTUAL)";
  statusEl.textContent = "PLANE IN FLIGHT";
  roundMessageEl.textContent = "Flight underway — virtual points only.";
  lastResultEl.textContent = "Flight in progress";
  roundNumberEl.textContent = "ROUND #" + roundNumber;

  timer = setInterval(() => {
    const elapsed = (Date.now() - flightStart) / 1000;

    multiplier = Math.exp(elapsed * 0.22);
    multiplierEl.textContent = multiplier.toFixed(2) + "×";

    const progress = Math.min(elapsed / 12, 1);
    planeEl.style.left = (11 + progress * 68) + "%";
    planeEl.style.bottom = (16 + progress * 49) + "%";
    planeEl.style.transform =
      "rotate(-" + (12 + progress * 12) + "deg)";
    pathEl.style.width = (progress * 68) + "%";

    if (multiplier >= crashPoint) {
      crashFlight();
    }
  }, 100);
}

function crashFlight() {
  if (!playing) return;

  clearInterval(timer);
  playing = false;

  multiplier = crashPoint;
  multiplierEl.textContent = crashPoint.toFixed(2) + "×";
  statusEl.textContent = "FLIGHT ENDED";
  statusEl.style.color = "#ff343f";
  planeEl.style.opacity = "0";
  playBtn.disabled = true;
  playBtn.textContent = "FLIGHT ENDED";

  addHistory(crashPoint, true);
  lastResultEl.textContent = "Last flight: " +
    crashPoint.toFixed(2) + "×";
  roundMessageEl.textContent =
    "The virtual flight ended. Points used: " +
    Math.floor(Number(stakeInput.value)) + ".";

  finishRound();
}

function cashOut() {
  if (!playing) return;

  clearInterval(timer);
  playing = false;

  const stake = Math.floor(Number(stakeInput.value));
  const payout = Math.floor(stake * multiplier);
  balance += payout;
  updateBalance();

  statusEl.textContent = "VIRTUAL CASH OUT";
  statusEl.style.color = "#45e3a0";
  roundMessageEl.textContent =
    "Virtual return: " + payout + " points.";
  lastResultEl.textContent = "Last flight: " +
    multiplier.toFixed(2) + "×";

  addHistory(multiplier, false);
  finishRound();
}

function finishRound() {
  roundNumber++;
  planeEl.style.opacity = "1";

  setTimeout(() => {
    prepareNextRound();
    roundMessageEl.textContent = "Ready for the next flight?";
  }, 1500);
}

playBtn.addEventListener("click", () => {
  if (playing) {
    cashOut();
  } else if (!playBtn.disabled) {
    startFlight();
  }
});

updateBalance();
prepareNextRound();
