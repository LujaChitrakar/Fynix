import React, { useState, useEffect } from "react";

// Interface to define the structure of the data expected from the API
interface PredictionData {
  prediction: "Buy" | "Sell" | "Hold" | "Unknown";
  prediction_numeric: 1 | 0 | -1 | number; // Allow generic number for unknown cases
  probabilities: {
    sell: number;
    hold: number;
    buy: number;
  };
  timestamp: string; // ISO format string
  model_info?: {
    // Optional model info
    lookback_days?: number;
    features_used?: number;
  };
}

// Interface for potential API error structure
interface ApiError {
  error: string;
}

// Helper to determine Tailwind text color based on prediction
const getPredictionColor = (
  prediction: PredictionData["prediction"]
): string => {
  switch (prediction) {
    case "Buy":
      return "text-green-600";
    case "Sell":
      return "text-red-600";
    case "Hold":
      return "text-gray-600";
    default:
      return "text-yellow-600"; // For 'Unknown' or errors during prediction
  }
};

// Helper to format probability as percentage
const formatPercent = (value: number): string => {
  return (value * 100).toFixed(1) + "%";
};

const PredictionDisplay: React.FC = () => {
  const [predictionData, setPredictionData] = useState<PredictionData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    console.log("Fetching prediction...");

    try {
      // --- IMPORTANT: Replace with your actual backend server address ---
      // If Flask runs on the same machine, use http://localhost:5000
      // If Flask runs on a different machine on your network, use its IP: http://<flask_server_ip>:5000
      const response = await fetch("http://localhost:5000/predict"); // Default Flask port

      if (!response.ok) {
        // Try to parse error message from backend if available
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
          const errorJson: ApiError = await response.json();
          if (errorJson.error) {
            errorMsg = `Prediction failed: ${errorJson.error}`;
          }
        } catch (parseError) {
          console.error("Could not parse error JSON:", parseError);
        }
        throw new Error(errorMsg);
      }

      const data: PredictionData = await response.json();
      setPredictionData(data);
      console.log("Prediction received:", data);
    } catch (err: any) {
      console.error("Failed to fetch prediction:", err);
      setError(err.message || "An unknown error occurred while fetching data.");
      setPredictionData(null); // Clear any stale data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction(); // Fetch on initial component mount

    // Optional: Set up an interval to fetch periodically (e.g., every 5 minutes)
    // const intervalId = setInterval(fetchPrediction, 5 * 60 * 1000);
    // return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, []); // Empty dependency array means run only once on mount

  return (
    <div className="flex flex-col items-center justify-center ">
      <div className="bg-[#060d21] shadow-xl rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-6 text-white">
          SUI Prediction AI MODEL
        </h1>

        {loading && (
          <p className="text-xl text-blue-600 animate-pulse">
            Loading prediction...
          </p>
        )}

        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {predictionData && !loading && !error && (
          <div className="space-y-4">
            <p className="text-lg text-gray-500">
              Based on data up to:{" "}
              {new Date(predictionData.timestamp).toLocaleString()}
            </p>
            <div
              className={`text-6xl font-extrabold my-4 ${getPredictionColor(
                predictionData.prediction
              )}`}
            >
              {predictionData.prediction}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Probabilities:</p>
              <p>
                <span className="font-medium text-red-500">Sell:</span>{" "}
                {formatPercent(predictionData.probabilities.sell)}
              </p>
              <p>
                <span className="font-medium text-gray-500">Hold:</span>{" "}
                {formatPercent(predictionData.probabilities.hold)}
              </p>
              <p>
                <span className="font-medium text-green-500">Buy:</span>{" "}
                {formatPercent(predictionData.probabilities.buy)}
              </p>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={fetchPrediction}
          disabled={loading}
          className={`mt-8 w-full px-4 py-2 rounded shadow text-white font-semibold transition duration-200 ease-in-out ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          }`}
        >
          {loading ? "Refreshing..." : "Refresh Prediction"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Disclaimer: Educational purposes only. Not financial advice.
      </p>
    </div>
  );
};

export default PredictionDisplay;
