# LoanPro Prepayment Visualizer

A powerful loan prepayment visualizer that helps you compare different prepayment strategies, analyze amortization schedules, and visualize interest savings over time.

## Features

### 📊 Dual Scenario Comparison
- Compare two different prepayment strategies side-by-side
- View detailed summaries of total interest, tenure, and savings for each scenario
- Identify the optimal prepayment approach for your financial goals

### 💰 Flexible Prepayment Options
- **Monthly Extra Payments**: Add extra amount to your regular EMI every month
- **Periodic Lump Sum Payments**: Make lump sum prepayments at custom intervals:
  - Monthly, Quarterly, Semi-Annual, or Annual frequency
  - Configure amount and timing for each period
- **Per-Year Customization**: Set different prepayment amounts for each year of the loan
- **Prepayment Timing**: Choose between start-of-month or end-of-month prepayments
- **Prepayment Modes**: 
  - Reduce Tenure (pay off loan faster)
  - Reduce EMI (lower monthly payments)

### 📈 Interactive Visualizations
- **Loan Balance Over Time**: Area chart showing principal reduction across years
- **Interest Breakdown**: Side-by-side comparison of interest paid vs saved
- **Cumulative Interest Savings**: Track accumulated savings over the loan period
- **Responsive Charts**: Built with Recharts for smooth, interactive data exploration

### 📋 Detailed Amortization Schedule
- Month-by-month breakdown of:
  - Opening and closing balance
  - Principal and interest components
  - Extra payments and prepayments
  - Cumulative interest paid
- **CSV Export**: Download complete amortization table for offline analysis

### 🤖 AI-Powered Insights
- Get personalized financial advice powered by Google Gemini AI
- Executive summary of prepayment impact
- Strategic recommendations for optimal prepayment amount
- Alternative suggestions (EMI vs lump sum strategies)
- Tax implications guidance for India (Section 24b/80C)

### ⚙️ Advanced Configuration
- **Custom EMI Override**: Set your own EMI amount (or leave at 0 for auto-calculation)
- **Input Validation**: Real-time validation with helpful error messages
- **Local Storage**: Automatically saves your scenarios for future sessions
- **Error Boundaries**: Robust error handling for a smooth user experience

### 🎯 Comprehensive Analytics
- Calculate total interest saved
- Determine tenure reduction in years and months
- Compare standard vs prepayment schedules
- Track cumulative savings over time
- Winner indicators for each metric (tenure, interest, total cost)

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in [.env.local](.env.local) to enable AI insights (optional)
3. Run the app:
   `npm run dev`
