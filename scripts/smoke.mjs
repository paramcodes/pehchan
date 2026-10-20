import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const DEFAULT_PORT = "3210";
const DEFAULT_DATABASE_URL = "postgresql://pehchan:pehchan@localhost:5432/pehchan";
const LOCAL_SECRET = "pehchan-smoke-local-secret-000000000000";
const READY_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 500;
const ROUTE_TIMEOUT_MS = 20_000;
const SEEDED_SLUG = "aria-vale";

const ROUTES = [
  ["/", "A few good first meetings."],
  ["/explore", "Catalogue"],
  ["/sign-in", "Welcome back."],
  ["/sign-up", "Make someone up."],
  [`/c/${SEEDED_SLUG}`, "Aria Vale"],
];

const skipBuild = process.argv.includes("--skip-build");

let server = null;
let serverLog = "";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(root, file);
    if (existsSync(full)) loadEnv({ path: full, quiet: true });
  }
}

function readPort() {
  const raw = (process.env.SMOKE_PORT || DEFAULT_PORT).trim();
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || port < 1 || port > 65535) {
    throw new Error(`SMOKE_PORT must be a port number between 1 and 65535, got "${raw}".`);
  }
  return String(port);
}

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

function appEnv(port, databaseUrl) {
  return {
    ...process.env,
    AI_MODE: "mock",
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET?.trim() || LOCAL_SECRET,
    BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: port,
  };
}

function runBuild(env) {
  console.log("smoke: running pnpm build");
  const result = spawnSync("pnpm", ["build"], { cwd: root, env, encoding: "utf8" });
  if (result.error) {
    throw new Error(`pnpm build could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    throw new Error(`pnpm build exited with status ${result.status}`);
  }
}

async function requireSeededCompanion(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  let rows = [];
  try {
    const result = await pool.query("select id from companions where slug = $1 limit 1", [
      SEEDED_SLUG,
    ]);
    rows = result.rows;
  } catch (error) {
    throw new Error(`Could not query ${databaseUrl} for the seeded companion: ${error.message}`);
  } finally {
    await pool.end();
  }
  if (rows.length === 0) {
    throw new Error(
      `The seeded companion "${SEEDED_SLUG}" is missing from the database. Run pnpm db:seed first.`,
    );
  }
}

function startServer(env, port) {
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  if (!existsSync(nextBin)) {
    throw new Error(`No next binary at ${nextBin}. Run pnpm install first.`);
  }
  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  const record = (chunk) => {
    serverLog += chunk.toString();
  };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  child.on("error", (error) => {
    serverLog += `\nserver error: ${error.message}\n`;
  });
  return child;
}

function signalGroup(child, signal) {
  if (!child || child.pid === undefined || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {}
  }
}

async function waitForExit(child, ms) {
  return Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    sleep(ms).then(() => false),
  ]);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  signalGroup(child, "SIGTERM");
  if (!(await waitForExit(child, 3000))) {
    signalGroup(child, "SIGKILL");
    await waitForExit(child, 2000);
  }
}

async function waitForReady(baseUrl, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The server exited with status ${child.exitCode} before it answered.`);
    }
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
      await response.text();
      return;
    } catch {}
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`The server did not answer at ${baseUrl} within ${READY_TIMEOUT_MS / 1000}s.`);
}

async function checkRoute(baseUrl, route, expect) {
  let response;
  try {
    response = await fetch(`${baseUrl}${route}`, { signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) });
  } catch (error) {
    return { ok: false, line: `FAIL ${route} request failed: ${error.message}` };
  }
  const body = await response.text();
  if (response.status !== 200) {
    return { ok: false, line: `FAIL ${route} expected 200 got ${response.status}` };
  }
  if (!body.includes(expect)) {
    return { ok: false, line: `FAIL ${route} expected body to contain ${JSON.stringify(expect)}` };
  }
  return { ok: true, line: `PASS ${route} ${response.status}` };
}

async function main() {
  loadEnvFiles();
  const port = readPort();
  const databaseUrl = resolveDatabaseUrl();
  const env = appEnv(port, databaseUrl);
  const baseUrl = `http://127.0.0.1:${port}`;

  await requireSeededCompanion(databaseUrl);

  if (skipBuild) {
    console.log("smoke: skipping the build");
    if (!existsSync(path.join(root, ".next/BUILD_ID"))) {
      throw new Error("No production build found. Run pnpm build first, or drop --skip-build.");
    }
  } else {
    runBuild(env);
  }

  server = startServer(env, port);
  // The server runs in its own process group so a wedged Next process dies with the whole tree.
  process.on("exit", () => signalGroup(server, "SIGTERM"));

  try {
    await waitForReady(baseUrl, server);
  } catch (error) {
    if (serverLog.trim()) console.error(serverLog.trimEnd());
    throw error;
  }

  let passed = 0;
  let failed = 0;
  for (const [route, expect] of ROUTES) {
    const result = await checkRoute(baseUrl, route, expect);
    console.log(result.line);
    if (result.ok) passed += 1;
    else failed += 1;
  }

  console.log(`smoke: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

process.on("SIGINT", () => {
  signalGroup(server, "SIGTERM");
  process.exit(130);
});

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await stopServer(server);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });
