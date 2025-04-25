import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getUserExecStuff from "../utils/userExecStuff";
import { bcs } from "@mysten/sui/bcs";
dotenv.config();

const savedStrategyId = localStorage.getItem("STRATEGY_ID") || "";
const packageId = import.meta.env.VITE_APP_PACKAGE_ID;
const fynix = import.meta.env.VITE_APP_FYNIX_ID || "";
const strategyId = savedStrategyId;
const currentAddress = import.meta.env.VITE_APP_USER_ACCOUNT || "";

export const getLiquidationPrice = async () => {
  const { keypair, client } = getUserExecStuff();
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::strategy::get_liquidation_price`,
    arguments: [tx.object(fynix), tx.object(strategyId)],
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

  return ans;
};

async function main() {
  console.log(await getLiquidationPrice());
}

main();
