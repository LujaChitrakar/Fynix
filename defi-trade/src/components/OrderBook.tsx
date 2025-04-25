import React, { useEffect, useState } from "react";

const OrderBook: React.FC = () => {
  const [buyOrders, setBuyOrders] = useState<any[]>(Array(10).fill([0, 0])); // Initialize with empty orders
  const [sellOrders, setSellOrders] = useState<any[]>(Array(10).fill([0, 0])); // Initialize with empty orders
  const [symbol] = useState("suiusdc");

  // Function to process the incoming WebSocket data and update the order book
  const processOrderBookData = (data: any) => {
    // Ensure 'b' and 'a' exist in the data (bids and asks)
    if (
      data &&
      data.b &&
      Array.isArray(data.b) &&
      data.a &&
      Array.isArray(data.a)
    ) {
      // Get the top 10 buy orders (b) and sell orders (a)
      const topBuyOrders = data.b.slice(0, 10); // Top 10 buy orders (bids)
      const topSellOrders = data.a.slice(0, 10); // Top 10 sell orders (asks)

      // Update the state with the new top 10 buy and sell orders
      setBuyOrders(topBuyOrders);
      setSellOrders(topSellOrders);
    } else {
      console.error("Invalid data format", data);
    }
  };

  // Set up the WebSocket connection for the real-time order book
  useEffect(() => {
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@depth`
    );

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    ws.onmessage = (event) => {
      const orderBookData = JSON.parse(event.data);
      processOrderBookData(orderBookData);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // Clean up WebSocket on component unmount
    return () => {
      ws.close();
    };
  }, [symbol]);

  return (
    <div
      className="bg-[#060d21] p-4 rounded-xl text-white w-full max-w-lg"
      style={{ height: "780px", width: "300px" }}
    >
      <h2 className="text-lg font-semibold mb-4">Order Book</h2>

      {/* Buy Orders */}
      <div className="mb-4">
        <h3 className="font-semibold text-green-500">Buy Orders</h3>
        <div className="h-[300px]">
          <table className="min-w-full table-auto text-sm text-left">
            <thead>
              <tr>
                <th className="px-2 py-1">Price</th>
                <th className="px-2 py-1">Quantity</th>
                <th className="px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {buyOrders.map((order, index) => (
                <tr key={index} className="bg-green-900">
                  <td className="px-2 py-1">{order[0]}</td> {/* Price */}
                  <td className="px-2 py-1">{order[1]}</td> {/* Quantity */}
                  <td className="px-2 py-1">
                    {(parseFloat(order[0]) * parseFloat(order[1])).toFixed(2)}
                  </td>{" "}
                  {/* Amount */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sell Orders */}
      <div>
        <h3 className="font-semibold text-red-500">Sell Orders</h3>
        <div className="h-[300px]">
          <table className="min-w-full table-auto text-sm text-left">
            <thead>
              <tr>
                <th className="px-2 py-1">Price</th>
                <th className="px-2 py-1">Quantity</th>
                <th className="px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sellOrders.map((order, index) => (
                <tr key={index} className="bg-red-900">
                  <td className="px-2 py-1">{order[0]}</td> {/* Price */}
                  <td className="px-2 py-1">{order[1]}</td> {/* Quantity */}
                  <td className="px-2 py-1">
                    {(parseFloat(order[0]) * parseFloat(order[1])).toFixed(2)}
                  </td>{" "}
                  {/* Amount */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
