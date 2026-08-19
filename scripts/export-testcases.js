#!/usr/bin/env node
/**
 * Xuất bảng test case ra CSV (mở được bằng Excel) và bảng tổng kết Markdown.
 * Đề mục 14:154 đòi "Excel test cases and test summary".
 *
 * NGUỒN DỮ LIỆU: ghép hai thứ lại với nhau —
 *   1. tests/*.cases.js          -> danh sách case, trục, nguồn (AI hay tự bổ sung), mã lỗi
 *   2. results/raw/conformance.json -> kết quả CHẠY THẬT của từng case
 * Nhờ vậy cột "Kết quả" không phải gõ tay, mà lấy từ lượt chạy Newman gần nhất.
 * Đề mục 11 nói TA đối chiếu — số liệu phải truy ngược được về file thô.
 *
 * Chạy: node scripts/export-testcases.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_CSV = path.join(ROOT, "docs", "Test-Cases.csv");
const OUT_MD = path.join(ROOT, "docs", "Test-Summary.md");

const NGUON = [
  { file: "api1-login.cases.js", api: "API1", endpoint: "POST /api/login", pool: "A", fr: "FR-02" },
  { file: "api2-checkout.cases.js", api: "API2", endpoint: "POST /api/checkout", pool: "B", fr: "FR-08" },
  { file: "api3-order-status.cases.js", api: "API3", endpoint: "PUT /api/admin/orders/:id/status", pool: "C", fr: "FR-18" },
];

const TEN_TRUC = {
  setup: "Chuẩn bị",
  domain: "Phân vùng miền",
  boundary: "Giá trị biên",
  state: "Chuyển trạng thái",
  security: "Bảo mật",
  schema: "Schema & HTTP",
  extended: "Tự bổ sung",
};

/** Đọc kết quả chạy thật: mã case -> {tong, fail, loi[]} */
function docKetQua() {
  const f = path.join(ROOT, "results/raw/conformance.json");
  if (!fs.existsSync(f)) {
    console.error("Chưa có results/raw/conformance.json — chạy `npm test` trước.");
    return { theo: {}, meta: null };
  }
  const run = JSON.parse(fs.readFileSync(f, "utf8")).run;
  const theo = {};
  for (const e of run.executions) {
    const id = e.item.name.split(" — ")[0];
    const t = (theo[id] = theo[id] || { tong: 0, fail: 0, loi: [] });
    for (const a of e.assertions || []) {
      t.tong++;
      if (a.error) {
        t.fail++;
        t.loi.push(a.assertion);
      }
    }
  }
  return { theo, meta: run.stats };
}

const q = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

