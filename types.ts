
export type PrepaymentTiming = "start" | "end";
export type PrepaymentMode = "reduce-tenure" | "reduce-emi";

export interface LoanInputs {
  principal: number;
  annualInterestRate: number;
  tenureYears: number;
  lumpsumAmount: number;
  prepaymentFrequency: number; // Frequency in months (e.g., 1, 6, 12)
  monthlyExtraPayment: number;
  customEmi: number; // Optional user-defined EMI
  yearlyPrepayments: number[]; // One value per year, applied at year-end
  prepaymentTiming: PrepaymentTiming;
  prepaymentMode: PrepaymentMode;
}

export interface AmortizationRow {
  month: number;
  year: number;
  beginningBalance: number;
  emi: number;
  interest: number;
  principalPaid: number;
  lumpsum: number;
  totalPaidThisMonth: number;
  endingBalance: number;
}

export interface LoanSummary {
  monthlyEmi: number;
  totalInterestStandard: number;
  totalInterestWithPrepayment: number;
  interestSaved: number;
  standardTenureMonths: number;
  newTenureMonths: number;
  tenureSavedMonths: number;
  totalAmountStandard: number;
  totalAmountWithPrepayment: number;
}
