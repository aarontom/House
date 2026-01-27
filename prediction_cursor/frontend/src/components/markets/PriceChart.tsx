import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import type { PricePoint } from '../../types';

interface PriceChartProps {
  data: PricePoint[];
  height?: number;
}

export default function PriceChart({ data, height = 200 }: PriceChartProps) {
  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      time: new Date(point.timestamp).getTime(),
      yes_percent: Math.round(point.yes_price * 100),
      no_percent: Math.round(point.no_price * 100),
      index,
    }));
  }, [data]);

  if (data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center bg-background/50 rounded-xl text-muted text-sm"
        style={{ height }}
      >
        Not enough data for chart
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg z-50">
          <p className="text-xs text-muted mb-2">
            {format(new Date(data.timestamp), 'MMM d, h:mm a')}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yes" />
              <span className="text-sm font-semibold text-yes">Yes: {data.yes_percent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-no" />
              <span className="text-sm font-semibold text-no">No: {data.no_percent}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="index"
            stroke="#3a3a3a"
            tick={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#3a3a3a"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="yes_percent"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#yesGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
