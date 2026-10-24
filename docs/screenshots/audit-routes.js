const { chromium } = require(process.env.PWCORE);
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = process.env.OUT; // docs/screenshots/before

// Member-facing routes (not welcome/login, not error pages).
const ROUTES = [
  ["home", "/"],
  ["withdrawals", "/withdrawals"],
  ["bulletin", "/bulletin"],
  ["ledger", "/ledger"],
  ["deposit", "/deposit"],
  ["desk", "/desk"],
  ["desk-announce", "/desk/announce"],
  ["desk-attendance", "/desk/attendance"],
  ["desk-loan", "/desk/loan"],
  ["desk-lottery", "/desk/lottery"],
  ["desk-minutes", "/desk/minutes"],
  ["members", "/members"],
  ["rotation", "/rotation"],
  ["help", "/help"],
  ["settings", "/settings"],
  ["settings-anomaly", "/settings/anomaly"],
  ["settings-delete-account", "/settings/delete-account"],
  ["settings-export", "/settings/export"],
  ["settings-group", "/settings/group"],
  ["settings-language", "/settings/language"],
  ["settings-notifications", "/settings/notifications"],
  ["settings-profile", "/settings/profile"],
  ["settings-security", "/settings/security"],
];

const SIZES = [
  ["375", 375, 812],
  ["768", 768, 1024],
  ["1440", 1440, 900],
];

function slug(route) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "home";
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const report = { generatedAt: new Date().toISOString(), routes: [], issues: [] };

  for (const [name, route] of ROUTES) {
    const entry = { name, route, sizes: {}, console: [], network: [], status: null, overflowAt375: false, notes: [] };
    for (const [label, w, h] of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const cErr = [];
      const nErr = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") cErr.push(`[${m.type()}] ${m.text().slice(0, 220)}`);
      });
      page.on("pageerror", (e) => cErr.push(`[pageerror] ${e.message.slice(0, 220)}`));
      page.on("requestfailed", (r) => nErr.push(`${r.method()} ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`));
      page.on("response", (r) => {
        if (r.status() >= 400) nErr.push(`${r.status()} ${r.url().slice(0, 120)}`);
      });

      let status = null;
      try {
        const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30000 });
        status = resp ? resp.status() : null;
      } catch (e) {
        status = "ERR " + e.message.slice(0, 80);
      }
      await page.waitForTimeout(400);

      const geom = await page
        .evaluate(() => {
          const de = document.documentElement;
          const focusables = Array.from(
            document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'),
          ).filter((el) => el.offsetParent !== null);
          const small = focusables
            .map((el) => {
              const r = el.getBoundingClientRect();
              return { tag: el.tagName.toLowerCase(), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) };
            })
            .filter((x) => x.h < 40 && x.h > 0 && x.tag !== "a");
          return {
            scrollW: de.scrollWidth,
            clientW: de.clientWidth,
            bodyH: document.body.scrollHeight,
            focusableCount: focusables.length,
            smallTargets: small.slice(0, 8),
            title: document.title,
            lang: de.lang,
            h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 60),
          };
        })
        .catch(() => ({}));

      entry.status = entry.status ?? status;
      entry.sizes[label] = { status, ...geom };
      if (w === 375 && geom.scrollW && geom.scrollW > geom.clientW + 1) entry.overflowAt375 = true;
      if (cErr.length) entry.console.push({ size: label, msgs: cErr.slice(0, 8) });
      if (nErr.length) entry.network.push({ size: label, msgs: nErr.slice(0, 8) });

      const file = path.join(OUT, `${String(ROUTES.findIndex((r) => r[1] === route)).padStart(2, "0")}-${name}-${label}.png`);
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      await ctx.close();
    }
    entry.notes.push(`h1="${entry.sizes["1440"].h1 || ""}"`);
    report.routes.push(entry);
    console.log(`${entry.status} ${route}${entry.overflowAt375 ? " OVERFLOW375" : ""}${entry.console.length ? " CONSOLE" : ""}${entry.network.length ? " NET" : ""}`);
  }

  fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(report, null, 2));
  console.log("WROTE audit.json");
  await browser.close();
  process.exit(0);
})();
