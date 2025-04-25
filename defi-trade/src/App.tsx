import { BrowserRouter, Router } from "react-router-dom";
import "./App.css";

import { MystenWalletProvider } from "../src/components/context/WalletContext";
import { WalletKitProvider } from "@mysten/wallet-kit";
import AppRoutes from "./AppRoutes";

function App() {
  return (
    <>
      <WalletKitProvider>
        <MystenWalletProvider>
          <BrowserRouter>
            <div className="App">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </MystenWalletProvider>
      </WalletKitProvider>
    </>
  );
}

export default App;
