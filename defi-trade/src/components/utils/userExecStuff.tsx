import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import * as dotenv from "dotenv";
dotenv.config();

// const MNEMONICS = process.env.MNEMONICS || '';

const getUserExecStuff = () => {
  // const keypair = Ed25519Keypair.deriveKeypair(MNEMONICS);
  // const USER_MNEMONICS = process.env.USER_MNEMONICS || "";
  const USER_MNEMONICS = import.meta.env.VITE_APP_USER_MNEMONICS as string

  console.log("USER MNEMONICS", USER_MNEMONICS)
  const keypair = Ed25519Keypair.deriveKeypair(USER_MNEMONICS);

  const client = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });
  return { keypair, client };
};
export default getUserExecStuff;
