// DonutVolumeChart.tsx
import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#00C49F", "#FF4C4C"]; // Buy - Green, Sell - Red

const DonutVolumeChart: React.FC = () => {
  const [data, setData] = useState([
    { name: "Buy Volume", value: 0 },
    { name: "Sell Volume", value: 0 },
  ]);
  const [interval, setInterval] = useState("5m");
  const symbol = "SUIUSDT";

  const fetchData = async () => {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`
    );
    const klines = await res.json();

    let buy = 0;
    let sell = 0;

    klines.forEach((k: any) => {
      const takerVolume = parseFloat(k[9]); // Taker buy volume
      const totalVolume = parseFloat(k[5]); // Total volume
      buy += takerVolume;
      sell += totalVolume - takerVolume;
    });

    setData([
      { name: "Buy Volume", value: buy },
      { name: "Sell Volume", value: sell },
    ]);
  };

  useEffect(() => {
    fetchData();
  }, [interval]);

  return (
    <div className="bg-[#040814] p-4 rounded-xl text-white  max-w-lg">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Buy vs Sell Volume</h2>
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
      <PieChart width={400} height={250}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          label
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
};

export default DonutVolumeChart;
