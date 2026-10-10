// Records the film mode of the page frame by frame with headless Chromium
// (Chrome DevTools Protocol over Node's built-in WebSocket), then assembles
// an H.264 mp4 with ffmpeg.
//
//   node record.mjs <seconds> <out.mp4> [stepsPerFrame] [warmupSteps]

import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const [seconds = "20", out = join(root, "dist", "aktin-lamellipodium.mp4"), stepsPerFrame = "3", warmup = "400"] = process.argv.slice(2);
const FPS = 30;
const frames = Math.round(Number(seconds) * FPS);
const framesDir = join(root, "frames");
const CHROMIUM = "/Applications/Chromium.app/Contents/MacOS/Chromium";
const PORT = 9333;
const page = pathToFileURL(join(root, "dist", "ilias", "index.html")).href + "#film";

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = spawn(CHROMIUM, [
  "--headless=new", `--remote-debugging-port=${PORT}`, "--window-size=1280,720",
  `--user-data-dir=${join(root, "frames", ".profile")}`, "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const p = list.find((t) => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chromium did not start");
}

const ws = new WebSocket(await target());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  pending.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception?.description));
  return r.result.value;
};

await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
await send("Page.enable");
await send("Page.navigate", { url: page });
for (let i = 0; i < 50 && !(await evaluate("!!window.film").catch(() => false)); i++) await sleep(200);
await evaluate("document.fonts.ready.then(() => true)");
await evaluate(`film.reset(); film.advance(${Number(warmup)}); film.draw()`);

for (let f = 0; f < frames; f++) {
  await evaluate(`film.advance(${Number(stepsPerFrame)}); film.draw()`);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
  writeFileSync(join(framesDir, `f_${String(f).padStart(5, "0")}.png`), Buffer.from(shot.data, "base64"));
}
ws.close();
browser.kill();

execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(framesDir, "f_%05d.png"),
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out]);
console.log(`wrote ${out} (${frames} frames)`);
