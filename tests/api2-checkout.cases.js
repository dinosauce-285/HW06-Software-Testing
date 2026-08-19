/**
 * API 2 — POST /api/checkout (Pool B, FR-08)
 *
 * Bảng test case sau khi đã THẨM ĐỊNH — xem docs/api2/Audit.md.
 * Quy ước trường giống api1-login.cases.js.
 *
 * ĐẶC THÙ CỦA API NÀY: endpoint GHI DỮ LIỆU, nên phần lớn oracle không nằm ở
 * response mà nằm ở HỆ QUẢ — đơn được tạo có tổng bao nhiêu, trạng thái gì,
 * thuộc về ai, và giỏ hàng có bị xoá không. Vì vậy đa số case phải gọi thêm
 * GET /api/orders/:id trong test script để đọc đơn vừa tạo.
 */

const ADDR = "123 Le Loi, Q1, TP.HCM";

/** Đăng nhập user thường rồi nạp giỏ hàng. `items` là mảng {id,name,price,quantity}. */
const napGio = (items) => [
  "// Mỗi case tự nạp giỏ của mình. Giỏ nằm trong RAM và KHÔNG bị xoá sau khi",
  "// thanh toán (BUG-A2-02), nên phải coi giỏ là trạng thái bẩn giữa các case.",
  `const items = ${JSON.stringify(items)};`,
  "let i = 0;",
  "const them = () => i >= items.length ? null : pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/cart', method: 'POST',",
  "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
  "            'Authorization': 'Bearer ' + pm.environment.get('token') },",
  "  body: { mode: 'raw', raw: JSON.stringify(items[i]) }",
  "}, () => { i++; them(); });",
  "them();",
];

/** Đọc lại đơn vừa tạo rồi khẳng định trên nó. */
const docDon = (expr, label) => [
  "const oid = pm.response.json().orderId;",
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/orders/' + oid,",
  "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
  "}, (err, res) => {",
  "  const don = res.json();",
  `  pm.test(${JSON.stringify(label)}, () => { ${expr} });`,
  "});",
];

/** Tài khoản mới toanh + token riêng, dùng cho các case về vòng đời. */
const userMoi = (extra = []) => [
  "const email = 'co-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@hw06.local';",
  "pm.variables.set('coEmail', email);",
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/register', method: 'POST',",
  "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
  "  body: { mode: 'raw', raw: JSON.stringify({ name: 'HW06', email: email, password: 'Test1234!' }) }",
  "}, () => pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
  "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
  "  body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'Test1234!' }) }",
  "}, (e, r) => {",
  "  pm.variables.set('coToken', r.json().token);",
  "  pm.variables.set('coId', r.json().user.id);",
  ...extra,
  "}));",
];

const auth = { Authorization: "Bearer {{token}}" };

