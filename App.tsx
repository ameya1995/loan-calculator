
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingDown, 
  Calendar, 
  IndianRupee, 
  Percent, 
  Sparkles,
  RefreshCw,
  Table as TableIcon,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { LoanInputs, PrepaymentMode, PrepaymentTiming } from './types';
import { getSummary, generateSchedule } from './utils/calculations';
import { getLoanAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [baseInputs, setBaseInputs] = useState({
    principal: 25000000, 
    annualInterestRate: 7.5,
    tenureYears: 15,
  });

  const buildYearlyPrepayments = (years: number) =>
    Array.from({ length: Math.max(0, years) }, () => 0);

  const normalizeYearlyPrepayments = (values: number[], years: number) => {
    const next = values.slice(0, years);
    while (next.length < years) next.push(0);
    return next;
  };

  const [scenarioA, setScenarioA] = useState({
    lumpsumAmount: 3000000,
    prepaymentFrequency: 12,
    monthlyExtraPayment: 0,
    customEmi: 0,
    yearlyPrepayments: buildYearlyPrepayments(Math.round(baseInputs.tenureYears)),
    prepaymentTiming: "end" as PrepaymentTiming,
    prepaymentMode: "reduce-tenure" as PrepaymentMode,
  });

  const [scenarioB, setScenarioB] = useState({
    lumpsumAmount: 1500000,
    prepaymentFrequency: 6,
    monthlyExtraPayment: 50000,
    customEmi: 0,
    yearlyPrepayments: buildYearlyPrepayments(Math.round(baseInputs.tenureYears)),
    prepaymentTiming: "end" as PrepaymentTiming,
    prepaymentMode: "reduce-emi" as PrepaymentMode,
  });

  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [scheduleScenario, setScheduleScenario] = useState<"A" | "B">("A");

  const inputsA: LoanInputs = useMemo(
    () => ({ ...baseInputs, ...scenarioA }),
    [baseInputs, scenarioA]
  );
  const inputsB: LoanInputs = useMemo(
    () => ({ ...baseInputs, ...scenarioB }),
    [baseInputs, scenarioB]
  );

  useEffect(() => {
    if (!compareEnabled && scheduleScenario === "B") {
      setScheduleScenario("A");
    }
  }, [compareEnabled, scheduleScenario]);

  useEffect(() => {
    const years = Math.max(0, Math.round(baseInputs.tenureYears));
    setScenarioA(prev => ({
      ...prev,
      yearlyPrepayments: normalizeYearlyPrepayments(prev.yearlyPrepayments, years),
    }));
    setScenarioB(prev => ({
      ...prev,
      yearlyPrepayments: normalizeYearlyPrepayments(prev.yearlyPrepayments, years),
    }));
  }, [baseInputs.tenureYears]);

  const summary = useMemo(() => getSummary(inputsA), [inputsA]);
  const summaryB = useMemo(
    () => (compareEnabled ? getSummary(inputsB) : null),
    [compareEnabled, inputsB]
  );

  const standardSchedule = useMemo(() => generateSchedule(inputsA, false), [inputsA]);
  const prepayScheduleA = useMemo(() => generateSchedule(inputsA, true), [inputsA]);
  const prepayScheduleB = useMemo(
    () => (compareEnabled ? generateSchedule(inputsB, true) : []),
    [compareEnabled, inputsB]
  );

  const scheduleData = useMemo(() => {
    const maxYear = Math.ceil(baseInputs.tenureYears);
    const data = [];

    for (let year = 1; year <= maxYear; year++) {
      const monthIdx = year * 12 - 1;
      const standardBalance = standardSchedule.length > monthIdx ? standardSchedule[monthIdx].endingBalance : 0;
      const prepaidBalanceA = prepayScheduleA.length > monthIdx 
        ? prepayScheduleA[monthIdx].endingBalance 
        : (prepayScheduleA.length > 0 && monthIdx >= prepayScheduleA.length ? 0 : prepayScheduleA[prepayScheduleA.length - 1]?.endingBalance || 0);
      const prepaidBalanceB = prepayScheduleB.length > monthIdx 
        ? prepayScheduleB[monthIdx].endingBalance 
        : (prepayScheduleB.length > 0 && monthIdx >= prepayScheduleB.length ? 0 : prepayScheduleB[prepayScheduleB.length - 1]?.endingBalance || 0);

      data.push({
        year: `Yr ${year}`,
        standardBalance: Math.round(standardBalance),
        prepaidBalanceA: Math.round(prepaidBalanceA),
        prepaidBalanceB: Math.round(prepaidBalanceB),
      });
    }
    return data;
  }, [standardSchedule, prepayScheduleA, prepayScheduleB, baseInputs.tenureYears]);

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    setBaseInputs(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
  };

  const handleScenarioChange = (
    updater: React.Dispatch<React.SetStateAction<typeof scenarioA>>
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "prepaymentTiming" || name === "prepaymentMode") {
      updater(prev => ({ ...prev, [name]: value }));
      return;
    }
    const numValue = parseFloat(value);
    updater(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
  };

  const handleYearlyPrepaymentChange = (
    updater: React.Dispatch<React.SetStateAction<typeof scenarioA>>,
    yearIndex: number
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value);
    updater(prev => {
      const next = [...prev.yearlyPrepayments];
      next[yearIndex] = isNaN(numValue) ? 0 : numValue;
      return { ...prev, yearlyPrepayments: next };
    });
  };

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    const advice = await getLoanAdvice(summary, inputsA);
    setAiAdvice(advice || "Something went wrong.");
    setLoadingAdvice(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatLakhs = (val: number) => {
    const lakhs = val / 100000;
    if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
    return `${lakhs.toFixed(1)} L`;
  };

  const getFrequencyLabel = (freq: number) => {
    if (freq === 1) return "Every Month";
    if (freq === 3) return "Every Quarter";
    if (freq === 6) return "Every 6 Months";
    if (freq === 12) return "Every Year";
    return `Every ${freq} Months`;
  };

  const formatTenure = (months: number) => {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return `${years}y ${remMonths}m`;
  };

  const pickWinner = (a: number, b: number, preferLower: boolean) => {
    if (a === b) return "tie";
    if (preferLower) return a < b ? "A" : "B";
    return a > b ? "A" : "B";
  };

  const exportScheduleCsv = (schedule: ReturnType<typeof generateSchedule>, label: string) => {
    const header = [
      "Month",
      "Year",
      "Beginning Balance",
      "EMI",
      "Interest",
      "Principal Paid",
      "Extra Payment",
      "Total Paid",
      "Ending Balance",
    ];
    const lines = schedule.map(row => [
      row.month,
      row.year,
      row.beginningBalance.toFixed(2),
      row.emi.toFixed(2),
      row.interest.toFixed(2),
      row.principalPaid.toFixed(2),
      row.lumpsum.toFixed(2),
      row.totalPaidThisMonth.toFixed(2),
      row.endingBalance.toFixed(2),
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 selection:bg-indigo-100 font-inter">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <TrendingDown size={22} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              LoanPro <span className="text-indigo-600 font-extrabold">Visualizer</span>
            </h1>
          </div>
          <button 
            onClick={fetchAdvice}
            disabled={loadingAdvice}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-95 transition-all font-medium text-sm shadow-md disabled:opacity-50"
          >
            {loadingAdvice ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            AI Insights
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-500" />
                Loan Configuration
              </h2>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                  className="accent-indigo-600"
                />
                Compare Scenarios
              </label>
            </div>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-500">Loan Amount</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {formatCurrency(baseInputs.principal)}
                  </span>
                </div>
                <input 
                  type="range" min="1000000" max="100000000" step="500000"
                  name="principal" value={baseInputs.principal} onChange={handleBaseChange}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-500">Interest Rate</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {baseInputs.annualInterestRate}%
                  </span>
                </div>
                <input 
                  type="range" min="1" max="20" step="0.1"
                  name="annualInterestRate" value={baseInputs.annualInterestRate} onChange={handleBaseChange}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-500">Tenure (Years)</label>
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {baseInputs.tenureYears} Yrs
                  </span>
                </div>
                <input 
                  type="range" min="1" max="30" step="1"
                  name="tenureYears" value={baseInputs.tenureYears} onChange={handleBaseChange}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Scenario A</h3>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Prepayments</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-500">Lump Sum Amount</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {formatCurrency(scenarioA.lumpsumAmount)}
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="10000000" step="100000"
                      name="lumpsumAmount" value={scenarioA.lumpsumAmount} onChange={handleScenarioChange(setScenarioA)}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-500">Frequency (Months)</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {getFrequencyLabel(scenarioA.prepaymentFrequency)}
                      </span>
                    </div>
                    <input 
                      type="range" min="1" max="24" step="1"
                      name="prepaymentFrequency" value={scenarioA.prepaymentFrequency} onChange={handleScenarioChange(setScenarioA)}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <p className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={12} />
                      Payment applies at month {scenarioA.prepaymentFrequency}, {scenarioA.prepaymentFrequency * 2}, etc.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-500">Monthly Extra Payment</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {formatCurrency(scenarioA.monthlyExtraPayment)}
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="1000000" step="50000"
                      name="monthlyExtraPayment" value={scenarioA.monthlyExtraPayment} onChange={handleScenarioChange(setScenarioA)}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-500">Custom Monthly EMI</label>
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {scenarioA.customEmi > 0 ? formatCurrency(scenarioA.customEmi) : "Auto"}
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      name="customEmi"
                      value={scenarioA.customEmi}
                      onChange={handleScenarioChange(setScenarioA)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                    />
                    <p className="mt-2 text-[11px] text-slate-400 font-medium">
                      Set to 0 to use the calculated EMI.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-500">Yearly Prepayments</label>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
                        Per Year
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-1">
                      {Array.from({ length: Math.max(0, Math.round(baseInputs.tenureYears)) }).map((_, index) => (
                        <label key={`a-year-${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Year {index + 1}
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={scenarioA.yearlyPrepayments[index] ?? 0}
                            onChange={handleYearlyPrepaymentChange(setScenarioA, index)}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400 font-medium">
                      Applied at the end of each year (month 12, 24, 36, ...).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prepayment Timing</label>
                      <select
                        name="prepaymentTiming"
                        value={scenarioA.prepaymentTiming}
                        onChange={handleScenarioChange(setScenarioA)}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                      >
                        <option value="end">End of Month</option>
                        <option value="start">Start of Month</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prepayment Mode</label>
                      <select
                        name="prepaymentMode"
                        value={scenarioA.prepaymentMode}
                        onChange={handleScenarioChange(setScenarioA)}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                      >
                        <option value="reduce-tenure">Reduce Tenure</option>
                        <option value="reduce-emi">Reduce EMI</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {compareEnabled && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Scenario B</h3>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Prepayments</span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-500">Lump Sum Amount</label>
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {formatCurrency(scenarioB.lumpsumAmount)}
                        </span>
                      </div>
                      <input 
                        type="range" min="0" max="10000000" step="100000"
                        name="lumpsumAmount" value={scenarioB.lumpsumAmount} onChange={handleScenarioChange(setScenarioB)}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-500">Frequency (Months)</label>
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {getFrequencyLabel(scenarioB.prepaymentFrequency)}
                        </span>
                      </div>
                      <input 
                        type="range" min="1" max="24" step="1"
                        name="prepaymentFrequency" value={scenarioB.prepaymentFrequency} onChange={handleScenarioChange(setScenarioB)}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <p className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Clock size={12} />
                        Payment applies at month {scenarioB.prepaymentFrequency}, {scenarioB.prepaymentFrequency * 2}, etc.
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-500">Monthly Extra Payment</label>
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {formatCurrency(scenarioB.monthlyExtraPayment)}
                        </span>
                      </div>
                      <input 
                        type="range" min="0" max="1000000" step="50000"
                        name="monthlyExtraPayment" value={scenarioB.monthlyExtraPayment} onChange={handleScenarioChange(setScenarioB)}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-500">Custom Monthly EMI</label>
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {scenarioB.customEmi > 0 ? formatCurrency(scenarioB.customEmi) : "Auto"}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        name="customEmi"
                        value={scenarioB.customEmi}
                        onChange={handleScenarioChange(setScenarioB)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                      />
                      <p className="mt-2 text-[11px] text-slate-400 font-medium">
                        Set to 0 to use the calculated EMI.
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-500">Yearly Prepayments</label>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
                          Per Year
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-1">
                        {Array.from({ length: Math.max(0, Math.round(baseInputs.tenureYears)) }).map((_, index) => (
                          <label key={`b-year-${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Year {index + 1}
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={scenarioB.yearlyPrepayments[index] ?? 0}
                              onChange={handleYearlyPrepaymentChange(setScenarioB, index)}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-400 font-medium">
                        Applied at the end of each year (month 12, 24, 36, ...).
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prepayment Timing</label>
                        <select
                          name="prepaymentTiming"
                          value={scenarioB.prepaymentTiming}
                          onChange={handleScenarioChange(setScenarioB)}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                        >
                          <option value="end">End of Month</option>
                          <option value="start">Start of Month</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prepayment Mode</label>
                        <select
                          name="prepaymentMode"
                          value={scenarioB.prepaymentMode}
                          onChange={handleScenarioChange(setScenarioB)}
                          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                        >
                          <option value="reduce-tenure">Reduce Tenure</option>
                          <option value="reduce-emi">Reduce EMI</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold opacity-60 uppercase tracking-[0.2em]">Estimated EMI</span>
                <IndianRupee size={18} className="text-indigo-400" />
              </div>
              <div className="text-4xl font-black mb-2 tracking-tight">{formatCurrency(summary.monthlyEmi)}</div>
              <div className="text-xs font-medium text-slate-400">Total payable (std): {formatCurrency(summary.totalAmountStandard)}</div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col transition-all hover:border-emerald-200 group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Interest Saved</span>
              <div className="text-2xl font-black text-emerald-600 mb-1">{formatCurrency(summary.interestSaved)}</div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                <Percent size={14} strokeWidth={3} />
                {((summary.interestSaved / (summary.totalInterestStandard || 1)) * 100).toFixed(1)}% Save
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col transition-all hover:border-indigo-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Time Saved</span>
              <div className="text-2xl font-black text-indigo-600 mb-1">
                {Math.floor(summary.tenureSavedMonths / 12)}y {summary.tenureSavedMonths % 12}m
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-indigo-500 bg-indigo-50 w-fit px-2 py-1 rounded-lg">
                <Calendar size={14} strokeWidth={3} />
                {(summary.tenureSavedMonths / 12).toFixed(1)} Years
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col transition-all hover:border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Total Payable</span>
              <div className="text-2xl font-black text-slate-800 mb-1">{formatCurrency(summary.totalAmountWithPrepayment)}</div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                Reduced from {formatLakhs(summary.totalAmountStandard)}
              </div>
            </div>
          </div>

          {compareEnabled && summaryB && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-indigo-100 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Scenario B Interest Saved</span>
                <div className="text-2xl font-black text-indigo-600 mb-1">{formatCurrency(summaryB.interestSaved)}</div>
                <div className="mt-auto pt-4 text-xs font-bold text-indigo-500">
                  {((summaryB.interestSaved / (summaryB.totalInterestStandard || 1)) * 100).toFixed(1)}% Save
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-indigo-100 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Scenario B Time Saved</span>
                <div className="text-2xl font-black text-indigo-600 mb-1">
                  {Math.floor(summaryB.tenureSavedMonths / 12)}y {summaryB.tenureSavedMonths % 12}m
                </div>
                <div className="mt-auto pt-4 text-xs font-bold text-indigo-500">
                  {(summaryB.tenureSavedMonths / 12).toFixed(1)} Years
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-indigo-100 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Scenario B Total Payable</span>
                <div className="text-2xl font-black text-slate-800 mb-1">{formatCurrency(summaryB.totalAmountWithPrepayment)}</div>
                <div className="mt-auto pt-4 text-xs font-bold text-slate-500">
                  Reduced from {formatLakhs(summaryB.totalAmountStandard)}
                </div>
              </div>
            </div>
          )}

          {compareEnabled && summaryB && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h3 className="text-lg font-black text-slate-800">Scenario A vs B</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Comparison</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="pb-3">Metric</th>
                      <th className="pb-3">Scenario A</th>
                      <th className="pb-3">Scenario B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 font-semibold text-slate-600">Starting EMI</td>
                      <td className={`py-3 font-bold ${pickWinner(prepayScheduleA[0]?.emi ?? summary.monthlyEmi, prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi, true) === "A" ? "text-emerald-600" : "text-indigo-600"}`}>
                        {formatCurrency(prepayScheduleA[0]?.emi ?? summary.monthlyEmi)}
                        {pickWinner(prepayScheduleA[0]?.emi ?? summary.monthlyEmi, prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi, true) === "A" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                      <td className={`py-3 font-bold ${pickWinner(prepayScheduleA[0]?.emi ?? summary.monthlyEmi, prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi, true) === "B" ? "text-emerald-600" : "text-indigo-600"}`}>
                        {formatCurrency(prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi)}
                        {pickWinner(prepayScheduleA[0]?.emi ?? summary.monthlyEmi, prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi, true) === "B" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-slate-600">New Tenure</td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.newTenureMonths, summaryB.newTenureMonths, true) === "A" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatTenure(summary.newTenureMonths)}
                        {pickWinner(summary.newTenureMonths, summaryB.newTenureMonths, true) === "A" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.newTenureMonths, summaryB.newTenureMonths, true) === "B" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatTenure(summaryB.newTenureMonths)}
                        {pickWinner(summary.newTenureMonths, summaryB.newTenureMonths, true) === "B" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-slate-600">Interest Saved</td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.interestSaved, summaryB.interestSaved, false) === "A" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summary.interestSaved)}
                        {pickWinner(summary.interestSaved, summaryB.interestSaved, false) === "A" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.interestSaved, summaryB.interestSaved, false) === "B" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summaryB.interestSaved)}
                        {pickWinner(summary.interestSaved, summaryB.interestSaved, false) === "B" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-slate-600">Total Payable</td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.totalAmountWithPrepayment, summaryB.totalAmountWithPrepayment, true) === "A" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summary.totalAmountWithPrepayment)}
                        {pickWinner(summary.totalAmountWithPrepayment, summaryB.totalAmountWithPrepayment, true) === "A" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.totalAmountWithPrepayment, summaryB.totalAmountWithPrepayment, true) === "B" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summaryB.totalAmountWithPrepayment)}
                        {pickWinner(summary.totalAmountWithPrepayment, summaryB.totalAmountWithPrepayment, true) === "B" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-slate-600">Total Interest</td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.totalInterestWithPrepayment, summaryB.totalInterestWithPrepayment, true) === "A" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summary.totalInterestWithPrepayment)}
                        {pickWinner(summary.totalInterestWithPrepayment, summaryB.totalInterestWithPrepayment, true) === "A" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                      <td className={`py-3 font-semibold ${pickWinner(summary.totalInterestWithPrepayment, summaryB.totalInterestWithPrepayment, true) === "B" ? "text-emerald-600" : "text-slate-700"}`}>
                        {formatCurrency(summaryB.totalInterestWithPrepayment)}
                        {pickWinner(summary.totalInterestWithPrepayment, summaryB.totalInterestWithPrepayment, true) === "B" && (
                          <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800">Projected Payoff</h2>
                <p className="text-sm text-slate-400 font-medium">Principal balance remaining by year</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                  <span className="w-2.5 h-2.5 bg-slate-200 rounded-full"></span> Standard
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span> Scenario A
                </div>
                {compareEnabled && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span> Scenario B
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scheduleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrepaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} tickFormatter={(val) => `₹${(val/10000000).toFixed(1)}Cr`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), "Balance"]}
                  />
                  <Area type="monotone" dataKey="standardBalance" stroke="#e2e8f0" strokeWidth={3} fill="transparent" activeDot={false} />
                  <Area type="monotone" dataKey="prepaidBalanceA" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPrepaid)" />
                  {compareEnabled && (
                    <Area type="monotone" dataKey="prepaidBalanceB" stroke="#34d399" strokeWidth={3} fillOpacity={0.2} fill="#34d399" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {aiAdvice && (
            <div className="bg-white border border-indigo-100 p-8 rounded-3xl relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 text-indigo-600">
                  <Sparkles size={18} />
                  <h3 className="text-slate-900 font-extrabold text-lg">Advisor's Analysis</h3>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                  {aiAdvice}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <button 
              onClick={() => setShowSchedule(!showSchedule)}
              className="w-full py-5 bg-white border border-slate-200 rounded-3xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold text-slate-700 shadow-sm"
            >
              <TableIcon size={20} className="text-slate-400" />
              {showSchedule ? "Hide Full Table" : "View Amortization Schedule"}
            </button>
            
            {showSchedule && (
              <div className="mt-6 overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-2xl max-h-[500px] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setScheduleScenario("A")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${scheduleScenario === "A" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      Scenario A
                    </button>
                    {compareEnabled && (
                      <button
                        onClick={() => setScheduleScenario("B")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${scheduleScenario === "B" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}
                      >
                        Scenario B
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportScheduleCsv(generateSchedule(inputsA, true), "scenario-a-schedule")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Export A CSV
                    </button>
                    {compareEnabled && (
                      <button
                        onClick={() => exportScheduleCsv(generateSchedule(inputsB, true), "scenario-b-schedule")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Export B CSV
                      </button>
                    )}
                  </div>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                    <tr>
                      <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Year/Mo</th>
                      <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Balance</th>
                      <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Total Paid</th>
                      <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Interest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(scheduleScenario === "A" ? generateSchedule(inputsA, true) : generateSchedule(inputsB, true)).map((row) => (
                      <tr key={row.month} className={`hover:bg-indigo-50/30 transition-colors ${row.lumpsum > 0 ? 'bg-emerald-50/40' : ''}`}>
                        <td className="px-6 py-4 text-slate-400 font-bold">Y{row.year} / M{row.month}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">{formatCurrency(row.beginningBalance)}</td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(row.emi + row.lumpsum)}</span>
                          {row.lumpsum > 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">EXTRA</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{formatCurrency(row.interest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
