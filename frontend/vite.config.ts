console.log("✅ VITE CONFIG LOADED");

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
  //  server: {
  //   host: '127.0.0.1', // Explicitly set the host to 127.0.0.1
  //   port: 5173
  // },
//   build: {
//     rollupOptions: {
//       output: {
//         manualChunks(id) {
//           if (id.includes("node_modules")) {
//             if (id.includes("react-router")) return "router";
//             if (id.includes("@react-oauth/google")) return "google-oauth";
//             if (id.includes("axios")) return "axios";
//             return "vendor";
//           }
//         },
//       },
//     },
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
  "gps-florists-featured-holland.trycloudflare.com"
],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) return "router";
            if (id.includes("@react-oauth/google")) return "google-oauth";
            if (id.includes("axios")) return "axios";
            return "vendor";
          }
        },
      },
    },
  },
});