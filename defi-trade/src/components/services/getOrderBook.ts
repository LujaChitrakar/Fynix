import axios from "axios";

const getOrderBook = async (symbol: string = "SUIUSDT", limit: number = 10) => {
  try {
    const response = await axios.get("https://api.binance.com/api/v3/depth", {
      params: {
        symbol,
        limit,
      },
    });

    const orderBook = response.data;
    console.log(`Order Book for ${symbol}:`);
    console.log("Bids:", orderBook.bids); // [price, quantity]
    console.log("Asks:", orderBook.asks); // [price, quantity]

    return orderBook;
  } catch (error) {
    console.error("Failed to fetch order book:", error);
    return null;
  }
};

getOrderBook();
