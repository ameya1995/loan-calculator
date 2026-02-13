import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingDown,
  Calendar,
  IndianRupee,
  Percent,
  Sparkles,
  RefreshCw,
  Table as TableIcon,
  AlertTriangle,
  Wallet,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { LoanInputs, PrepaymentMode, PrepaymentTiming, ScenarioState } from './types';
import {
  getSummary,
  generateSchedule,
  validateInputs,
  getPrepaymentInsight,
  getCumulativeInterestData,
} from './utils/calculations';
import { getLoanAdvice } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import ErrorBoundary from './components/ErrorBoundary';
import ScenarioForm from './components/ScenarioForm';
import InterestBreakdownChart from './components/InterestBreakdownChart';
import CumulativeInterestChart from './components/CumulativeInterestChart';

// ── Helpers ─────────────────────────────────────────────────────────

const buildYearlyPrepayments = (years: number) =>
  Array.from({ length: Math.max(0, years) }, () => 0);

const normalizeYearlyPrepayments = (values: number[], years: number) => {
  const next = values.slice(0, years);
  while (next.length < years) next.push(0);
  return next;
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

const formatLakhs = (val: number) => {
  const lakhs = val / 100000;
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs.toFixed(1)} L`;
};

const getFrequencyLabel = (freq: number) => {
  if (freq === 1) return 'Every Month';
  if (freq === 3) return 'Every Quarter';
  if (freq === 6) return 'Every 6 Months';
  if (freq === 12) return 'Every Year';
  return `Every ${freq} Months`;
};

const formatTenure = (months: number) => {
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years}y ${remMonths}m`;
};

const pickWinner = (a: number, b: number, preferLower: boolean) => {
  if (a === b) return 'tie';
  if (preferLower) return a < b ? 'A' : 'B';
  return a > b ? 'A' : 'B';
};

// ── Default values ──────────────────────────────────────────────────

const DEFAULT_BASE = { principal: 25000000, annualInterestRate: 7.5, tenureYears: 15 };

const DEFAULT_SCENARIO_A: ScenarioState = {
  lumpsumAmount: 3000000,
  prepaymentFrequency: 12,
  monthlyExtraPayment: 0,
  customEmi: 0,
  yearlyPrepayments: buildYearlyPrepayments(15),
  prepaymentTiming: 'end',
  prepaymentMode: 'reduce-tenure',
};

const DEFAULT_SCENARIO_B: ScenarioState = {
  lumpsumAmount: 1500000,
  prepaymentFrequency: 6,
  monthlyExtraPayment: 50000,
  customEmi: 0,
  yearlyPrepayments: buildYearlyPrepayments(15),
  prepaymentTiming: 'end',
  prepaymentMode: 'reduce-emi',
};

// ── App Component ───────────────────────────────────────────────────

