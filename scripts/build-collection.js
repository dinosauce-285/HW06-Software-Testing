#!/usr/bin/env node
/**
 * Sinh Postman Collection v2.1 từ các bảng test case khai báo trong tests/*.cases.js
 *
 * VÌ SAO KHÔNG VIẾT TAY JSON: ba API × ~60 case = ~180 request. Viết tay thì
 * không soát được, mà mỗi lần đổi một khẳng định chung (ví dụ thêm kiểm
 * Content-Type cho mọi response) phải sửa 180 chỗ. Khai báo tập trung thì sửa
 * một chỗ, sinh lại toàn bộ.
 *
 * ĐỀ MỤC 6:85 — mọi request phải mang header X-Student-Id. Header đó được gắn
 * bằng pre-request script ở CẤP COLLECTION (xem COLLECTION_PREREQUEST bên dưới),
 * nên không case nào có thể quên nó.
 *
 * Dùng: node scripts/build-collection.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_FULL = path.join(ROOT, "collections", "EShop-API-Tests.postman_collection.json");
const OUT_GREEN = path.join(ROOT, "collections", "EShop-API-Regression.postman_collection.json");
const STUDENT_ID = "23127262";

/**
 * HAI COLLECTION, MỘT NGUỒN KHAI BÁO — vì sao cần tách:
 *
 * Bộ test này khẳng định ĐẶC TẢ. SUT có lỗi thật, nên những case bắt được lỗi
 * sẽ FAIL — và đó đúng là công dụng của chúng, không được phép giấu đi.
 * Nhưng đề mục 6:91 lại đòi một lượt CI "toàn bộ test case đều pass".
 *
 * Cách giải: case nào đang bắt một lỗi đã biết thì đánh dấu `knownBug: 'BUG-...'`.
 *   - EShop-API-Tests       : ĐẦY ĐỦ, gồm cả case bắt lỗi -> dùng làm bằng chứng bug
 *   - EShop-API-Regression  : bỏ các case đã biết lỗi     -> dùng cho CI, luôn xanh
 * Đây là mô hình "quarantine" quen thuộc: lỗi vẫn hiển thị trong báo cáo, còn
 * cổng CI thì chỉ chặn khi có hồi quy MỚI.
 */

const SOURCES = [
  { file: "api1-login.cases.js", name: "API1 — POST /api/login (Pool A, FR-02)" },
  { file: "api2-checkout.cases.js", name: "API2 — POST /api/checkout (Pool B, FR-08)" },
  { file: "api3-order-status.cases.js", name: "API3 — PUT /api/admin/orders/:id/status (Pool C, FR-18)" },
];

const OUT_DD = path.join(ROOT, "collections", "EShop-API3-Transitions.postman_collection.json");

/** Gắn X-Student-Id cho MỌI request, và ghi ra Console để chụp màn hình làm bằng chứng. */
const COLLECTION_PREREQUEST = [
  "// Đề mục 6:85 — mọi request phải mang header X-Student-Id.",
  "// Đặt ở cấp collection nên không request nào có thể thiếu.",
  "const sid = pm.environment.get('studentId') || '" + STUDENT_ID + "';",
  "pm.request.headers.upsert({ key: 'X-Student-Id', value: sid });",
  "",
  "// Đề mục 11:131 — TA đối chiếu bằng ảnh chụp Postman Console.",
  "console.log('[X-Student-Id] ' + sid + '  ->  ' + pm.request.method + ' ' + pm.request.url.getPath());",
];

/** Khẳng định áp cho mọi request, khỏi lặp lại trong từng case. */
const COLLECTION_TEST = [
  "// Khẳng định chung cho mọi response của bộ test.",
  "pm.test('[chung] response dưới 2 giây', () => pm.expect(pm.response.responseTime).to.be.below(2000));",
  "pm.test('[chung] không phải lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
];

/** Thứ tự folder = thứ tự Newman chạy. `setup` BẮT BUỘC đứng đầu vì các case
 *  trạng thái đọc bộ đếm bằng {{adminToken}} do folder này nạp vào environment. */
const AXIS_ORDER = ["setup", "domain", "boundary", "state", "security", "schema", "extended"];

const AXIS_LABEL = {
  setup: "0. Setup — nạp token dùng chung",
  domain: "1. Phân vùng miền",
  boundary: "2. Giá trị biên",
  state: "3. Chuyển trạng thái",
  security: "4. Bảo mật",
  schema: "5. Schema & HTTP",
  extended: "6. Tự bổ sung (bước 3)",
};

