<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LoanPro Prepayment Visualizer

A loan prepayment visualizer that compares scenarios, projects amortization schedules, and shows interest savings.

## Features

- Scenario comparison with prepayment modes (reduce tenure or reduce EMI)
- Monthly extra payments and periodic lump sum prepayments
- Per-year prepayment inputs with start/end timing
- Custom monthly EMI override (set to 0 for auto EMI)
- Amortization table and CSV export

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in [.env.local](.env.local) to enable AI insights (optional)
3. Run the app:
   `npm run dev`
