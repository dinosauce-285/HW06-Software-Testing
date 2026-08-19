#!/usr/bin/env node
/**
 * Chứng minh MỌI request trong bộ test đều mang header X-Student-Id (đề mục 6:85).
 *
 * VÌ SAO CẦN SCRIPT NÀY THAY VÌ MỘT ẢNH CHỤP:
 * Request trong bộ test đến từ HAI nguồn khác nhau, và pre-request script cấp
 * collection chỉ phủ được MỘT trong hai:
 *
 *   1. Request khai báo trong collection  -> pre-request cấp collection tự gắn header
 *   2. pm.sendRequest gọi bên trong script -> KHÔNG đi qua pre-request cấp collection,
 *                                             phải tự gắn header trong từng lời gọi
 *
 * Một ảnh chụp Postman Console chỉ chứng minh được nhóm (1). Script này soát cả hai,
 * bằng cách đọc thẳng file collection đã sinh.
 *
 * Chạy: node scripts/verify-student-id.js
 * Mã thoát khác 0 nếu có bất kỳ request nào thiếu header.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "collections/EShop-API-Tests.postman_collection.json",
  "collections/EShop-API-Regression.postman_collection.json",
  "collections/EShop-API3-Transitions.postman_collection.json",
];

/** Tìm lời gọi pm.sendRequest và lấy phần đối số thứ nhất (object cấu hình). */
function tachSendRequest(code) {
  const ra = [];
  let i = 0;
  while ((i = code.indexOf("pm.sendRequest(", i)) !== -1) {
    i += "pm.sendRequest(".length;
    let sau = 0, j = i, trongChuoi = null;
    for (; j < code.length; j++) {
      const c = code[j];
      if (trongChuoi) { if (c === trongChuoi && code[j - 1] !== "\\") trongChuoi = null; continue; }
      if (c === "'" || c === '"' || c === "`") { trongChuoi = c; continue; }
      if (c === "{" || c === "[" || c === "(") sau++;
      else if (c === "}" || c === "]" || c === ")") { sau--; if (sau === 0) { j++; break; } }
      else if (c === "," && sau === 0) break;
    }
    ra.push(code.slice(i, j));
  }
  return ra;
}

/** Header có thể viết thẳng, hoặc trỏ tới một biến khai báo trong cùng script. */
function coHeader(doiSo, code) {
  if (/X-Student-Id/.test(doiSo)) return true;

  // dạng `header: h` hoặc `header: admin()` -> tra ngược định nghĩa trong cùng script
  const m = doiSo.match(/header:\s*([A-Za-z_$][\w$]*)\s*(\(\))?/);
  if (!m) return false;
  const ten = m[1];
  const dn = new RegExp(`(const|let|var)\\s+${ten}\\s*=([\\s\\S]{0,400})`);
  const d = code.match(dn);
  return !!(d && /X-Student-Id/.test(d[2]));
}

let tongCollection = 0, tongScript = 0, thieu = [];

for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const col = JSON.parse(fs.readFileSync(p, "utf8"));

  const cpre = (col.event || []).find((e) => e.listen === "prerequest");
  const coCapCollection = cpre && /X-Student-Id/.test((cpre.script.exec || []).join("\n"));
  if (!coCapCollection) thieu.push(`${f}: pre-request CAP COLLECTION khong gan X-Student-Id`);

  const duyet = (it) => {
    if (it.item) return it.item.forEach(duyet);
    tongCollection++;                       // được pre-request cấp collection phủ
    for (const e of it.event || []) {
      const code = (e.script.exec || []).join("\n");
      for (const ds of tachSendRequest(code)) {
        tongScript++;
        if (!coHeader(ds, code)) thieu.push(`${it.name} [${e.listen}]`);
      }
    }
  };
  col.item.forEach(duyet);
}

// Output cố tình viết KHÔNG DẤU: font monospace trên máy này đặt sai dấu thanh
// tiếng Việt (ví dụ "TỔNG" hiện thành "TÔŃG"), mà output này được render thành
// ảnh bằng chứng nên phải đọc được rõ ràng.
console.log("Soat header X-Student-Id tren toan bo bo test\n");
console.log(`  Request khai bao trong collection : ${tongCollection}`);
console.log("    -> phu boi pre-request CAP COLLECTION (khong case nao co the quen)\n");
console.log(`  pm.sendRequest goi trong script   : ${tongScript}`);
console.log("    -> KHONG di qua pre-request cap collection, phai tu gan header\n");
console.log(`  TONG REQUEST                      : ${tongCollection + tongScript}`);
console.log(`  Thieu header                      : ${thieu.length}\n`);

if (thieu.length) {
  console.log("Cac cho thieu:");
  [...new Set(thieu)].forEach((t) => console.log("  [X] " + t));
  process.exit(1);
}
console.log("[OK] Moi request deu mang X-Student-Id - dat yeu cau de muc 6:85.");
