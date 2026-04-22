import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // `@polkadot-apps/host` ships inline vitest blocks
  // (`if (import.meta.vitest) { ... }`) inside its published sources.
  // In production those blocks are dead code but Rollup cannot always
  // hoist them out, which reorders the chunk and surfaces as a TDZ
  // `Cannot access 'T' before initialization` at runtime. Replacing
  // the sentinel with `undefined` at build time lets esbuild eliminate
  // the whole block cleanly before Rollup runs.
  define: {
    "import.meta.vitest": "undefined",
  },
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
    // `@polkadot-apps/statement-store` (and its logger) use top-level
    // `await` for dynamic imports. esbuild's dev-mode dep optimizer
    // defaults to `es2020`, which rejects TLA, so we bump it here to
    // match the production `build.target`. Keeping both at `esnext`
    // avoids a matrix of "works in build but breaks in dev" bugs.
    esbuildOptions: {
      target: "esnext",
    },
  },
});