function toRequest(tc) {
  // tc.headers là các header riêng của case (chủ yếu là Authorization).
  // X-Student-Id KHÔNG đặt ở đây — nó do pre-request script cấp collection gắn
  // vào mọi request, xem COLLECTION_PREREQUEST.
  const rieng = Object.entries(tc.headers || {}).map(([key, value]) => ({ key, value }));
  const req = {
    method: tc.method || "POST",
    header: [{ key: "Content-Type", value: tc.contentType || "application/json" }, ...rieng],
    url: {
      raw: "{{baseUrl}}" + tc.path,
      host: ["{{baseUrl}}"],
      path: tc.path.replace(/^\//, "").split("/"),
    },
  };
  if (tc.rawBody !== undefined) {
    req.body = { mode: "raw", raw: tc.rawBody };
  } else if (tc.body !== undefined) {
    req.body = { mode: "raw", raw: JSON.stringify(tc.body, null, 2) };
  }
  return req;
}

function toItem(tc) {
  const event = [];
  if (tc.prereq && tc.prereq.length) {
    event.push({ listen: "prerequest", script: { type: "text/javascript", exec: tc.prereq } });
  }
  event.push({
    listen: "test",
    script: {
      type: "text/javascript",
      exec: [`// ${tc.id} — ${tc.axis}`, ...(tc.tests || [])],
    },
  });
  return { name: `${tc.id} — ${tc.name}`, event, request: toRequest(tc) };
}

function buildFolders(cases) {
  const byAxis = new Map();
  for (const tc of cases) {
    if (!byAxis.has(tc.axis)) byAxis.set(tc.axis, []);
    byAxis.get(tc.axis).push(tc);
  }
  return [...byAxis.entries()]
    .sort((a, b) => AXIS_ORDER.indexOf(a[0]) - AXIS_ORDER.indexOf(b[0]))
    .map(([axis, items]) => ({
      name: AXIS_LABEL[axis] || axis,
      item: items.map(toItem),
    }));
}

function makeCollection(id, name, description, folders) {
  return {
    info: {
      _postman_id: id,
      name,
      description,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: folders,
    event: [
      { listen: "prerequest", script: { type: "text/javascript", exec: COLLECTION_PREREQUEST } },
      { listen: "test", script: { type: "text/javascript", exec: COLLECTION_TEST } },
    ],
    variable: [{ key: "baseUrl", value: "http://localhost:3000" }],
  };
}

/**
 * Collection data-driven cho ma trận chuyển trạng thái của API 3.
 *
 * VÌ SAO TÁCH RIÊNG: 25 ô của ma trận FR-10 dùng CHUNG một kịch bản — dựng đơn
 * về trạng thái nguồn, gọi API chuyển sang trạng thái đích, kiểm mã HTTP và
 * kiểm trạng thái LƯU TRONG CSDL. Chỉ có dữ liệu là khác. Viết 25 request giống
 * hệt nhau thì vừa dài vừa dễ sai; một request lặp qua data/api3-transitions.csv
 * là đúng bài toán mà Collection Runner sinh ra để giải.
 *
 * Chạy:  npx newman run collections/EShop-API3-Transitions.postman_collection.json \
 *          -e environments/local.postman_environment.json -d data/api3-transitions.csv
 */
function makeDataDriven() {
  const prereq = [
    "// Dựng một đơn hàng MỚI cho mỗi dòng dữ liệu, rồi đẩy nó về trạng thái nguồn.",
    "// Mỗi dòng một đơn riêng để 25 lượt chạy không ảnh hưởng lẫn nhau.",
    "const duong = {",
    "  pending:   [],",
    "  confirmed: ['confirmed'],",
    "  shipping:  ['confirmed', 'shipping'],",
    "  delivered: ['confirmed', 'shipping', 'delivered'],",
    "  canceled:  ['canceled'],",
    "};",
    "const base = pm.environment.get('baseUrl');",
    "const sid = pm.environment.get('studentId');",
    "const admin = () => ({ 'Content-Type': 'application/json', 'X-Student-Id': sid,",
    "                       'Authorization': 'Bearer ' + pm.environment.get('adminToken') });",
    "",
    "pm.sendRequest({",
    "  url: base + '/api/checkout', method: 'POST',",
    "  header: { 'Content-Type': 'application/json', 'X-Student-Id': sid,",
    "            'Authorization': 'Bearer ' + pm.environment.get('token') },",
    "  body: { mode: 'raw', raw: JSON.stringify({ total_amount: 1000, shipping_address: '123 Le Loi' }) }",
    "}, (err, res) => {",
    "  const id = res.json().orderId;",
    "  pm.variables.set('donId', id);",
    "  const chuoi = duong[pm.iterationData.get('tu_trang_thai')] || [];",
    "  let k = 0;",
    "  const buoc = () => k >= chuoi.length ? null : pm.sendRequest({",
    "    url: base + '/api/admin/orders/' + id + '/status', method: 'PUT',",
    "    header: admin(),",
    "    body: { mode: 'raw', raw: JSON.stringify({ status: chuoi[k] }) }",
    "  }, () => { k++; buoc(); });",
    "  buoc();",
    "});",
  ];

  const tests = [
    "const d = pm.iterationData;",
    "const id = d.get('case_id');",
    "const tu = d.get('tu_trang_thai');",
    "const toi = d.get('toi_trang_thai');",
    "const hopLe = d.get('hop_le') === 'co';",
    "const mong = Number(d.get('ma_mong_doi'));",
    "",
    "pm.test(`${id}: ${tu} -> ${toi} phải trả ${mong}`, () =>",
    "  pm.expect(pm.response.code).to.eql(mong));",
    "",
    "// Chỉ kiểm mã HTTP thì chưa đủ: có thể trả 400 mà vẫn ghi vào CSDL.",
    "// Phải đọc lại đơn để biết trạng thái THẬT SỰ được lưu là gì.",
    "const sauCung = hopLe ? toi : tu;",
    "pm.sendRequest({",
    "  url: pm.environment.get('baseUrl') + '/api/orders/' + pm.variables.get('donId'),",
    "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
    "}, (err, res) => pm.test(`${id}: trạng thái lưu trong CSDL phải là ${sauCung}`, () =>",
    "  pm.expect(res.json().status).to.eql(sauCung)));",
  ];

  return makeCollection(
    "hw06-23127262-eshop-api3-transitions",
    `EShop API3 — Ma trận chuyển trạng thái (${STUDENT_ID})`,
    "Chạy data-driven trọn 25 ô của máy trạng thái FR-10. Cần file dữ liệu: " +
      "npx newman run <file này> -e environments/local.postman_environment.json " +
      "-d data/api3-transitions.csv",
    [
      {
        name: "Chuẩn bị",
        item: [
          toItem({
            id: "SETUP-DD", name: "Nạp token admin và token user", axis: "setup",
            path: "/api/login", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
            tests: [
              "pm.environment.set('adminToken', pm.response.json().token);",
              "pm.sendRequest({",
              "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
              "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
              "  body: { mode: 'raw', raw: JSON.stringify({ email: pm.environment.get('userEmail'), password: pm.environment.get('userPassword') }) }",
              "}, (err, res) => pm.environment.set('token', res.json().token));",
            ],
          }),
        ],
      },
      {
        name: "Ma trận 5×5 (data-driven)",
        item: [
          toItem({
            id: "MATRIX", name: "{{case_id}}: {{tu_trang_thai}} → {{toi_trang_thai}}",
            axis: "state", method: "PUT",
            path: "/api/admin/orders/{{donId}}/status",
            headers: { Authorization: "Bearer {{adminToken}}" },
            rawBody: '{"status": "{{toi_trang_thai}}"}',
            prereq, tests,
          }),
        ],
      },
    ],
  );
}

function main() {
  const all = [];

  for (const src of SOURCES) {
    const full = path.join(ROOT, "tests", src.file);
    if (!fs.existsSync(full)) {
      console.error(`Bỏ qua (chưa có): tests/${src.file}`);
      continue;
    }
    all.push({ name: src.name, cases: require(full) });
  }

  const countAll = all.reduce((n, s) => n + s.cases.length, 0);
  const green = all.map((s) => ({ name: s.name, cases: s.cases.filter((c) => !c.knownBug) }));
  const countGreen = green.reduce((n, s) => n + s.cases.length, 0);

  fs.mkdirSync(path.dirname(OUT_FULL), { recursive: true });

  fs.writeFileSync(
    OUT_FULL,
    JSON.stringify(
      makeCollection(
        "hw06-23127262-eshop-api-tests",
        `EShop API Tests — HW06 (${STUDENT_ID})`,
        "Bộ test đầy đủ, khẳng định theo ĐẶC TẢ. Có chứa các case bắt lỗi đã biết nên " +
          "lượt chạy sẽ có FAIL — đó là bằng chứng bug, không phải hỏng bộ test. " +
          "Sinh tự động bằng scripts/build-collection.js, đừng sửa trực tiếp file này.",
        all.map((s) => ({ name: s.name, item: buildFolders(s.cases) })),
      ),
      null,
      2,
    ) + "\n",
  );

  fs.writeFileSync(
    OUT_GREEN,
    JSON.stringify(
      makeCollection(
        "hw06-23127262-eshop-api-regression",
        `EShop API Regression — HW06 (${STUDENT_ID})`,
        "Bộ test hồi quy dùng cho CI: giống bộ đầy đủ nhưng đã bỏ các case đang bắt lỗi " +
          "đã biết, nên phải luôn XANH. Fail ở đây nghĩa là có hồi quy mới.",
        green.map((s) => ({ name: s.name, item: buildFolders(s.cases) })),
      ),
      null,
      2,
    ) + "\n",
  );

  fs.writeFileSync(OUT_DD, JSON.stringify(makeDataDriven(), null, 2) + "\n");

  console.log(`Đầy đủ  : ${countAll} request -> ${path.relative(ROOT, OUT_FULL)}`);
  console.log(`Hồi quy : ${countGreen} request -> ${path.relative(ROOT, OUT_GREEN)}`);
  console.log(`Đã tách ra ${countAll - countGreen} case đang bắt lỗi đã biết.`);
  console.log(`Data-driven: 1 request x 25 dòng -> ${path.relative(ROOT, OUT_DD)}`);
}

main();
