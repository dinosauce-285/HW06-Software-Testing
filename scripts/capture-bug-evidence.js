#!/usr/bin/env node
/**
 * Tái hiện từng lỗi bằng lệnh THẬT vào backend đang chạy, giữ nguyên văn output,
 * rồi render thành ảnh PNG để đính vào GitHub Issue (đề mục 6:86).
 *
 * Ảnh sinh ra là bản RENDER của transcript có thật, không phải ảnh chụp cửa sổ
 * terminal. Mỗi ảnh in kèm lệnh gốc, thời điểm chạy và hostname để người chấm
 * chạy lại kiểm chứng được.
 *
 * Lệnh trong file này phải TRÙNG với mục "Tái hiện" của docs/Bug-Report.md.
 *
 * Chạy: node scripts/capture-bug-evidence.js
 * Lưu ý: BUG-A1-11 có `sleep 185`, cả lượt chạy mất khoảng 4 phút.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("/home/qt/.npm/_npx/9833c18b2d85bc59/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "evidence/bugs");
fs.mkdirSync(OUT, { recursive: true });

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 300000, shell: "/bin/bash", cwd: ROOT });
  } catch (e) {
    return (e.stdout || "") + (e.stderr || "");
  }
};

const RESET = "./scripts/reset-db.sh >/dev/null 2>&1";
const ADMIN =
  `AT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"admin@eshop.com","password":"Admin123!"}' | jq -r .token)`;
const USER =
  `T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)`;

const CASES = [
  {
    id: "BUG-A1-01",
    title: "Mật khẩu được lưu và trả về dạng plaintext (SEC-01)",
    cmds: [
      `${RESET}; curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq '.user'`,
    ],
  },
  {
    id: "BUG-A1-02",
    title: "Bộ đếm tăng 2 mỗi lần sai, khoá ngay từ lần thứ 2 (FR-02)",
    cmds: [
      `${RESET}; ${ADMIN}
for i in 1 2 3; do
  printf 'lan %s -> HTTP ' "$i"
  curl -s -o /dev/null -w '%{http_code}   ' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'
  curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" | jq -c '.[] | select(.email=="test@eshop.com") | {login_attempts, locked_until}'
done`,
    ],
  },
  {
    id: "BUG-A1-03",
    title: "Thời lượng khoá 180 giây thay vì 30 giây theo đặc tả (FR-02)",
    cmds: [
      `${ADMIN}; curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" | jq -r '.[] | select(.email=="test@eshop.com") | .locked_until' | xargs -I{} node -e "console.log('locked_until =', '{}'); console.log('con lai   =', Math.round((new Date('{}')-Date.now())/1000), 'giay  (dac ta doi TONG 30 giay)')"`,
    ],
  },
  {
    id: "BUG-A1-04",
    title: "JWT không có hạn dùng — token sống vĩnh viễn (SEC-02)",
    cmds: [
      `${RESET}; curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token | cut -d. -f2 | base64 -d 2>/dev/null; echo; echo '^ khong co claim exp'`,
      `echo 'SECRET_KEY hardcode ngay trong ma nguon:'; sed -n '9p' sut/backend/server.js`,
    ],
  },
  {
    id: "BUG-A1-05",
    title: "Content-Type: text/plain làm server trả HTTP 500",
    cmds: [
      `curl -s -o /dev/null -w 'HTTP %{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: text/plain' --data-raw '{"email":"test@eshop.com","password":"Test1234!"}'`,
    ],
  },
  {
    id: "BUG-A1-06",
    title: "Response lỗi trả HTML trên một API JSON",
    cmds: [
      `curl -s -w '\\n<- HTTP %{http_code}  %{content_type}\\n' localhost:3000/api/login | head -6`,
      `curl -s -w '\\n<- HTTP %{http_code}  %{content_type}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' --data-raw '{"email":' | head -6`,
    ],
  },
  {
    id: "BUG-A1-07",
    title: "Liệt kê tài khoản qua kênh phản hồi 403 (FR-02 C5)",
    cmds: [
      `${RESET}
echo '--- email GIA (khong ton tai) ---'
for i in 1 2 3 4; do printf '  lan %s -> ' "$i"; curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"ma-khong-ton-tai@hw06.local","password":"SAI"}'; done
echo '--- email THAT ---'
for i in 1 2 3 4; do printf '  lan %s -> ' "$i"; curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'; done
echo '--- than response cua nhanh 403 ---'
curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'`,
    ],
  },
  {
    id: "BUG-A1-08",
    title: "Mất cập nhật bộ đếm khi có request đồng thời",
    cmds: [
      `${RESET}; ${ADMIN}
curl -s -o /dev/null -X POST localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Race","email":"race@hw06.local","password":"Test1234!"}'
echo 'ban 5 request dang nhap sai DONG THOI...'
for i in 1 2 3 4 5; do curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"race@hw06.local","password":"SAI"}' & done; wait
printf 'login_attempts = '; curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" | jq '.[] | select(.email=="race@hw06.local") | .login_attempts'
echo '(tuan tu phai ra 10 voi buoc nhay 2, hoac 5 neu dung dac ta)'`,
    ],
  },
  {
    id: "BUG-A1-09",
    title: "Không có giới hạn tần suất theo IP",
    cmds: [
      `S=$(date +%s%N); for i in $(seq 1 100); do curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"ma@hw06.local","password":"SAI"}'; done; E=$(date +%s%N); echo "100 request hoan tat trong $(( (E-S)/1000000 )) ms, khong request nao bi chan"`,
    ],
  },
  {
    id: "BUG-A1-10",
    title: "Khoá tài khoản dùng được làm vũ khí từ chối dịch vụ",
    cmds: [
      `${RESET}
echo 'KE TAN CONG (chi biet email, khong biet mat khau):'
curl -s -o /dev/null -w '  doan bua lan 1 -> HTTP %{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"doan-bua-1"}'
curl -s -o /dev/null -w '  doan bua lan 2 -> HTTP %{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"doan-bua-2"}'
echo 'NAN NHAN (dung dung mat khau cua minh):'
curl -s -w '\\n  <- HTTP %{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'`,
    ],
  },
  {
    id: "BUG-A1-11",
    title: "Hết hạn khoá không reset bộ đếm → khoá vĩnh viễn",
    cmds: [
      `${RESET}; ${ADMIN}
ctr(){ curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" | jq -c '.[] | select(.email=="test@eshop.com") | {login_attempts, locked_until}'; }
bad(){ curl -s -o /dev/null -w '%{http_code}' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'; }
echo "T+0     sai 1 -> $(bad)   $(ctr)"
echo "        sai 2 -> $(bad)   $(ctr)   [da khoa]"
echo '        ... cho 185 giay cho het han khoa ...'
sleep 185
echo "T+185   $(ctr)   <- bo dem KHONG duoc reset"
echo "        sai them DUNG 1 lan -> $(bad)   $(ctr)   [khoa lai them 180s]"
printf '        thu mat khau DUNG -> HTTP '; curl -s -o /dev/null -w '%{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'`,
    ],
  },
];

// Lỗi của API 2 và API 3 để ở file riêng cho khỏi dài.
CASES.push(...require("./bug-cases-api2.js"), ...require("./bug-cases-api3.js"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(bug, meta) {
  const blocks = bug.parts
    .map(
      (p) => `
      <div class="blk">
        <div class="cmd"><span class="p">$</span> ${esc(p.cmd)}</div>
        <pre class="out">${esc(p.out.replace(/\n+$/, "")) || "<em>(khong co output)</em>"}</pre>
      </div>`,
    )
    .join("");

  return `<!doctype html><meta charset="utf-8"><style>
  /* Tiếng Việt dùng Noto Sans — font monospace trên máy này đặt sai dấu thanh.
     Monospace chỉ dùng cho lệnh và output, vốn là ASCII. */
  *{box-sizing:border-box} body{margin:0;background:#0d1117;font-family:"Noto Sans","DejaVu Sans",sans-serif}
  .wrap{width:1180px;padding:26px}
  .hd{border-left:4px solid #f85149;padding:2px 0 2px 14px;margin-bottom:18px}
  .id{color:#f85149;font-size:15px;font-weight:700;letter-spacing:.4px}
  .ti{color:#e6edf3;font-size:21px;font-weight:600;margin-top:4px;line-height:1.35}
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
    <div class="hd"><div class="id">${esc(bug.id)}</div><div class="ti">${esc(bug.title)}</div></div>
    ${blocks}
    <div class="ft">Bản render của output lệnh chạy thật (không phải ảnh chụp terminal) &nbsp;·&nbsp;
      host <b>${esc(meta.host)}</b> &nbsp;·&nbsp; user <b>${esc(meta.user)}</b> &nbsp;·&nbsp;
      ${esc(meta.at)} &nbsp;·&nbsp; SUT eshop-sut@85af3ba &nbsp;·&nbsp; MSSV 23127262</div>
  </div>`;
}

(async () => {
  const TRANSCRIPT = path.join(OUT, "transcripts.json");
  // --render-only: vẽ lại ảnh từ transcript đã lưu, khỏi chạy lại (lượt chạy mất ~4 phút
  // vì BUG-A1-11 phải chờ hết hạn khoá 180 giây).
  const renderOnly = process.argv.includes("--render-only");

  let results, meta;
  if (renderOnly) {
    const luu = JSON.parse(fs.readFileSync(TRANSCRIPT, "utf8"));
    ({ results } = luu);
    meta = { host: luu.host, user: luu.user, at: luu.at };
    console.log(`Vẽ lại từ transcript đã lưu (${meta.at})`);
  } else {
    results = [];
    for (const c of CASES) {
      const parts = c.cmds.map((cmd) => ({ cmd: cmd.replace(/\s*\\\n\s*/g, " ").trim(), out: sh(cmd) }));
      results.push({ ...c, parts });
      console.log(`✓ chạy xong ${c.id}`);
    }
    meta = { host: os.hostname(), user: os.userInfo().username, at: new Date().toISOString() };
    fs.writeFileSync(TRANSCRIPT, JSON.stringify({ ...meta, results }, null, 2));
  }

  // Bản playwright sẵn có trên máy không khớp với binary trong ~/.cache/ms-playwright,
  // nên trỏ thẳng vào binary đang có thay vì tải thêm một bản trình duyệt nữa.
  const CHROME = [
    path.join(os.homedir(), ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell"),
    "/usr/bin/google-chrome",
  ].find((p) => fs.existsSync(p));

  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const pg = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
  for (const bug of results) {
    await pg.setContent(page(bug, meta));
    await pg.locator(".wrap").screenshot({ path: path.join(OUT, `${bug.id}.png`) });
    console.log(`✓ ảnh ${bug.id}.png`);
  }
  await browser.close();
  console.log(`\nXong ${results.length} bằng chứng -> evidence/bugs/`);
})();
