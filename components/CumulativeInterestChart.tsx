import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CumulativeDataPoint } from '../utils/calculations';

interface CumulativeInterestChartProps {
  data: CumulativeDataPoint[];
  formatCurrency: (val: number) => string;
}

const CumulativeInterestChart: React.FC<CumulativeInterestChartProps> = ({
  data,
  formatCurrency,
}) => {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Cumulative Interest</h2>
          <p className="text-sm text-slate-400 font-medium">Total interest paid over time</p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
            <span className="w-2.5 h-2.5 bg-red-400 rounded-full"></span> Standard
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> With Prepayment
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorStdInt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPreInt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
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
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
              }}
              formatter={(val: number, name: string) => [
                formatCurrency(val),
                name === 'standardCumInterest' ? 'Standard' : 'With Prepayment',
              ]}
            />
            <Area
              type="monotone"
              dataKey="standardCumInterest"
              stroke="#f87171"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorStdInt)"
            />
            <Area
              type="monotone"
              dataKey="prepaidCumInterest"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPreInt)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CumulativeInterestChart;
