import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useWalletKit } from "@mysten/wallet-kit";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";

// Create a client instance
const client = new SuiClient({ url: getFullnodeUrl("devnet") });

// Define the shape of our context data
interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isLoading: boolean;
  refreshBalance: () => Promise<void>;
  getWalletAdapter: () => any;
}

// Create the context with default values
const MystenWalletContext = createContext<WalletContextType>({
  isConnected: false,
  address: null,
  balance: null,
  isLoading: false,
  refreshBalance: async () => {},
  getWalletAdapter: () => ({}),
});

// Custom hook to use the wallet context
export const useMystenWallet = () => useContext(MystenWalletContext);

interface WalletProviderProps {
  children: ReactNode;
}

// Add proper types for the wallet methods that might be available on window
declare global {
  interface Window {
    suiWallet?: {
      signAndExecuteTransaction: (transaction: any) => Promise<any>;
      getAccounts: () => Promise<string[]>;
      // Add other methods that might be available on the wallet
    };
  }
}

export const MystenWalletProvider: React.FC<WalletProviderProps> = ({
  children,
}) => {
  const { currentAccount, isConnected, signTransactionBlock } = useWalletKit();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchBalance = async () => {
    if (!currentAccount) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await client.getBalance({ owner: currentAccount.address });
      setBalance(res.totalBalance);
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a wallet adapter that can be used with your existing functions
  const getWalletAdapter = () => {
    if (!isConnected || !currentAccount) {
      return null;
    }

    return {
      connected: isConnected,
      address: currentAccount.address,
      signAndExecuteTransaction: async (transaction: any) => {
        // For @mysten/wallet-kit, we need to use the signTransactionBlock method
        if (signTransactionBlock) {
          try {
            // Check if the transaction is already a TransactionBlock
            if (transaction instanceof TransactionBlock) {
              return await signTransactionBlock({
                transactionBlock: transaction,
              });
            }
            // Otherwise, try to adapt the transaction
            else {
              // This adaptation depends on what your createStrategy function expects
              // You might need to modify this based on your specific requirements
              console.warn(
                "Transaction is not a TransactionBlock, attempting to adapt..."
              );
              return await signTransactionBlock({
                transactionBlock: transaction,
              });
            }
          } catch (e) {
            console.error("Error signing transaction with wallet kit:", e);
            throw e;
          }
        }
        // Fallback to window.suiWallet if available
        else if (window.suiWallet) {
          return await window.suiWallet.signAndExecuteTransaction(transaction);
        }
        throw new Error("No wallet method available for signing transactions");
      },
    };
  };

  // Fetch balance whenever the current account changes
  useEffect(() => {
    fetchBalance();
  }, [currentAccount]);

  // Value to be provided to consuming components
  const value = {
    isConnected,
    address: currentAccount?.address || null,
    balance,
    isLoading,
    refreshBalance: fetchBalance,
    getWalletAdapter,
  };

  return (
    <MystenWalletContext.Provider value={value}>
      {children}
    </MystenWalletContext.Provider>
  );
};
