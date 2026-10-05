# WealthFlow — Compounder

A no-nonsense tool that shows you how your money actually grows — and what your big life goals cost your retirement along the way.

Plug in your salary, savings, and portfolio. Watch the projection move in real time.

---

## What it does

- **Projects your wealth** from today to retirement, based on salary, raises, and investments
- **Splits your portfolio** across assets with different returns — anything unallocated sits as cash, growing at 0%
- **Grows your salary** with your investment amount each year, on autopilot
- **Adjusts for inflation** — every big number also shows in today's money, so it's never mistaken for real buying power
- **Prices your life goals** — a car, a house, a wedding — at the age you plan them, inflation-adjusted, and shows what pulling that money out costs your retirement
- **Separates contributions from growth**, charted side by side across your whole timeline
- **Converts your total** into USD and gold equivalents
- **Live sliders** next to every number — drag and watch the curve move. Type past a slider's max and the track just grows to fit
- **Hover the chart** to see your pot, what you put in, and what compounding added at any age
- **Share a link** that carries your whole scenario — or save privately to your browser instead
- **Light / dark mode**, remembered between visits
- **Hide Amounts** — blur every money figure with one toggle, for when someone's looking over your shoulder
- **Built-in glossary** explaining every field, result, and button

---

## Daily Net Worth Tracker (`networth.html`)

A dedicated daily tracking companion that calculates and logs your real-world net worth day by day:

- **Vehicles & Cars**: Add multiple cars with make, model, year, and current estimated market value
- **Gold & Precious Metals**:
  - Supports **24K, 22K, 21K, 18K, and 14K** karats
  - Measure in **Tolas** or **Grams**
  - **Live Spot Price Engine**: Automatically pulls live USD/PKR and XAU gold spot prices from public currency APIs and computes exact Karat purity prices
  - Direct reference link to [GoldPriceZ.com](https://goldpricez.com/pk/21k/tola-india) for quick local retail rate comparison
- **Stocks & Equities**: Enter company / ticker symbols, share quantities, and market prices per share
- **Real Estate & Plots**: Track plots, residential houses, apartments, and commercial properties
- **Cash & Bank Accounts**: Add checking/savings accounts, cash reserves, crypto, and other liquid assets
- **Liabilities & Debt**: Deducts loans, mortgages, or credit card balances to give your true net worth
- **Day-over-Day Tracking**: Automatically computes and highlights daily net worth change (`+ / - Rs.` and `%`)
- **Daily Snapshots & History Log**: Save daily entries with timestamps, view historical logs, and inspect an interactive SVG trend curve
- **One-Click Sync to Compounder**: Export your today's net worth directly into the Compounder's starting savings with a single click
- **Portfolio Split Auto-Fill & Suggestions**: In the Compounder's `Investment Portfolio Split` section, get automatic suggestion chips, datalist autocomplete, and 1-click 100% balanced auto-fill directly from your logged Gold, Cars, PSX Stocks, Real Estate, and Cash holdings
- **Save & Load Locally**: Save your net worth scenarios privately in browser local storage, with one-click **Save Scenario** and **Load Saved** buttons matching the Compounder
- **Shared Privacy & Themes**: Seamless dark/light theme and privacy mask toggles shared with the Compounder

---

## Built with

Plain HTML, CSS, and JavaScript — zero external framework dependencies, runs offline directly from your browser.

---

## How the math holds up

The number-crunching lives in pure functions, separate from the UI, so it can be checked on its own. Open `index.html#test` and check the console — multiple automated checks cover compounding, salary raises, inflation, goal pricing, and edge cases.

A few things done right under the hood:
- Contributions land at the *start* of each month and earn that month's return (annuity-due), using the true monthly compounding rate — not annual ÷ 12
- Growth is tracked directly, not backed into — so the numbers can never quietly go negative
- Inflation-adjusted figures (not raw future rupees) feed the USD/gold conversions and the chart, so a 35-year projection doesn't look like a flat line with a spike at the end
- Gold pricing converts 1 troy ounce (31.1035 g) spot rate to 1 tola (11.6638 g) and scales by exact karat purity (e.g. 21/24 = 87.5% for 21K)

---

## Privacy

Everything runs in your browser — your numbers are never uploaded.

- **Live Rates** is the only feature that calls the internet (a public currency API, no personal data sent)
- **Share** puts your inputs in the URL itself — great for sending a scenario
- **Save Scenario** keeps everything local in browser storage, so nothing leaves your machine

