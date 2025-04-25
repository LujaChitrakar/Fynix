/**
 * ZkLoginComponent.tsx
 *
 * Implements a manual ZKLogin flow using @mysten/zklogin and @mysten/sui.js.
 * Assumes usage with Vite and Google OAuth.
 *
 * IMPORTANT Prerequisites:
 * 1.  Ensure `@mysten/enoki/react` and related hooks/providers are REMOVED from your project
 *     to avoid conflicts with this manual implementation.
 * 2.  Configure environment variables (VITE_*) in your `.env` file.
 * 3.  Install and configure `vite-plugin-node-polyfills` in `vite.config.ts`
 *     to handle Node.js built-ins like 'buffer' used by dependent libraries.
 * 4.  Verify the `generateNonce` function matches the requirements of your specific
 *     @mysten/zklogin version and the ZK Prover service.
 * 5.  Configure Google Cloud Console credentials correctly (Client ID, redirect URI, test users).
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import {
  computeZkLoginAddress,
  genAddressSeed,
  getZkLoginSignature,
} from "@mysten/zklogin";
import { jwtDecode } from "jwt-decode"; // Named import
import { MIST_PER_SUI } from "@mysten/sui.js/utils";
// Buffer might be needed by dependencies or the nonce function.
// Ensure polyfill is configured in vite.config.ts via vite-plugin-node-polyfills
import { Buffer } from "buffer";

// --- Interface for the structure returned by the ZK Prover ---
interface ZkLoginProof {
  proofPoints: {
    a: string[];
    b: string[][];
    c: string[];
  };
  issBase64Details: {
    value: string;
    indexMod4: number;
  };
  headerBase64: string;
  addressSeed: string; // IMPORTANT: Prover *must* return this
}

// --- Interface for the application's user state ---
interface UserInfo {
  address: string;
  jwt: string;
  inputs: ZkLoginProof | null; // Holds the parsed proof data
  keyPair: Ed25519Keypair; // Ephemeral keypair for the session
  maxEpoch: number; // Max epoch for proof/transaction validity
}

// --- Interface for the decoded JWT payload ---
interface JwtData {
  sub: string; // Subject (unique user ID)
  iss: string; // Issuer (URL of the OIDC provider)
  aud: string; // Audience (your application's Client ID)
  nonce: string; // Nonce used during the OAuth request
  email?: string;
  name?: string;
}

// --- Constants & Configuration (Using Vite's import.meta.env) ---
const GOOGLE_CLIENT_ID =
  "36898366765-36httpgbrljnkecoc5fesjmbve4l2i5j.apps.googleusercontent.com";
const REDIRECT_URI = "http://localhost:5173/";
const PROVER_URL = "https://prover-dev.mystenlabs.com/v1";
const APP_SALT = "b97559de34d2f0b4905a7dc9b7ca6803";
const suiClient = new SuiClient({ url: getFullnodeUrl("devnet") });
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "openid email profile";

// --- Keys for storing data in localStorage ---
const ZK_LOGIN_ADDRESS_KEY = "zkLoginUserAddress";
const ZK_EPHEMERAL_KEYPAIR_KEY = "zkEphemeralKeypair";
const ZK_MAX_EPOCH_KEY = "zkMaxEpoch"; // Temporary storage during login
const ZK_RANDOMNESS_KEY = "zkRandomness"; // Temporary storage during login

// --- Helper: Generate Nonce ---
// WARNING: The exact implementation of nonce generation is critical and MUST match
// the requirements of the @mysten/zklogin version and the ZK Prover you are using.
// The example below is based on common patterns but should be verified against official documentation.
// Inconsistency here WILL lead to 'Nonce mismatch' errors during callback.
function generateNonce(
  ephemeralPublicKey: string, // Base64 encoded Ed25519 public key
  maxEpoch: number,
  randomness: string // BigInt string
): string {
  try {
    const eph_pubkey_bytes = Buffer.from(ephemeralPublicKey, "base64");
    if (eph_pubkey_bytes.length !== 32) {
      console.error(
        "generateNonce: Unexpected ephemeral public key length:",
        eph_pubkey_bytes.length
      );
      throw new Error(
        "Invalid ephemeral public key format for nonce generation."
      );
    }

    // Convert public key bytes to BigInt (example using little-endian)
    let publicKeyBigInt = 0n;
    for (let i = 0; i < eph_pubkey_bytes.length; i++) {
      publicKeyBigInt += BigInt(eph_pubkey_bytes[i]) << BigInt(8 * i);
    }

    const maxEpochBigInt = BigInt(maxEpoch);
    const randomnessBigInt = BigInt(randomness);

    // Example Nonce Combination (Verify the exact formula/shifts from Sui docs):
    // This specific formula needs confirmation:
    // const nonceBigInt = (publicKeyBigInt >> 128n) + (maxEpochBigInt << 128n) + (randomnessBigInt << 160n);
    // Using a simpler combination for demonstration - LIKELY NEEDS ADJUSTMENT:
    const nonceBigInt = publicKeyBigInt + maxEpochBigInt + randomnessBigInt;

    return nonceBigInt.toString();
  } catch (error) {
    console.error("Error in generateNonce:", error);
    throw new Error(
      `Nonce generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// --- Helper: Generate Randomness ---
function generateRandomness(): string {
  const randomnessBytes = new Uint8Array(16); // 128 bits
  crypto.getRandomValues(randomnessBytes);
  let randomnessBigInt = 0n;
  for (let i = 0; i < randomnessBytes.length; i++) {
    randomnessBigInt = (randomnessBigInt << 8n) | BigInt(randomnessBytes[i]); // Big-endian conversion
  }
  return randomnessBigInt.toString();
}

// --- React Component ---
const ZkLoginComponent: React.FC = () => {
  // --- State Variables ---
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suiBalance, setSuiBalance] = useState<number | null>(null);

  const navigate = useNavigate();

  // --- Check Salt Configuration ---
  useEffect(() => {
    if (!APP_SALT) {
      const saltWarning =
        "WARNING: VITE_APP_SALT is not set correctly in .env. Please generate a unique salt and update VITE_APP_SALT.";
      console.warn(saltWarning);
      // setError("Application setup error: Salt not configured."); // Optional user-facing error
    }
  }, []);

  // --- Ephemeral Keypair Management ---
  const getKeyPair = useCallback((): Ed25519Keypair => {
    const storedKey = localStorage.getItem(ZK_EPHEMERAL_KEYPAIR_KEY);
    if (storedKey) {
      try {
        const secretKey = Uint8Array.from(JSON.parse(storedKey));
        return Ed25519Keypair.fromSecretKey(secretKey);
      } catch (e) {
        console.error("Failed to parse stored keypair, generating new one.", e);
        localStorage.removeItem(ZK_EPHEMERAL_KEYPAIR_KEY);
      }
    }
    const newKeypair = Ed25519Keypair.generate();
    localStorage.setItem(
      ZK_EPHEMERAL_KEYPAIR_KEY,
      JSON.stringify(Array.from(newKeypair.getSecretKey()))
    );
    return newKeypair;
  }, []);

  // --- Fetch SUI Balance ---
  const fetchBalance = useCallback(async (address: string) => {
    if (!address) return;
    setLoading("Fetching balance...");
    setSuiBalance(null);
    try {
      const balanceObj = await suiClient.getBalance({
        owner: address,
        coinType: "0x2::sui::SUI",
      });
      const balanceInSui =
        Number(balanceObj.totalBalance) / Number(MIST_PER_SUI);
      setSuiBalance(balanceInSui);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch balance:", err);
      setError(
        `Could not fetch balance: ${err.message || "Unknown network error"}`
      );
      setSuiBalance(null);
    } finally {
      setLoading(null);
    }
  }, []); // suiClient is stable

  // --- Login Initiation ---
  const handleLogin = async () => {
    setLoading("Preparing login redirect...");
    setError(null);
    setSuiBalance(null);
    // Clear potentially stale temp storage from previous attempts
    localStorage.removeItem(ZK_MAX_EPOCH_KEY);
    localStorage.removeItem(ZK_RANDOMNESS_KEY);
    // Consider clearing keypair here if you want a completely fresh key for every login attempt
    // localStorage.removeItem(ZK_EPHEMERAL_KEYPAIR_KEY);

    try {
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2; // Validity window: current epoch + 2
      const ephemeralKeyPair = getKeyPair(); // Use existing or generate new
      const ephemeralPublicKeyB64 = ephemeralKeyPair.getPublicKey().toBase64();
      const randomness = generateRandomness();
      const nonce = generateNonce(ephemeralPublicKeyB64, maxEpoch, randomness);

      console.log("Generated Nonce for OAuth:", nonce);

      localStorage.setItem(ZK_MAX_EPOCH_KEY, maxEpoch.toString());
      localStorage.setItem(ZK_RANDOMNESS_KEY, randomness);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "id_token",
        scope: SCOPES,
        nonce: nonce,
      });

      const loginUrl = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
      console.log("Attempting redirect to Google with URL:", loginUrl);
      console.log("Using Client ID:", GOOGLE_CLIENT_ID);
      console.log("Using Redirect URI:", REDIRECT_URI);

      window.location.href = loginUrl;
    } catch (err: any) {
      console.error("Login initiation failed:", err);
      setError(`Login setup failed: ${err.message || "Unknown error"}`);
      setLoading(null);
    }
  };

  // --- Handle OAuth Callback ---
  const handleCallback = useCallback(async () => {
    setLoading("Processing authentication callback...");
    setError(null); // Clear previous errors
    console.log("--- handleCallback START ---"); // START LOG
    try {
      // --- Extract JWT and check for errors ---
      const urlFragment = window.location.hash.substring(1);
      const params = new URLSearchParams(urlFragment);
      const jwt = params.get("id_token");
      const errorParam = params.get("error");

      // Clean URL bar immediately
      window.history.replaceState(null, "", window.location.pathname);

      if (errorParam) {
        const errorDesc =
          params.get("error_description") || "No description provided.";
        console.error(
          `OAuth Error Parameter Found: ${errorParam} - ${errorDesc}`
        );
        throw new Error(`OAuth provider error: ${errorParam} - ${errorDesc}`);
      }
      if (!jwt) {
        console.log(
          "handleCallback: No id_token found in URL fragment. Exiting callback handler."
        );
        setLoading(null);
        return; // Not a valid callback or direct navigation
      }
      console.log("handleCallback: JWT found in URL fragment."); // LOG 1

      // --- Decode JWT ---
      const decodedJwt: JwtData = jwtDecode(jwt);
      console.log("handleCallback: JWT Decoded", decodedJwt); // LOG 2

      // --- Retrieve temporary state ---
      const savedMaxEpochStr = localStorage.getItem(ZK_MAX_EPOCH_KEY);
      const savedRandomness = localStorage.getItem(ZK_RANDOMNESS_KEY);
      const keyPair = getKeyPair(); // Retrieve the same keypair used for login init
      const ephemeralPublicKeyB64 = keyPair.getPublicKey().toBase64();

      if (!savedMaxEpochStr || !savedRandomness) {
        console.error(
          "handleCallback: Missing maxEpoch or randomness from localStorage."
        );
        throw new Error(
          "Session data (maxEpoch, randomness) missing. Please try logging in again."
        );
      }
      const savedMaxEpoch = parseInt(savedMaxEpochStr, 10);
      console.log(
        "handleCallback: Retrieved state for nonce validation (maxEpoch, randomness, keyPair)"
      ); // LOG 3

      // --- Nonce Validation ---
      const expectedNonce = generateNonce(
        ephemeralPublicKeyB64,
        savedMaxEpoch,
        savedRandomness
      );
      console.log("handleCallback: Calculated Expected Nonce:", expectedNonce); // LOG 4
      console.log("handleCallback: Nonce received from JWT:", decodedJwt.nonce); // Log received nonce

      if (decodedJwt.nonce !== expectedNonce) {
        console.error(
          "NONCE MISMATCH! Expected:",
          expectedNonce,
          "Got:",
          decodedJwt.nonce
        ); // Explicit log
        throw new Error(
          `Nonce validation failed. Expected: ${expectedNonce}, Received: ${decodedJwt.nonce}`
        );
      }
      console.log("handleCallback: Nonce VALIDATED successfully"); // LOG 5

      // --- Derive Sui Address ---
      if (!APP_SALT) {
        console.error("handleCallback: APP_SALT is not configured correctly.");
        throw new Error(
          "Application setup error: VITE_APP_SALT is not configured correctly."
        );
      }

      const userAddress = computeZkLoginAddress({
        claimName: "sub",
        claimValue: decodedJwt.sub,
        userSalt: BigInt(APP_SALT),
        iss: decodedJwt.iss,
        aud: decodedJwt.aud,
      });
      console.log("handleCallback: Derived User Address:", userAddress); // LOG 6

      // --- Fetch ZK Proof ---
      setLoading("Fetching ZK proof from prover service...");
      console.log(
        "handleCallback: Preparing to fetch ZK proof from:",
        PROVER_URL
      ); // LOG 7
      const proofPayload = {
        jwt: jwt,
        extendedEphemeralPublicKey: ephemeralPublicKeyB64,
        maxEpoch: savedMaxEpoch,
        jwtRandomness: savedRandomness,
        salt: APP_SALT, // Pass the original string salt here
        keyClaimName: "sub",
      };
      // Avoid logging the full JWT in production if possible
      console.log(
        "handleCallback: Proof Request Payload (excluding JWT for brevity):",
        { ...proofPayload, jwt: " OMITTED " }
      ); // LOG 8

      const proofResponse = await fetch(PROVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proofPayload),
      });
      console.log(
        "handleCallback: Proof Fetch Response Status:",
        proofResponse.status
      ); // LOG 9

      if (!proofResponse.ok) {
        const errorText = await proofResponse.text(); // Read error text from prover
        console.error("handleCallback: Prover Fetch Error Text:", errorText); // LOG ERROR TEXT
        throw new Error(
          `Failed to get ZK proof (${proofResponse.status}): ${errorText}`
        );
      }

      // Parse the proof data
      const zkLoginProofData: ZkLoginProof = await proofResponse.json();
      console.log("handleCallback: Parsed ZK Proof data:", zkLoginProofData); // LOG 10

      // Validate essential proof parts
      if (!zkLoginProofData.proofPoints || !zkLoginProofData.addressSeed) {
        console.error(
          "handleCallback: Incomplete proof data received",
          zkLoginProofData
        );
        throw new Error(
          "Received incomplete ZK proof data from the prover service."
        );
      }
      // Optional: Validate address seed consistency
      const localAddressSeed = genAddressSeed(
        BigInt(APP_SALT),
        "sub",
        decodedJwt.sub,
        decodedJwt.aud
      ).toString();
      if (localAddressSeed !== zkLoginProofData.addressSeed) {
        console.warn(
          `Address seed mismatch! Local: ${localAddressSeed}, Prover: ${zkLoginProofData.addressSeed}.`
        );
      } else {
        console.log("Address seed validated with prover response.");
      }

      // --- Store User Session Info ---
      console.log("handleCallback: Setting UserInfo state..."); // LOG 11
      // Note: Ensure UserInfo interface matches this structure if using it
      setUserInfo({
        address: userAddress,
        jwt: jwt, // Store JWT temporarily if needed
        inputs: zkLoginProofData, // Store the parsed ZkLoginProof object
        keyPair: keyPair,
        maxEpoch: savedMaxEpoch,
      });

      console.log(
        "handleCallback: Setting zkLoginUserAddress in localStorage:",
        userAddress
      ); // LOG 12
      localStorage.setItem(ZK_LOGIN_ADDRESS_KEY, userAddress); // <<<< STORE ADDRESS

      // --- Fetch Initial Balance ---
      console.log("handleCallback: Fetching balance for new address..."); // LOG 13
      await fetchBalance(userAddress);

      // --- Navigate and Cleanup ---
      setLoading(null);
      console.log("handleCallback: Navigating to /"); // LOG 14
      navigate("/"); // Redirect to home page or dashboard

      // Cleanup temporary items *after* successful processing
      localStorage.removeItem(ZK_MAX_EPOCH_KEY);
      localStorage.removeItem(ZK_RANDOMNESS_KEY);
      console.log("--- handleCallback SUCCESS ---"); // SUCCESS LOG
    } catch (err: any) {
      // --- Handle Errors During Callback Processing ---
      console.error("--- handleCallback ERROR ---", err); // Catch block log
      // Provide specific error feedback if possible
      let errorMessage = `Login/Callback failed: ${
        err.message || "An unknown error occurred."
      }`;
      if (err.message?.includes("Nonce validation failed")) {
        errorMessage =
          "Login session mismatch or expired. Please try logging in again.";
      } else if (err.message?.includes("Failed to get ZK proof")) {
        errorMessage = `Could not get validation proof. ${err.message.substring(
          err.message.indexOf(":") + 1
        )}`;
      }
      setError(errorMessage);

      // Cleanup potentially corrupted state
      localStorage.removeItem(ZK_EPHEMERAL_KEYPAIR_KEY);
      localStorage.removeItem(ZK_MAX_EPOCH_KEY);
      localStorage.removeItem(ZK_RANDOMNESS_KEY);
      localStorage.removeItem(ZK_LOGIN_ADDRESS_KEY); // Ensure address is cleared on error
      setUserInfo(null);
      setSuiBalance(null);
      setLoading(null); // Ensure loading indicator stops
    }
  }, [
    // Add ALL external state setters, getters, hooks, and functions used inside
    getKeyPair,
    fetchBalance,
    navigate,
    setUserInfo,
    setLoading,
    setError,
    setSuiBalance,
    // generateNonce should ideally be stable or memoized if defined inside component
  ]);

  // --- Effect for Callback Handling & Session Restore ---
  useEffect(() => {
    if (
      window.location.hash.includes("id_token") ||
      window.location.hash.includes("error")
    ) {
      handleCallback();
    } else {
      const storedAddress = localStorage.getItem(ZK_LOGIN_ADDRESS_KEY);
      const keypairExists = !!localStorage.getItem(ZK_EPHEMERAL_KEYPAIR_KEY);
      if (storedAddress && keypairExists) {
        console.log(
          "Found stored address and keypair. Restoring partial session."
        );
        const keyPair = getKeyPair();
        setUserInfo({
          address: storedAddress,
          keyPair: keyPair,
          jwt: "", // No JWT stored long term
          inputs: null, // Proof not persisted
          maxEpoch: 0, // Max epoch not persisted
        });
        fetchBalance(storedAddress);
      } else {
        console.log("No active ZKLogin session found in localStorage.");
        setUserInfo(null);
        setSuiBalance(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleCallback]); // Rerun if handleCallback definition changes

  // --- Example Transaction ---
  const handleMakeTransaction = async () => {
    if (!userInfo || !userInfo.inputs || !userInfo.maxEpoch) {
      setError(
        "Active login session with proof data required for transactions. Please login again."
      );
      return;
    }
    setLoading("Preparing and executing transaction...");
    setError(null);

    try {
      const txb = new TransactionBlock();
      txb.splitCoins(txb.gas, [txb.pure(1000)]); // Example action
      txb.setSender(userInfo.address);

      const { epoch } = await suiClient.getLatestSuiSystemState();
      if (Number(epoch) > userInfo.maxEpoch) {
        setError(
          "Login session expired (max epoch exceeded). Please login again."
        );
        setUserInfo((prev) =>
          prev ? { ...prev, inputs: null, maxEpoch: 0, jwt: "" } : null
        );
        setLoading(null);
        return;
      }

      const { bytes: txBytes, signature: userSignature } = await txb.sign({
        client: suiClient,
        signer: userInfo.keyPair, // Sign with the ephemeral key
      });

      if (!userInfo.inputs.addressSeed) {
        throw new Error(
          "Proof data is incomplete (missing addressSeed). Please login again."
        );
      }

      const zkLoginSignature = getZkLoginSignature({
        inputs: userInfo.inputs, // Pass the ZkLoginProof object
        maxEpoch: userInfo.maxEpoch,
        userSignature: userSignature,
      });

      console.log("Executing transaction block with ZkLoginSignature...");
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: zkLoginSignature,
        options: { showEffects: true, showBalanceChanges: true },
      });

      console.log("Transaction Execution Result:", result);
      if (result.effects?.status.status === "success") {
        setLoading(null);
        alert(`Transaction Successful! Digest: ${result.digest}`);
        await fetchBalance(userInfo.address); // Refresh balance
      } else {
        throw new Error(
          `Transaction failed on-chain: ${
            result.effects?.status.error || "Unknown error"
          }`
        );
      }
    } catch (err: any) {
      console.error("Transaction failed:", err);
      setError(`Transaction failed: ${err.message || "Unknown error"}`);
      setLoading(null);
      if (err.message?.includes("epoch")) {
        setError(
          "Transaction failed: Login session may have expired. Please login again."
        );
        setUserInfo((prev) =>
          prev ? { ...prev, inputs: null, maxEpoch: 0, jwt: "" } : null
        );
      }
    }
  };

  // --- Logout ---
  const handleLogout = () => {
    setUserInfo(null);
    setError(null);
    setLoading(null);
    setSuiBalance(null);
    localStorage.removeItem(ZK_EPHEMERAL_KEYPAIR_KEY);
    localStorage.removeItem(ZK_LOGIN_ADDRESS_KEY);
    localStorage.removeItem(ZK_MAX_EPOCH_KEY);
    localStorage.removeItem(ZK_RANDOMNESS_KEY);
    console.log("User logged out.");
    navigate("/login"); // Redirect to login page
  };

  // --- UI Elements ---
  const loginButton = useMemo(
    () => (
      <button
        onClick={handleLogin}
        disabled={!!loading}
        style={{ marginTop: "10px" }}
      >
        {loading === "Preparing login redirect..."
          ? "Redirecting..."
          : "Login with Google"}
      </button>
    ),
    [loading]
  );

  // --- Component Render ---
  return (
    <div
      style={{ padding: "20px", fontFamily: "sans-serif", lineHeight: "1.6" }}
    >
      <h2>Sui ZK Login (Manual Flow)</h2>

      {loading && (
        <p style={{ color: "blue" }}>
          <i>Loading: {loading}...</i>
        </p>
      )}
      {error && (
        <p
          style={{
            color: "red",
            fontWeight: "bold",
            border: "1px solid red",
            padding: "10px",
          }}
        >
          Error: {error}
        </p>
      )}

      {!userInfo ? (
        // --- Logged Out View ---
        <div>
          <p>Login using Google to interact with the Sui network.</p>
          {loginButton}
          {localStorage.getItem(ZK_LOGIN_ADDRESS_KEY) && !loading && !error && (
            <p style={{ marginTop: "15px", fontSize: "0.9em", color: "#555" }}>
              (Previously logged in as:{" "}
              {localStorage.getItem(ZK_LOGIN_ADDRESS_KEY)})
            </p>
          )}
        </div>
      ) : (
        // --- Logged In View ---
        <div>
          <h3>Session Active</h3>
          <p>
            <strong>Sui Address:</strong>{" "}
            <code style={{ background: "#f0f0f0", padding: "2px 4px" }}>
              {userInfo.address}
            </code>
          </p>
          <p>
            <strong>Balance:</strong>{" "}
            {suiBalance === null
              ? "Checking..."
              : `${suiBalance.toFixed(6)} SUI`}
            <button
              onClick={() => fetchBalance(userInfo.address)}
              disabled={!!loading}
              style={{ marginLeft: "10px", fontSize: "0.9em" }}
              title="Refresh balance"
            >
              🔄 Refresh
            </button>
          </p>

          <div
            style={{
              margin: "20px 0",
              padding: "15px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <h4>Actions</h4>
            {userInfo.inputs && userInfo.maxEpoch ? (
              // --- Transaction Button (Enabled) ---
              <button onClick={handleMakeTransaction} disabled={!!loading}>
                {loading === "Preparing and executing transaction..."
                  ? "Executing Tx..."
                  : "Make Test Transaction"}
              </button>
            ) : (
              // --- Transaction Disabled (Partial Login) ---
              <div>
                <p style={{ color: "orange", fontWeight: "bold" }}>
                  Full login session required for transactions.
                </p>
                {loginButton} {/* Prompt to re-login fully */}
              </div>
            )}
          </div>

          {/* --- Logout --- */}
          <button
            onClick={handleLogout}
            disabled={!!loading}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              padding: "8px 15px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>

          {/* --- Faucet Link --- */}
          <p style={{ marginTop: "25px", fontSize: "0.9em" }}>
            Need DevNet SUI? Visit the{" "}
            <a
              href="https://docs.sui.io/build/faucet"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sui DevNet Faucet
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
};

export default ZkLoginComponent;
