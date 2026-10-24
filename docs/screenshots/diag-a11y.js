const { chromium } = require(process.env.PWCORE);
const BASE = "http://localhost:3000";
const log = (...a) => console.log(...a);

function lum(rgb) {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function parseColor(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((x) => parseFloat(x.trim()));
  return { rgb: p.slice(0, 3), a: p[3] ?? 1 };
}
function contrast(fg, bg) {
  const l1 = lum(fg);
  const l2 = lum(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();

  // ---- 1. Accessible names of form controls on key pages
  log("=== ACCESSIBLE NAMES (inputs/textarea/select) ===");
  for (const route of ["/deposit", "/withdrawals", "/settings/profile", "/help"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    if (route === "/withdrawals") {
      await page.getByRole("button", { name: /New withdrawal/i }).click().catch(() => {});
      await page.waitForTimeout(400);
    }
    const controls = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("input:not([type=hidden]),textarea,select"));
      return els
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const id = el.id;
          let labelText = "";
          if (id) {
            const l = document.querySelector(`label[for="${id}"]`);
            if (l) labelText = l.textContent.trim();
          }
          if (!labelText) {
            const wrapLabel = el.closest("label");
            if (wrapLabel) labelText = wrapLabel.textContent.trim();
          }
          return {
            tag: el.tagName.toLowerCase(),
            type: el.type,
            aria: el.getAttribute("aria-label"),
            labelledby: el.getAttribute("aria-labelledby"),
            name: el.name || null,
            id: id || null,
            labelText: labelText.slice(0, 30),
            ph: el.placeholder || null,
          };
        });
    });
    log(`\n${route}  (${controls.length} controls)`);
    controls.forEach((c) => {
      const accessible = c.aria || c.labelledby || (c.labelText ? `label:"${c.labelText}"` : null);
      log(`  ${c.tag}${c.type ? "[" + c.type + "]" : ""} name=${c.name} id=${c.id} => ${accessible ? accessible : "*** NO ACCESSIBLE NAME ***"}${c.ph ? " ph=" + c.ph : ""}`);
    });
  }

  // ---- 2. Contrast of key text elements on home + deposit
  log("\n=== CONTRAST (sample text) ===");
  for (const route of ["/", "/deposit", "/ledger"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const samples = await page.evaluate(() => {
      const pick = [];
      const els = Array.from(document.querySelectorAll("p,span,h1,h2,h3,a,button,label"));
      for (const el of els) {
        const txt = (el.textContent || "").trim();
        if (!txt || txt.length > 40) continue;
        const st = getComputedStyle(el);
        if (st.visibility === "hidden" || st.display === "none") continue;
        // effective background: walk up until non-transparent
        let bg = "rgba(0, 0, 0, 0)";
        let node = el;
        while (node) {
          const b = getComputedStyle(node).backgroundColor;
          if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") { bg = b; break; }
          node = node.parentElement;
        }
        pick.push({ txt: txt.slice(0, 30), color: st.color, bg, size: st.fontSize, weight: st.fontWeight });
      }
      return pick.slice(0, 40);
    });
    log(`\n${route}`);
    const seen = new Set();
    for (const s of samples) {
      const fg = parseColor(s.color);
      const bg = parseColor(s.bg);
      if (!fg || !bg) continue;
      const ratio = contrast(fg.rgb, bg.rgb);
      const px = parseFloat(s.size);
      const large = px >= 24 || (px >= 18.66 && parseInt(s.weight) >= 700);
      const min = large ? 3 : 4.5;
      const key = `${s.color}|${s.bg}|${Math.round(ratio * 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const flag = ratio < min ? `  *** LOW (<${min}) ***` : "";
      log(`  "${s.txt}" ${s.size}/${s.weight} color=${s.color} bg=${s.bg} ratio=${ratio.toFixed(2)}${flag}`);
    }
  }

  // ---- 3. Invite chip + small targets geometry
  log("\n=== SMALL TAP TARGETS (<44px) on / at 375 ===");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const smalls = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button,a,[role=button],input,select"));
    return els
      .filter((el) => el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height) };
      })
      .filter((x) => x.h > 0 && x.h < 44);
  });
  smalls.forEach((s) => log(`  ${s.tag} "${s.label}" ${s.w}x${s.h}`));

  await browser.close();
  process.exit(0);
})();
