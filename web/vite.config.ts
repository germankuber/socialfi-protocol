import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The ESM build of libsodium-wrappers ships an unresolved dynamic
      // import to "./libsodium.mjs" that Rollup cannot follow. Force the
      // bundler to use the CJS entry point which is self-contained.
      "libsodium-wrappers": path.resolve(
        __dirname,
        "./node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js",
      ),
    },
  },
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ["libsodium-wrappers"],
  },
});
