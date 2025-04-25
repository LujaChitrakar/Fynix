import React, { useEffect, useState } from "react";

const TradingStats: React.FC = () => {
  const [buyVolume, setBuyVolume] = useState<number>(0);
  const [sellVolume, setSellVolume] = useState<number>(0);

  const symbol = "SUIUSDT"; // Binance symbol

  useEffect(() => {
    const fetchTrades = async () => {
      const res = await fetch(
        `https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=1000`
      );
      const trades = await res.json();

      let buy = 0;
      let sell = 0;

      trades.forEach((trade: any) => {
        if (trade.isBuyerMaker) {
          sell += parseFloat(trade.qty); // seller-initiated
        } else {
          buy += parseFloat(trade.qty); // buyer-initiated
        }
      });

      setBuyVolume(buy);
      setSellVolume(sell);
    };

    fetchTrades();

    const interval = setInterval(fetchTrades, 5 * 100); // refresh every minute
    return () => clearInterval(interval);
  }, [symbol]);

  const totalVolume = buyVolume + sellVolume;
  const buyPercentage = ((buyVolume / totalVolume) * 100).toFixed(2);
  const sellPercentage = ((sellVolume / totalVolume) * 100).toFixed(2);

  return (
    <div className="text-white bg-[#060d21] p-4 rounded-xl shadow-md space-y-4">
      <h2 className="text-lg font-semibold">
        Buy / Sell Volume (Last 1000 Trades)
      </h2>
      <div className="flex justify-between">
        <div>
          <p className="text-green-400">
            Buy : {buyVolume.toFixed(2)} SUI ({buyPercentage}%)
          </p>
          <p className="text-red-400">
            Sell : {sellVolume.toFixed(2)} SUI ({sellPercentage}%)
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradingStats;
