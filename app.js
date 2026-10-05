/* ============================================================
   app.js — Connects the page to the model
   ------------------------------------------------------------
   1. Find the page elements
   2. Formatting helpers
   3. Read and check the current inputs
   4. Draw the deal card, results, chart, table and price check
   5. update() — the one function that refreshes everything
   6. Scenario buttons
   7. Deal buttons (load example, blank deal, change deal)
   8. Start-up

   Two deal modes:
   - "example": the sourced Deepsea Bollsta deal from data.js
   - "custom":  the user's own inputs (no sources, no price check)
   ============================================================ */


/* ---------- 1. Page elements ---------- */
const sliders = {
  options:      document.getElementById("options"),
  optionEbitda: document.getElementById("optionEbitda"),
  residual:     document.getElementById("residual"),
  discountRate: document.getElementById("discountRate")
};

const fields = {
  rigName:       document.getElementById("inRigName"),
  closeYear:     document.getElementById("inCloseYear"),
  purchasePrice: document.getElementById("inPrice"),
  firmBacklog:   document.getElementById("inBacklog"),
  firmEbitda:    document.getElementById("inEbitda"),
  firmQuarters:  document.getElementById("inQuarters"),
  maxOptions:    document.getElementById("inMaxOptions")
};

const scenarioButtons = document.querySelectorAll(".btn-scenario");
const editor = document.getElementById("dealEditor");
const editorButton = document.getElementById("toggleEditor");

let activeScenario = "base";   // "bear", "base", "bull" or "custom"
let dealMode = "example";      // "example" or "custom"


/* ---------- 2. Formatting helpers ----------
   Every formatter returns "–" for missing numbers (NaN, Infinity),
   so the page never shows broken values. */
const DASH = "–";

// 480 → "USD 480m", -92.4 → "−USD 92m"
function formatUsd(value) {
  if (!Number.isFinite(value)) return DASH;
  const sign = value < 0 ? "−" : "";
  return sign + "USD " + Math.round(Math.abs(value)).toLocaleString("en-US") + "m";
}

// Same, but always shows + or − (for NPV)
function formatSignedUsd(value) {
  if (!Number.isFinite(value)) return DASH;
  return (value >= 0 ? "+" : "") + formatUsd(value);
}

// Plain number for tables: -480 → "−480"
function formatNumber(value) {
  if (!Number.isFinite(value)) return DASH;
  const rounded = Math.round(value);
  if (rounded === 0) return "0";
  return (rounded < 0 ? "−" : "") + Math.abs(rounded).toLocaleString("en-US");
}

// 0.0912 → "9.1%"
function formatPercent(value, decimals) {
  if (!Number.isFinite(value)) return DASH;
  return (value * 100).toFixed(decimals) + "%";
}

// Make user-typed text safe to put inside HTML
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// Show the source numbers [1][2] next to a fact
function citations(sourceKeys) {
  const allKeys = Object.keys(SOURCES);
  return sourceKeys.map(function (key) {
    const number = allKeys.indexOf(key) + 1;
    return '<a class="cite" href="#source-' + key + '" title="' + SOURCES[key].title + '">[' + number + ']</a>';
  }).join("");
}


/* ---------- 3. Read and check the inputs ---------- */

// Slider values. Discount rate goes from "9" (percent) to 0.09.
function readAssumptions() {
  return {
    options:      Number(sliders.options.value),
    optionEbitda: Number(sliders.optionEbitda.value),
    residual:     Number(sliders.residual.value),
    discountRate: Number(sliders.discountRate.value) / 100
  };
}

