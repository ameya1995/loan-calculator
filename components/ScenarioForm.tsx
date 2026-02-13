import React from 'react';
import { Clock } from 'lucide-react';
import { ScenarioState } from '../types';

interface ScenarioFormProps {
  label: string;
  scenario: ScenarioState;
  tenureYears: number;
  accentColor: 'emerald' | 'indigo';
  onScenarioChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onYearlyPrepaymentChange: (yearIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatCurrency: (val: number) => string;
  getFrequencyLabel: (freq: number) => string;
}

const ScenarioForm: React.FC<ScenarioFormProps> = ({
  label,
  scenario,
  tenureYears,
  accentColor,
  onScenarioChange,
  onYearlyPrepaymentChange,
  formatCurrency,
  getFrequencyLabel,
}) => {
  const accent = accentColor === 'emerald'
    ? { badge: 'text-emerald-600 bg-emerald-50/80', slider: 'accent-emerald-500', tag: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' }
    : { badge: 'text-indigo-600 bg-indigo-50/80', slider: 'accent-indigo-500', tag: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-500' };

  const timingLabel = scenario.prepaymentTiming === 'start' ? 'start' : 'end';

  return (
    <div className={`pt-6 border-t ${accent.border}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent.dot}`}></span>
          {label}
        </h3>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${accent.badge}`}>Prepayments</span>
      </div>

      <div className="space-y-6">
        {/* Lump Sum Amount */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-lumpsum-label`}>Lump Sum Amount</label>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${accent.badge}`}>
              {formatCurrency(scenario.lumpsumAmount)}
            </span>
          </div>
          <input
            type="range" min="0" max="10000000" step="100000"
            name="lumpsumAmount" value={scenario.lumpsumAmount} onChange={onScenarioChange}
            aria-labelledby={`${label}-lumpsum-label`}
            className={`w-full ${accent.slider}`}
          />
        </div>

        {/* Frequency */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-freq-label`}>Frequency</label>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${accent.badge}`}>
              {getFrequencyLabel(scenario.prepaymentFrequency)}
            </span>
          </div>
          <input
            type="range" min="1" max="24" step="1"
            name="prepaymentFrequency" value={scenario.prepaymentFrequency} onChange={onScenarioChange}
            aria-labelledby={`${label}-freq-label`}
            className={`w-full ${accent.slider}`}
          />
          <p className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Clock size={11} className="text-slate-300" />
            Payment at month {scenario.prepaymentFrequency}, {scenario.prepaymentFrequency * 2}, etc.
          </p>
        </div>

        {/* Monthly Extra Payment */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-extra-label`}>Monthly Extra</label>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${accent.badge}`}>
              {formatCurrency(scenario.monthlyExtraPayment)}
            </span>
          </div>
          <input
            type="range" min="0" max="1000000" step="50000"
            name="monthlyExtraPayment" value={scenario.monthlyExtraPayment} onChange={onScenarioChange}
            aria-labelledby={`${label}-extra-label`}
            className={`w-full ${accent.slider}`}
          />
        </div>

        {/* Custom EMI */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-emi-label`}>Custom Monthly EMI</label>
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${accent.badge}`}>
              {scenario.customEmi > 0 ? formatCurrency(scenario.customEmi) : 'Auto'}
            </span>
          </div>
          <input
            type="number" min="0" step="any"
            name="customEmi" value={scenario.customEmi} onChange={onScenarioChange}
            aria-labelledby={`${label}-emi-label`}
            className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <p className="mt-2 text-[11px] text-slate-400 font-medium">
            Set to 0 for calculated EMI
          </p>
        </div>

        {/* Yearly Prepayments */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-500">Yearly Prepayments</label>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${accent.badge}`}>
              Per Year
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-h-40 overflow-y-auto pr-1 schedule-scroll">
            {Array.from({ length: Math.max(0, Math.round(tenureYears)) }).map((_, index) => (
              <label key={`${label}-year-${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Yr {index + 1}
                <input
                  type="number" min="0" step="any"
                  value={scenario.yearlyPrepayments[index] ?? 0}
                  onChange={onYearlyPrepaymentChange(index)}
                  aria-label={`${label} year ${index + 1} prepayment`}
                  className="mt-1 w-full rounded-xl border border-slate-200/80 bg-white/80 px-2 py-1.5 text-xs font-semibold text-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400 font-medium">
            Applied at the {timingLabel} of each year.
          </p>
        </div>

        {/* Timing & Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest" id={`${label}-timing-label`}>
              Timing
            </label>
            <select
              name="prepaymentTiming" value={scenario.prepaymentTiming} onChange={onScenarioChange}
              aria-labelledby={`${label}-timing-label`}
              className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="end">End of Month</option>
              <option value="start">Start of Month</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest" id={`${label}-mode-label`}>
              Mode
            </label>
            <select
              name="prepaymentMode" value={scenario.prepaymentMode} onChange={onScenarioChange}
              aria-labelledby={`${label}-mode-label`}
              className="mt-2 w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-600 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="reduce-tenure">Reduce Tenure</option>
              <option value="reduce-emi">Reduce EMI</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioForm;
