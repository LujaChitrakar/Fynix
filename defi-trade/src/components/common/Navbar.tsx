import { ConnectButton } from "@mysten/wallet-kit";
import { Link } from "react-router-dom";
import { useMystenWallet } from "../context/WalletContext";
import { useWalletKit } from "@mysten/wallet-kit";

function Navbar() {
  const { currentAccount } = useWalletKit();
  const { balance, isLoading } = useMystenWallet();

  return (
    <nav className="flex justify-between items-center bg-[#030816] px-8 py-4 shadow-lg">
      <div className="text-2xl text-white font-bold flex items-center">
        <Link
          to="/"
          className="text-gray-300 font-medium hover:text-purple-400 transition-colors"
        >
          FY<span className="text-pink-400">NIX</span>
        </Link>
      </div>
      <div className="flex gap-8 text-white"></div>
      <div className="flex gap-10 items-center">
        <Link
          to="/login"
          className="text-gray-300 font-medium hover:text-purple-400 transition-colors"
        >
          Login with ZK
        </Link>
        <div className="text-white">
          {currentAccount ? (
            <>
              <p>
                Your Balance:{" "}
                {isLoading
                  ? "Loading..."
                  : balance
                  ? parseFloat(balance) / 1e9 + " SUI"
                  : "0 SUI"}
              </p>
            </>
          ) : (
            <p></p>
          )}
        </div>
        <div className="rounded-full bg-white flex items-center justify-center font-bold">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
