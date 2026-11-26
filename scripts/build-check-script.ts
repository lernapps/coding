// Builds src/tools/challenge-check.ts into public/tools/challenge-check.v1.mjs: one file without dependencies, which
// the app publishes. Run after a change of the core, the worlds or the messages: npm run build:check-script
// (CHECK_SCRIPT_OUT names another folder, for the test that compares the published file with a fresh build).
/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { build } from "vite";
import { sourceHash } from "./check-script-source.ts";

const outDir = process.env["CHECK_SCRIPT_OUT"] ?? "public/tools";

await build({
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  build: {
    ssr: "src/tools/challenge-check.ts",
    outDir,
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: { entryFileNames: "challenge-check.v1.mjs", format: "es", banner: `// source: ${sourceHash()}` },
    },
  },
  ssr: { noExternal: true },
});

// Formatted as the repository's format check expects, so that the check leaves the published file alone (a folder the
// formatter ignores stays as built).
try {
  execFileSync("npx", ["vp", "fmt", `${outDir}/challenge-check.v1.mjs`], { stdio: "ignore" });
} catch {
  // not formatted: compared without white space by the test
}