module.exports = [
  // ── 0. SETUP ────────────────────────────────────────────────────────────
  {
    id: "SETUP-A2", name: "Đăng nhập user thường, lưu token", axis: "setup", origin: "human",
    path: "/api/login", body: { email: "{{userEmail}}", password: "{{userPassword}}" },
    tests: [
      "pm.test('đăng nhập thành công', () => pm.response.to.have.status(200));",
      "pm.environment.set('token', pm.response.json().token);",
      "pm.environment.set('userId', pm.response.json().user.id);",
    ],
  },

  // ── 1. PHÂN VÙNG MIỀN — total_amount ────────────────────────────────────
  // Oracle chung: đơn tạo ra phải mang TỔNG CỦA GIỎ (200 000), không phải số
  // client gửi. Đây là cách kiểm ràng buộc D2 của FR-08.
  {
    id: "TC-A2-001", name: "total_amount khớp giỏ hàng", axis: "domain", origin: "ai",
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]), headers: auth,
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: ADDR },
    tests: [
      "pm.test('tạo đơn thành công', () => pm.response.to.have.status(200));",
      "pm.environment.set('orderId', pm.response.json().orderId);",
      ...docDon("pm.expect(don.total_amount).to.eql(200000)", "đơn ghi đúng tổng giỏ hàng"),
    ],
  },
  ...[
    ["TC-A2-002", "thấp hơn giỏ rất nhiều", 1],
    ["TC-A2-003", "bằng 0", 0],
    ["TC-A2-004", "số âm", -500000],
    ["TC-A2-005", "cao hơn giỏ", 999999999],
  ].map(([id, ten, val]) => ({
    id, name: `total_amount ${ten} → đơn vẫn phải ghi tổng giỏ`, axis: "domain", origin: "ai",
    knownBug: "BUG-A2-01",
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]), headers: auth,
    path: "/api/checkout", body: { total_amount: val, shipping_address: ADDR },
    tests: [
      "pm.test('tạo đơn thành công', () => pm.response.to.have.status(200));",
      ...docDon(
        "pm.expect(don.total_amount, 'backend phải tự tính lại từ giỏ (FR-08)').to.eql(200000)",
        "đơn ghi tổng giỏ chứ không phải số client gửi",
      ),
    ],
  })),
  // SQLite có TYPE AFFINITY: chuỗi trông giống số ("200000") và boolean được ép
  // về số khi ghi vào cột NUMERIC, nên chúng KHÔNG làm hỏng cột. Chỉ "abc" và
  // null mới thực sự lọt vào. Vì vậy chỉ hai case đó mới là case bắt lỗi.
  ...[
    ["TC-A2-006", 'chuỗi chữ "abc"', '"abc"', "BUG-A2-04"],
    ["TC-A2-007", 'chuỗi số "200000"', '"200000"', null],
    ["TC-A2-008", "boolean true", "true", null],
    ["TC-A2-010", "null", "null", "BUG-A2-04"],
    ["TC-A2-011", "số thực 200000.55", "200000.55", null],
    ["TC-A2-012", "ký hiệu khoa học 2e5", "2e5", null],
    ["TC-A2-013", "số tràn 1e308", "1e308", null],
  ].map(([id, ten, raw, bug]) => ({
    id, name: `total_amount sai kiểu — ${ten}`, axis: "domain", origin: "ai",
    ...(bug ? { knownBug: bug } : {}), headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", rawBody: `{"total_amount": ${raw}, "shipping_address": "${ADDR}"}`,
    tests: [
      "pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
      ...docDon(
        "pm.expect(don.total_amount, 'cột số tiền chỉ được chứa số ≥ 0').to.be.a('number').and.to.be.at.least(0)",
        "giá trị sai kiểu không được lọt vào cột số tiền",
      ),
    ],
  })),
  {
    id: "TC-A2-009", name: "Thiếu hẳn total_amount — backend tự tính thì vẫn phải thành công", axis: "domain", origin: "ai",
    knownBug: "BUG-A2-04",
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]), headers: auth,
    path: "/api/checkout", body: { shipping_address: ADDR },
    tests: [
      "pm.test('vẫn tạo được đơn', () => pm.response.to.have.status(200));",
      ...docDon("pm.expect(don.total_amount).to.eql(200000)", "đơn ghi tổng giỏ dù client không gửi số nào"),
    ],
  },

  // ── 2. PHÂN VÙNG MIỀN — shipping_address ────────────────────────────────
  {
    id: "TC-A2-014", name: "Địa chỉ hợp lệ", axis: "domain", origin: "ai",
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]), headers: auth,
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: ADDR },
    tests: [
      "pm.test('tạo đơn thành công', () => pm.response.to.have.status(200));",
      ...docDon(`pm.expect(don.shipping_address).to.eql(${JSON.stringify(ADDR)})`, "địa chỉ lưu đúng nguyên văn"),
    ],
  },
  ...[
    ["TC-A2-015", "rỗng", '""'],
    ["TC-A2-016", "chỉ có khoảng trắng", '"     "'],
    ["TC-A2-021", "sai kiểu — số", "12345"],
    ["TC-A2-022", "null", "null"],
  ].map(([id, ten, raw]) => ({
    id, name: `Địa chỉ ${ten} — đặc tả im lặng nên chỉ khẳng định không sập`, axis: "domain", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", rawBody: `{"total_amount": 200000, "shipping_address": ${raw}}`,
    tests: [
      "// Audit: AI đòi 400, nhưng FR-08 KHÔNG hề nói trường này bắt buộc.",
      "// Hạ xuống mức khẳng định robustness; chuyện bắt buộc ghi ở mục khuyến nghị.",
      "pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
    ],
  })),
  {
    id: "TC-A2-017", name: "Thiếu hẳn trường shipping_address", axis: "domain", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", body: { total_amount: 200000 },
    tests: ["pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));"],
  },
  {
    id: "TC-A2-018", name: "Địa chỉ 5 000 ký tự — phải lưu nguyên độ dài", axis: "boundary", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", rawBody: JSON.stringify({ total_amount: 200000, shipping_address: "a".repeat(5000) }),
    tests: [
      "pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
      ...docDon("pm.expect(don.shipping_address.length).to.eql(5000)", "địa chỉ không bị cắt bớt âm thầm"),
    ],
  },
  {
    id: "TC-A2-019", name: "Địa chỉ có dấu tiếng Việt — không được vỡ mã hóa", axis: "domain", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: "số 5, đường Nguyễn Huệ, Quận 1" },
    tests: [...docDon("pm.expect(don.shipping_address).to.eql('số 5, đường Nguyễn Huệ, Quận 1')", "dấu tiếng Việt nguyên vẹn")],
  },
  {
    id: "TC-A2-020", name: "Địa chỉ có emoji — ký tự ngoài BMP", axis: "domain", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: "123 Le Loi 🏠" },
    tests: [...docDon("pm.expect(don.shipping_address).to.include('🏠')", "emoji không bị cắt theo byte")],
  },
  {
    id: "TC-A2-023", name: "Địa chỉ nhiều dòng — giữ nguyên ký tự xuống dòng", axis: "domain", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 2 }]),
    path: "/api/checkout", rawBody: JSON.stringify({ total_amount: 200000, shipping_address: "123 Le Loi\n\n\nQ1" }),
    tests: [...docDon("pm.expect(don.shipping_address).to.include('\\n')", "ký tự xuống dòng được giữ")],
  },

  // ── 3. GIÁ TRỊ BIÊN (trên GIỎ HÀNG, vì tổng là hàm của giỏ) ─────────────
  {
    // KHÔNG đánh dấu knownBug: ở case này con số client gửi TRÙNG với tổng giỏ,
    // nên dù backend lấy nhầm nguồn thì kết quả vẫn đúng — không phân biệt được.
    id: "TC-A2-024", name: "Giỏ tối thiểu — 1 sản phẩm, số lượng 1", axis: "boundary", origin: "ai",
    headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.total_amount).to.eql(100000)", "đơn = 1 × 100 000")],
  },
  {
    id: "TC-A2-025", name: "Số lượng 0 trong giỏ → tổng đơn phải là 0", axis: "boundary", origin: "ai",
    knownBug: "BUG-A2-01", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 0 }]),
    path: "/api/checkout", body: { total_amount: 999999, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.total_amount).to.eql(0)", "tổng tính từ giỏ, không lấy số client gửi")],
  },
  {
    id: "TC-A2-026", name: "Số lượng âm trong giỏ → tổng đơn không được âm", axis: "boundary", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: -5 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "// Audit: đổi oracle từ 'checkout trả 400' sang 'tổng đơn không âm'.",
      "// Ràng buộc số lượng thuộc endpoint giỏ hàng, không thuộc checkout.",
      ...docDon("pm.expect(don.total_amount).to.be.at.least(0)", "không tạo được đơn có tổng âm"),
    ],
  },
  {
    id: "TC-A2-027", name: "Số lượng rất lớn — kiểm tràn số", axis: "boundary", origin: "ai",
    knownBug: "BUG-A2-01", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1000000 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.total_amount).to.eql(100000000000)", "tổng = 100 000 × 1 000 000, không tràn")],
  },
  {
    id: "TC-A2-029", name: "Giỏ nhiều dòng — tổng phải là tổng cả ba", axis: "boundary", origin: "ai",
    knownBug: "BUG-A2-01", headers: auth,
    prereq: napGio([
      { id: 1, name: "A", price: 100000, quantity: 1 },
      { id: 2, name: "B", price: 250000, quantity: 2 },
      { id: 3, name: "C", price: 50000, quantity: 3 },
    ]),
    path: "/api/checkout", body: { total_amount: 1, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.total_amount).to.eql(750000)", "tổng = 100k + 500k + 150k")],
  },
  {
    id: "TC-A2-030", name: "Địa chỉ 1 ký tự", axis: "boundary", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: "a" },
    tests: ["pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));"],
  },

  // ── 4. CHUYỂN TRẠNG THÁI VÀ HỆ QUẢ SAU GHI ──────────────────────────────
  {
    id: "TC-A2-031", name: "Đơn mới phải ở trạng thái pending — điểm vào FR-10", axis: "state", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.status).to.eql('pending')", "trạng thái khởi tạo là pending")],
  },
  {
    id: "TC-A2-032", name: "Giỏ hàng phải bị xóa sau khi thanh toán (D4)", axis: "state", origin: "ai",
    knownBug: "BUG-A2-02", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/cart',",
      "  header: { 'Authorization': 'Bearer ' + pm.environment.get('token'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('giỏ hàng rỗng sau khi thanh toán', () =>",
      "  pm.expect(res.json()).to.be.an('array').that.is.empty));",
    ],
  },
  {
    id: "TC-A2-033", name: "Giỏ RỖNG thì không được tạo đơn", axis: "state", origin: "ai",
    knownBug: "BUG-A2-03",
    prereq: userMoi(), // tài khoản mới -> giỏ chắc chắn rỗng
    headers: { Authorization: "Bearer {{coToken}}" },
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: ADDR },
    tests: ["pm.test('phải từ chối vì không có gì để đặt', () => pm.expect(pm.response.code).to.be.oneOf([400, 422]));"],
  },
  {
    id: "TC-A2-035", name: "Đơn phải nằm trong lịch sử của đúng người dùng", axis: "state", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "const oid = pm.response.json().orderId;",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/my-orders',",
      "  header: { 'Authorization': 'Bearer ' + pm.environment.get('token'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => {",
      "  const ds = res.json();",
      "  pm.test('đơn mới có trong my-orders', () => pm.expect(ds.map(o => o.id)).to.include(oid));",
      "  pm.test('my-orders chỉ chứa đơn của chính mình', () =>",
      "    pm.expect([...new Set(ds.map(o => o.user_id))]).to.eql([Number(pm.environment.get('userId'))]));",
      "});",
    ],
  },
  {
    id: "TC-A2-037", name: "Thêm cùng sản phẩm hai lần — tổng không được nhân đôi nhầm", axis: "state", origin: "ai",
    knownBug: "BUG-A2-01", headers: auth,
    prereq: napGio([
      { id: 1, name: "iPhone", price: 100000, quantity: 1 },
      { id: 1, name: "iPhone", price: 100000, quantity: 1 },
    ]),
    path: "/api/checkout", body: { total_amount: 1, shipping_address: ADDR },
    tests: [...docDon("pm.expect(don.total_amount).to.eql(200000)", "tổng = 2 × 100 000 (FR-07 gộp dòng)")],
  },
  {
    id: "TC-A2-039", name: "Đơn phải xuất hiện ở danh sách phía admin", axis: "state", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "// Audit bổ sung tiền đề: cần token admin, lấy từ folder Setup của API 1.",
      "const oid = pm.response.json().orderId;",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/admin/orders',",
      "  header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('admin nhìn thấy đơn mới', () =>",
      "  pm.expect(res.json().map(o => o.id)).to.include(oid)));",
    ],
  },

  // ── 5. BẢO MẬT ──────────────────────────────────────────────────────────
  ...[
    ["TC-A2-040", "không có header Authorization", null],
    ["TC-A2-041", "token sai định dạng", "Bearer abc.def"],
    ["TC-A2-042", "token đúng cấu trúc nhưng sai chữ ký", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.chuKySAI"],
    ["TC-A2-043", "header Authorization rỗng", ""],
    ["TC-A2-044", "thiếu tiền tố Bearer", "{{token}}"],
  ].map(([id, ten, hdr]) => ({
    id, name: `SEC-02 — ${ten}`, axis: "security", origin: "ai",
    headers: hdr === null ? {} : { Authorization: hdr },
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: ADDR },
    tests: [
      "pm.test('phải từ chối', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
      "pm.test('không tạo ra đơn hàng nào', () => pm.expect(pm.response.text()).to.not.include('orderId'));",
    ],
  })),
  ...[
    ["TC-A2-045", "user_id của người khác", '"user_id": 1'],
    ["TC-A2-046", "status delivered", '"status": "delivered"'],
    ["TC-A2-047", "id đơn hàng tự chọn", '"id": 999999'],
  ].map(([id, ten, extra]) => ({
    id, name: `Mass assignment — client tự đặt ${ten}`, axis: "security", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout",
    rawBody: `{"total_amount": 100000, "shipping_address": "${ADDR}", ${extra}}`,
    tests: [
      "pm.test('tạo đơn thành công', () => pm.response.to.have.status(200));",
      ...docDon(
        "pm.expect(don.status, 'trạng thái do server quyết định').to.eql('pending'); " +
          "pm.expect(don.user_id, 'chủ đơn là chủ token').to.eql(Number(pm.environment.get('userId')))",
        "trường thuộc quyền server không bị client ghi đè",
      ),
    ],
  })),
  {
    id: "TC-A2-048", name: "SQL injection trong shipping_address", axis: "security", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout",
    rawBody: JSON.stringify({ total_amount: 100000, shipping_address: "', 'x'); DROP TABLE orders;--" }),
    tests: [
      "pm.test('không sập', () => pm.expect(pm.response.code).to.be.below(500));",
      ...docDon("pm.expect(don.shipping_address).to.include('DROP TABLE')", "chuỗi lưu nguyên văn, không được thực thi"),
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/1',",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('bảng orders vẫn còn', () => pm.expect(res.code).to.not.eql(500)));",
    ],
  },
  {
    id: "TC-A2-049", name: "SEC-04 — payload XSS lưu nguyên văn, response là JSON", axis: "security", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout",
    body: { total_amount: 100000, shipping_address: "<script>alert(1)</script>" },
    tests: [
      "// Audit chốt lại: escape là việc của tầng hiển thị (SEC-04). Ở tầng API chỉ",
      "// khẳng định response là JSON hợp lệ và chuỗi được lưu nguyên vẹn.",
      "pm.test('Content-Type là JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
      ...docDon("pm.expect(don.shipping_address).to.eql('<script>alert(1)</script>')", "chuỗi lưu nguyên văn"),
    ],
  },
  {
    id: "TC-A2-050", name: "IDOR — đọc đơn hàng mà không cần token", axis: "security", origin: "ai",
    knownBug: "BUG-A2-05", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "const oid = pm.response.json().orderId;",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/' + oid,",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }", // cố tình KHÔNG gửi token
      "}, (err, res) => pm.test('đọc đơn mà không có token phải bị chặn', () =>",
      "  pm.expect(res.code).to.be.oneOf([401, 403])));",
    ],
  },

  // ── 6. SCHEMA & HTTP ────────────────────────────────────────────────────
  {
    id: "TC-A2-052", name: "Response 200 khớp schema", axis: "schema", origin: "ai",
    headers: auth, prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "pm.test('khớp schema {message, orderId}', () => pm.response.to.have.jsonSchema({",
      "  type: 'object', required: ['message', 'orderId'],",
      "  properties: { message: { type: 'string' }, orderId: { type: 'integer', minimum: 1 } }",
      "}));",
    ],
  },
  {
    id: "TC-A2-053", name: "Đơn hàng khớp schema — total_amount là số ≥ 0", axis: "schema", origin: "ai",
    knownBug: "BUG-A2-04", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", rawBody: `{"total_amount": "abc", "shipping_address": "${ADDR}"}`,
    tests: [
      "const oid = pm.response.json().orderId;",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/' + oid,",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('đơn hàng khớp schema', () => {",
      "  const don = res.json();",
      "  pm.expect(don.total_amount, 'cột số tiền').to.be.a('number');",
      "  pm.expect(don.status).to.be.oneOf(['pending','confirmed','shipping','delivered','canceled']);",
      "}));",
    ],
  },
  {
    id: "TC-A2-056", name: "Sai method GET /api/checkout", axis: "schema", origin: "ai",
    method: "GET", path: "/api/checkout", headers: auth,
    tests: ["pm.test('trả 404 hoặc 405', () => pm.expect(pm.response.code).to.be.oneOf([404, 405]));"],
  },
  {
    id: "TC-A2-057", name: "Sai method PUT /api/checkout", axis: "schema", origin: "ai",
    method: "PUT", path: "/api/checkout", headers: auth,
    tests: ["pm.test('trả 404 hoặc 405', () => pm.expect(pm.response.code).to.be.oneOf([404, 405]));"],
  },
  {
    id: "TC-A2-058", name: "Body JSON hỏng", axis: "schema", origin: "ai",
    headers: auth, path: "/api/checkout", rawBody: '{"total_amount":',
    tests: ["pm.test('trả 400', () => pm.response.to.have.status(400));"],
  },

  // ── 7. TỰ BỔ SUNG (bước 3) ──────────────────────────────────────────────
  {
    id: "TC-A2-E01", name: "Thanh toán 5 lần đồng thời chỉ được sinh 1 đơn", axis: "extended", origin: "human",
    knownBug: "BUG-A2-06",
    prereq: [
      ...userMoi([
        "  // Nạp giỏ rồi bắn 4 request thanh toán SONG SONG; request chính là cái thứ 5.",
        "  pm.sendRequest({",
        "    url: pm.environment.get('baseUrl') + '/api/cart', method: 'POST',",
        "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
        "              'Authorization': 'Bearer ' + r.json().token },",
        "    body: { mode: 'raw', raw: JSON.stringify({ id: 1, name: 'iPhone', price: 100000, quantity: 2 }) }",
        "  }, () => { for (let k = 0; k < 4; k++) pm.sendRequest({",
        "    url: pm.environment.get('baseUrl') + '/api/checkout', method: 'POST',",
        "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
        "              'Authorization': 'Bearer ' + r.json().token },",
        "    body: { mode: 'raw', raw: JSON.stringify({ total_amount: 200000, shipping_address: '123 Le Loi' }) }",
        "  }, () => {}); });",
      ]),
    ],
    headers: { Authorization: "Bearer {{coToken}}" },
    path: "/api/checkout", body: { total_amount: 200000, shipping_address: ADDR },
    tests: [
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/my-orders',",
      "  header: { 'Authorization': 'Bearer ' + pm.variables.get('coToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('cùng một giỏ hàng chỉ được sinh ra 1 đơn (thực tế: ' + res.json().length + ')', () =>",
      "  pm.expect(res.json().length).to.eql(1)));",
    ],
  },
  {
    id: "TC-A2-E02", name: "Không duyệt tuần tự được đơn hàng của người khác", axis: "extended", origin: "human",
    knownBug: "BUG-A2-05", headers: auth,
    prereq: napGio([{ id: 1, name: "iPhone", price: 100000, quantity: 1 }]),
    path: "/api/checkout", body: { total_amount: 100000, shipping_address: ADDR },
    tests: [
      "// Duyệt từ id 1 tới id của đơn vừa tạo, KHÔNG gửi token nào.",
      "const oid = pm.response.json().orderId;",
      "let doc = 0, xong = 0;",
      "const n = Math.min(oid, 5);",
      "for (let i = 1; i <= n; i++) pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/' + i,",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => {",
      "  if (res && res.code === 200 && res.json().shipping_address) doc++;",
      "  if (++xong === n) pm.test('không đơn nào bị lộ khi duyệt tuần tự (lộ ' + doc + '/' + n + ')', () =>",
      "    pm.expect(doc).to.eql(0));",
      "});",
    ],
  },
  {
    id: "TC-A2-E03", name: "Token của tài khoản đã bị xóa không được đặt hàng", axis: "extended", origin: "human",
    knownBug: "BUG-A2-07",
    prereq: userMoi([
      "  // Xoá luôn tài khoản vừa tạo bằng quyền admin, giữ lại token cũ.",
      "  pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/admin/users/' + r.json().user.id, method: 'DELETE',",
      "    header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "  }, () => {});",
    ]),
    headers: { Authorization: "Bearer {{coToken}}" },
    path: "/api/checkout", body: { total_amount: 9999, shipping_address: "nowhere" },
    tests: [
      "pm.test('token của tài khoản đã xóa phải bị từ chối', () =>",
      "  pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
    ],
  },
  {
    id: "TC-A2-E04", name: "Không được tồn tại đơn hàng mồ côi (khóa ngoại)", axis: "extended", origin: "human",
    knownBug: "BUG-A2-08",
    prereq: userMoi([
      "  pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/admin/users/' + r.json().user.id, method: 'DELETE',",
      "    header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "  }, () => {});",
    ]),
    headers: { Authorization: "Bearer {{coToken}}" },
    path: "/api/checkout", body: { total_amount: 9999, shipping_address: "nowhere" },
    tests: [
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/admin/orders',",
      "  header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => {",
      "  const moCoi = res.json().filter(o => o.user_name === null);",
      "  pm.test('không có đơn nào trỏ tới người dùng không tồn tại (thấy ' + moCoi.length + ')', () =>",
      "    pm.expect(moCoi.length).to.eql(0));",
      "});",
    ],
  },
  {
    id: "TC-A2-E05", name: "Tài khoản đang bị khóa không được đặt hàng bằng token cũ", axis: "extended", origin: "human",
    knownBug: "BUG-A2-09",
    prereq: userMoi([
      "  // Lấy token xong mới khoá tài khoản: sai mật khẩu liên tiếp cho tới khi khoá.",
      "  let d = 0;",
      "  const sai = () => pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "    body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'SaiRoi000!' }) }",
      "  }, () => { if (++d < 3) sai(); });",
      "  sai();",
    ]),
    headers: { Authorization: "Bearer {{coToken}}" },
    path: "/api/checkout", body: { total_amount: 1, shipping_address: ADDR },
    tests: [
      "pm.test('tài khoản bị khóa thì token cũ cũng phải mất hiệu lực', () =>",
      "  pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
    ],
  },
];
