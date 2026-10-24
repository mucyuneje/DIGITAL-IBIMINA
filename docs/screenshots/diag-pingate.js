const { chromium } = require(process.env.PWCORE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const p = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  const errs = [];
  p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 120)));
  p.on("pageerror", (e) => errs.push("pe:" + e.message.slice(0, 120)));

  await p.goto("http://localhost:3000/desk/announce", { waitUntil: "networkidle" });
  const titleIn = p.locator("input:not([type=hidden])").first();
  console.log("title_inputs=" + (await p.locator("input:not([type=hidden])").count()));
  await titleIn.fill("Group meeting notice");
  await p.locator("textarea").first().fill("Test announcement for the group meeting");
  await p.getByRole("button", { name: /Tangaza|Announce|Submit|Post|Publish/i }).first().click();
  await p.waitForTimeout(600);

  const dlg = p.locator("[data-slot=dialog-content]");
  const dots = await dlg.locator("span.rounded-full").count();
  const keys = await dlg.locator("button[aria-label]").count();
  console.log("dialog_open=" + (await dlg.count()) + " dots=" + dots + " aria_keys=" + keys);

  for (const d of ["1", "2", "3", "4", "5"]) {
    const k = dlg.locator(`button[aria-label='${d}']`).first();
    if (await k.count()) await k.click().catch(() => {});
  }
  await p.waitForTimeout(1500);
  console.log("dialog_after_pin=" + (await p.locator("[data-slot=dialog-content]").count()));
  console.log("ERRORS=" + errs.length + " " + JSON.stringify(errs.slice(0, 4)));
  await b.close();
  process.exit(0);
})();
