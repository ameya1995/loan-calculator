
import { LoanInputs, AmortizationRow, LoanSummary, PrepaymentInsight } from "../types";

// ── Validation ──────────────────────────────────────────────────────
export const validateInputs = (inputs: LoanInputs): string[] => {
  const errors: string[] = [];
  if (inputs.principal <= 0) errors.push("Loan amount must be positive.");
  if (inputs.annualInterestRate < 0) errors.push("Interest rate cannot be negative.");
  if (inputs.annualInterestRate > 50) errors.push("Interest rate seems unrealistically high (>50%).");
  if (inputs.tenureYears <= 0) errors.push("Tenure must be at least 1 year.");
  if (inputs.tenureYears > 40) errors.push("Tenure exceeds 40 years.");
  if (inputs.lumpsumAmount < 0) errors.push("Lump sum amount cannot be negative.");
  if (inputs.monthlyExtraPayment < 0) errors.push("Monthly extra payment cannot be negative.");
  if (inputs.customEmi < 0) errors.push("Custom EMI cannot be negative.");
  if (inputs.customEmi > 0) {
    const minEmi = inputs.principal * (inputs.annualInterestRate / 12 / 100);
    if (inputs.customEmi <= minEmi) {
      errors.push(`Custom EMI must exceed monthly interest (₹${Math.ceil(minEmi).toLocaleString('en-IN')}) to reduce principal.`);
    }
  }
  return errors;
};

// ── EMI Calculations ────────────────────────────────────────────────
export const calculateEmi = (p: number, r: number, n: number): number => {
  if (p <= 0 || n <= 0) return 0;
  const monthlyRate = r / 12 / 100;
  const numMonths = n * 12;
  if (monthlyRate === 0) return p / numMonths;
  const emi =
    (p * monthlyRate * Math.pow(1 + monthlyRate, numMonths)) /
    (Math.pow(1 + monthlyRate, numMonths) - 1);
  return emi;
};

const calculateEmiForMonths = (p: number, r: number, months: number): number => {
  if (p <= 0 || months <= 0) return 0;
  const monthlyRate = r / 12 / 100;
  if (monthlyRate === 0) return p / months;
  const emi =
    (p * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return emi;
};

export const generateSchedule = (inputs: LoanInputs, usePrepayments: boolean): AmortizationRow[] => {
  const {
    principal,
    annualInterestRate,
    tenureYears,
    lumpsumAmount,
    prepaymentFrequency,
    monthlyExtraPayment,
    customEmi,
    yearlyPrepayments,
    prepaymentTiming,
    prepaymentMode,
  } = inputs;
  const monthlyRate = annualInterestRate / 12 / 100;
  const totalMonths = Math.max(0, Math.round(tenureYears * 12));
  const standardEmi = calculateEmi(principal, annualInterestRate, tenureYears);

  let balance = principal;
  const schedule: AmortizationRow[] = [];
  let month = 1;

  // Safety cap at 50 years (600 months)
  const maxMonths = Math.min(600, totalMonths || 600);

  while (balance > 0.01 && month <= maxMonths) {
    const beginningBalance = balance;
    const remainingMonths = Math.max(1, totalMonths - month + 1);

    let extraPayment = 0;
    if (usePrepayments) {
      extraPayment += Math.max(0, monthlyExtraPayment);
      if (prepaymentFrequency > 0 && month % prepaymentFrequency === 0) {
        extraPayment += Math.max(0, lumpsumAmount);
      }
      const isYearStart = month % 12 === 1;
      const isYearEnd = month % 12 === 0;
      const applyYearlyAtStart = prepaymentTiming === "start" && isYearStart;
      const applyYearlyAtEnd = prepaymentTiming === "end" && isYearEnd;
      if (applyYearlyAtStart || applyYearlyAtEnd) {
        const yearIndex = Math.floor((month - 1) / 12);
        const yearlyAmount = yearlyPrepayments?.[yearIndex] ?? 0;
        extraPayment += Math.max(0, yearlyAmount);
      }
    }

    let balanceAfterPrepay = beginningBalance;
    let appliedExtra = 0;

    if (usePrepayments && prepaymentTiming === "start" && extraPayment > 0) {
      appliedExtra = Math.min(balanceAfterPrepay, extraPayment);
      balanceAfterPrepay -= appliedExtra;
    }

    const interest = balanceAfterPrepay * monthlyRate;

    let emi = standardEmi;
    if (usePrepayments && prepaymentMode === "reduce-emi") {
      emi = calculateEmiForMonths(balanceAfterPrepay, annualInterestRate, remainingMonths);
    }
    if (usePrepayments && customEmi > 0) {
      emi = customEmi;
    }

    // Monthly payment is EMI, but shouldn't exceed (balance + interest)
    emi = Math.min(balanceAfterPrepay + interest, emi);
    const principalPaid = emi - interest;

    if (usePrepayments && prepaymentTiming === "end" && extraPayment > 0) {
      const remainingAfterEmi = Math.max(0, balanceAfterPrepay - principalPaid);
      appliedExtra = Math.min(remainingAfterEmi, extraPayment);
      balanceAfterPrepay = remainingAfterEmi - appliedExtra;
    } else {
      balanceAfterPrepay = balanceAfterPrepay - principalPaid;
    }

    balance = balanceAfterPrepay;

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      beginningBalance,
      emi,
      interest,
      principalPaid,
      lumpsum: appliedExtra,
      totalPaidThisMonth: emi + appliedExtra,
      endingBalance: Math.max(0, balance),
    });

    if (balance <= 0) break;
    month++;
  }

  return schedule;
};

