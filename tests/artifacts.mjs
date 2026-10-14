import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  let p = await b.newPage({ viewport: { width: 1024, height: 600 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(process.env.GAME_URL ?? "http://127.0.0.1:4173");
  await p.waitForFunction(() => window.__HON_GIOI__);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(async () => {
    const names = await caches.keys();
    return names.some((n) => n.startsWith("hon-gioi-"));
  });
  await p.context().setOffline(true);
  await p.reload();
  await p.waitForFunction(() => window.__HON_GIOI__);
  await p.locator("#start").click();
  await p.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  assert.deepEqual(errors, []);
  console.log("PASS: production PWA reloads and starts a match offline.");
  await p.close();
  p = await b.newPage({ viewport: { width: 1024, height: 600 } });
  let external = 0;
  const fileErrors = [];
  p.on("request", (r) => {
    if (/^https?:/.test(r.url()) && r.url() !== "https://standalone.test/")
      external++;
  });
  p.on("pageerror", (e) => fileErrors.push(e.message));
  try {
    await p.goto("file://" + process.cwd() + "/release/Hon-Gioi-Sinh-Ton.html");
  } catch (e) {
    if (!String(e).includes("ERR_BLOCKED_BY_ADMINISTRATOR")) throw e;
    const html = await readFile("release/Hon-Gioi-Sinh-Ton.html", "utf8");
    await p.route("https://standalone.test/", (route) =>
      route.fulfill({ body: html, contentType: "text/html; charset=utf-8" }),
    );
    await p.goto("https://standalone.test/");
    console.log(
      "NOTE: managed Chromium blocks file://; same HTML tested through an intercepted document response.",
    );
  }
  await p.waitForFunction(() => window.__HON_GIOI__);
  await p.locator("#start").click();
  await p.waitForFunction(() => window.__HON_GIOI__.match?.time > 0);
  assert.equal(external, 0);
  assert.deepEqual(fileErrors, []);
  console.log(
    "PASS: standalone HTML starts with zero external asset requests and no page errors.",
  );
  await p.close();
} finally {
  await b.close();
}