// A number field as a number. Empty, invalid or negative → 0.
function numberFrom(input) {
  const value = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

// The deal the model will use: data.js defaults + what is in the fields.
function readDeal() {
  const year = Math.round(numberFrom(fields.closeYear));
  const closeYear = year >= 1900 && year <= 2100 ? year : null;   // null = not filled in

  return {
    ...DEAL,
    rigName:       fields.rigName.value.trim(),
    closeYear:     closeYear,
    // Quarter labels need a year; without one we fall back to the example's.
    firstYear:     (closeYear || DEAL.firstYear - 1) + 1,
    purchasePrice: numberFrom(fields.purchasePrice),
    firmBacklog:   numberFrom(fields.firmBacklog),
    firmEbitda:    numberFrom(fields.firmEbitda),
    firmQuarters:  Math.min(40, Math.round(numberFrom(fields.firmQuarters))),
    maxOptions:    Math.min(10, Math.round(numberFrom(fields.maxOptions)))
  };
}

// Which inputs are usable? Results that depend on a missing input show "–".
function checkDeal(deal) {
  const ok = {
    price:    deal.purchasePrice > 0,
    ebitda:   deal.firmEbitda > 0,
    quarters: deal.firmQuarters >= 1,
    backlog:  fields.firmBacklog.value.trim() !== ""   // 0 is allowed, empty is not
  };
  ok.cashFlows = ok.ebitda && ok.quarters;   // enough to build the cash flows
  ok.all = ok.cashFlows && ok.price;          // enough for NPV, IRR, payback
  return ok;
}


/* ---------- 4. Drawing functions ---------- */

// Heading, intro text and facts card for the current deal
function renderDealCard(deal, ok) {
  const isExample = dealMode === "example";

  document.getElementById("dealName").textContent =
    isExample ? DEAL.rigName : (deal.rigName || "Unnamed rig");

  document.getElementById("dealIntro").textContent = isExample
    ? DEAL.buyer + " bought " + DEAL.rigName + " from " + DEAL.seller +
      ". All values are as of the close, " + DEAL.closeLabel + ". Every fact is sourced."
    : "Your own inputs (not sourced). Values are as of the close" +
      (deal.closeYear ? ", " + deal.closeYear : "") + ".";

  // Example: sourced facts from data.js. Custom: the user's inputs, no sources.
  let facts;
  if (isExample) {
    facts = DEAL_FACTS.map(function (fact) {
      return { label: fact.label, value: fact.value, cites: citations(fact.sources) };
    });
  } else {
    facts = [
      { label: "Rig",            value: escapeHtml(deal.rigName) || DASH },
      { label: "Year of close",  value: deal.closeYear || DASH },
      { label: "Purchase price", value: ok.price ? formatUsd(deal.purchasePrice) : DASH },
      { label: "Firm backlog",   value: ok.backlog ? formatUsd(deal.firmBacklog) : DASH },
      { label: "EBITDA, firm period", value: ok.ebitda ? formatUsd(deal.firmEbitda) + " / year" : DASH },
      { label: "Firm contract",  value: ok.quarters
          ? deal.firmQuarters + " quarters (to " + quarterLabel(deal.firmQuarters, deal.firstYear) + ")"
          : DASH },
      { label: "Options available", value: fields.maxOptions.value.trim() === ""
          ? DASH : deal.maxOptions + " × 1 year" }
    ];
  }

  document.getElementById("dealFacts").innerHTML = facts.map(function (fact) {
    return '<div class="fact"><dt>' + fact.label + '</dt><dd>' + fact.value + (fact.cites || "") + '</dd></div>';
  }).join("");

  // Highlight "Load example" while the example is loaded
  document.getElementById("loadExample").classList.toggle("is-active", isExample);
}


// Slider readouts, the fill on each track, and the hints.
function renderSliders(assumptions, result, ok, deal) {
  document.getElementById("optionsOut").textContent = assumptions.options + " of " + deal.maxOptions;
  document.getElementById("optionEbitdaOut").textContent = formatUsd(assumptions.optionEbitda);
  document.getElementById("residualOut").textContent = formatUsd(assumptions.residual);
  document.getElementById("discountRateOut").textContent = formatPercent(assumptions.discountRate, 1);

  document.getElementById("optionsHint").textContent = ok.quarters
    ? "Contract ends " + result.exitLabel + ". Each option = 1 extra year."
    : "Each option = 1 extra year.";
  document.getElementById("residualHint").textContent = ok.quarters
    ? "Value at end of firm contract (" + result.firmEndLabel + "). Falls 4% per extra year of age."
    : "Value at end of firm contract. Falls 4% per extra year of age.";

  // Colour the slider track up to the thumb
  Object.values(sliders).forEach(function (slider) {
    const range = slider.max - slider.min;   // 0 when no options are available
    const percent = range > 0 ? (slider.value - slider.min) / range * 100 : 0;
    slider.style.setProperty("--fill", percent + "%");
  });
}


// The instrument readouts. Each one checks it has the inputs it needs.
function renderResults(result, deal, ok) {
  // Breakeven price only needs the cash flows (not the price)
  document.getElementById("outBreakeven").textContent = ok.cashFlows ? formatUsd(result.breakevenPrice) : DASH;

  let verdict;
  if (!ok.cashFlows) {
    verdict = "Enter firm EBITDA and contract length to calculate.";
  } else if (!ok.price) {
    verdict = "Max price for NPV = 0. Enter a purchase price to compare.";
  } else {
    const gap = result.breakevenPrice - deal.purchasePrice;
    verdict = "Max price for NPV = 0. That is " + formatUsd(Math.abs(gap)) +
      (gap >= 0 ? " above" : " below") + " the " + formatUsd(deal.purchasePrice) + " paid.";
  }
  document.getElementById("outVerdict").textContent = verdict;

  // NPV, green or red
  const npvEl = document.getElementById("outNpv");
  npvEl.textContent = ok.all ? formatSignedUsd(result.npv) : DASH;
  npvEl.className = "readout-value" + (ok.all ? (result.npv >= 0 ? " is-positive" : " is-negative") : "");

  // IRR ("n/a" if the cash flows have no IRR)
  document.getElementById("outIrr").textContent =
    !ok.all ? DASH : (result.irr === null ? "n/a" : formatPercent(result.irr, 1));

  // Payback
  document.getElementById("outPayback").textContent = ok.all ? (result.paybackLabel || "Not reached") : DASH;
  document.getElementById("outPaybackNote").textContent = !ok.all ? "" : result.paybackLabel
    ? result.paybackYears.toFixed(2) + " years after close"
    : "Cash from operations doesn't cover the price before exit – the deal relies on the residual value.";

  document.getElementById("outCoverage").textContent = ok.price && ok.backlog ? formatPercent(result.backlogCoverage, 0) : DASH;
  document.getElementById("outMultiple").textContent =
    ok.price && ok.ebitda ? result.evToEbitda.toFixed(1) + "x" : DASH;

  document.getElementById("outExit").textContent = ok.quarters ? result.exitLabel : DASH;
  document.getElementById("outExitNote").textContent = ok.quarters ? "Sold for " + formatUsd(result.exitValue) : "";
}


// Bar chart made of plain <div>s. Heights are % of the tallest year.
function renderChart(result, deal) {
  const years = result.years.filter(function (y) { return y.year >= deal.firstYear; });
  const tallest = Math.max(1, ...years.map(function (y) { return y.operating + y.residual; }));

  document.getElementById("chart").innerHTML = years.map(function (y) {
    const operatingHeight = Math.max(0, y.operating) / tallest * 100;
    const residualHeight  = Math.max(0, y.residual) / tallest * 100;
    return (
      '<div class="bar-col">' +
        '<span class="bar-value">' + formatNumber(y.operating + y.residual) + '</span>' +
        '<div class="bar-stack" style="height:' + (operatingHeight + residualHeight) * 0.8 + '%">' +
          '<div class="bar-residual"  style="flex:' + residualHeight + '"></div>' +
          '<div class="bar-operating" style="flex:' + operatingHeight + '"></div>' +
        '</div>' +
        '<span class="bar-year">' + y.year + '</span>' +
      '</div>'
    );
  }).join("");
}


// Year-by-year table. The PV column adds up to the NPV.
function renderTable(result) {
  document.getElementById("cfBody").innerHTML = result.years.map(function (y) {
    return (
      "<tr>" +
        "<td>" + y.year + "</td>" +
        "<td>" + formatNumber(y.purchase) + "</td>" +
        "<td>" + formatNumber(y.operating) + "</td>" +
        "<td>" + formatNumber(y.residual) + "</td>" +
        "<td>" + formatNumber(y.net) + "</td>" +
        "<td>" + formatNumber(y.pv) + "</td>" +
        "<td>" + formatNumber(y.cumulativeExResidual) + "</td>" +
      "</tr>"
    );
  }).join("");

  document.getElementById("cfFoot").innerHTML =
    '<tr><td>NPV</td><td colspan="4"></td><td>' + formatNumber(result.npv) + '</td><td></td></tr>';
}


// Chart + table only make sense with a complete deal; otherwise show a note.
function renderCashFlows(result, deal, ok) {
  document.getElementById("cfContent").hidden = !ok.all;
  document.getElementById("cfEmpty").hidden = ok.all;
  if (ok.all) {
    renderChart(result, deal);
    renderTable(result);
  }
}


// Reference prices: only for the Bollsta example (the figures are about that rig)
function renderComparison(result, deal, ok) {
  const section = document.getElementById("compare");
  section.hidden = dealMode !== "example";
  if (section.hidden) return;

  const items = PRICE_COMPARISON.map(function (item) {
    return { ...item, value: item.usesDealPrice ? deal.purchasePrice : item.value };
  });
  const breakeven = ok.cashFlows ? Math.max(0, result.breakevenPrice) : 0;
  const scaleMax = Math.max(breakeven, ...items.map(function (i) { return i.value; })) * 1.08;
  const markerLeft = breakeven / scaleMax * 100;

  const rows = items.map(function (item) {
    return (
      '<div class="cmp-row' + (item.highlight ? " is-deal" : "") + '">' +
        '<div class="cmp-head">' +
          '<span>' + item.label + citations(item.sources) +
            (item.reported ? '<span class="tag">reported</span>' : "") + '</span>' +
          '<span class="cmp-value">' + formatUsd(item.value) + '</span>' +
        '</div>' +
        '<div class="cmp-track">' +
          '<div class="cmp-bar" style="width:' + (item.value / scaleMax * 100) + '%"></div>' +
          (ok.cashFlows ? '<span class="cmp-marker" style="left:' + markerLeft + '%"></span>' : "") +
        '</div>' +
      '</div>'
    );
  }).join("");

  document.getElementById("compareBars").innerHTML = rows +
    '<p class="cmp-legend">Dashed line: breakeven price ' + formatUsd(ok.cashFlows ? result.breakevenPrice : NaN) +
    ' (from the sliders above).</p>';
}


/* ---------- 5. update() — refresh everything ----------
   Called every time a slider, button or input changes. */
function update() {
  const deal = readDeal();
  const ok = checkDeal(deal);
  syncOptionsSlider(deal.maxOptions);           // slider max follows the deal
  const assumptions = readAssumptions();
  const result = runModel(deal, assumptions);   // ← all the maths happens in model.js

  renderDealCard(deal, ok);
  renderSliders(assumptions, result, ok, deal);
  renderResults(result, deal, ok);
  renderCashFlows(result, deal, ok);
  renderComparison(result, deal, ok);
}


// The options slider can't go above the number of options in the deal
function syncOptionsSlider(maxOptions) {
  sliders.options.max = maxOptions;
  if (Number(sliders.options.value) > maxOptions) sliders.options.value = maxOptions;
}


/* ---------- 6. Scenarios ---------- */

// Set the four sliders to the values in SCENARIOS (data.js)
function applyScenario(name) {
  const scenario = SCENARIOS[name];
  sliders.options.value      = scenario.options;
  sliders.optionEbitda.value = scenario.optionEbitda;
  sliders.residual.value     = scenario.residual;
  sliders.discountRate.value = scenario.discountRate;
  activeScenario = name;
  showActiveScenario();
  update();
}

// Highlight the active button; show "Custom" once a slider is moved
function showActiveScenario() {
  scenarioButtons.forEach(function (button) {
    const isActive = button.dataset.scenario === activeScenario;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive);
  });
  const label = activeScenario.charAt(0).toUpperCase() + activeScenario.slice(1);
  document.getElementById("scenarioStatus").textContent = label;
}