export const getSummary = (inputs: LoanInputs): LoanSummary => {
  const standardSchedule = generateSchedule(inputs, false);
  const prepaySchedule = generateSchedule(inputs, true);
  
  const emi = inputs.customEmi > 0
    ? inputs.customEmi
    : calculateEmi(inputs.principal, inputs.annualInterestRate, inputs.tenureYears);
  
  const totalInterestStandard = standardSchedule.reduce((sum, row) => sum + row.interest, 0);
  const totalInterestWithPrepayment = prepaySchedule.reduce((sum, row) => sum + row.interest, 0);
  
  // Accurate total amounts: sum of all actual payments (EMI + prepayments)
  const totalAmountStandard = standardSchedule.reduce((sum, row) => sum + row.totalPaidThisMonth, 0);
  const totalAmountWithPrepayment = prepaySchedule.reduce((sum, row) => sum + row.totalPaidThisMonth, 0);

  // Total extra money the borrower puts in beyond standard EMI
  const totalPrepaymentOutlay = prepaySchedule.reduce((sum, row) => sum + row.lumpsum, 0);

  return {
    monthlyEmi: emi,
    totalInterestStandard,
    totalInterestWithPrepayment,
    interestSaved: Math.max(0, totalInterestStandard - totalInterestWithPrepayment),
    standardTenureMonths: standardSchedule.length,
    newTenureMonths: prepaySchedule.length,
    tenureSavedMonths: Math.max(0, standardSchedule.length - prepaySchedule.length),
    totalAmountStandard,
    totalAmountWithPrepayment,
    totalPrepaymentOutlay,
  };
};

// ── Prepayment Insight ──────────────────────────────────────────────
export const getPrepaymentInsight = (summary: LoanSummary): PrepaymentInsight => {
  const { interestSaved, totalPrepaymentOutlay, tenureSavedMonths } = summary;
  const roi = totalPrepaymentOutlay > 0
    ? (interestSaved / totalPrepaymentOutlay) * 100
    : 0;

  // Simple annualised return: spread the ROI across the years saved
  const yearsSaved = tenureSavedMonths / 12;
  const annualisedReturn = yearsSaved > 0 && totalPrepaymentOutlay > 0
    ? (Math.pow(1 + interestSaved / totalPrepaymentOutlay, 1 / Math.max(1, yearsSaved)) - 1) * 100
    : 0;

  return {
    totalPrepaymentOutlay,
    interestSaved,
    roi,
    annualisedReturn,
    tenureSavedMonths,
  };
};

// ── Cumulative Interest Data ────────────────────────────────────────
export interface CumulativeDataPoint {
  month: number;
  year: number;
  label: string;
  standardCumInterest: number;
  prepaidCumInterest: number;
}

export const getCumulativeInterestData = (
  standardSchedule: AmortizationRow[],
  prepaySchedule: AmortizationRow[],
  yearlyGranularity = true,
): CumulativeDataPoint[] => {
  const maxLen = Math.max(standardSchedule.length, prepaySchedule.length);
  const points: CumulativeDataPoint[] = [];
  let stdCum = 0;
  let preCum = 0;

  for (let i = 0; i < maxLen; i++) {
    stdCum += standardSchedule[i]?.interest ?? 0;
    preCum += prepaySchedule[i]?.interest ?? 0;
    const month = i + 1;
    const year = Math.ceil(month / 12);

    if (yearlyGranularity && month % 12 !== 0 && i !== maxLen - 1) continue;

    points.push({
      month,
      year,
      label: `Yr ${year}`,
      standardCumInterest: Math.round(stdCum),
      prepaidCumInterest: Math.round(preCum),
    });
  }
  return points;
};