function main() {
  const { theo, meta } = docKetQua();
  const hang = [];
  const thongKe = {};

  for (const src of NGUON) {
    const full = path.join(ROOT, "tests", src.file);
    if (!fs.existsSync(full)) continue;
    const cases = require(full);
    const tk = (thongKe[src.api] = {
      endpoint: src.endpoint, pool: src.pool, fr: src.fr,
      ai: 0, human: 0, chay: 0, pass: 0, fail: 0, bugs: new Set(), truc: {},
    });

    for (const c of cases) {
      const kq = theo[c.id];
      const trangThai = !kq ? "Chưa chạy" : kq.fail === 0 ? "PASS" : "FAIL";

      hang.push({
        api: src.api, endpoint: src.endpoint, pool: src.pool, fr: src.fr,
        id: c.id,
        truc: TEN_TRUC[c.axis] || c.axis,
        mota: c.name,
        nguon: c.origin === "human" ? "Tự bổ sung" : "AI sinh",
        khangDinh: kq ? kq.tong : 0,
        trangThai,
        loi: c.knownBug || "",
        chiTietFail: kq ? kq.loi.join(" | ") : "",
      });

      if (c.axis !== "setup") c.origin === "human" ? tk.human++ : tk.ai++;
      tk.truc[TEN_TRUC[c.axis] || c.axis] = (tk.truc[TEN_TRUC[c.axis] || c.axis] || 0) + 1;
      if (kq) {
        tk.chay++;
        trangThai === "PASS" ? tk.pass++ : tk.fail++;
      }
      if (c.knownBug) tk.bugs.add(c.knownBug);
    }
  }

  // ── CSV ───────────────────────────────────────────────────────────────
  const cot = ["API", "Endpoint", "Pool", "FR", "Mã case", "Trục kiểm thử", "Mô tả",
               "Nguồn", "Số khẳng định", "Kết quả", "Mã lỗi", "Chi tiết khẳng định thất bại"];
  const csv = [cot.join(",")];
  for (const h of hang) {
    csv.push([h.api, h.endpoint, h.pool, h.fr, h.id, h.truc, h.mota, h.nguon,
              h.khangDinh, h.trangThai, h.loi, h.chiTietFail].map(q).join(","));
  }
  // BOM để Excel nhận đúng UTF-8 tiếng Việt
  fs.writeFileSync(OUT_CSV, "﻿" + csv.join("\n") + "\n");

  // ── Bảng tổng kết Markdown ────────────────────────────────────────────
  const apis = Object.keys(thongKe);
  const tong = (k) => apis.reduce((s, a) => s + thongKe[a][k], 0);
  const tatCaBug = new Set(apis.flatMap((a) => [...thongKe[a].bugs]));

  let md = `# Test Summary — HW06 API Testing

> Sinh tự động bằng \`node scripts/export-testcases.js\`. Cột kết quả lấy từ
> \`results/raw/conformance.json\` — output thô của lượt chạy Newman gần nhất, không gõ tay.
> Bảng test case đầy đủ: \`docs/Test-Cases.csv\` (mở bằng Excel).

## 1. Tổng kết theo API

| API | Endpoint | Pool | FR | AI sinh | Tự bổ sung | Đã chạy | Pass | Fail | Số lỗi |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
`;
  for (const a of apis) {
    const t = thongKe[a];
    md += `| ${a} | \`${t.endpoint}\` | ${t.pool} | ${t.fr} | ${t.ai} | ${t.human} | ${t.chay} | ${t.pass} | ${t.fail} | ${t.bugs.size} |\n`;
  }
  md += `| **Tổng** | | | | **${tong("ai")}** | **${tong("human")}** | **${tong("chay")}** | **${tong("pass")}** | **${tong("fail")}** | **${tatCaBug.size}** |\n`;

  md += `\n## 2. Độ phủ theo trục kiểm thử\n\n| Trục | ${apis.join(" | ")} | Tổng |\n| --- | ${apis.map(() => "---:").join(" | ")} | ---: |\n`;
  const trucs = [...new Set(apis.flatMap((a) => Object.keys(thongKe[a].truc)))];
  for (const tr of trucs) {
    const so = apis.map((a) => thongKe[a].truc[tr] || 0);
    md += `| ${tr} | ${so.join(" | ")} | **${so.reduce((x, y) => x + y, 0)}** |\n`;
  }

  md += `\n## 3. Chỉ số theo yêu cầu mục 14:160\n
| Chỉ số | Giá trị |
| --- | --- |
| Số API kiểm thử | ${apis.length} |
| Test case AI sinh ra | ${tong("ai")} |
| Test case tự bổ sung | ${tong("human")} |
| Test case đã thực thi | ${tong("chay")} |
| Passed | ${tong("pass")} |
| Failed | ${tong("fail")} |
| Số lỗi tìm được | ${tatCaBug.size} |
`;

  if (meta) {
    md += `\n## 4. Lượt chạy Newman gần nhất\n
| | |
| --- | --- |
| Request | ${meta.requests.total} |
| Khẳng định | ${meta.assertions.total} |
| Khẳng định thất bại | ${meta.assertions.failed} |

> **Vì sao có khẳng định thất bại:** bộ test khẳng định theo **đặc tả**, mà SUT có lỗi thật.
> Mỗi khẳng định thất bại đều truy được về một mã lỗi ở cột "Mã lỗi". Bộ hồi quy dùng cho CI
> (\`EShop-API-Regression\`) đã loại các case này ra nên luôn xanh.
`;
  }

  fs.writeFileSync(OUT_MD, md);
  console.log(`Đã xuất ${hang.length} test case`);
  console.log(`  -> ${path.relative(ROOT, OUT_CSV)}`);
  console.log(`  -> ${path.relative(ROOT, OUT_MD)}`);
}

main();
