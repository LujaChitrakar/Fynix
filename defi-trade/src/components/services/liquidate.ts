import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getAdminExecStuff from "../utils/adminExecStuff";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import getSuiPrice from "./getSuiPrice";

dotenv.config();

const savedStrategyId = localStorage.getItem("STRATEGY_ID") || "";

const packageId = import.meta.env.VITE_APP_PACKAGE_ID;
const fynix = import.meta.env.VITE_APP_FYNIX_ID || "";
const strategyId = savedStrategyId;
const balanceManagerId = import.meta.env.VITE_APP_BALANCEMANAGER_ID || "";
const suiUsdcPoolId = import.meta.env.VITE_APP_SUI_USDC_POOL_ID || "";

export const liquidate = async () => {
  const { keypair, client } = getAdminExecStuff();
  const tx = new Transaction();

  let suiPrice = (await getSuiPrice()) || 0;

  const tradeProof = tx.moveCall({
    target: `${packageId}::fynix::generate_proof_as_owner`,
    arguments: [tx.object(balanceManagerId)],
  });

  tx.moveCall({
    target: `${packageId}::strategy::liquidate`,
    arguments: [
      tx.object(fynix),
      tx.object(strategyId),
      //   tx.pure.u64(suiPrice),
      tx.pure.u64(12 * 1 ** 8), // sui price for liquidation
      tx.object(suiUsdcPoolId),
      tx.object(balanceManagerId),
      tradeProof,
      tx.pure.bool(true),
      tx.pure.bool(true),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
    typeArguments: [
      `${packageId}::custom_sui::CUSTOM_SUI`,
      `${packageId}::custom_usdc::CUSTOM_USDC`,
    ],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  console.log(result.digest);

  return result.digest;
};
