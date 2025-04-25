import { Transaction } from "@mysten/sui/transactions";
import * as dotenv from "dotenv";
import getUserExecStuff from "../utils/userExecStuff";
import writeToEnv from "../utils/writeEnv";

dotenv.config();

// const packageId = process.env.PACKAGE_ID;
const packageId = import.meta.env.VITE_APP_PACKAGE_ID as string;
// const fynix = process.env.FYNIX_ID || "";
const fynix = import.meta.env.VITE_APP_FYNIX_ID as string;

export const createStrategy = async (wallet: any, formData: any) => {
  const { keypair, client } = getUserExecStuff();
  const tx = new Transaction();

  let coinId: string = (
    await client.getCoins({
      owner: keypair.getPublicKey().toSuiAddress(),
      coinType: `${packageId}::custom_usdc::CUSTOM_USDC`,
    })
  ).data[0].coinObjectId;
  const coin = tx.splitCoins(coinId, [tx.pure.u64(formData.amount * 10 ** 9)]); // Convert to correct precision

  const strategy = tx.moveCall({
    target: `${packageId}::strategy::create_strategy`,
    arguments: [
      tx.object(fynix),
      tx.pure.string(formData.strategyName),
      tx.pure.u64(formData.buyPriceLower * 10 ** 9),
      tx.pure.u64(formData.buyPriceUpper * 10 ** 9),
      tx.pure.u64(formData.sellPriceLower * 10 ** 9),
      tx.pure.u64(formData.sellPriceUpper * 10 ** 9),
      tx.pure.u64(formData.stoploss * 10 ** 9),
      coin,
      tx.pure.u64(formData.leverage),
    ],

    typeArguments: [`${packageId}::custom_usdc::CUSTOM_USDC`],
  });

  tx.moveCall({
    target: `${packageId}::strategy::link_strategy`,
    arguments: [tx.object(fynix), strategy],
  });

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

  const digest_ = result.digest;

  let strategyID;

  const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  await sleep(2000);

  if (!digest_) {
    console.log("Digest is not available");
    return { strategyID };
  }

  const txn = await client.getTransactionBlock({
    digest: String(digest_),
    options: {
      showEffects: true,
      showInput: false,
      showEvents: false,
      showObjectChanges: true,
      showBalanceChanges: false,
    },
  });
  let output: any;
  output = txn.objectChanges;

  for (let i = 0; i < output.length; i++) {
    const item = output[i];
    if ((await item.type) === "created") {
      if ((await item.objectType) === `${packageId}::strategy::Strategy`) {
        strategyID = String(item.objectId);
      }
    }
  }

  writeToEnv("STRATEGY_ID", strategyID || "");

  return { strategyID };
};
