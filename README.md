# Rig Acquisition Stress-Tester

A small static website that tests whether a drilling rig acquisition was worth the price.
It opens with a loaded example, **Odfjell Drilling's purchase of the semi-submersible Deepsea Bollsta
from Northern Ocean (USD 480m, closed December 2025)**. Use "Change deal" or "Start with a blank deal"
to test any other rig deal; the reference prices section only shows for the Bollsta example.

Plain HTML, CSS and JavaScript. No frameworks, no build step, no API, no database.

## Run it

- **Locally:** double-click `index.html`. It works straight from the file system.
- **Vercel:** push the folder to a GitHub repo, then import the repo in Vercel.
  Choose framework preset **"Other"** and leave the build command empty. Vercel serves `index.html` as is.

## File structure

| File | What it does |
|---|---|
| `index.html` | The page layout: hero with the animated sea and rig (SVG), deal card, sliders, results, chart, table, price comparison, method notes, sources. |
| `styles.css` | All styling. Colours are defined once as variables at the top (deep navy blues, white, blue-grey, and safety orange as the only accent). Also holds the hero animations and the mobile/desktop layout. |
| `data.js` | The deal facts for Deepsea Bollsta, each linked to a source. Also holds our two assumptions (maintenance capex, residual decay) and the Bear/Base/Bull scenario values. No calculations. |
| `model.js` | All the maths: cash flows, NPV, IRR, payback, breakeven price. Pure functions that take numbers in and give numbers out. Never touches the page. |
| `app.js` | Connects the page to the model. It reads the sliders and deal fields, checks which inputs are filled in, calls `runModel()`, and writes the results, chart and table back to the page. Results that need a missing input show "–". |

The scripts load in that order (`data.js` → `model.js` → `app.js`), because each one uses what the previous one defined.

## How the model works

1. **Timeline in quarters.** Quarter 0 is the close (December 2025), when the purchase price is paid.
   Quarter 1 is Q1 2026.
2. **Firm contract.** For 9 quarters (Q1 2026 – Q1 2028) the rig earns the firm EBITDA
   (USD 100m per year).
3. **Options.** Each option the client exercises adds 4 quarters at the option-period EBITDA (slider).
4. **Cash flow per quarter** = (annual EBITDA − maintenance capex) ÷ 4.
   Maintenance capex is an assumption of USD 10m per year.
5. **Exit.** When the last contract ends, the rig is sold. The slider sets the value at the end of the
   firm contract. Each exercised option year makes the rig one year older, and its value falls 4% per year.
6. **Discounting.** Each cash flow is divided by (1 + rate)^(quarter ÷ 4), back to the close date.

From these cash flows:

- **NPV** is the sum of all discounted cash flows, including the −480.
- **IRR** is the rate where NPV = 0. It is found by bisection: try a rate, check the sign, halve the interval, repeat.
- **Breakeven price** is the present value of everything after the purchase. It is the most you could pay and still get NPV = 0.
- **Payback** is the first quarter where cumulative cash turns positive. It excludes the residual value.
- **Backlog coverage** = firm backlog ÷ price.
- **Implied EV/EBITDA** = price ÷ firm EBITDA.

## Simplifications

These are stated on the page, under "Method & limitations".

- **Unlevered.** The deal was debt financed, but we value the asset itself at a WACC-style rate.
- **No taxes.**
- **No idle time or recontracting** after the options.
- **Reported figures.** The 2017 price (USD 400m) and the Deepsea Mira construction cost (~USD 720m) come from a secondary source.
