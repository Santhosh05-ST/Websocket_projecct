import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // sockjs-client references the Node.js `global` object, which
    // Vite doesn't polyfill by default in the browser.
    global: "globalThis",
  },
  server: {
    port: 5173,
  },
});
