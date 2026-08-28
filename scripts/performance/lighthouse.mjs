import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const target = new URL(process.env.PERF_TARGET_URL ?? "http://127.0.0.1:3100/login");
const lighthouseCli = fileURLToPath(
  new URL("../../node_modules/lighthouse/cli/index.js", import.meta.url),
);
const lighthouseTemp = fileURLToPath(
  new URL("../../test-results/lighthouse-tmp/", import.meta.url),
);

mkdirSync("test-results", { recursive: true });
mkdirSync(lighthouseTemp, { recursive: true });

const child = spawn(process.execPath, [
  lighthouseCli,
  target.toString(),
  "--quiet",
  "--chrome-flags=--headless --no-sandbox",
  "--output=html",
  "--output=json",
  "--output-path=./test-results/lighthouse-login",
], {
  env: {
    ...process.env,
    TEMP: lighthouseTemp,
    TMP: lighthouseTemp,
  },
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
