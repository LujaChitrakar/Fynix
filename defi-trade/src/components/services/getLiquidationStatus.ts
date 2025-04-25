import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getUserExecStuff from "../utils/userExecStuff";
import { bcs } from "@mysten/sui/bcs";
import getSuiPrice from "./getSuiPrice";
dotenv.config();

const savedStrategyId = localStorage.getItem("STRATEGY_ID") || "";
const packageId = import.meta.env.VITE_APP_PACKAGE_ID;
const fynix = import.meta.env.VITE_APP_FYNIX_ID || "";
const strategyId = savedStrategyId || "";
const currentAddress = import.meta.env.VITE_APP_USER_ACCOUNT || "";

export const checkLiquidation = async () => {
  const { keypair, client } = getUserExecStuff();
  const tx = new Transaction();

  let suiPrice = (await getSuiPrice()) || 0;

  tx.moveCall({
    target: `${packageId}::strategy::check_liquidation`,
    arguments: [tx.object(fynix), tx.object(strategyId), tx.pure.u64(suiPrice)],
  });

  const { results, error } = await client.devInspectTransactionBlock({
    transactionBlock: tx,
    sender: currentAddress,
  });

  if (!results || !results[0] || !results[0].returnValues) {
    console.error("Invalid character", error);
    return;
  }

  let ans = bcs.bool().parse(Uint8Array.from(results[0].returnValues[0][0]));

  console.log(`Liquidated: ${ans}`);
  return ans;
};
