import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface InterestBreakdownChartProps {
  principal: number;
  interestStandard: number;
  interestWithPrepayment: number;
  formatCurrency: (val: number) => string;
}

const COLORS_STANDARD = ['#6366f1', '#e2e8f0'];
const COLORS_PREPAID = ['#10b981', '#e2e8f0'];

const InterestBreakdownChart: React.FC<InterestBreakdownChartProps> = ({
  principal,
  interestStandard,
  interestWithPrepayment,
  formatCurrency,
}) => {
  const standardData = [
    { name: 'Interest', value: Math.round(interestStandard) },
    { name: 'Principal', value: Math.round(principal) },
  ];
  const prepaidData = [
    { name: 'Interest', value: Math.round(interestWithPrepayment) },
    { name: 'Principal', value: Math.round(principal) },
  ];

  const standardPct = ((interestStandard / (principal + interestStandard)) * 100).toFixed(1);
  const prepaidPct = ((interestWithPrepayment / (principal + interestWithPrepayment)) * 100).toFixed(1);

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm animate-fade-in-up">
      <h2 className="text-xl font-extrabold text-slate-800 mb-2">Interest vs Principal</h2>
      <p className="text-sm text-slate-400 font-medium mb-8">Where your money goes</p>

      <div className="grid grid-cols-2 gap-6">
        {/* Standard */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Without Prepayment
          </span>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={standardData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {standardData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS_STANDARD[idx]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <span className="text-xs font-bold text-indigo-600 mt-2">{standardPct}% Interest</span>
        </div>

        {/* With Prepayment */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            With Prepayment
          </span>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prepaidData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {prepaidData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS_PREPAID[idx]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <span className="text-xs font-bold text-emerald-600 mt-2">{prepaidPct}% Interest</span>
        </div>
      </div>

      <div className="flex justify-center gap-8 mt-6 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: COLORS_STANDARD[0] }}></span>
          Interest
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-200"></span>
          Principal
        </div>
      </div>
    </div>
  );
};

export default InterestBreakdownChart;
