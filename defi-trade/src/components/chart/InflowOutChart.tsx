// LineVolumeChart.tsx
import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface TradePoint {
  time: string;
  buy: number;
  sell: number;
}

const InflowOutChart: React.FC = () => {
  const [data, setData] = useState<TradePoint[]>([]);
  const [interval, setInterval] = useState("5m");
  const symbol = "SUIUSDT";

  const fetchKlines = async () => {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`
    );
    const klines = await res.json();

    const formatted: TradePoint[] = klines.map((k: any) => {
      const date = new Date(k[0]);
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      const time = `${hours}:${minutes}`;

      const totalVolume = parseFloat(k[5]);
      const takerBuyVolume = parseFloat(k[9]);
      const takerSellVolume = totalVolume - takerBuyVolume;

      return {
        time,
        buy: parseFloat(takerBuyVolume.toFixed(2)),
        sell: parseFloat(takerSellVolume.toFixed(2)),
      };
    });

    setData(formatted);
  };

  useEffect(() => {
    fetchKlines();
  }, [interval]);

  return (
    <div className="bg-[#040814] p-4 rounded-xl text-white w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Inflow/Outflow Over Time</h2>
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="bg-gray-800 border border-gray-600 p-1 rounded text-sm"
        >
          <option value="5m">5 Min</option>
          <option value="30m">30 Min</option>
          <option value="1h">1 Hour</option>
          <option value="1d">1 Day</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="buy"
            stroke="#00C49F"
            name="Buy Inflow"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="sell"
            stroke="#FF4C4C"
            name="Sell Outflow"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InflowOutChart;
