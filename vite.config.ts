import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
      "crypto": "crypto-browserify",
      "buffer": "buffer",
      "stream": "stream-browserify",
      "process": "process/browser",
      "util": "util",
      "events": "events",
    },
  },
  define: {
    global: "globalThis",
    process: "globalThis.process",
  },
  build: {
    target: "ES2022",
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ["@digitalpersona/websdk", "@digitalpersona/devices"],
    esbuildOptions: {
      target: "ES2022",
      define: {
        global: "globalThis",
        process: "globalThis.process",
      },
    },
    include: [
      "crypto-browserify",
      "buffer",
      "stream-browserify",
      "util",
      "events",
    ],
  },
})