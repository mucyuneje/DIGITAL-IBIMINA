const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const p = await (await b.newContext({ viewport: { width: 375, height: 812 } })).newPage();
  await p.goto(BASE + "/deposit", { waitUntil: "networkidle" });
  const info = await p.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button,[role=radio],*"));
    const chip = els.find((e) => (e.textContent || "").trim() === "50,000");
    if (!chip) return "not found";
    const chain = [];
    let node = chip;
    while (node && node !== document.body) {
      const st = getComputedStyle(node);
      chain.push({ tag: node.tagName.toLowerCase(), cls: (node.className || "").toString().slice(0, 90), bg: st.backgroundColor, color: st.color, role: node.getAttribute("role"), pressed: node.getAttribute("aria-pressed") });
      node = node.parentElement;
    }
    return chain;
  });
  console.log(JSON.stringify(info, null, 2));
  await b.close();
})();
