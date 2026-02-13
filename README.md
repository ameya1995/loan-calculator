# LoanPro: Prepayment Visualizer

An advanced interactive loan prepayment calculator that helps you compare different prepayment strategies, analyze amortization schedules, and visualize interest savings over time. Make informed decisions about loan prepayments with AI-powered insights and comprehensive financial analytics.

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-purple?logo=vite)

## 🌟 Features

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

## 🛠️ Technology Stack

- **Frontend Framework**: React 19.2 with TypeScript
- **Build Tool**: Vite 6.2
- **Charts**: Recharts 3.7
- **AI Integration**: Google Generative AI (Gemini)
- **Icons**: Lucide React
- **Styling**: CSS with modern features

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd loanpro_-prepayment-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables (Optional)**
   
   Create a `.env.local` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   To get a Gemini API key:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env.local` file
   
   *Note: The app works without the API key, but AI insights will be disabled.*

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## 📦 Build & Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploy

The app can be deployed to any static hosting service:

- **Vercel**: Connect your repository and deploy automatically
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions to deploy the `dist` folder
- **Azure Static Web Apps**: Deploy with Azure CLI or GitHub Actions
- **AWS S3 + CloudFront**: Upload the `dist` folder to S3

**Build Command**: `npm run build`  
**Output Directory**: `dist`

## 📖 How to Use

1. **Enter Loan Details**: Input loan amount, interest rate, and tenure
2. **Configure Scenario A**: Set up your first prepayment strategy
3. **Configure Scenario B**: Set up an alternative prepayment strategy
4. **Compare Results**: View side-by-side comparison of both scenarios
5. **Analyze Charts**: Explore interactive visualizations of your loan data
6. **Get AI Insights**: Click "Get AI Insights" for personalized recommendations
7. **Export Data**: Download amortization schedules as CSV files

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI insights | No |

### Prepayment Modes

- **Reduce Tenure**: Maintain EMI amount, pay off loan faster
- **Reduce EMI**: Maintain loan tenure, lower monthly payments

### Prepayment Timing

- **Start of Month**: Prepayments applied at the beginning of each period
- **End of Month**: Prepayments applied at the end of each period

## 📊 Features in Detail

### Dual Scenario Comparison
Compare two different prepayment strategies to find the optimal approach for your financial situation.

### Flexible Prepayment Options
- Monthly extra payments
- Periodic lump sums (monthly, quarterly, semi-annual, annual)
- Per-year customization
- Combined strategies

### AI-Powered Insights
Get intelligent recommendations on:
- Optimal prepayment amounts
- EMI vs lump sum strategies
- Tax implications (Section 24b/80C for India)
- Financial planning advice

### Interactive Visualizations
- Loan balance progression over time
- Interest breakdown comparison
- Cumulative interest savings tracker
- Responsive and mobile-friendly charts

### Data Export
Download complete amortization schedules as CSV files for external analysis.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with React and TypeScript
- Charts powered by Recharts
- AI insights powered by Google Gemini
- Icons from Lucide React

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

Made with ❤️ for better financial planning