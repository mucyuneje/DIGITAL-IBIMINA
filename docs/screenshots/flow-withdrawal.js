const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
const PIN = ["1", "2", "3", "4", "5"];
const log = (...a) => console.log(...a);

async function enterPin(page, dlg, digits) {
  // The PinGateModal auto-submits on the 5th digit (onComplete). Prefer the
  // keypad; fall back to the OTP input.
  for (const d of digits) {
    const key = dlg.locator(`button[aria-label='${d}']`);
    if (await key.count()) await key.click();
    else break;
  }
  await page.waitForTimeout(1600);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errs.push(`[${m.type()}] ${m.text().slice(0, 160)}`));
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message.slice(0, 160)}`));

  // ---------- WITHDRAWAL: propose + vote
  log("=== WITHDRAWAL PROPOSE ===");
  await page.goto(BASE + "/withdrawals", { waitUntil: "networkidle" });
  const newBtn = page.getByRole("button", { name: /New withdrawal|Nshya|Nouveau/i }).first();
  log("new_button_count=" + (await newBtn.count()));
  const newBtnBox = await newBtn.boundingBox();
  log("new_button_box=" + JSON.stringify(newBtnBox));
  await newBtn.click();
  await page.waitForTimeout(500);
  const modal = page.locator("[data-slot='dialog-content']");
  log("modal_visible=" + (await modal.count()));
  log("modal_fields=" + (await modal.locator("input,textarea").count()));
  const modalButtons = await modal.locator("button").allTextContents();
  log("modal_buttons=" + JSON.stringify(modalButtons.map((x) => x.trim()).filter(Boolean)));
  // Fill title + amount
  const inputs = modal.locator("input");
  log("input_count=" + (await inputs.count()));
  for (let i = 0; i < (await inputs.count()); i++) {
    const lbl = await inputs.nth(i).getAttribute("aria-label");
    const name = await inputs.nth(i).getAttribute("name");
    log(`  input[${i}] aria=${lbl} name=${name}`);
  }
  const area = modal.locator("textarea").first();
  log("textarea=" + (await area.count()));

  await browser.close();
  log("ERRORS=" + errs.length);
  errs.forEach((e) => log("  " + e));
  process.exit(0);
})();
