const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => (m.type() === "error") && errs.push(`[error] ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => errs.push(`[pageerror] ${e.message.slice(0, 200)}`));

  await page.goto(BASE + "/deposit", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const vaultBefore = await page.getByText(/RWF|FRW|RFW/i).first().textContent().catch(() => null);
  log("vault_before_text=" + vaultBefore);

  // Open PIN dialog
  const cont = page.getByRole("button", { name: /Continue|Komeza|Continuer/i }).first();
  log("continue_buttons=" + (await cont.count()));
  await cont.click();
  await page.waitForTimeout(500);

  const dlg = page.locator("[data-slot='dialog-content']");
  log("dialog=" + (await dlg.count()));

  // Enter PIN 12345 via keypad (auto-submits on 5th)
  for (const d of ["1", "2", "3", "4", "5"]) {
    const key = dlg.locator(`button[aria-label='${d}']`);
    if (await key.count()) await key.click();
  }
  await page.waitForTimeout(200);

  // Deposit's dialog submits with an explicit button (not auto).
  const confirm = dlg.getByRole("button", { name: /Confirm deposit|Emeza umusanzu|Confirmer le dépôt/i }).first();
  log("confirm_buttons=" + (await confirm.count()));
  if (await confirm.count()) await confirm.click();

  // Immediately look for the pending state
  await page.waitForTimeout(400);
  const pendingTitle = await dlg.getByText(/Waiting for MoMo|Tegereje|attente/i).count();
  log("pending_visible_after_pin=" + pendingTitle);

  // Wait for settlement
  await page.waitForTimeout(3500);
  const success = await dlg.getByText(/Deposit recorded|Umusanzu wanditswe|Dépôt enregistré/i).count();
  log("success_visible=" + success);
  const vaultAfter = await page.getByText(/RWF|FRW|RFW/i).first().textContent().catch(() => null);
  log("vault_after_text=" + vaultAfter);

  log("console_errors=" + errs.length);
  errs.slice(0, 10).forEach((e) => log("  " + e));

  await browser.close();
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
