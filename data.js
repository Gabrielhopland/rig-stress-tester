/* ============================================================
   data.js — The deal facts (default example: Deepsea Bollsta)
   ------------------------------------------------------------
   This file only holds DATA. It does not calculate anything.
   - All money amounts are in USD millions.
   - Every fact points to a source in SOURCES.
   - To test another rig deal, change the numbers in DEAL
     (or use the "Edit deal inputs" panel on the page).
   ============================================================ */


/* ---------- 1. Sources ----------
   Each fact below refers to one of these by its key
   (e.g. "energyPedia"). The page numbers them [1], [2] ... */
const SOURCES = {
  energyPedia: {
    title: "Energy-Pedia — Odfjell Drilling acquires Deepsea Bollsta from Northern Ocean",
    url: "https://www.energy-pedia.com/news/norway/odfjell-drilling-acquires-deepsea-bollsta-from-northern-ocean-201964"
  },
  odfjellPresentation: {
    title: "Odfjell Drilling — Company presentation, November 2025",
    url: "https://www.odfjelldrilling.com/wp-content/uploads/2025/11/odfjell-drilling-company-presentation-november-2025.pdf"
  },
  northernOcean: {
    title: "Northern Ocean — Sale of Deepsea Bollsta",
    url: "https://www.northernocean.no/nol-sale-of-deepsea-bollsta/"
  },
  goodInvestors: {
    title: "The Good Investors — Company Notes Series #15: Northern Ocean (secondary source)",
    url: "https://www.thegoodinvestors.sg/company-notes-series-15-northern-ocean/"
  },
  oeDigital: {
    title: "OE Digital — Deepsea Bollsta rig gets new name as Odfjell Drilling takes ownership",
    url: "https://www.oedigital.com/news/533506-deepsea-bollsta-rig-gets-new-name-as-odfjell-drilling-takes-ownership"
  }
};


/* ---------- 2. Deal inputs used by the model ---------- */
const DEAL = {
  rigName: "Deepsea Bollsta",
  buyer: "Odfjell Drilling",
  seller: "Northern Ocean",
  closeLabel: "December 2025",   // valuation date = deal close
  firstYear: 2026,               // first forecast quarter is Q1 of this year

  purchasePrice: 480,            // USDm, paid at close
  firmBacklog: 355,              // USDm of firm contract backlog added
  firmEbitda: 100,               // USDm per year under the current Equinor contract
  firmQuarters: 9,               // Q1 2026 – Q1 2028 = 9 quarters of firm contract
  maxOptions: 5,                 // 5 x 1-year options held by Equinor

  // --- ASSUMPTIONS (not from a source — our own simplifications) ---
  maintenanceCapex: 10,          // USDm per year, flat. Assumption.
  residualDecay: 0.04            // rig value falls 4% per extra year of age. Assumption.
};


/* ---------- 3. Facts shown in the "Deal" card ----------
   "sources" lists keys from SOURCES above. */
const DEAL_FACTS = [
  { label: "Purchase price",  value: "USD 480m",                         sources: ["energyPedia"] },
  { label: "Settlement",      value: "All cash, fully debt financed",    sources: ["northernOcean", "oeDigital"] },
  { label: "Closed",          value: "December 2025",                    sources: ["northernOcean", "oeDigital"] },
  { label: "Contract",        value: "Equinor, firm to Q1 2028 + 5 × 1-year options", sources: ["energyPedia"] },
  { label: "Firm backlog",    value: "USD 355m",                         sources: ["energyPedia"] },
  { label: "EBITDA, current contract", value: "~USD 100m / year",        sources: ["odfjellPresentation"] },
  { label: "Rig",             value: "Built 2019 · Moss CS60E semi-sub · Hyundai Heavy Industries", sources: ["oeDigital"] }
];


/* ---------- 4. Price comparison ----------
   usesDealPrice: true means "take the price from the deal inputs".
   reported: true means the figure comes from a secondary source. */
const PRICE_COMPARISON = [
  { label: "Northern Ocean paid (2017)",       value: 400,  reported: true,  sources: ["goodInvestors"] },
  { label: "Odfjell Drilling paid (2025)",     usesDealPrice: true, highlight: true, sources: ["energyPedia"] },
  { label: "Deepsea Mira construction cost (sister rig)", value: 720, reported: true, sources: ["goodInvestors"] }
];


/* ---------- 5. Scenarios ----------
   Each button sets the four sliders to these values.
   These are placeholder views, not sourced forecasts. */
const SCENARIOS = {
  bear: { options: 0, optionEbitda: 70,  residual: 250, discountRate: 11 },
  base: { options: 3, optionEbitda: 100, residual: 380, discountRate: 9 },
  bull: { options: 5, optionEbitda: 140, residual: 500, discountRate: 8 }
};
