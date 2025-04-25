import React, { useEffect, useState } from "react";
import { executeStrategy } from "./services/executeStrategy";
import { toast } from "react-toastify";
import { liquidate } from "./services/liquidate";

interface RowData {
  strategy_id: string;
  is_bid: boolean;
}

const StrategyTable: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [data, setData] = useState<RowData[]>([
    { strategy_id: "", is_bid: false },
  ]);

  // Load strategy_id from localStorage on component mount
  useEffect(() => {
    const storedStrategyId = localStorage.getItem("STRATEGY_ID") || "";
    setData([{ strategy_id: storedStrategyId, is_bid: false }]);
  }, []);

  const handleChange = (
    index: number,
    field: keyof RowData,
    value: string | boolean
  ) => {
    const updated = [...data];
    updated[index][field] = value as never;
    setData(updated);
  };

  const handleSubmit = async () => {
    const strategy_ids = data[0].strategy_id;
    const bid = data[0].is_bid;
    console.log("Submitted data:", strategy_ids, bid);

    try {
      const result = await executeStrategy(strategy_ids, bid);
      console.log("Strategy executed:", result);

      setErrorMessage("");
      toast.success("Executed strategy");
    } catch (error) {
      console.error("Error creating strategy:", error);
      setErrorMessage("Error creating strategy. Please try again later.");
      toast.error("Failed to create strategy.");
    }
  };

  const handleLiquidate = async () => {
    const result = await liquidate();
    console.log("LIQUIDATED");
    toast.success("Liquidated");
    return result;
  };

  return (
    <div className="p-4">
      <table className="table-auto border border-collapse border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Strategy_id</th>
            <th className="border px-4 py-2">is_bid</th>
            <th className="border px-4 py-2">Execute</th>
            <th className="border px-4 py-2">Liquidate</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx}>
              <td className="border px-4 py-2">
                <input
                  type="text"
                  value={row.strategy_id}
                  readOnly
                  className="border p-1 w-full bg-gray-100"
                />
              </td>
              <td className="border px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={row.is_bid}
                  onChange={(e) =>
                    handleChange(idx, "is_bid", e.target.checked)
                  }
                />
              </td>
              <td className="border px-4 py-2 text-center">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Execute
                </button>
              </td>
              <td className="border px-4 py-2 text-center">
                <button
                  onClick={handleLiquidate}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Liquidate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StrategyTable;
