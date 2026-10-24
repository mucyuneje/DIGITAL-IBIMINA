const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
const log = (...a) => console.log(...a);

async function dismissPin(page) {
  // PinGateModal auto-submits on 5th keypad digit; click 1..5
  for (const d of ["1", "2", "3", "4", "5"]) {
    const k = page.locator(`button[aria-label='${d}']`).first();
    if (await k.count()) { await k.click().catch(() => {}); }
    else {
      const inp = page.locator("input[inputmode='numeric'], input[inputmode='tel']").last();
      if (await inp.count()) await inp.type(d).catch(() => {});
    }
  }
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => (m.type() === "error") && errs.push(m.text().slice(0, 140)));
  page.on("pageerror", (e) => errs.push("pageerror:" + e.message.slice(0, 140)));

  // ---- ANNOUNCE: check auto-submit vs confirm
  log("=== ANNOUNCE (desk) ===");
  await page.goto(BASE + "/desk/announce", { waitUntil: "networkidle" });
  const url1 = page.url();
  log("url=" + url1);
  if (url1.includes("announce")) {
    const titleIn = page.locator("input[type=text]").first();
    if (await titleIn.count()) { await titleIn.fill("Group meeting notice"); }
    const ta = page.locator("textarea").first();
    if (await ta.count()) { await ta.fill("Test announcement for the group meeting"); }
    const submit = page.getByRole("button", { name: /Submit|Post|Publish|Announce|Confirm|Tangaza|Publier/i }).first();
    const dis = await submit.count() ? await submit.isDisabled() : "n/a";
    log("submit_button=" + (await submit.count()) + " disabled=" + dis);
    if (await submit.count() && !dis) {
      await submit.click();
      await page.waitForTimeout(600);
      const dlg = page.locator("[data-slot='dialog-content']");
      log("pin_dialog_after_submit=" + (await dlg.count()));
      const dlgButtons = await dlg.locator("button").allTextContents();
      log("pin_dialog_buttons=" + JSON.stringify(dlgButtons.map((x) => x.trim()).filter(Boolean).slice(0, 24)));
      const dlgInputs = await dlg.locator("input").count();
      const dlgPad = await dlg.locator("button[aria-label]").count();
      log("pin_dialog_inputs=" + dlgInputs + " aria_buttons=" + dlgPad);
      // try auto-submit via keypad
      await dismissPin(page);
      log("after_pin_dialog_count=" + (await page.locator("[data-slot='dialog-content']").count()));
    } else {
      log("submit_disabled=guard")
    }
  }

  // ---- LOAN
  log("\n=== LOAN (desk) ===");
  await page.goto(BASE + "/desk/loan", { waitUntil: "networkidle" });
  log("url=" + page.url());
  const loanInputs = await page.locator("input").count();
  log("loan_inputs=" + loanInputs);
  const loanBtn = page.getByRole("button", { name: /Request|Submit|Confirm|Approve/i }).first();
  log("loan_action=" + (await loanBtn.count() ? (await loanBtn.textContent()).trim() : "none"));

  // ---- LOTTERY
  log("\n=== LOTTERY (desk) ===");
  await page.goto(BASE + "/desk/lottery", { waitUntil: "networkidle" });
  log("url=" + page.url());
  const lotBtns = await page.locator("button").allTextContents();
  log("lottery_buttons=" + JSON.stringify(lotBtns.map((x) => x.trim()).filter(Boolean).slice(0, 12)));

  // ---- MINUTES / ATTENDANCE
  for (const p of ["/desk/minutes", "/desk/attendance"]) {
    await page.goto(BASE + p, { waitUntil: "networkidle" });
    log(`\n${p} url=${page.url()}`);
    const btns = await page.locator("button").allTextContents();
    log("  buttons=" + JSON.stringify(btns.map((x) => x.trim()).filter(Boolean).slice(0, 10)));
  }

  // ---- LANGUAGE SWITCH
  log("\n=== LANGUAGE SWITCH ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const langBtn = page.getByRole("button", { name: /language|langue|ururimi|switch/i }).first();
  log("lang_button=" + (await langBtn.count()));
  if (await langBtn.count()) {
    await langBtn.click();
    await page.waitForTimeout(400);
    const items = await page.locator("[role=menuitem],[role=option]").allTextContents();
    log("lang_options=" + JSON.stringify(items.map((x) => x.trim()).filter(Boolean)));
  }

  // ---- KEYBOARD FOCUS ORDER on home
  log("\n=== TAB ORDER (first 12 focusables on /) ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const order = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const st = getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), outline: st.outlineStyle + " " + st.outlineWidth, box: st.boxShadow.slice(0, 40) };
    });
    order.push(info);
  }
  order.forEach((o, i) => o && log(`  ${i + 1}. ${o.tag} "${o.label}" outline=${o.outline} shadow=${o.box}`));

  // ---- nbsp / i18n parity sanity on rw
  log("\n=== RW HOME (translate check) ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const langSwitch = page.getByRole("button", { name: /language|langue|ururimi|switch/i }).first();
  if (await langSwitch.count()) {
    await langSwitch.click();
    await page.waitForTimeout(300);
    const rw = page.getByRole("menuitem", { name: /Kinyarwanda|IKinyarwanda|rw/i }).first();
    if (await rw.count()) { await rw.click(); await page.waitForTimeout(700); }
  }
  const headings = await page.locator("h1,h2").allTextContents();
  log("rw_headings=" + JSON.stringify(headings.map((x) => x.trim()).slice(0, 8)));
  const hasRw = headings.some((h) => /ubw|ikimina|member|kwinjiza|Itsinda/i.test(h));
  log("rw_applied=" + hasRw);

  await browser.close();
  log("\nERRORS=" + errs.length);
  errs.forEach((e) => log("  " + e));
  process.exit(0);
})();
