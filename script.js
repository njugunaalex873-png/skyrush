
(() => {
  const STARTING_BALANCE = 1000;
  const MIN_POINTS = 10;
  const MAX_HISTORY = 8;

  const $ = (id) => document.getElementById(id);

  let balance = STARTING_BALANCE;
  let round = 1;
  let history = [];
  let toastTimer;

  const panels = {
    amount1: { state: "ready", stake: 0, multiplier: 1, crashAt: 0, start: 0, raf: null, timer: null },
    amount2: { state: "ready", stake: 0, multiplier: 1, crashAt: 0, start: 0, raf: null, timer: null }
  };

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function updateBalance() {
    $("balance").textContent = balance.toLocaleString();
  }

  function getAmount(id) {
    const value = Number($(id).value);
    return Number.isFinite(value) ? Math.floor(value) : 0;
  }

  function updatePanel(id) {
    const panel = panels[id];
    const number = id === "amount1" ? "1" : "2";
    const button = $("action" + number);
    const title = $("action" + number + "-title");
    const value = $("action" + number + "-value");
    const amount = getAmount(id);

    value.textContent = Math.max(0, amount).toLocaleString() + " PTS";

    if (panel.state === "flying") {
      title.textContent = "CASH OUT";
      value.textContent = Math.floor(panel.stake * panel.multiplier).toLocaleString() + " PTS";
      button.classList.add("cashing");
    } else if (panel.state === "countdown") {
      title.textContent = "GET READY";
      button.classList.remove("cashing");
    } else {
      title.textContent = "START FLIGHT";
      button.classList.remove("cashing");
    }

    $(id).disabled = panel.state !== "ready";
    document.querySelectorAll(`[data-input="${id}"]`).forEach((control) => {
      control.disabled = panel.state !== "ready";
    });
  }

  function updateAllPanels() {
    Object.keys(panels).forEach(updatePanel);
  }

  function addHistory(multiplier, result) {
    history.unshift({ multiplier: multiplier.toFixed(2), result });
    history = history.slice(0, MAX_HISTORY);

    const container = $("history");
    container.replaceChildren();

    history.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "history-item";
      chip.textContent = item.multiplier + "x";
      chip.title = item.result;
      container.appendChild(chip);
    });

    $("results-strip").replaceChildren();
    history.slice(0, 5).forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item.multiplier + "x";
      $("results-strip").appendChild(chip);
    });
  }

  function updateScene(multiplier) {
    $("multiplier").textContent = multiplier.toFixed(2) + "x";
  }

  function startFlight(id) {
    const panel = panels[id];
    if (panel.state !== "ready") return;

    const amount = getAmount(id);

    if (!Number.isInteger(amount) || amount < MIN_POINTS) {
      toast("Enter at least 10 virtual points.");
      return;
    }

    if (amount > balance) {
      toast("Not enough virtual points.");
      return;
    }

    panel.stake = amount;
    balance -= amount;
    updateBalance();

    panel.multiplier = 1;
    // Simulated arcade outcome; not a prediction.
    panel.crashAt = 1.2 + Math.random() * 4.8;
    panel.state = "countdown";

    updatePanel(id);

    let count = 3;
    $("countdown").textContent = count;
    $("countdown").classList.remove("hidden");
    $("result-label").textContent = "GET READY";
    $("status").textContent = "Preparing for takeoff...";

    panel.timer = setInterval(() => {
      count--;

      if (count > 0) {
        $("countdown").textContent = count;
        return;
      }

      clearInterval(panel.timer);
      panel.timer = null;

      // Hide the shared countdown only when neither panel is counting down.
      panel.state = "flying";
      panel.start = performance.now();
      $("countdown").classList.add("hidden");
      $("result-label").textContent = "PLANE IN FLIGHT";
      $("status").textContent = "Cash out your virtual points!";
      updatePanel(id);
      animate(id);
    }, 700);
  }

  function animate(id) {
    const panel = panels[id];
    if (panel.state !== "flying") return;

    const elapsed = (performance.now() - panel.start) / 1000;
    panel.multiplier = Math.exp(elapsed * 0.22);

    updateScene(panel.multiplier);
    updatePanel(id);

    const progress = Math.min(elapsed / 12, 1);
    const x = 20 + progress * 560;
    const y = 310 - progress * 210;
    $("plane").setAttribute("x", x);
    $("plane").setAttribute("y", y);

    const controlX = x * 0.52;
    const controlY = 320 - progress * 220;
    $("flight-path").setAttribute(
      "d",
      `M0 320 Q${controlX} ${controlY} ${x} ${y}`
    );

    if (panel.multiplier >= panel.crashAt) {
      panel.multiplier = panel.crashAt;
      updateScene(panel.multiplier);
      finishFlight(id, false);
      return;
    }

    panel.raf = requestAnimationFrame(() => animate(id));
  }

  function finishFlight(id, cashedOut) {
    const panel = panels[id];
    if (panel.state !== "flying") return;

    cancelAnimationFrame(panel.raf);
    panel.raf = null;

    if (cashedOut) {
      const result = panel.multiplier;
      const returned = Math.floor(panel.stake * result);
      balance += returned;
      updateBalance();

      $("result-label").textContent = "POINTS COLLECTED!";
      $("status").textContent =
        `Collected ${returned.toLocaleString()} virtual points at ${result.toFixed(2)}x.`;

      $("last-flight").textContent = result.toFixed(2) + "x";
      addHistory(result, "Cashed out");
      toast("Virtual points collected!");
    } else {
      const result = panel.crashAt;

      $("result-label").textContent = "FLIGHT ENDED";
      $("status").textContent =
        `Flight ended at ${result.toFixed(2)}x. Try another arcade round.`;

      $("last-flight").textContent = result.toFixed(2) + "x";
      addHistory(result, "Flight ended");
      toast("Flight ended. No points collected.");
    }

    panel.state = "ready";
    panel.stake = 0;
    round++;
    $("round").textContent = "ROUND #" + round;
    updatePanel(id);
  }

  function reset() {
    if (Object.values(panels).some((panel) =>
      panel.state !== "ready"
    )) {
      toast("Finish both flights before resetting.");
      return;
    }

    balance = STARTING_BALANCE;
    history = [];
    round = 1;
    updateBalance();

    $("round").textContent = "ROUND #1";
    $("multiplier").textContent = "1.00x";
    $("result-label").textContent = "READY FOR TAKEOFF";
    $("status").textContent = "Ready for the next flight?";
    $("last-flight").textContent = "—";
    $("flight-path").setAttribute("d", "M0 320 Q300 210 600 320");
    $("plane").setAttribute("x", "20");
    $("plane").setAttribute("y", "310");
    $("history").textContent = "No flights yet.";

    $("results-strip").replaceChildren();
    ["1.00x", "1.24x", "2.18x", "1.67x", "3.40x"].forEach((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      $("results-strip").appendChild(span);
    });

    updateAllPanels();
    toast("Balance reset to 1,000 virtual points.");
  }

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.input;
      if (panels[id].state !== "ready") return;

      $(id).value = Math.max(
        MIN_POINTS,
        getAmount(id) + Number(button.dataset.step)
      );
      updatePanel(id);
    });
  });

  document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.input;
      if (panels[id].state !== "ready") return;

      $(id).value = Number(button.dataset.amount);
      updatePanel(id);
    });
  });

  ["amount1", "amount2"].forEach((id) => {
    $(id).addEventListener("change", () => {
      $(id).value = Math.max(MIN_POINTS, getAmount(id) || MIN_POINTS);
      updatePanel(id);
    });
  });

  $("action1").addEventListener("click", () => {
    if (panels.amount1.state === "ready") startFlight("amount1");
    else if (panels.amount1.state === "flying") finishFlight("amount1", true);
  });

  $("action2").addEventListener("click", () => {
    if (panels.amount2.state === "ready") startFlight("amount2");
    else if (panels.amount2.state === "flying") finishFlight("amount2", true);
  });

  $("reset").addEventListener("click", reset);

  updateBalance();
  updateAllPanels();
})();
