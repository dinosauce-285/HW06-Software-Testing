#!/usr/bin/env node
/**
 * Chụp màn hình trang GitHub Actions của một lượt chạy CI (đề mục 6:91 đòi
 * "screenshots and links" cho hai lượt chạy mẫu).
 *
 * Repo là public nên trang lượt chạy xem được mà không cần đăng nhập — ảnh chụp
 * là trang THẬT trên github.com, không phải bản dựng lại.
 *
 * Kèm theo, script lưu luôn phần tóm tắt Newman trích từ log của chính lượt đó,
 * để đối chiếu con số trong báo cáo.
 *
 * Chạy: node scripts/capture-ci-evidence.js <runId> <tên-file>
 * Ví dụ: node scripts/capture-ci-evidence.js 32222002026 ci-pass
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("/home/qt/.npm/_npx/9833c18b2d85bc59/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "evidence/ci");
const REPO = "dinosauce-285/HW06-Software-Testing";

const CHROME = [
  path.join(os.homedir(), ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell"),
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

const [runId, ten] = process.argv.slice(2);
if (!runId || !ten) {
  console.error("Dùng: node scripts/capture-ci-evidence.js <runId> <tên-file>");
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  // 1. Trích tóm tắt Newman từ log của chính lượt chạy này
  let log = "";
  try {
    log = execSync(`gh run view ${runId} --repo ${REPO} --log`, {
      encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    log = (e.stdout || "").toString();
  }
  const tomTat = log
    .split("\n")
    .filter((l) => /│|failure|AssertionError|inside "/.test(l))
    .map((l) => l.replace(/^[^\t]*\t[^\t]*\t\S+Z /, ""))
    .join("\n");

  const meta = execSync(
    `gh run view ${runId} --repo ${REPO} --json displayTitle,conclusion,headSha,createdAt,url ` +
      `-q '"\\(.conclusion)|\\(.headSha)|\\(.createdAt)|\\(.url)|\\(.displayTitle)"'`,
    { encoding: "utf8" },
  ).trim();
  const [ketLuan, sha, luc, url, tieuDe] = meta.split("|");

  fs.writeFileSync(
    path.join(OUT, `${ten}.txt`),
    `runId: ${runId}\nkết luận: ${ketLuan}\ncommit: ${sha}\nlúc: ${luc}\nlink: ${url}\n` +
      `tiêu đề: ${tieuDe}\n\n--- tóm tắt Newman trích từ log ---\n${tomTat}\n`,
  );

  // 2. Chụp trang lượt chạy trên github.com
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const pg = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await pg.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await pg.waitForTimeout(2500);
  await pg.screenshot({ path: path.join(OUT, `${ten}.png`), fullPage: false });
  await browser.close();

  console.log(`✓ ${ten}.png  (${ketLuan}, commit ${sha.slice(0, 7)})`);
  console.log(`✓ ${ten}.txt  — tóm tắt Newman + link`);
  console.log(`  ${url}`);
})();
