import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  // Optional: Add resolve alias if the plugin doesn't handle it automatically
  // resolve: {
  //   alias: {
  //       buffer: 'buffer/', // Alias 'buffer' to the installed buffer package
  //   }
  // }

  server: {
    proxy: {
      "/gas": "https://faucet.testnet.sui.io",
    },
  },
});