const App: React.FC = () => {
  // Persisted state
  const [baseInputs, setBaseInputs] = useLocalStorage('loanpro-base', DEFAULT_BASE);
  const [scenarioA, setScenarioA] = useLocalStorage<ScenarioState>('loanpro-a', DEFAULT_SCENARIO_A);
  const [scenarioB, setScenarioB] = useLocalStorage<ScenarioState>('loanpro-b', DEFAULT_SCENARIO_B);

  // UI state (not persisted)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [scheduleScenario, setScheduleScenario] = useState<'A' | 'B'>('A');

  // ── Derived inputs ────────────────────────────────────────────────

  const inputsA: LoanInputs = useMemo(() => ({ ...baseInputs, ...scenarioA }), [baseInputs, scenarioA]);
  const inputsB: LoanInputs = useMemo(() => ({ ...baseInputs, ...scenarioB }), [baseInputs, scenarioB]);

  // ── Validation ────────────────────────────────────────────────────

  const validationErrors = useMemo(() => validateInputs(inputsA), [inputsA]);

  // ── Effects ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!compareEnabled && scheduleScenario === 'B') setScheduleScenario('A');
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
  }, [baseInputs.tenureYears, setScenarioA, setScenarioB]);

  // ── Memoised computations ─────────────────────────────────────────

  const summary = useMemo(() => getSummary(inputsA), [inputsA]);
  const summaryB = useMemo(() => (compareEnabled ? getSummary(inputsB) : null), [compareEnabled, inputsB]);

  const standardSchedule = useMemo(() => generateSchedule(inputsA, false), [inputsA]);
  const prepayScheduleA = useMemo(() => generateSchedule(inputsA, true), [inputsA]);
  const prepayScheduleB = useMemo(
    () => (compareEnabled ? generateSchedule(inputsB, true) : []),
    [compareEnabled, inputsB],
  );

  const insight = useMemo(() => getPrepaymentInsight(summary), [summary]);

  const cumulativeData = useMemo(
    () => getCumulativeInterestData(standardSchedule, prepayScheduleA),
    [standardSchedule, prepayScheduleA],
  );

  // Chart data for payoff
  const scheduleData = useMemo(() => {
    const maxYear = Math.ceil(baseInputs.tenureYears);
    const data = [];
    for (let year = 1; year <= maxYear; year++) {
      const monthIdx = year * 12 - 1;
      const standardBalance =
        standardSchedule.length > monthIdx ? standardSchedule[monthIdx].endingBalance : 0;
      const prepaidBalanceA =
        prepayScheduleA.length > monthIdx
          ? prepayScheduleA[monthIdx].endingBalance
          : prepayScheduleA.length > 0 && monthIdx >= prepayScheduleA.length
            ? 0
            : prepayScheduleA[prepayScheduleA.length - 1]?.endingBalance || 0;
      const prepaidBalanceB =
        prepayScheduleB.length > monthIdx
          ? prepayScheduleB[monthIdx].endingBalance
          : prepayScheduleB.length > 0 && monthIdx >= prepayScheduleB.length
            ? 0
            : prepayScheduleB[prepayScheduleB.length - 1]?.endingBalance || 0;

      data.push({
        year: `Yr ${year}`,
        standardBalance: Math.round(standardBalance),
        prepaidBalanceA: Math.round(prepaidBalanceA),
        prepaidBalanceB: Math.round(prepaidBalanceB),
      });
    }
    return data;
  }, [standardSchedule, prepayScheduleA, prepayScheduleB, baseInputs.tenureYears]);

  // Active schedule for amortization table (uses memoised data — BUG FIX)
  const activeSchedule = scheduleScenario === 'A' ? prepayScheduleA : prepayScheduleB;

  // ── Event handlers ────────────────────────────────────────────────

  const handleBaseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const numValue = parseFloat(value);
      setBaseInputs(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    },
    [setBaseInputs],
  );

  const makeScenarioHandler = useCallback(
    (updater: (fn: (prev: ScenarioState) => ScenarioState) => void) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'prepaymentTiming' || name === 'prepaymentMode') {
          updater(prev => ({ ...prev, [name]: value as PrepaymentTiming | PrepaymentMode }));
          return;
        }
        const numValue = parseFloat(value);
        updater(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
      },
    [],
  );

  const handleScenarioAChange = useMemo(() => makeScenarioHandler(setScenarioA), [makeScenarioHandler, setScenarioA]);
  const handleScenarioBChange = useMemo(() => makeScenarioHandler(setScenarioB), [makeScenarioHandler, setScenarioB]);

  const makeYearlyHandler = useCallback(
    (updater: (fn: (prev: ScenarioState) => ScenarioState) => void) =>
      (yearIndex: number) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = parseFloat(e.target.value);
        updater(prev => {
          const next = [...prev.yearlyPrepayments];
          next[yearIndex] = isNaN(numValue) ? 0 : numValue;
          return { ...prev, yearlyPrepayments: next };
        });
      },
    [],
  );

  const yearlyHandlerA = useMemo(() => makeYearlyHandler(setScenarioA), [makeYearlyHandler, setScenarioA]);
  const yearlyHandlerB = useMemo(() => makeYearlyHandler(setScenarioB), [makeYearlyHandler, setScenarioB]);

  const fetchAdvice = async () => {
    setLoadingAdvice(true);
    const advice = await getLoanAdvice(summary, inputsA);
    setAiAdvice(advice || 'Something went wrong.');
    setLoadingAdvice(false);
  };

  const exportScheduleCsv = (schedule: ReturnType<typeof generateSchedule>, label: string) => {
    const header = [
      'Month', 'Year', 'Beginning Balance', 'EMI', 'Interest',
      'Principal Paid', 'Extra Payment', 'Total Paid', 'Ending Balance',
    ];
    const lines = schedule.map(row =>
      [
        row.month, row.year, row.beginningBalance.toFixed(2), row.emi.toFixed(2),
        row.interest.toFixed(2), row.principalPaid.toFixed(2), row.lumpsum.toFixed(2),
        row.totalPaidThisMonth.toFixed(2), row.endingBalance.toFixed(2),
      ].join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${label}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen mesh-bg pb-20 selection:bg-indigo-100">
      {/* Header */}
      <header className="glass-card sticky top-0 z-40 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200/60"
              aria-hidden="true"
            >
              <TrendingDown size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">
                LoanPro <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Visualizer</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide">Smart Prepayment Planner</p>
            </div>
          </div>
          <button
            onClick={fetchAdvice}
            disabled={loadingAdvice}
            aria-label="Get AI financial insights"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 active:scale-[0.97] transition-all font-semibold text-sm shadow-lg shadow-indigo-200/50 disabled:opacity-50"
          >
            {loadingAdvice ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            AI Insights
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ─── Left column: Inputs ─────────────────────────────────── */}
        <section className="lg:col-span-4 flex flex-col gap-6" aria-label="Loan configuration">
          <ErrorBoundary>
            <div className="glass-card p-6 rounded-3xl shadow-sm transition-all hover:shadow-md animate-fade-in-up">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Calendar size={16} className="text-indigo-500" />
                  </div>
                  Loan Setup
                </h2>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-indigo-600 transition-colors">
                  <div className={`relative w-9 h-5 rounded-full transition-colors ${compareEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={compareEnabled}
                      onChange={e => setCompareEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${compareEnabled ? 'translate-x-4' : ''}`} />
                  </div>
                  Compare
                </label>
              </div>

              {/* Validation warnings */}
              {validationErrors.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-4" role="alert">
                  <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                    <AlertTriangle size={14} /> Validation
                  </div>
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600 font-medium leading-relaxed">{err}</p>
                  ))}
                </div>
              )}

              <div className="space-y-8">
                {/* Base loan inputs */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-500" id="principal-label">Loan Amount</label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50/80 px-3 py-1 rounded-lg">
                      {formatCurrency(baseInputs.principal)}
                    </span>
                  </div>
                  <input
                    type="range" min="1000000" max="100000000" step="500000"
                    name="principal" value={baseInputs.principal} onChange={handleBaseChange}
                    aria-labelledby="principal-label"
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-500" id="rate-label">Interest Rate</label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50/80 px-3 py-1 rounded-lg">
                      {baseInputs.annualInterestRate}%
                    </span>
                  </div>
                  <input
                    type="range" min="1" max="20" step="0.1"
                    name="annualInterestRate" value={baseInputs.annualInterestRate} onChange={handleBaseChange}
                    aria-labelledby="rate-label"
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-semibold text-slate-500" id="tenure-label">Tenure (Years)</label>
                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50/80 px-3 py-1 rounded-lg">
                      {baseInputs.tenureYears} Yrs
                    </span>
                  </div>
                  <input
                    type="range" min="1" max="30" step="1"
                    name="tenureYears" value={baseInputs.tenureYears} onChange={handleBaseChange}
                    aria-labelledby="tenure-label"
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Scenario A form */}
                <ScenarioForm
                  label="Scenario A"
                  scenario={scenarioA}
                  tenureYears={baseInputs.tenureYears}
                  accentColor="emerald"
                  onScenarioChange={handleScenarioAChange}
                  onYearlyPrepaymentChange={yearlyHandlerA}
                  formatCurrency={formatCurrency}
                  getFrequencyLabel={getFrequencyLabel}
                />

                {/* Scenario B form (conditional) */}
                {compareEnabled && (
                  <ScenarioForm
                    label="Scenario B"
                    scenario={scenarioB}
                    tenureYears={baseInputs.tenureYears}
                    accentColor="indigo"
                    onScenarioChange={handleScenarioBChange}
                    onYearlyPrepaymentChange={yearlyHandlerB}
                    formatCurrency={formatCurrency}
                    getFrequencyLabel={getFrequencyLabel}
                  />
                )}
              </div>
            </div>
          </ErrorBoundary>

          {/* EMI card */}
          <div className="emi-card text-white p-8 rounded-3xl shadow-xl shadow-indigo-200/40 animate-fade-in-up stagger-1">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-[0.2em]">Monthly EMI</span>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <IndianRupee size={16} className="text-indigo-300" />
                </div>
              </div>
              <div className="text-4xl font-black mb-3 tracking-tight drop-shadow-sm">{formatCurrency(summary.monthlyEmi)}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-indigo-300/80">Total payable:</span>
                <span className="text-xs font-bold text-white/70">{formatCurrency(summary.totalAmountStandard)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Right column: Results ──────────────────────────────── */}
        <section className="lg:col-span-8 flex flex-col gap-6" aria-label="Loan analysis results">
          <ErrorBoundary>
            {/* Summary cards — Scenario A */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up group">
                <span className="section-label mb-3">Interest Saved</span>
                <div className="stat-value text-emerald-600 mb-1">{formatCurrency(summary.interestSaved)}</div>
                <div className="mt-auto pt-4">
                  <span className="badge bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <Percent size={12} strokeWidth={3} />
                    {((summary.interestSaved / (summary.totalInterestStandard || 1)) * 100).toFixed(1)}% saved
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up stagger-1 group">
                <span className="section-label mb-3">Time Saved</span>
                <div className="stat-value text-indigo-600 mb-1">
                  {Math.floor(summary.tenureSavedMonths / 12)}y {summary.tenureSavedMonths % 12}m
                </div>
                <div className="mt-auto pt-4">
                  <span className="badge bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Calendar size={12} strokeWidth={3} />
                    {(summary.tenureSavedMonths / 12).toFixed(1)} years faster
                  </span>
                </div>
              </div>

              <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up stagger-2 group">
                <span className="section-label mb-3">Total Payable</span>
                <div className="stat-value text-slate-800 mb-1">{formatCurrency(summary.totalAmountWithPrepayment)}</div>
                <div className="mt-auto pt-4">
                  <span className="badge bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                    <TrendingDown size={12} strokeWidth={3} />
                    from {formatLakhs(summary.totalAmountStandard)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── NEW: Prepayment Insight Card ────────────────────── */}
            {insight.totalPrepaymentOutlay > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden p-6 rounded-3xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50/80 via-white to-white flex flex-col card-hover animate-fade-in-up stagger-1">
                  <span className="section-label mb-3 flex items-center gap-1">
                    <Wallet size={12} className="text-emerald-400" /> Prepaid Outlay
                  </span>
                  <div className="stat-value text-emerald-700 mb-1">
                    {formatCurrency(insight.totalPrepaymentOutlay)}
                  </div>
                  <div className="mt-auto pt-4 text-[11px] font-medium text-slate-400">
                    Extra money beyond standard EMI
                  </div>
                </div>

                <div className="relative overflow-hidden p-6 rounded-3xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/80 via-white to-white flex flex-col card-hover animate-fade-in-up stagger-2">
                  <span className="section-label mb-3 flex items-center gap-1">
                    <Target size={12} className="text-indigo-400" /> Return on Prepayment
                  </span>
                  <div className="stat-value text-indigo-700 mb-1">
                    {insight.roi.toFixed(1)}%
                  </div>
                  <div className="mt-auto pt-4 text-[11px] font-medium text-slate-400">
                    Saved {formatCurrency(insight.interestSaved)} on {formatCurrency(insight.totalPrepaymentOutlay)}
                  </div>
                </div>

                <div className="relative overflow-hidden p-6 rounded-3xl border border-violet-100/60 bg-gradient-to-br from-violet-50/80 via-white to-white flex flex-col card-hover animate-fade-in-up stagger-3">
                  <span className="section-label mb-3">Annual Return</span>
                  <div className="stat-value text-violet-700 mb-1">
                    ~{insight.annualisedReturn.toFixed(1)}% <span className="text-lg font-bold text-violet-400">p.a.</span>
                  </div>
                  <div className="mt-auto pt-4 text-[11px] font-medium text-slate-400">
                    Equivalent guaranteed return
                  </div>
                </div>
              </div>
            )}

            {/* Scenario B summary cards */}
            {compareEnabled && summaryB && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up">
                  <span className="section-label mb-3">B — Interest Saved</span>
                  <div className="stat-value text-indigo-600 mb-1">{formatCurrency(summaryB.interestSaved)}</div>
                  <div className="mt-auto pt-4">
                    <span className="badge bg-indigo-50 text-indigo-600">
                      {((summaryB.interestSaved / (summaryB.totalInterestStandard || 1)) * 100).toFixed(1)}% saved
                    </span>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up stagger-1">
                  <span className="section-label mb-3">B — Time Saved</span>
                  <div className="stat-value text-indigo-600 mb-1">
                    {Math.floor(summaryB.tenureSavedMonths / 12)}y {summaryB.tenureSavedMonths % 12}m
                  </div>
                  <div className="mt-auto pt-4">
                    <span className="badge bg-indigo-50 text-indigo-600">
                      {(summaryB.tenureSavedMonths / 12).toFixed(1)} years faster
                    </span>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-3xl flex flex-col card-hover animate-fade-in-up stagger-2">
                  <span className="section-label mb-3">B — Total Payable</span>
                  <div className="stat-value text-slate-800 mb-1">{formatCurrency(summaryB.totalAmountWithPrepayment)}</div>
                  <div className="mt-auto pt-4">
                    <span className="badge bg-slate-100 text-slate-500">
                      from {formatLakhs(summaryB.totalAmountStandard)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison table */}
            {compareEnabled && summaryB && (
              <div className="glass-card p-6 rounded-3xl shadow-sm animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <h3 className="text-lg font-extrabold text-slate-800">Scenario A vs B</h3>
                  <span className="section-label">Quick Comparison</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" role="table" aria-label="Scenario comparison">
                    <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="pb-3">Metric</th>
                        <th className="pb-3">Scenario A</th>
                        <th className="pb-3">Scenario B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          label: 'Starting EMI',
                          valA: prepayScheduleA[0]?.emi ?? summary.monthlyEmi,
                          valB: prepayScheduleB[0]?.emi ?? summaryB.monthlyEmi,
                          lower: true,
                          isTenure: false,
                        },
                        { label: 'New Tenure', valA: summary.newTenureMonths, valB: summaryB.newTenureMonths, lower: true, isTenure: true },
                        { label: 'Interest Saved', valA: summary.interestSaved, valB: summaryB.interestSaved, lower: false, isTenure: false },
                        { label: 'Total Payable', valA: summary.totalAmountWithPrepayment, valB: summaryB.totalAmountWithPrepayment, lower: true, isTenure: false },
                        { label: 'Total Interest', valA: summary.totalInterestWithPrepayment, valB: summaryB.totalInterestWithPrepayment, lower: true, isTenure: false },
                      ].map(({ label, valA, valB, lower, isTenure }) => {
                        const winner = pickWinner(valA, valB, lower);
                        return (
                          <tr key={label}>
                            <td className="py-3 font-semibold text-slate-600">{label}</td>
                            <td className={`py-3 font-bold ${winner === 'A' ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {isTenure ? formatTenure(valA) : formatCurrency(valA)}
                              {winner === 'A' && (
                                <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                              )}
                            </td>
                            <td className={`py-3 font-bold ${winner === 'B' ? 'text-emerald-600' : 'text-slate-700'}`}>
                              {isTenure ? formatTenure(valB) : formatCurrency(valB)}
                              {winner === 'B' && (
                                <span className="ml-2 text-[10px] uppercase font-bold text-emerald-500">Best</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Projected Payoff Chart ──────────────────────────── */}
            <div className="glass-card p-8 rounded-3xl shadow-sm relative overflow-hidden animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">Projected Payoff</h2>
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
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="year"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                      tickFormatter={(val) => `₹${(val / 10000000).toFixed(1)}Cr`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [formatCurrency(val), 'Balance']}
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

            {/* ── NEW: Interest vs Principal Donut ────────────────── */}
            <InterestBreakdownChart
              principal={baseInputs.principal}
              interestStandard={summary.totalInterestStandard}
              interestWithPrepayment={summary.totalInterestWithPrepayment}
              formatCurrency={formatCurrency}
            />

            {/* ── NEW: Cumulative Interest Chart ─────────────────── */}
            <CumulativeInterestChart data={cumulativeData} formatCurrency={formatCurrency} />

            {/* AI Advice */}
            {aiAdvice && (
              <div className="relative overflow-hidden p-8 rounded-3xl shadow-sm border border-indigo-100/60 bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30 animate-fade-in-up">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200/40">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-extrabold text-lg leading-none">AI Analysis</h3>
                      <p className="text-[10px] font-semibold text-indigo-400 mt-0.5">Powered by Gemini</p>
                    </div>
                  </div>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                    {aiAdvice}
                  </div>
                </div>
              </div>
            )}

            {/* ── Amortization Schedule ───────────────────────────── */}
            <div className="mt-4">
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="w-full py-5 glass-card rounded-3xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all font-bold text-slate-700 shadow-sm group"
                aria-expanded={showSchedule}
              >
                <TableIcon size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                {showSchedule ? 'Hide Full Table' : 'View Amortization Schedule'}
              </button>

              {showSchedule && (
                <div className="mt-6 overflow-x-auto glass-card rounded-3xl shadow-xl max-h-[500px] overflow-y-auto schedule-scroll animate-fade-in-up">
                  <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2" role="tablist">
                      <button
                        role="tab"
                        aria-selected={scheduleScenario === 'A'}
                        onClick={() => setScheduleScenario('A')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          scheduleScenario === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Scenario A
                      </button>
                      {compareEnabled && (
                        <button
                          role="tab"
                          aria-selected={scheduleScenario === 'B'}
                          onClick={() => setScheduleScenario('B')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            scheduleScenario === 'B' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Scenario B
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 no-print">
                      <button
                        onClick={() => exportScheduleCsv(prepayScheduleA, 'scenario-a-schedule')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                      >
                        Export A CSV
                      </button>
                      {compareEnabled && (
                        <button
                          onClick={() => exportScheduleCsv(prepayScheduleB, 'scenario-b-schedule')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          Export B CSV
                        </button>
                      )}
                    </div>
                  </div>
                  <table className="w-full text-left text-xs" role="table" aria-label="Amortization schedule">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Year/Mo</th>
                        <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Balance</th>
                        <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Total Paid</th>
                        <th className="px-6 py-4 font-extrabold text-slate-400 uppercase tracking-widest">Interest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeSchedule.map(row => (
                        <tr
                          key={row.month}
                          className={`hover:bg-indigo-50/30 transition-colors ${row.lumpsum > 0 ? 'bg-emerald-50/40' : ''}`}
                        >
                          <td className="px-6 py-4 text-slate-400 font-bold">
                            Y{row.year} / M{row.month}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">{formatCurrency(row.beginningBalance)}</td>
                          <td className="px-6 py-4 flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(row.emi + row.lumpsum)}</span>
                            {row.lumpsum > 0 && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">
                                EXTRA
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">{formatCurrency(row.interest)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );
};

export default App;
