import React, { useEffect, useState } from "react";
import { getHealthFactor } from "./services/getHealthFactor";
import { toast } from "react-toastify";
import { getLiquidationPrice } from "./services/getLiquidationPrice";
import { checkLiquidation } from "./services/getLiquidationStatus"; // Assume this might return boolean | undefined

// Type definition
type LiquidationInfo = {
  strategy_id: string;
  health_factor: number;
  liquidation_price: number;
  liquidation_status: boolean; // Expects a definite boolean
};

// Helper function to safely parse numbers
const parseNumericValue = (
  value: string | number | undefined | null
): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return null;
  }
  return num;
};

const LiquidationTable: React.FC = () => {
  const [displayItem, setDisplayItem] = useState<LiquidationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setDisplayItem(null);

      try {
        const savedStrategyId = localStorage.getItem("STRATEGY_ID");
        if (!savedStrategyId) {
          console.warn("STRATEGY_ID not found in localStorage.");
          setIsLoading(false);
          return;
        }

        // Fetch raw values
        const rawHealthFactor = await getHealthFactor();
        const rawLiquidationPrice = await getLiquidationPrice();
        const rawLiquidationStatus = await checkLiquidation();

        // Safely parse the numeric values
        const health_factor = parseNumericValue(rawHealthFactor);
        const liquidation_price = parseNumericValue(rawLiquidationPrice);

        // Validate the parsed numbers
        if (health_factor === null) {
          console.error("Failed to parse health factor:", rawHealthFactor);
          throw new Error("Invalid or missing health factor data.");
        }
        if (liquidation_price === null) {
          console.error(
            "Failed to parse liquidation price:",
            rawLiquidationPrice
          );
          throw new Error("Invalid or missing liquidation price data.");
        }

        // --- Validate the liquidation status ---
        if (rawLiquidationStatus === undefined) {
          console.error(
            "Failed to get liquidation status:",
            rawLiquidationStatus
          );
          throw new Error("Invalid or missing liquidation status data.");
        }
        // --- Now we know rawLiquidationStatus is a boolean ---
        const liquidation_status: boolean = rawLiquidationStatus;

        // Create the data object only if all checks pass
        const data: LiquidationInfo = {
          strategy_id: savedStrategyId,
          health_factor: health_factor / 1_000_000,
          liquidation_price: liquidation_price / 10 ** 9,
          liquidation_status: liquidation_status, // Now guaranteed to be boolean
        };

        setDisplayItem(data);
      } catch (error: any) {
        console.error("Error fetching strategy info:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch strategy info.";
        toast.error(message);
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- JSX Rendering (no changes needed here from the previous version) ---
  return (
    <div className="text-white p-6 rounded-lg w-full max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        Liquidation Overview{" "}
        {displayItem ? `for ${displayItem.strategy_id}` : ""}
      </h2>

      {isLoading && (
        <p className="text-center text-gray-400 my-4">
          Loading Strategy Info...
        </p>
      )}

      {!isLoading && errorMessage && (
        <p className="text-center text-red-500 font-semibold my-4">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && displayItem && (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-700 rounded">
            <thead>
              <tr className="bg-gray-800 text-sm text-gray-300">
                <th className="p-3 text-left border-b border-gray-700">
                  Strategy ID
                </th>
                <th className="p-3 text-right border-b border-gray-700">
                  Health Factor
                </th>
                <th className="p-3 text-right border-b border-gray-700">
                  Liquidation Price
                </th>
                <th className="p-3 text-center border-b border-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                key={displayItem.strategy_id}
                className="hover:bg-gray-800 text-sm transition duration-200"
              >
                <td className="p-3 border-b border-gray-700">
                  {displayItem.strategy_id}
                </td>
                <td className="p-3 text-right border-b border-gray-700">
                  {displayItem.health_factor.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="p-3 text-right border-b border-gray-700">
                  $
                  {displayItem.liquidation_price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="p-3 text-center border-b border-gray-700">
                  {displayItem.liquidation_status ? (
                    <span className="text-red-500 font-semibold">At Risk</span>
                  ) : (
                    <span className="text-green-500 font-semibold">Safe</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        !displayItem &&
        !localStorage.getItem("STRATEGY_ID") && (
          <p className="text-center text-gray-400 my-4">
            No Strategy ID found. Please configure a strategy.
          </p>
        )}
    </div>
  );
};

export default LiquidationTable;
