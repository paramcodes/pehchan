import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { chromium } from "playwright";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const root = process.cwd();
const workDir = path.join(root, ".capture");
const shotsDir = path.join(root, "docs/screenshots");
const mediaDir = path.join(root, "docs/media");
const baseUrl = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";
const keepUser = process.argv.includes("--keep-user");
const keepWork = process.argv.includes("--keep-work");

const shots = [
  ["01-home", "home"],
  ["02-explore", "explore"],
  ["03-detail", "detail"],
  ["04-chat", "chat"],
  ["05-chats", "chats"],
  ["06-editor", "editor"],
  ["07-studio", "studio"],
];

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
  }
}

function assertTools() {
  const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpeg.status !== 0) {
    throw new Error("ffmpeg is required to build the GIF, MP4, and WebP files.");
  }
}

async function probe() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
    return response.status;
  } catch {
    return null;
  }
}

async function startServer() {
  const status = await probe();
  if (status !== null) {
    if (status >= 500) {
      throw new Error(`The server at ${baseUrl} responded with ${status}. Check the database.`);
    }
    console.log(`Using the server at ${baseUrl}`);
    return null;
  }

  if (!existsSync(path.join(root, ".next/BUILD_ID"))) {
    throw new Error("No production build found. Run pnpm build first, or use pnpm capture:fresh.");
  }

  const port = new URL(baseUrl).port || "3000";
  const nextBin = path.join(root, "node_modules/next/dist/bin/next");
  console.log(`Starting next start on port ${port}`);
  const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await probe();
    if (ready !== null && ready < 500) return child;
    await sleep(500);
  }

  child.kill("SIGTERM");
  throw new Error(`The server did not start at ${baseUrl}.`);
}

async function idleImages(page) {
  await page.waitForFunction(
    () => Array.from(document.images).every((image) => image.complete),
    undefined,
    { timeout: 20000 },
  );
  await page.waitForTimeout(350);
}

async function capture(page) {
  const pause = (ms) => page.waitForTimeout(ms);
  const shot = async (name) => {
    await idleImages(page);
    await page.screenshot({ path: path.join(workDir, "shots", `${name}.png`) });
    console.log(`Captured ${name}`);
  };

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /A few good first meetings/i }).waitFor();
  await pause(2400);
  await shot("01-home");

  await page.goto(`${baseUrl}/sign-up?next=%2Fexplore`, { waitUntil: "domcontentloaded" });
  await pause(700);
  await idleImages(page);
  await page.fill('input[name="name"]', "Mira Reader");
  await page.fill('input[name="email"]', process.env.CAPTURE_EMAIL);
  await page.fill('input[name="password"]', process.env.CAPTURE_PASSWORD);
  await pause(500);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(`${baseUrl}/explore`);
  await pause(900);

  await page.click('input[name="q"]');
  await page.type('input[name="q"]', "radio", { delay: 14 });
  await pause(400);
  await page.getByRole("button", { name: "Find" }).click();
  await page.waitForURL(/q=radio/);
  await page.getByText("Aria Vale").first().waitFor();
  await pause(1400);
  await shot("02-explore");

  await page.getByText("Aria Vale").first().click();
  await page.waitForURL(/\/c\/aria-vale/);
  await pause(2200);
  await shot("03-detail");

  await page.getByRole("button", { name: "Start a conversation" }).click();
  await page.waitForURL(/\/chat\//);
  await pause(900);

  await page.click("#chat-input");
  await page.type(
    "#chat-input",
    "I keep replaying a conversation from work, and I cannot let it go.",
    {
      delay: 14,
    },
  );
  await pause(500);
  await page.press("#chat-input", "Enter");
  await page.getByText(/You said:/).waitFor({ timeout: 20000 });
  await page.waitForTimeout(900);
  await shot("04-chat");
  await pause(1200);

  await page.goto(`${baseUrl}/chats`, { waitUntil: "domcontentloaded" });
  await pause(1200);
  await shot("05-chats");

  await page.goto(`${baseUrl}/studio`, { waitUntil: "domcontentloaded" });
  await pause(800);
  await page.getByRole("link", { name: "New companion" }).click();
  await page.waitForURL(`${baseUrl}/studio/new`);
  await pause(700);

  await page.fill('input[name="name"]', "Wren Calder");
  await page.getByLabel("Tagline").fill("Night-shift librarian who keeps the odd questions.");
  await page
    .getByLabel("Description")
    .fill(
      "Wren works the late desk at a library that never quite closes. She is curious, unhurried, and suspicious of tidy answers.",
    );
  await page
    .getByLabel("Behaviour and voice")
    .fill(
      "Speak in measured sentences. Ask one precise question at a time. Notice what the user avoids. Never rush to advice.",
    );
  await page
    .getByLabel("Opening line")
    .fill("The lights are low and the kettle is warm. What are you looking for tonight?");
  await page
    .getByLabel("Example dialogue")
    .fill(
      "I cannot stop thinking about it. | Then we will give it a proper shelf. Start where the thought gets loudest.",
    );
  await pause(600);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await pause(500);
  await shot("06-editor");

  await page.getByRole("button", { name: "Create companion" }).click();
  await page.waitForURL(/\/studio\?created=/);
  await pause(1800);
  await shot("07-studio");

  await page.getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/studio\/[^/]+\/edit/);
  await pause(1300);
  await page.mouse.wheel(0, 420);
  await pause(900);

  await page.goto(`${baseUrl}/privacy`, { waitUntil: "domcontentloaded" });
  await pause(1200);
  await page.mouse.wheel(0, 360);
  await pause(900);

  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
  await pause(1200);
}

