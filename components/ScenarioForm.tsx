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
    ? { badge: 'text-emerald-600 bg-emerald-50', slider: 'accent-emerald-500', tag: 'text-emerald-600' }
    : { badge: 'text-indigo-600 bg-indigo-50', slider: 'accent-indigo-500', tag: 'text-indigo-600' };

  const timingLabel = scenario.prepaymentTiming === 'start' ? 'start' : 'end';

  return (
    <div className="pt-6 border-t border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700">{label}</h3>
        <span className={`text-[10px] font-bold uppercase ${accent.tag}`}>Prepayments</span>
      </div>

      <div className="space-y-6">
        {/* Lump Sum Amount */}
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-lumpsum-label`}>Lump Sum Amount</label>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${accent.badge}`}>
              {formatCurrency(scenario.lumpsumAmount)}
            </span>
          </div>
          <input
            type="range" min="0" max="10000000" step="100000"
            name="lumpsumAmount" value={scenario.lumpsumAmount} onChange={onScenarioChange}
            aria-labelledby={`${label}-lumpsum-label`}
            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${accent.slider}`}
          />
        </div>

        {/* Frequency */}
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-freq-label`}>Frequency (Months)</label>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${accent.badge}`}>
              {getFrequencyLabel(scenario.prepaymentFrequency)}
            </span>
          </div>
          <input
            type="range" min="1" max="24" step="1"
            name="prepaymentFrequency" value={scenario.prepaymentFrequency} onChange={onScenarioChange}
            aria-labelledby={`${label}-freq-label`}
            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${accent.slider}`}
          />
          <p className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Clock size={12} />
            Payment applies at month {scenario.prepaymentFrequency}, {scenario.prepaymentFrequency * 2}, etc.
          </p>
        </div>

        {/* Monthly Extra Payment */}
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-extra-label`}>Monthly Extra Payment</label>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${accent.badge}`}>
              {formatCurrency(scenario.monthlyExtraPayment)}
            </span>
          </div>
          <input
            type="range" min="0" max="1000000" step="50000"
            name="monthlyExtraPayment" value={scenario.monthlyExtraPayment} onChange={onScenarioChange}
            aria-labelledby={`${label}-extra-label`}
            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${accent.slider}`}
          />
        </div>

        {/* Custom EMI */}
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-slate-500" id={`${label}-emi-label`}>Custom Monthly EMI</label>
            <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${accent.badge}`}>
              {scenario.customEmi > 0 ? formatCurrency(scenario.customEmi) : 'Auto'}
            </span>
          </div>
          <input
            type="number" min="0" step="any"
            name="customEmi" value={scenario.customEmi} onChange={onScenarioChange}
            aria-labelledby={`${label}-emi-label`}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
          />
          <p className="mt-2 text-[11px] text-slate-400 font-medium">
            Set to 0 to use the calculated EMI.
          </p>
        </div>

        {/* Yearly Prepayments */}
        <div>
          <div className="flex justify-between mb-3">
            <label className="text-sm font-semibold text-slate-500">Yearly Prepayments</label>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${accent.badge}`}>
              Per Year
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto pr-1 schedule-scroll">
            {Array.from({ length: Math.max(0, Math.round(tenureYears)) }).map((_, index) => (
              <label key={`${label}-year-${index}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Year {index + 1}
                <input
                  type="number" min="0" step="any"
                  value={scenario.yearlyPrepayments[index] ?? 0}
                  onChange={onYearlyPrepaymentChange(index)}
                  aria-label={`${label} year ${index + 1} prepayment`}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600"
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
              Prepayment Timing
            </label>
            <select
              name="prepaymentTiming" value={scenario.prepaymentTiming} onChange={onScenarioChange}
              aria-labelledby={`${label}-timing-label`}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
            >
              <option value="end">End of Month</option>
              <option value="start">Start of Month</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest" id={`${label}-mode-label`}>
              Prepayment Mode
            </label>
            <select
              name="prepaymentMode" value={scenario.prepaymentMode} onChange={onScenarioChange}
              aria-labelledby={`${label}-mode-label`}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
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
