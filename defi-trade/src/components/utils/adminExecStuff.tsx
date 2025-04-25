import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as dotenv from "dotenv";
dotenv.config();

// const MNEMONICS = process.env.MNEMONICS || '';

const getAdminExecStuff = () => {
  // const keypair = Ed25519Keypair.deriveKeypair(MNEMONICS);
  // const USER_MNEMONICS = process.env.USER_MNEMONICS || "";
  const ADMIN_MNEMONICS = import.meta.env.VITE_APP_MNEMONICS as string;

  console.log("ADMIN MNEMONICS", ADMIN_MNEMONICS);
  const keypair = Ed25519Keypair.deriveKeypair(ADMIN_MNEMONICS);

  const client = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });
  return { keypair, client };
};
export default getAdminExecStuff;
