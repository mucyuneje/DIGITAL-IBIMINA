const { chromium } = require(process.env.PWCORE);

const BASE = "http://localhost:3000";
const PIN = "12345";

function log(...a) {
  console.log(...a);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => consoleMsgs.push(`[pageerror] ${e.message.slice(0, 200)}`));

  const tapDialogPin = async (digits) => {
    const dlg = page.locator("[data-slot='dialog-content']");
    await dlg.waitFor({ state: "visible", timeout: 5000 });
    for (const d of digits) {
      const key = dlg.locator(`button[aria-label='${d}']`);
      if (await key.count()) await key.click();
      else await dlg.locator("input[inputmode='numeric']").first().fill(digits.join(""));
    }
    const confirm = dlg.getByRole("button", { name: /Confirm|Emeza|Confirmer|Approve|Reject|Submit|Post|Issue|Run|Record|Save|Yego|Ohereza/i }).first();
    if (await confirm.count()) await confirm.click();
    await page.waitForTimeout(1800);
  };

  // ---- discover dynamic IDs from list pages
  await page.goto(BASE + "/ledger", { waitUntil: "networkidle" });
  const ledgerLinks = await page.locator("a[href*='/ledger/']").evaluateAll((a) => a.map((x) => x.getAttribute("href")).slice(0, 3));
  log("LEDGER_DETAIL_LINKS=" + JSON.stringify(ledgerLinks));

  await page.goto(BASE + "/members", { waitUntil: "networkidle" });
  const memberLinks = await page.locator("a[href*='/members/']").evaluateAll((a) => a.map((x) => x.getAttribute("href")).slice(0, 3));
  log("MEMBER_DETAIL_LINKS=" + JSON.stringify(memberLinks));

  await page.goto(BASE + "/withdrawals", { waitUntil: "networkidle" });
  const wdLinks = await page.locator("a[href*='/withdrawals/']").evaluateAll((a) => a.map((x) => x.getAttribute("href")).slice(0, 3));
  log("WITHDRAWAL_DETAIL_LINKS=" + JSON.stringify(wdLinks));

  // ---- Withdrawal proposal flow
  log("\n=== WITHDRAWAL PROPOSAL ===");
  await page.goto(BASE + "/withdrawals", { waitUntil: "networkidle" });
  const newBtn = page.getByRole("button", { name: /New withdrawal request|withdrawal request|Propose/i }).first();
  log("has_new_withdrawal_button=" + (await newBtn.count()));
  if (await newBtn.count()) {
    await newBtn.click();
    await page.waitForTimeout(400);
    log("after_click_url=" + new URL(page.url()).pathname);
    log("form_fields=" + (await page.locator("input,textarea").count()));
  }

  // ---- Deposit flow with wrong PIN
  log("\n=== DEPOSIT (wrong then right PIN) ===");
  await page.goto(BASE + "/deposit", { waitUntil: "networkidle" });
  const momo = page.locator("input[inputmode='tel']");
  await momo.fill("0781112223");
  await page.getByRole("button", { name: /Continue|Komeza|Continuer/i }).click();
  const dlg = page.locator("[data-slot='dialog-content']");
  await dlg.waitFor({ state: "visible" });
  for (const d of ["1", "1", "1", "1", "1"]) await dlg.locator(`button[aria-label='${d}']`).click();
  await dlg.getByRole("button", { name: /Confirm deposit|Emeza umusanzu|Confirmer le dépôt/i }).click();
  await page.waitForTimeout(1500);
  log("wrong_pin_error=" + (await dlg.locator("[role='alert']").count() > 0));
  for (const d of ["1", "2", "3", "4", "5"]) await dlg.locator(`button[aria-label='${d}']`).click();
  await dlg.getByRole("button", { name: /Confirm deposit|Emeza umusanzu|Confirmer le dépôt/i }).click();
  await page.waitForTimeout(1800);
  log("success_shown=" + (await dlg.textContent()).includes("recorded") || (await dlg.textContent()).includes("wanditswe"));
  await dlg.getByRole("button", { name: /Done|Byarangiye|Terminé/i }).click().catch(() => {});

  // ---- Announcement
  log("\n=== ANNOUNCE ===");
  await page.goto(BASE + "/desk/announce", { waitUntil: "networkidle" });
  const titleIn = page.locator("input").first();
  const bodyIn = page.locator("textarea").first();
  log("announce_title_input=" + (await titleIn.count()) + " body=" + (await bodyIn.count()));
  if (await titleIn.count()) await titleIn.fill("Test announcement");
  if (await bodyIn.count()) await bodyIn.fill("Body text for the UX audit.");
  const postBtn = page.getByRole("button", { name: /Post|Ohereza|Publier|Announce/i }).first();
  if (await postBtn.count()) { await postBtn.click(); await tapDialogPin([...PIN]); }
  log("after_announce_url=" + new URL(page.url()).pathname);
  log("announce_success=" + ((await page.locator("body").textContent()).includes("Test announcement") ? "visible" : "not-visible"));

  // ---- Loan
  log("\n=== LOAN ===");
  await page.goto(BASE + "/desk/loan", { waitUntil: "networkidle" });
  log("loan_inputs=" + (await page.locator("input").count()));
  const loanBtns = await page.locator("button").allTextContents();
  log("loan_buttons=" + JSON.stringify(loanBtns.map((x) => x.trim()).filter(Boolean).slice(0, 12)));

  // ---- Lottery
  log("\n=== LOTTERY ===");
  await page.goto(BASE + "/desk/lottery", { waitUntil: "networkidle" });
  log("lottery_buttons=" + JSON.stringify((await page.locator("button").allTextContents()).map((x) => x.trim()).filter(Boolean).slice(0, 10)));

  // ---- Chat
  log("\n=== CHAT ===");
  await page.goto(BASE + "/bulletin", { waitUntil: "networkidle" });
  const chatInput = page.locator("input,textarea").last();
  log("chat_input=" + (await chatInput.count()));

  // ---- Language switch + invite copy
  log("\n=== LANGUAGE + INVITE ===");
  const langBtns = await page.locator("button").filter({ hasText: /^(RW|EN|FR)$/ }).count();
  log("lang_buttons_on_home_after_nav=" + langBtns);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const invite = page.locator("button[aria-label*='nvite'], button[title*='nvite']").first();
  log("invite_button=" + (await invite.count()));
  if (await invite.count()) {
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await invite.click();
    await page.waitForTimeout(600);
    log("toast_after_copy=" + (await page.locator("[data-sonner-toast], [role='status']").count()));
  }

  // ---- Keyboard tab order on home
  log("\n=== KEYBOARD NAV (home) ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const order = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return null;
      const r = a.getBoundingClientRect();
      const style = getComputedStyle(a);
      return { tag: a.tagName.toLowerCase(), label: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 24), outline: style.outlineWidth + " " + style.outlineStyle };
    });
    order.push(el);
  }
  log("tab_order=" + JSON.stringify(order));

  log("\nCONSOLE_MSGS=" + consoleMsgs.length);
  consoleMsgs.slice(0, 20).forEach((m) => log("  " + m));

  await browser.close();
  process.exit(0);
})();
