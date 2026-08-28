import { performance } from "node:perf_hooks";

const target = new URL(process.env.PERF_TARGET_URL ?? "http://127.0.0.1:3100/login");
const concurrency = Number.parseInt(process.env.PERF_CONCURRENCY ?? "10", 10);
const durationSeconds = Number.parseInt(process.env.PERF_DURATION_SECONDS ?? "10", 10);
const localHosts = new Set(["127.0.0.1", "localhost"]);
const isRemoteTarget = !localHosts.has(target.hostname);

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 50) {
  throw new Error("PERF_CONCURRENCY must be an integer between 1 and 50");
}

if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 60) {
  throw new Error("PERF_DURATION_SECONDS must be an integer between 1 and 60");
}

if (isRemoteTarget) {
  if (process.env.PERF_ALLOW_REMOTE !== "staging-only") {
    throw new Error("Remote load tests require PERF_ALLOW_REMOTE=staging-only");
  }

  if (!process.env.PERF_STAGING_ORIGIN) {
    throw new Error("Remote load tests require an explicit PERF_STAGING_ORIGIN allowlist");
  }

  const stagingOrigin = new URL(process.env.PERF_STAGING_ORIGIN).origin;
  if (target.origin !== stagingOrigin) {
    throw new Error("PERF_TARGET_URL does not match the staging origin allowlist");
  }

  if (process.env.PERF_PRODUCTION_ORIGIN) {
    const productionOrigin = new URL(process.env.PERF_PRODUCTION_ORIGIN).origin;
    if (target.origin === productionOrigin) {
      throw new Error("Refusing to load test the production origin");
    }
  }
}

const deadline = performance.now() + durationSeconds * 1_000;
const latencies = [];
let completed = 0;
let failed = 0;
let transferredBytes = 0;

async function worker() {
  while (performance.now() < deadline) {
    const startedAt = performance.now();
    try {
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
      const body = await response.arrayBuffer();
      latencies.push(performance.now() - startedAt);
      transferredBytes += body.byteLength;
      if (response.status >= 200 && response.status < 400) completed += 1;
      else failed += 1;
    } catch {
      latencies.push(performance.now() - startedAt);
      failed += 1;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

latencies.sort((left, right) => left - right);
const percentile = (value) => {
  if (latencies.length === 0) return 0;
  const index = Math.min(latencies.length - 1, Math.ceil(latencies.length * value) - 1);
  return latencies[index];
};

const total = completed + failed;
console.log(`target=${target.origin}${target.pathname}`);
console.log(`duration=${durationSeconds}s concurrency=${concurrency}`);
console.log(`requests=${total} completed=${completed} failed=${failed}`);
console.log(`requestsPerSecond=${(total / durationSeconds).toFixed(1)}`);
console.log(
  `latencyMs p50=${percentile(0.5).toFixed(1)} p95=${percentile(0.95).toFixed(1)} p99=${percentile(0.99).toFixed(1)}`,
);
console.log(`transferredBytes=${transferredBytes}`);

if (failed > 0) process.exitCode = 1;
