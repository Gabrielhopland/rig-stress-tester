/* ============================================================
   model.js — All the calculations
   ------------------------------------------------------------
   Pure functions only: numbers in, numbers out.
   Nothing here touches the web page — that is app.js's job.

   How the model works, in one paragraph:
   We pay the purchase price at close (quarter 0). Every quarter
   after that, the rig earns (annual EBITDA − maintenance capex) / 4.
   The firm contract lasts a set number of quarters; each option
   the client exercises adds 4 more quarters at the option EBITDA.
   When the last contract ends, we sell the rig for its residual
   value. Cash flows are discounted back to the close date.

   Units: USD millions. Rates are decimals (0.09 = 9%).
   ============================================================ */


/* Turn a quarter number into a label like "Q1 2028".
   Quarter 0 is the close; quarter 1 is Q1 of firstYear. */
function quarterLabel(q, firstYear) {
  if (q === 0) return "Close";
  const year = firstYear + Math.floor((q - 1) / 4);
  const quarterInYear = ((q - 1) % 4) + 1;
  return "Q" + quarterInYear + " " + year;
}

/* Calendar year a quarter belongs to (quarter 0 = close year). */
function quarterYear(q, firstYear) {
  if (q === 0) return firstYear - 1;
  return firstYear + Math.floor((q - 1) / 4);
}


/* Residual value at exit.
   The slider gives the value at the END OF THE FIRM CONTRACT.
   Each exercised option = one more year of age = value falls
   by the decay rate (compounded). 0 options → no reduction. */
function residualAtExit(residualAtFirmEnd, optionsExercised, decay) {
  return residualAtFirmEnd * Math.pow(1 - decay, optionsExercised);
}


/* Build the quarterly cash flows.
   deal        = facts from data.js (price, EBITDA, firm quarters ...)
   assumptions = slider values { options, optionEbitda, residual, discountRate }
   Returns an array with one object per quarter. */
function buildCashFlows(deal, assumptions) {
  const flows = [];
  const exitQuarter = deal.firmQuarters + 4 * assumptions.options;
  const exitValue = residualAtExit(assumptions.residual, assumptions.options, deal.residualDecay);

  // Quarter 0: we pay for the rig.
  flows.push({ q: 0, purchase: -deal.purchasePrice, operating: 0, residual: 0 });

  // Quarter 1 ... exit: the rig works and earns money.
  for (let q = 1; q <= exitQuarter; q++) {
    const inFirmPeriod = q <= deal.firmQuarters;
    const annualEbitda = inFirmPeriod ? deal.firmEbitda : assumptions.optionEbitda;

    flows.push({
      q: q,
      purchase: 0,
      operating: (annualEbitda - deal.maintenanceCapex) / 4,  // one quarter's cash
      residual: q === exitQuarter ? exitValue : 0             // sale only in the last quarter
    });
  }

  // Add the total for each quarter.
  flows.forEach(function (f) { f.total = f.purchase + f.operating + f.residual; });
  return flows;
}


/* Discount factor for quarter q at an ANNUAL rate.
   q / 4 converts quarters to years: quarter 6 = 1.5 years. */
function discountFactor(rate, q) {
  return 1 / Math.pow(1 + rate, q / 4);
}


/* Net present value: sum of every cash flow × its discount factor. */
function npv(flows, rate) {
  let sum = 0;
  flows.forEach(function (f) { sum += f.total * discountFactor(rate, f.q); });
  return sum;
}


/* Internal rate of return = the discount rate where NPV = 0.
   Method: bisection.
   1. Start with a low rate (NPV positive) and a high rate (NPV negative).
   2. Try the midpoint. Keep the half where NPV changes sign.
   3. Repeat until the interval is tiny.
   Returns null if no IRR exists in the range. */
function irr(flows) {
  let low = -0.9;   // -90%
  let high = 2.0;   // 200%
  if (npv(flows, low) * npv(flows, high) > 0) return null;  // same sign → no answer

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    if (npv(flows, mid) > 0) {
      low = mid;    // NPV still positive → IRR is higher
    } else {
      high = mid;   // NPV negative → IRR is lower
    }
  }
  return (low + high) / 2;
}


/* Payback: first quarter where cumulative cash turns positive.
   We EXCLUDE the residual value on purpose — otherwise payback
   would just be "the day you sell the rig".
   Returns the quarter number, or null if never reached. */
function paybackQuarter(flows) {
  let cumulative = 0;
  for (let i = 0; i < flows.length; i++) {
    cumulative += flows[i].purchase + flows[i].operating;
    if (i > 0 && cumulative >= 0) return flows[i].q;
  }
  return null;
}


/* Sum the quarterly flows into calendar years (for the chart and table). */
function annualSummary(flows, rate, firstYear) {
  const years = [];
  let cumulativeExResidual = 0;

  flows.forEach(function (f) {
    const year = quarterYear(f.q, firstYear);
    let row = years.find(function (y) { return y.year === year; });
    if (!row) {
      row = { year: year, purchase: 0, operating: 0, residual: 0, net: 0, pv: 0 };
      years.push(row);
    }
    row.purchase += f.purchase;
    row.operating += f.operating;
    row.residual += f.residual;
    row.net += f.total;
    row.pv += f.total * discountFactor(rate, f.q);
  });

  years.forEach(function (row) {
    cumulativeExResidual += row.purchase + row.operating;
    row.cumulativeExResidual = cumulativeExResidual;
  });
  return years;
}


/* Run everything and return one results object for app.js. */
function runModel(deal, assumptions) {
  const flows = buildCashFlows(deal, assumptions);
  const rate = assumptions.discountRate;
  const valueNpv = npv(flows, rate);
  const payback = paybackQuarter(flows);
  const exitQuarter = deal.firmQuarters + 4 * assumptions.options;

  return {
    flows: flows,
    years: annualSummary(flows, rate, deal.firstYear),

    npv: valueNpv,
    irr: irr(flows),

    paybackQuarter: payback,
    paybackLabel: payback === null ? null : quarterLabel(payback, deal.firstYear),
    paybackYears: payback === null ? null : payback / 4,

    // Breakeven price = PV of everything AFTER the purchase.
    // It is the highest price at which NPV would be exactly zero.
    breakevenPrice: valueNpv + deal.purchasePrice,

    backlogCoverage: deal.firmBacklog / deal.purchasePrice,
    evToEbitda: deal.purchasePrice / deal.firmEbitda,

    firmEndLabel: quarterLabel(deal.firmQuarters, deal.firstYear),
    exitLabel: quarterLabel(exitQuarter, deal.firstYear),
    exitValue: residualAtExit(assumptions.residual, assumptions.options, deal.residualDecay)
  };
}
