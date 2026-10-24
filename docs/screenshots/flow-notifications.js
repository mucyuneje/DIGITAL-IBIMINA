const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => (m.type() === "error") && errs.push(`[error] ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message.slice(0, 200)}`));

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const bell = page.locator("button[aria-label*='notification' i], button[aria-label*='ubutumwa' i], button[aria-label*='notification' i]");
  log("bell_buttons=" + (await bell.count()));

  // Click the first bell
  if (await bell.count()) {
    await bell.first().click();
    await page.waitForTimeout(500);
    const pop = page.locator("[data-slot='popover-content']");
    log("popover=" + (await pop.count()));
    const bodyText = await pop.textContent().catch(() => "");
    log("popover_text=" + (bodyText || "").replace(/\s+/g, " ").slice(0, 160));
  }

  // Navigate to the full page
  await page.goto(BASE + "/notifications", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const h1 = await page.locator("h1").first().textContent();
  log("page_h1=" + h1);
  const rows = await page.locator("main li").count();
  log("page_rows=" + rows);
  const filters = await page.locator("main [role='group'] button, main [data-slot] button").count();
  log("filter_buttons~=" + filters);

  log("console_errors=" + errs.length);
  errs.slice(0, 10).forEach((e) => log("  " + e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
