import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getUSerExecStuff from "../utils/userExecStuff";
import { bcs } from "@mysten/sui/bcs";
import getSuiPrice from "./getSuiPrice";
import { useEffect } from "react";
dotenv.config();

const savedStrategyId = localStorage.getItem("STRATEGY_ID") || "";

const packageId = import.meta.env.VITE_APP_PACKAGE_ID;
const fynix = import.meta.env.VITE_APP_FYNIX_ID || "";
const strategyId = savedStrategyId || "";
const currentAddress = import.meta.env.VITE_APP_USER_ACCOUNT || "";

export const getHealthFactor = async () => {
  const { keypair, client } = getUSerExecStuff();
  const tx = new Transaction();

  let suiPrice = (await getSuiPrice()) || 0;

  tx.moveCall({
    target: `${packageId}::strategy::get_health_factor`,
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

  let ans = bcs.u64().parse(Uint8Array.from(results[0].returnValues[0][0]));

  console.log(`Health factor: ${ans}`);
  return ans;
};
