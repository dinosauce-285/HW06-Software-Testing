#!/usr/bin/env node
/**
 * Xuất các tài liệu Markdown bắt buộc ra PDF (Policies: "students must also
 * submit a Save-As-PDF version of those files").
 *
 * Không có pandoc trên máy này, nên dùng Chromium: render Markdown -> HTML ->
 * in ra PDF. Bộ chuyển Markdown viết tay vừa đủ cho các cấu trúc thật sự dùng
 * trong bài (tiêu đề, bảng, danh sách, khối mã, trích dẫn, in đậm/nghiêng,
 * liên kết) — không nhằm thay một bộ parser đầy đủ.
 *
 * Chạy: node scripts/export-pdf.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("/home/qt/.npm/_npx/9833c18b2d85bc59/node_modules/playwright");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "pdf");

const FILES = [
  "docs/Main-Report.md",
  "docs/Bug-Report.md",
  "docs/AI-Audit-Report.md",
  "docs/AI-Critique.md",
  "docs/CI-CD-Report.md",
  "docs/Test-Summary.md",
  "docs/Postman-Features.md",
  "README.md",
];

const CHROME = [
  path.join(os.homedir(), ".cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell"),
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Định dạng trong một dòng: mã, đậm, nghiêng, liên kết. */
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function toHtml(md) {
  const out = [];
  const lines = md.split("\n");
  let i = 0;
  let trongDanhSach = false;

  const dongDanhSach = () => {
    if (trongDanhSach) { out.push("</ul>"); trongDanhSach = false; }
  };

  while (i < lines.length) {
    const l = lines[i];

    // khối mã
    if (/^```/.test(l)) {
      dongDanhSach();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // bảng — nhận ra bằng dòng phân cách |---|
    if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      dongDanhSach();
      const o = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = o(l);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(o(lines[i++]));
      out.push(
        "<table><thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>" +
          rows.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") +
          "</tbody></table>",
      );
      continue;
    }

    if (/^#{1,6}\s/.test(l)) {
      dongDanhSach();
      const n = l.match(/^#+/)[0].length;
      out.push(`<h${n}>${inline(l.replace(/^#+\s*/, ""))}</h${n}>`);
      i++; continue;
    }

    if (/^>\s?/.test(l)) {
      dongDanhSach();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    if (/^---+\s*$/.test(l)) { dongDanhSach(); out.push("<hr>"); i++; continue; }

    if (/^\s*[-*]\s+/.test(l)) {
      if (!trongDanhSach) { out.push("<ul>"); trongDanhSach = true; }
      out.push(`<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`);
      i++; continue;
    }

    if (!l.trim()) { dongDanhSach(); i++; continue; }

    // Đoạn văn — gộp các dòng liền nhau (Markdown xuống dòng mềm).
    // CHÚ Ý: điều kiện dừng chỉ được bắt các dấu hiệu MỞ KHỐI thật sự.
    // Dòng bắt đầu bằng `*` mà KHÔNG có khoảng trắng theo sau là chữ in nghiêng,
    // không phải danh sách — nếu chặn cả nó thì cả đoạn bị nuốt mất.
    const moKhoi = (x) => /^#{1,6}\s/.test(x) || /^>/.test(x) || /^```/.test(x) ||
                          /^\s*\|/.test(x) || /^\s*[-*]\s+/.test(x) || /^---+\s*$/.test(x);
    const buf = [];
    while (i < lines.length && lines[i].trim() && !moKhoi(lines[i])) buf.push(lines[i++]);
    if (buf.length) out.push(`<p>${inline(buf.join(" "))}</p>`);
    else i++;
  }
  dongDanhSach();
  return out.join("\n");
}

const CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Noto Sans","DejaVu Sans",sans-serif; font-size: 10.5pt; line-height: 1.55;
       color: #1a1a1a; margin: 0; }
h1 { font-size: 20pt; border-bottom: 2px solid #333; padding-bottom: 6px; margin: 0 0 14px; }
h2 { font-size: 14.5pt; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
h3 { font-size: 12pt; margin: 16px 0 6px; }
h4 { font-size: 11pt; margin: 12px 0 4px; }
p { margin: 7px 0; }
code { font-family: "DejaVu Sans Mono",monospace; font-size: 9pt; background: #f2f2f2;
       padding: 1px 4px; border-radius: 3px; }
pre { background: #f7f7f7; border: 1px solid #ddd; border-radius: 4px; padding: 9px 11px;
      overflow-x: auto; page-break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 8.5pt; line-height: 1.45; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9pt;
        page-break-inside: avoid; }
th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background: #eee; font-weight: 600; }
blockquote { border-left: 3px solid #888; margin: 10px 0; padding: 4px 0 4px 12px;
             color: #444; background: #fafafa; }
ul { margin: 7px 0; padding-left: 22px; }
li { margin: 3px 0; }
hr { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
a { color: #0645ad; text-decoration: none; }
h1, h2, h3 { page-break-after: avoid; }
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const pg = await browser.newPage();

  for (const f of FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) { console.error(`bỏ qua (chưa có): ${f}`); continue; }
    const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${toHtml(fs.readFileSync(src, "utf8"))}`;
    await pg.setContent(html, { waitUntil: "load" });
    const ten = path.basename(f, ".md") + ".pdf";
    await pg.pdf({ path: path.join(OUT, ten), format: "A4", printBackground: true });
    const kb = Math.round(fs.statSync(path.join(OUT, ten)).size / 1024);
    console.log(`✓ ${ten}  (${kb} KB)`);
  }

  await browser.close();
  console.log(`\nXong -> ${path.relative(ROOT, OUT)}/`);
})();
