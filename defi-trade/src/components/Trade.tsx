import { useState } from "react";

const Trade = () => {
  const [price, setPrice] = useState(2.245); // Default price
  const [amount, setAmount] = useState(0); // User entered amount

  const total = (price * amount).toFixed(2);

  const handleBuy = () => {
    console.log("Buy SUI →", { price, amount, total });
  };

  const handleSell = () => {
    console.log("Sell SUI →", { price, amount, total });
  };

  return (
    <div className="bg-[#0d0e13] p-6 rounded-lg text-white w-full max-w-5xl mx-auto grid grid-cols-2 gap-4">
      {/* Buy Section */}
      <div className="space-y-4 border-r border-gray-700 pr-4">
        <div>
          <label className="block text-sm">Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
          />
        </div>

        <div>
          <label className="block text-sm">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
          />
        </div>

        <div className="flex justify-between text-sm">
          <span>Total</span>
          <span>{total} USDC</span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
            <span>5%</span>
            <span>20%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            onChange={(e) => {
              const step = parseInt(e.target.value);
              const percentages = [0.05, 0.2, 0.5, 1];
              const available = 100;
              setAmount(
                parseFloat((available * percentages[step - 1]).toFixed(2))
              );
            }}
            className="w-full accent-green-500"
          />
        </div>

        <button
          className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded"
          onClick={handleBuy}
        >
          Buy SUI
        </button>
      </div>

      {/* Sell Section */}
      <div className="space-y-4 pl-4">
        <div>
          <label className="block text-sm">Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
          />
        </div>

        <div>
          <label className="block text-sm">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
          />
        </div>

        <div className="flex justify-between text-sm">
          <span>Total</span>
          <span>{total} USDC</span>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1 px-1">
            <span>5%</span>
            <span>20%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            onChange={(e) => {
              const step = parseInt(e.target.value);
              const percentages = [0.05, 0.2, 0.5, 1];
              const available = 100; // Example available balance, replace with real value
              setAmount(
                parseFloat((available * percentages[step - 1]).toFixed(2))
              );
            }}
            className="w-full accent-green-500"
          />
        </div>

        <button
          className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded"
          onClick={handleSell}
        >
          Sell SUI
        </button>
      </div>
    </div>
  );
};

export default Trade;
