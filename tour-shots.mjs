// Captures every tour step as a PNG (film mode, headless Chromium), for checking.
//   node tour-shots.mjs <steps>
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const steps = Number(process.argv[2] ?? 9);
const out = join(root, "frames", "tour");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const PORT = 9334;
const browser = spawn("/Applications/Chromium.app/Contents/MacOS/Chromium", ["--headless=new", `--remote-debugging-port=${PORT}`, "--window-size=1280,720", `--user-data-dir=${join(out, ".profile")}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) { try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch {} await sleep(200); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluate = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url: pathToFileURL(join(root, "dist", "ilias", "index.html")).href + "#film" });
for (let i = 0; i < 50 && !(await evaluate("!!window.film").catch(() => false)); i++) await sleep(200);
await evaluate("document.fonts.ready.then(() => true)");
for (let i = 0; i < steps; i++) {
  const title = await evaluate(`film.tourStep(${i})`);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
  writeFileSync(join(out, `step_${i + 1}.png`), Buffer.from(shot.data, "base64"));
  console.log(i + 1, title);
}
ws.close(); browser.kill();
