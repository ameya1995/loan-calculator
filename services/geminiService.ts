
import { GoogleGenAI } from "@google/genai";
import { LoanSummary, LoanInputs } from "../types";

export const getLoanAdvice = async (summary: LoanSummary, inputs: LoanInputs) => {
  // Always use {apiKey: process.env.API_KEY} for initialization
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Calculate annual prepayment based on frequency (frequency is months between payments)
  const annualLumpSum = inputs.prepaymentFrequency > 0 
    ? (12 / inputs.prepaymentFrequency) * inputs.lumpsumAmount 
    : 0;
  const annualExtra = annualLumpSum + (inputs.monthlyExtraPayment || 0) * 12;

  // Corrected the reference from inputs.annualLumpsum to calculated annualPrepayment
  const prompt = `
    As a senior financial advisor, analyze this home loan scenario for a user in India.
    
    Current Inputs:
    - Loan Amount: ₹${(inputs.principal / 10000000).toFixed(2)} Crore
    - Interest Rate: ${inputs.annualInterestRate}%
    - Standard Tenure: ${inputs.tenureYears} years
    - Planned Annual Prepayment: ₹${(annualExtra / 100000).toFixed(2)} Lakhs
    - Prepayment Timing: ${inputs.prepaymentTiming === "start" ? "Start of month" : "End of month"}
    - Prepayment Mode: ${inputs.prepaymentMode === "reduce-emi" ? "Reduce EMI" : "Reduce Tenure"}
    
    Comparison Results:
    - Interest Saved: ₹${summary.interestSaved.toLocaleString('en-IN')}
    - Tenure Reduced By: ${Math.floor(summary.tenureSavedMonths / 12)} years and ${summary.tenureSavedMonths % 12} months
    - New Tenure: ${Math.floor(summary.newTenureMonths / 12)} years and ${summary.newTenureMonths % 12} months
    
    Please provide:
    1. A brief executive summary of the impact.
    2. Strategic advice: Is this prepayment amount optimal? 
    3. Alternative suggestions (e.g., increasing EMI vs lumpsum).
    4. Tax implications in India (Section 24b/80C) briefly.
    
    Format the response in clean Markdown.
  `;

  try {
    // Using gemini-3-flash-preview for general financial analysis tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access the .text property directly, it is not a method
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to fetch AI advice. Please check your connection and try again.";
  }
};
