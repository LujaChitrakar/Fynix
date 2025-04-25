import React, { useState, useEffect } from "react";
import { useMystenWallet } from "../components/context/WalletContext";
import { createStrategy } from "../components/services/createStrategy";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StrategyForm: React.FC = () => {
  const { isConnected, address, getWalletAdapter } = useMystenWallet();
  const [strategyId, setStrategyId] = useState<string>("");

  const [formData, setFormData] = useState({
    strategyName: "",
    buyPriceLower: "",
    buyPriceUpper: "",
    sellPriceLower: "",
    sellPriceUpper: "",
    stoploss: "",
    amount: "",
    leverage: 1,
  });
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Load existing strategy ID from localStorage on component mount
  useEffect(() => {
    const savedStrategyId = localStorage.getItem("STRATEGY_ID");
    if (savedStrategyId) {
      setStrategyId(savedStrategyId);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, leverage: Number(e.target.value) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedData = {
      ...formData,
      buyPriceLower: Number(formData.buyPriceLower),
      buyPriceUpper: Number(formData.buyPriceUpper),
      sellPriceLower: Number(formData.sellPriceLower),
      sellPriceUpper: Number(formData.sellPriceUpper),
      stoploss: Number(formData.stoploss),
      amount: Number(formData.amount),
      leverage: Number(formData.leverage),
    };

    if (!isConnected || !address) {
      setErrorMessage(
        "Wallet is not connected. Please connect your wallet first."
      );
      toast.error("Wallet not connected!");
      return;
    }

    const walletAdapter = getWalletAdapter();
    if (!walletAdapter) {
      setErrorMessage("Failed to get wallet adapter. Please try again.");
      toast.error("Wallet adapter error!");
      return;
    }

    try {
      const result = await createStrategy(walletAdapter, parsedData);
      console.log("Strategy Created:", result);

      // Get the strategy ID from localStorage after creation
      setTimeout(() => {
        const savedStrategyId = localStorage.getItem("STRATEGY_ID");
        if (savedStrategyId) {
          setStrategyId(savedStrategyId);
        }
      }, 1000); // Small delay to ensure localStorage is updated

      setErrorMessage("");
      toast.success("Strategy created successfully!");
    } catch (error) {
      console.error("Error creating strategy:", error);
      setErrorMessage("Error creating strategy. Please try again later.");
      toast.error("Failed to create strategy.");
    }
  };

  const calculatePercentage = (percent: number) => {
    const available = 100; // Example available balance, replace with real value
    setFormData({
      ...formData,
      amount: (available * percent).toFixed(2),
    });
  };

  return (
    <div className="bg-[#0d0e13] flex p-6 rounded-lg text-white w-full max-w-5xl mx-auto gap-4">
      <ToastContainer />

      {/* Create Strategy Section */}
      <div className="space-y-4 border-r border-gray-700 pr-4">
        <h2 className="text-lg font-bold mb-4">Create Strategy</h2>

        <div>
          <label className="block text-sm">Strategy Name</label>
          <input
            type="text"
            name="strategyName"
            value={formData.strategyName}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
            placeholder="Enter strategy name"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Buy Price Lower</label>
            <input
              type="number"
              name="buyPriceLower"
              value={formData.buyPriceLower}
              onChange={handleChange}
              className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm">Buy Price Upper</label>
            <input
              type="number"
              name="buyPriceUpper"
              value={formData.buyPriceUpper}
              onChange={handleChange}
              className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Sell Price Lower</label>
            <input
              type="number"
              name="sellPriceLower"
              value={formData.sellPriceLower}
              onChange={handleChange}
              className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm">Sell Price Upper</label>
            <input
              type="number"
              name="sellPriceUpper"
              value={formData.sellPriceUpper}
              onChange={handleChange}
              className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm">Stoploss</label>
          <input
            type="number"
            name="stoploss"
            value={formData.stoploss}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm">Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full bg-transparent border border-gray-600 p-2 rounded text-right"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm">
            Leverage: {formData.leverage}x
          </label>
          <input
            type="range"
            name="leverage"
            min={1}
            max={5}
            value={formData.leverage}
            onChange={handleSliderChange}
            className="w-full accent-blue-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded"
        >
          Create Strategy
        </button>

        {errorMessage && (
          <div className="error-message text-red-500 text-center mt-2 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="text-sm mt-2">
          <span className="font-medium">Wallet:</span>{" "}
          {isConnected && address ? (
            <span className="text-green-500">
              Connected ({address.slice(0, 6)}...{address.slice(-4)})
            </span>
          ) : (
            <span className="text-red-500">Not Connected</span>
          )}
        </div>
      </div>

      {/* Strategy Details Section */}
      <div className="space-y-4 pl-4">
        <h2 className="text-lg font-bold mb-4">Strategy Details</h2>

        {strategyId ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm">Strategy ID</label>
              <div className="w-full bg-transparent border border-gray-600 p-2 rounded text-xs break-all">
                {strategyId}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400">
              This ID is stored in your browser and can be used to track your
              strategy.
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Strategy Parameters</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>Strategy Name:</div>
                <div className="text-right">
                  {formData.strategyName || "N/A"}
                </div>

                <div>Buy Range:</div>
                <div className="text-right">
                  {formData.buyPriceLower && formData.buyPriceUpper
                    ? `${formData.buyPriceLower} - ${formData.buyPriceUpper}`
                    : "Not set"}
                </div>

                <div>Sell Range:</div>
                <div className="text-right">
                  {formData.sellPriceLower && formData.sellPriceUpper
                    ? `${formData.sellPriceLower} - ${formData.sellPriceUpper}`
                    : "Not set"}
                </div>

                <div>Stoploss:</div>
                <div className="text-right">
                  {formData.stoploss || "Not set"}
                </div>

                <div>Amount:</div>
                <div className="text-right">{formData.amount || "0.00"}</div>

                <div>Leverage:</div>
                <div className="text-right">{formData.leverage}x</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 italic">
            No strategy created yet. Create a strategy to see its details here.
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyForm;
