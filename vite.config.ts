import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the Node backend so the browser talks to one origin.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