// Moving any slider → scenario becomes "custom"
Object.values(sliders).forEach(function (slider) {
  slider.addEventListener("input", function () {
    activeScenario = "custom";
    showActiveScenario();
    update();
  });
});

scenarioButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    applyScenario(button.dataset.scenario);
  });
});


/* ---------- 7. Deal buttons ---------- */

// Fill the fields with the Bollsta numbers from data.js
function loadExample() {
  fields.rigName.value       = DEAL.rigName;
  fields.closeYear.value     = DEAL.firstYear - 1;
  fields.purchasePrice.value = DEAL.purchasePrice;
  fields.firmBacklog.value   = DEAL.firmBacklog;
  fields.firmEbitda.value    = DEAL.firmEbitda;
  fields.firmQuarters.value  = DEAL.firmQuarters;
  fields.maxOptions.value    = DEAL.maxOptions;
  dealMode = "example";
  update();
}

// Empty every field (the placeholders show example values) and open the editor
function loadBlank() {
  Object.values(fields).forEach(function (field) { field.value = ""; });
  dealMode = "custom";
  openEditor(true);
  fields.rigName.focus();
  update();
}

// Show or hide the editable fields
function openEditor(open) {
  editor.hidden = !open;
  editorButton.setAttribute("aria-expanded", open);
  editorButton.textContent = open ? "Close editor" : "Change deal";
}

document.getElementById("loadExample").addEventListener("click", loadExample);
document.getElementById("loadBlank").addEventListener("click", loadBlank);
editorButton.addEventListener("click", function () { openEditor(editor.hidden); });

// Typing in any field turns the deal into the user's own ("custom")
Object.values(fields).forEach(function (field) {
  field.addEventListener("input", function () {
    dealMode = "custom";
    update();
  });
});


/* ---------- 8. Start-up ---------- */

// Numbered source list in the footer
document.getElementById("sourceList").innerHTML = Object.keys(SOURCES).map(function (key) {
  const source = SOURCES[key];
  return '<li id="source-' + key + '"><a href="' + source.url + '" target="_blank" rel="noopener">' + source.title + '</a></li>';
}).join("");

loadExample();
applyScenario("base");
