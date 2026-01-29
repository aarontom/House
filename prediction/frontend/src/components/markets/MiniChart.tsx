import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: { yes_price: number; timestamp: string }[];
}

export default function MiniChart({ data }: MiniChartProps) {
  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      index,
      value: Math.round(point.yes_price * 100),
    }));
  }, [data]);

  if (data.length < 2) {
    return null;
  }

  // Determine if trend is up or down
  const firstValue = chartData[0]?.value ?? 50;
  const lastValue = chartData[chartData.length - 1]?.value ?? 50;
  const isUp = lastValue >= firstValue;
  const color = isUp ? '#22c55e' : '#ef4444';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`miniGradient-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[0, 100]} hide />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#miniGradient-${isUp ? 'up' : 'down'})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