function buildMedia(videoPath) {
  mkdirSync(shotsDir, { recursive: true });
  mkdirSync(mediaDir, { recursive: true });

  for (const [source, target] of shots) {
    run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      path.join(workDir, "shots", `${source}.png`),
      "-vf",
      "scale=1440:-1:flags=lanczos",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      path.join(shotsDir, `${target}.webp`),
    ]);
  }

  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    "0.2",
    "-i",
    videoPath,
    "-vf",
    "setpts=PTS/2.2,fps=10,scale=900:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4",
    "-loop",
    "0",
    path.join(mediaDir, "pehchan-demo.gif"),
  ]);

  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    "0.2",
    "-i",
    videoPath,
    "-vf",
    "setpts=PTS/1.6,scale=1440:-1:flags=lanczos",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "25",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    path.join(mediaDir, "pehchan-demo.mp4"),
  ]);
}

async function deleteCaptureUser(email) {
  if (keepUser) {
    console.log(`Keeping the capture account ${email}`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.warn(`DATABASE_URL is not set. Delete the capture account ${email} manually.`);
    return;
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  try {
    await pool.query('delete from "user" where email = $1', [email]);
    console.log(`Deleted the capture account ${email}`);
  } catch (error) {
    console.warn(`Could not delete the capture account ${email}.`, error);
  } finally {
    await pool.end();
  }
}

async function main() {
  assertTools();
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(path.join(workDir, "shots"), { recursive: true });
  mkdirSync(path.join(workDir, "video"), { recursive: true });

  const email = process.env.CAPTURE_EMAIL ?? `capture-${Date.now()}@example.com`;
  const password = process.env.CAPTURE_PASSWORD ?? "correct-horse-9";
  process.env.CAPTURE_EMAIL = email;
  process.env.CAPTURE_PASSWORD = password;

  const server = await startServer();
  let browser;
  let videoPath;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: path.join(workDir, "video"), size: { width: 1440, height: 900 } },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (entry) => {
      if (entry.type() === "error") errors.push(entry.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));

    await capture(page);

    const video = page.video();
    await context.close();
    videoPath = await video.path();

    if (errors.length > 0) {
      console.warn(`Console errors during capture:\n${errors.join("\n")}`);
    }
  } finally {
    await browser?.close();
    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        sleep(2000).then(() => {
          if (server.exitCode === null) server.kill("SIGKILL");
        }),
      ]);
    }
    await deleteCaptureUser(email);
  }

  buildMedia(videoPath);
  console.log(`Wrote screenshots to ${shotsDir}`);
  console.log(`Wrote media to ${mediaDir}`);

  if (!keepWork) rmSync(workDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
