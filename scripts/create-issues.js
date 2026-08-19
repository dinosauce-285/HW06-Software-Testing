#!/usr/bin/env node
/**
 * Mở GitHub Issue cho từng lỗi trong docs/Bug-Report.md, mỗi issue đính ảnh
 * bằng chứng tương ứng trong evidence/bugs/ (đề mục 6:86).
 *
 * VÌ SAO ĐỌC THẲNG TỪ BUG-REPORT.MD: đề bắt báo lỗi ở CẢ hai nơi — Markdown và
 * GitHub Issues. Nếu chép nội dung sang đây thì hai bên sẽ lệch nhau ngay lần
 * sửa đầu tiên, mà TA có đối chiếu. Một nguồn sự thật, hai đầu ra.
 *
 * Ảnh được tham chiếu qua raw.githubusercontent nên PHẢI push evidence/ lên
 * repo TRƯỚC khi chạy script này.
 *
 * Chạy thử:  node scripts/create-issues.js --dry
 * Chạy thật: node scripts/create-issues.js
 */

const { execSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const REPO = "dinosauce-285/HW06-Software-Testing";
const RAW = `https://raw.githubusercontent.com/${REPO}/main/evidence/bugs`;
const DRY = process.argv.includes("--dry");

const SEV_LABEL = {
  "Nghiêm trọng": "severity: critical",
  Cao: "severity: high",
  "Trung bình": "severity: medium",
  Thấp: "severity: low",
};

/** Tách docs/Bug-Report.md thành từng khối `## BUG-A1-xx — tiêu đề`. */
function parseBugReport() {
  const md = fs.readFileSync(path.join(ROOT, "docs/Bug-Report.md"), "utf8");
  const bugs = [];
  const re = /^## (BUG-[A-Z0-9-]+) — (.+)$/gm;
  const heads = [...md.matchAll(re)];

  heads.forEach((h, i) => {
    const start = h.index + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : md.indexOf("\n## Đối chiếu nguồn", start);
    const body = md.slice(start, end === -1 ? undefined : end).trim();
    const sev = (body.match(/\*\*Mức:\*\*\s*([^·\n]+)/) || [])[1]?.trim().replace(/\*/g, "") || "Trung bình";
    const tuTim = /Tự tìm, AI bỏ sót/.test(body);
    bugs.push({ id: h[1], title: h[2].trim(), sev, tuTim, body });
  });
  return bugs;
}

function ensureLabels(labels) {
  const co = new Set(
    execSync(`gh label list --repo ${REPO} --limit 100 --json name -q '.[].name'`, { encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const mau = {
    bug: "d73a4a",
    security: "b60205",
    api1: "0e8a16",
    "phát hiện bởi AI": "c5def5",
    "tự tìm": "5319e7",
    "severity: critical": "b60205",
    "severity: high": "d93f0b",
    "severity: medium": "fbca04",
    "severity: low": "c2e0c6",
  };
  for (const l of labels) {
    if (co.has(l)) continue;
    try {
      execSync(
        `gh label create ${JSON.stringify(l)} --repo ${REPO} --color ${mau[l] || "ededed"} --force`,
        { stdio: "pipe" },
      );
      console.log(`  + tạo nhãn "${l}"`);
    } catch (e) {
      console.error(`  ! không tạo được nhãn "${l}"`);
    }
  }
}

const bugs = parseBugReport();
if (!bugs.length) {
  console.error("Không đọc được lỗi nào từ docs/Bug-Report.md — kiểm tra lại định dạng tiêu đề.");
  process.exit(1);
}

const allLabels = new Set([
  "bug", "api1", "api2", "api3", "security", "phát hiện bởi AI", "tự tìm", ...Object.values(SEV_LABEL),
]);
if (!DRY) ensureLabels(allLabels);

/** Mã lỗi đã có issue trên repo — để chạy lại script không tạo trùng.
 *  Cần thiết vì script này được gọi lại sau mỗi API. */
function daCoIssue() {
  try {
    const ds = execSync(
      `gh issue list --repo ${REPO} --state all --limit 200 --json title -q '.[].title'`,
      { encoding: "utf8" },
    );
    return new Set([...ds.matchAll(/\[(BUG-[A-Z0-9-]+)\]/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}
const daCo = daCoIssue();

const tmp = os.tmpdir();
let created = 0;
let boQua = 0;

for (const b of bugs) {
  if (daCo.has(b.id)) {
    if (DRY) console.log(`BỎ QUA  ${b.id} — đã có issue trên repo`);
    boQua++;
    continue;
  }
  const anh = path.join(ROOT, "evidence/bugs", `${b.id}.png`);
  const coAnh = fs.existsSync(anh);

  const body = `> **Mức độ:** ${b.sev} · phát hiện trong HW06 API Testing — MSSV **23127262**
> **SUT:** [ttbhanh/eshop-sut](https://github.com/ttbhanh/eshop-sut) @ \`85af3ba\` · backend \`http://localhost:3000\`
> **Nguồn phát hiện:** ${b.tuTim ? "test case do tôi tự bổ sung (AI bỏ sót)" : "test case do AI sinh, sau khi tôi thẩm định"}

${b.body}

${coAnh ? `## Bằng chứng\n\n![${b.id}](${RAW}/${b.id}.png)\n` : ""}
---
*Ảnh bằng chứng là bản render của output lệnh chạy thật trên máy \`${os.hostname()}\`, có in kèm lệnh gốc để chạy lại kiểm chứng. Báo cáo đầy đủ: [docs/Bug-Report.md](https://github.com/${REPO}/blob/main/docs/Bug-Report.md) · kết quả Newman: [results/raw/conformance.json](https://github.com/${REPO}/blob/main/results/raw/conformance.json)*`;

  // Nhãn API lấy từ chính mã lỗi (BUG-A2-07 -> api2), không gán cứng.
  const nhanApi = "api" + (b.id.match(/BUG-A(\d)/) || [, "1"])[1];
  const labels = ["bug", nhanApi, SEV_LABEL[b.sev] || "severity: medium", b.tuTim ? "tự tìm" : "phát hiện bởi AI"];
  if (/SEC-0|bảo mật|Liệt kê tài khoản|DoS|tần suất/i.test(b.title + b.body)) labels.push("security");

  const title = `[${b.id}] ${b.title}`;

  if (DRY) {
    console.log(`DRY  ${title}`);
    console.log(`     nhãn: ${labels.join(", ")} | ảnh: ${coAnh ? "có" : "THIẾU"} | ${body.length} ký tự`);
    continue;
  }

  const f = path.join(tmp, `issue-${b.id}.md`);
  fs.writeFileSync(f, body);
  try {
    // execFileSync chứ KHÔNG execSync: tiêu đề lỗi có chứa dấu backtick
    // (ví dụ "`Content-Type: text/plain` làm server trả 500"). Ghép vào chuỗi
    // shell thì backtick bị hiểu là lệnh và nuốt mất một đoạn tiêu đề.
    // Truyền tham số dạng mảng thì không qua shell, không còn chuyện đó.
    const url = execFileSync(
      "gh",
      ["issue", "create", "--repo", REPO, "--title", title, "--body-file", f,
       ...labels.flatMap((l) => ["--label", l])],
      { encoding: "utf8" },
    ).trim();
    console.log(`✓ ${b.id}  ${url}`);
    created++;
  } catch (e) {
    console.error(`✗ ${b.id}: ${(e.stderr || e.message).toString().trim().split("\n")[0]}`);
  }
}

if (!DRY) console.log(`\nĐã tạo ${created} issue mới, bỏ qua ${boQua} cái đã có (tổng ${bugs.length} lỗi).`);
