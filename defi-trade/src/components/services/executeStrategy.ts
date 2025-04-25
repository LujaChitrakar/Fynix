import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getAdminExecStuff from "../utils/adminExecStuff";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
dotenv.config();

const packageId = import.meta.env.VITE_APP_PACKAGE_ID;
const fynix = import.meta.env.VITE_APP_FYNIX_ID || "";
const fynixCap = import.meta.env.VITE_APP_FYNIX_CAP || "";
const suiUSDCPool = import.meta.env.VITE_APP_SUI_USDC_POOL_ID || "";
const balanceManagerId = import.meta.env.VITE_APP_BALANCEMANAGER_ID || "";

export const MAX_TIMESTAMP = 1844674407370955161n;

export const executeStrategy = async (strategyId: string, isBid: boolean) => {
  const { keypair, client } = getAdminExecStuff();
  const tx = new Transaction();

  const tradeProof = tx.moveCall({
    target: `${packageId}::fynix::generate_proof_as_owner`,
    arguments: [tx.object(balanceManagerId)],
  });

  tx.moveCall({
    target: `${packageId}::strategy::execute_strategy`,
    arguments: [
      tx.object(fynixCap),
      tx.object(fynix),
      tx.pure.address(strategyId),
      tx.object(suiUSDCPool),
      // tx.object(deepSuiPool),
      tx.object(balanceManagerId),
      tradeProof,
      tx.pure.u8(0), // order type 0 = no restriction
      tx.pure.u8(0), // self matching allowed
      tx.pure.bool(true), // is bid
      tx.pure.bool(true), // pay with deep
      tx.pure.u64(MAX_TIMESTAMP),
      tx.pure.bool(false),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
    typeArguments: [
      // `${packageId}::deep::DEEP`,
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
