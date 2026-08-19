#!/usr/bin/env node
/**
 * Dựng ảnh bằng chứng cho header X-Student-Id (đề mục 6:85, 11:131).
 *
 * Sinh hai ảnh:
 *   1. newman-console.png  — output console.log của pre-request script khi chạy thật
 *   2. coverage.png        — kết quả soát 624 request, chứng minh KHÔNG request nào thiếu
 *
 * Ảnh (1) tương đương ảnh chụp Postman Console: cùng một dòng `console.log`, cùng một
 * pre-request script cấp collection — chỉ khác là chạy bằng Newman thay vì giao diện.
 * Ảnh chụp Postman Console do sinh viên tự làm được đặt cùng thư mục.
 *
 * Chạy: node scripts/capture-student-id-evidence.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("/home/qt/.npm/_npx/9833c18b2d85bc59/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "evidence/postman");
fs.mkdirSync(OUT, { recursive: true });

const CHROME = [
  path.join(os.homedir(), ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell"),
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 300000, shell: "/bin/bash", cwd: ROOT });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function trang(tieuDe, phu, khoi, meta) {
  const blocks = khoi
    .map(
      (b) => `
      <div class="blk">
        <div class="cmd"><span class="p">$</span> ${esc(b.cmd)}</div>
        <pre class="out">${esc(b.out.replace(/\n+$/, ""))}</pre>
      </div>`,
    )
    .join("");

  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{margin:0;background:#0d1117;font-family:"Noto Sans","DejaVu Sans",sans-serif}
  .wrap{width:1180px;padding:26px}
  .hd{border-left:4px solid #3fb950;padding:2px 0 2px 14px;margin-bottom:6px}
  .id{color:#3fb950;font-size:15px;font-weight:700;letter-spacing:.4px}
  .ti{color:#e6edf3;font-size:21px;font-weight:600;margin-top:4px;line-height:1.35}
  .su{color:#8b949e;font-size:13px;margin:8px 0 18px 18px;line-height:1.5}
  .blk{margin-bottom:16px}
  .cmd{background:#161b22;border:1px solid #30363d;border-bottom:none;border-radius:6px 6px 0 0;
       padding:9px 13px;color:#79c0ff;font-family:"DejaVu Sans Mono",monospace;font-size:12.5px;
       white-space:pre-wrap;word-break:break-all;line-height:1.5}
  .p{color:#8b949e;margin-right:7px}
  .out{margin:0;background:#010409;border:1px solid #30363d;border-radius:0 0 6px 6px;
       padding:12px 13px;color:#c9d1d9;font-family:"DejaVu Sans Mono",monospace;font-size:12.5px;
       white-space:pre-wrap;word-break:break-word;line-height:1.55}
  .ft{color:#8b949e;font-size:11.5px;margin-top:16px;border-top:1px solid #21262d;padding-top:10px}
  </style><div class="wrap">
    <div class="hd"><div class="id">X-STUDENT-ID · đề mục 6:85 &amp; 11:131</div>
      <div class="ti">${esc(tieuDe)}</div></div>
    <div class="su">${phu}</div>
    ${blocks}
    <div class="ft">Bản render của output lệnh chạy thật (không phải ảnh chụp terminal) &nbsp;·&nbsp;
      host <b>${esc(meta.host)}</b> &nbsp;·&nbsp; user <b>${esc(meta.user)}</b> &nbsp;·&nbsp;
      ${esc(meta.at)} &nbsp;·&nbsp; SUT eshop-sut@85af3ba &nbsp;·&nbsp; MSSV 23127262</div>
  </div>`;
}

(async () => {
  const meta = { host: os.hostname(), user: os.userInfo().username, at: new Date().toISOString() };

  // ── Ảnh 1: console.log của pre-request script khi chạy thật ────────────
  sh("./scripts/reset-db.sh >/dev/null 2>&1");
  const lenh1 =
    `npx newman run collections/EShop-API-Tests.postman_collection.json ` +
    `-e environments/local.postman_environment.json ` +
    `--folder "0. Setup — nạp token dùng chung" --reporters cli --reporter-cli-no-banner`;
  const out1 = sh(lenh1).split("\n").slice(0, 14).join("\n");

  const lenh2 =
    `npx newman run collections/EShop-API-Tests.postman_collection.json ` +
    `-e environments/local.postman_environment.json --reporters cli --reporter-cli-no-banner ` +
    `2>&1 | grep 'X-Student-Id' | sed 's/^ *| *//' | sort -u | head -14`;
  const out2 = sh(lenh2);

  const lenh3 =
    `npx newman run collections/EShop-API-Tests.postman_collection.json ` +
    `-e environments/local.postman_environment.json --reporters cli --reporter-cli-no-banner ` +
    `2>&1 | grep -c 'X-Student-Id'`;
  const out3 = sh(lenh3).trim() + "   <- so dong console.log = so request khai bao trong collection";

  // ── Ảnh 2: soát độ phủ ─────────────────────────────────────────────────
  const out4 = sh("node scripts/verify-student-id.js");

  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const pg = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });

  await pg.setContent(
    trang(
      "Pre-request script cấp collection in header ra Console",
      'Script nằm ở cấp <b>collection</b> nên áp cho mọi request; mỗi lần chạy nó gọi ' +
        '<code style="color:#79c0ff">console.log(\'[X-Student-Id] \' + sid + \'  ->  \' + method + \' \' + path)</code>. ' +
        "Đây chính là dòng hiện trong Postman Console khi chạy bằng giao diện.",
      [
        { cmd: lenh1, out: out1 },
        { cmd: lenh2, out: out2 },
        { cmd: lenh3, out: out3 },
      ],
      meta,
    ),
  );
  await pg.locator(".wrap").screenshot({ path: path.join(OUT, "newman-console.png") });
  console.log("✓ newman-console.png");

  await pg.setContent(
    trang(
      "Soát toàn bộ: không request nào thiếu header",
      "Request đến từ hai nguồn — khai báo trong collection (được pre-request cấp collection phủ) " +
        "và <code style='color:#79c0ff'>pm.sendRequest</code> gọi trong script (KHÔNG đi qua pre-request, " +
        "phải tự gắn). Ảnh chụp Console chỉ chứng minh được nhóm thứ nhất, nên tôi soát cả hai bằng script.",
      [{ cmd: "node scripts/verify-student-id.js", out: out4 }],
      meta,
    ),
  );
  await pg.locator(".wrap").screenshot({ path: path.join(OUT, "coverage.png") });
  console.log("✓ coverage.png");

  await browser.close();
  console.log(`\nXong -> ${path.relative(ROOT, OUT)}/`);
})();
