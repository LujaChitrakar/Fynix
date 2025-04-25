// src/components/SuiPredictor.tsx
import React, { useState, useEffect } from "react";

// Define the expected structure of the data from CoinGecko
interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp, price]
  market_caps: [number, number][]; // [timestamp, market_cap]
  total_volumes: [number, number][]; // [timestamp, volume]
}

// Define the structure for the data sent to our backend
interface PredictionPayload {
  priceOpen: number;
  priceHigh: number;
  priceLow: number;
  priceClose: number;
  volume: number;
}

// Define the structure for the response from our backend
interface PredictionResponse {
  prediction: 0 | 1; // 0 for Sell (or Hold), 1 for Buy
}

const SuiPredictor: React.FC = () => {
  const [prediction, setPrediction] = useState<string>("Loading...");
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Backend API endpoint URL
  const backendApiUrl = "http://localhost:5000/predict"; // Make sure this matches your Flask app's address

  // CoinGecko API endpoint URL
  const coinGeckoApiUrl =
    "https://api.coingecko.com/api/v3/coins/sui/market_chart?vs_currency=usd&days=1"; // Use days=1 to get recent data

  useEffect(() => {
    const fetchAndPredict = async () => {
      setIsLoading(true);
      setError(null);
      setPrediction("Fetching data...");

      try {
        // 1. Fetch data from CoinGecko
        console.log("Fetching data from CoinGecko...");
        const response = await fetch(coinGeckoApiUrl);
        if (!response.ok) {
          throw new Error(`CoinGecko API Error: ${response.statusText}`);
        }
        const data: CoinGeckoMarketChartResponse = await response.json();
        console.log("CoinGecko data received:", data);

        // Check if data is available
        if (
          !data.prices ||
          data.prices.length === 0 ||
          !data.total_volumes ||
          data.total_volumes.length === 0
        ) {
          throw new Error("No price or volume data received from CoinGecko.");
        }

        // --- Data Simplification ---
        // Get the *latest* price and volume entry
        // NOTE: This uses the *same* latest price for Open, High, Low, Close.
        // This is a simplification and may not match your model's training data structure.
        const latestPriceData = data.prices[data.prices.length - 1];
        const latestVolumeData =
          data.total_volumes[data.total_volumes.length - 1];

        if (!latestPriceData || !latestVolumeData) {
          throw new Error("Could not extract latest price/volume data.");
        }

        const currentPrice = latestPriceData[1];
        const currentVolume = latestVolumeData[1];

        setLatestPrice(currentPrice); // Store for display
        console.log(
          `Latest Price: ${currentPrice}, Latest Volume: ${currentVolume}`
        );

        // 2. Prepare data for the backend prediction API
        const payload: PredictionPayload = {
          priceOpen: currentPrice, // Simplification
          priceHigh: currentPrice, // Simplification
          priceLow: currentPrice, // Simplification
          priceClose: currentPrice,
          volume: currentVolume,
        };
        console.log("Sending payload to backend:", payload);
        setPrediction("Getting prediction...");

        // 3. Call the backend prediction API
        const predictionResponse = await fetch(backendApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!predictionResponse.ok) {
          // Try to get more error details from backend response if possible
          let errorDetails = predictionResponse.statusText;
          try {
            const errorJson = await predictionResponse.json();
            errorDetails = errorJson.message || errorDetails; // Adjust if your backend sends errors differently
          } catch (e) {
            /* ignore parsing error */
          }
          throw new Error(`Backend API Error: ${errorDetails}`);
        }

        const predictionResult: PredictionResponse =
          await predictionResponse.json();
        console.log("Backend prediction received:", predictionResult);

        // 4. Update the prediction state
        setPrediction(predictionResult.prediction === 1 ? "Buy" : "Sell");
      } catch (err) {
        console.error("Error during fetch or prediction:", err);
        if (err instanceof Error) {
          setError(`Failed to get prediction: ${err.message}`);
        } else {
          setError("An unknown error occurred.");
        }
        setPrediction("Error"); // Update status
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndPredict();

    // Optional: Set up polling to refresh data periodically (e.g., every 5 minutes)
    const intervalId = setInterval(fetchAndPredict, 5 * 60 * 1000); // 5 minutes

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [backendApiUrl, coinGeckoApiUrl]); // Dependencies for useEffect

  // --- Render the component ---
  return (
    <div className="sui-predictor">
      <h2>SUI Stock Indicator</h2>
      <div className={`indicator ${prediction.toLowerCase()}`}>
        {isLoading ? "Loading..." : prediction}
      </div>
      {latestPrice !== null && !isLoading && !error && (
        <p className="latest-price">
          Based on latest price: ${latestPrice.toFixed(4)}
        </p>
      )}
      {error && <p className="error-message">{error}</p>}
      <button onClick={() => window.location.reload()} disabled={isLoading}>
        {isLoading ? "Refreshing..." : "Refresh Now"}
      </button>
      <p className="disclaimer">
        Disclaimer: This is based on a simplified data model (using latest price
        for OHLC) and AI prediction. Not financial advice.
      </p>
    </div>
  );
};

export default SuiPredictor;
