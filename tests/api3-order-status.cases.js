/**
 * API 3 — PUT /api/admin/orders/:id/status (Pool C, FR-18)
 *
 * Bảng test case sau khi THẨM ĐỊNH — xem docs/api3/Audit.md.
 *
 * LƯU Ý VỀ MA TRẬN 25 Ô: nhóm chuyển trạng thái KHÔNG nằm trong file này.
 * Nó được chạy data-driven bằng `data/api3-transitions.csv` qua collection
 * riêng `EShop-API3-Transitions` — xem scripts/build-collection.js. Lý do:
 * 25 ô cùng một kịch bản, chỉ khác dữ liệu, nên một request lặp qua 25 dòng
 * dữ liệu gọn hơn và dễ soát hơn 25 request chép đi chép lại.
 */

const admin = { Authorization: "Bearer {{adminToken}}" };
const user = { Authorization: "Bearer {{token}}" };

/** Tạo một đơn mới (luôn ở pending) bằng token user thường, lưu id vào {{donId}}. */
const taoDon = (extra = []) => [
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/checkout', method: 'POST',",
  "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
  "            'Authorization': 'Bearer ' + pm.environment.get('token') },",
  "  body: { mode: 'raw', raw: JSON.stringify({ total_amount: 1000, shipping_address: '123 Le Loi' }) }",
  "}, (err, res) => {",
  "  pm.variables.set('donId', res.json().orderId);",
  ...extra,
  "});",
];

/** Đẩy đơn vừa tạo qua một chuỗi trạng thái bằng quyền admin (dùng trong pre-request). */
const daySang = (chuoi) => [
  `  const chuoi = ${JSON.stringify(chuoi)};`,
  "  let k = 0;",
  "  const buoc = () => k >= chuoi.length ? null : pm.sendRequest({",
  "    url: pm.environment.get('baseUrl') + '/api/admin/orders/' + res.json().orderId + '/status',",
  "    method: 'PUT',",
  "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
  "              'Authorization': 'Bearer ' + pm.environment.get('adminToken') },",
  "    body: { mode: 'raw', raw: JSON.stringify({ status: chuoi[k] }) }",
  "  }, () => { k++; buoc(); });",
  "  buoc();",
];

/** Đọc lại đơn rồi khẳng định trạng thái của nó. */
const trangThaiPhaiLa = (tt) => [
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/orders/' + pm.variables.get('donId'),",
  "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
  `}, (err, res) => pm.test('trạng thái đơn phải là ${tt}', () =>`,
  `  pm.expect(res.json().status).to.eql('${tt}')));`,
];

module.exports = [
  // ── 0. SETUP ────────────────────────────────────────────────────────────
  {
    id: "SETUP-A3", name: "Nạp token admin và token user thường", axis: "setup", origin: "human",
    path: "/api/login", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    tests: [
      "pm.test('đăng nhập admin thành công', () => pm.response.to.have.status(200));",
      "pm.environment.set('adminToken', pm.response.json().token);",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: pm.environment.get('userEmail'), password: pm.environment.get('userPassword') }) }",
      "}, (err, res) => {",
      "  pm.environment.set('token', res.json().token);",
      "  pm.environment.set('userId', res.json().user.id);",
      "});",
    ],
  },

  // ── 1. PHÂN VÙNG MIỀN — status ──────────────────────────────────────────
  {
    id: "TC-A3-001", name: "status hợp lệ — pending → confirmed", axis: "domain", origin: "ai",
    prereq: taoDon(), headers: admin,
    path: "/api/admin/orders/{{donId}}/status", method: "PUT", body: { status: "confirmed" },
    tests: [
      "pm.test('chuyển đổi hợp lệ được chấp nhận', () => pm.response.to.have.status(200));",
      ...trangThaiPhaiLa("confirmed"),
    ],
  },
  {
    id: "TC-A3-002", name: "status hợp lệ — pending → canceled", axis: "domain", origin: "ai",
    prereq: taoDon(), headers: admin,
    path: "/api/admin/orders/{{donId}}/status", method: "PUT", body: { status: "canceled" },
    tests: [
      "pm.test('hủy đơn đang chờ được chấp nhận', () => pm.response.to.have.status(200));",
      ...trangThaiPhaiLa("canceled"),
    ],
  },
  ...[
    ["TC-A3-003", "ngoài enum", '"shipped"'],
    ["TC-A3-004", "sai hoa/thường", '"CONFIRMED"'],
    ["TC-A3-005", "thừa khoảng trắng", '" confirmed "'],
    ["TC-A3-006", "chuỗi rỗng", '""'],
    ["TC-A3-008", "null", "null"],
    ["TC-A3-009", "sai kiểu — số", "123"],
    ["TC-A3-010", "mảng", '["confirmed"]'],
  ].map(([id, ten, raw]) => ({
    id, name: `status không hợp lệ — ${ten}`, axis: "domain", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", rawBody: `{"status": ${raw}}`,
    tests: [
      "pm.test('bị từ chối', () => pm.response.to.have.status(400));",
      ...trangThaiPhaiLa("pending"),
    ],
  })),
  {
    id: "TC-A3-007", name: "status không hợp lệ — thiếu hẳn trường", axis: "domain", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", rawBody: "{}",
    tests: ["pm.test('bị từ chối', () => pm.response.to.have.status(400));", ...trangThaiPhaiLa("pending")],
  },

  // ── 2. PHÂN VÙNG MIỀN + BIÊN trên :id ───────────────────────────────────
  {
    id: "TC-A3-011", name: ":id của đơn có thật", axis: "domain", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: ["pm.test('chấp nhận', () => pm.response.to.have.status(200));"],
  },
  // Audit gộp TC-A3-019 (trùng hoàn toàn) vào TC-A3-014.
  ...[
    ["TC-A3-012", "không tồn tại", "999999"],
    ["TC-A3-013", "không phải số", "abc"],
    ["TC-A3-014", "bằng 0 (gộp cả TC-A3-019)", "0"],
    ["TC-A3-015", "số âm", "-1"],
    ["TC-A3-016", "số thực", "1.5"],
    ["TC-A3-017", "chuỗi SQL injection", "1%20OR%201=1"],
    ["TC-A3-020", "số nguyên lớn nhất an toàn", "9007199254740991"],
    ["TC-A3-021", "vượt giới hạn số nguyên", "99999999999999999999"],
  ].map(([id, ten, val]) => ({
    id, name: `:id ${ten}`, axis: "boundary", origin: "ai",
    headers: admin, method: "PUT",
    path: `/api/admin/orders/${val}/status`, body: { status: "confirmed" },
    tests: [
      "pm.test('trả 404', () => pm.response.to.have.status(404));",
      "pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
    ],
  })),
  {
    id: "TC-A3-018", name: ":id biên dưới — đơn tự tạo trong tiền đề", axis: "boundary", origin: "ai",
    // Audit: bỏ oracle có điều kiện "200 nếu tồn tại", tự tạo đơn để luôn xác định.
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: ["pm.test('đơn tự tạo luôn tồn tại nên phải 200', () => pm.response.to.have.status(200));"],
  },
  {
    id: "TC-A3-022", name: ":id rỗng — /orders//status", axis: "boundary", origin: "ai",
    headers: admin, method: "PUT", path: "/api/admin/orders//status", body: { status: "confirmed" },
    tests: ["pm.test('trả 404', () => pm.response.to.have.status(404));"],
  },

  // ── 3. BẢO MẬT ──────────────────────────────────────────────────────────
  {
    id: "TC-A3-023", name: "SEC-02 — không có header Authorization", axis: "security", origin: "ai",
    prereq: taoDon(), headers: {}, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: ["pm.test('trả 401', () => pm.response.to.have.status(401));", ...trangThaiPhaiLa("pending")],
  },
  {
    id: "TC-A3-024", name: "SEC-02 — token sai chữ ký", axis: "security", origin: "ai",
    prereq: taoDon(), method: "PUT",
    headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.chuKyGiaMao" },
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "pm.test('bị từ chối', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
      ...trangThaiPhaiLa("pending"),
    ],
  },
  {
    id: "TC-A3-025", name: "SEC-02 — token không có hạn dùng (thay cho case token hết hạn)", axis: "security", origin: "ai",
    // Audit: case gốc "token hết hạn" không dựng nổi đầu vào (phải biết khóa bí mật),
    // và hệ thống này không phát hành token có exp. Chuyển sang kiểm chính điều đó.
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    knownBug: "BUG-A1-04",
    tests: [
      "const p = JSON.parse(atob(pm.environment.get('adminToken').split('.')[1]));",
      "pm.test('token admin phải có hạn dùng', () => pm.expect(p).to.have.property('exp'));",
    ],
  },
  {
    id: "TC-A3-026", name: "SEC-02 — thiếu tiền tố Bearer", axis: "security", origin: "ai",
    prereq: taoDon(), headers: { Authorization: "{{adminToken}}" }, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: ["pm.test('bị từ chối', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));"],
  },
  {
    id: "TC-A3-027", name: "SEC-03 — token USER THƯỜNG phải bị chặn (case quan trọng nhất)", axis: "security", origin: "ai",
    knownBug: "BUG-A3-01",
    prereq: taoDon(), headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "pm.test('FR-12: API admin phải kiểm role, không chỉ kiểm token', () =>",
      "  pm.response.to.have.status(403));",
      ...trangThaiPhaiLa("pending"),
    ],
  },
  {
    id: "TC-A3-028", name: "SEC-03 — token user + đơn của chính người đó vẫn phải bị chặn", axis: "security", origin: "ai",
    knownBug: "BUG-A3-01",
    prereq: taoDon(), headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "canceled" },
    tests: [
      "// Endpoint này thuộc nhóm admin, không phải nhóm 'chủ đơn tự thao tác'.",
      "// Muốn tự hủy thì đã có PUT /api/orders/:id/cancel riêng.",
      "pm.test('quyền sở hữu không thay thế được quyền admin', () => pm.response.to.have.status(403));",
    ],
  },
  {
    id: "TC-A3-029", name: "SEC-03 — user tự đánh dấu ĐÃ GIAO trên đơn đang shipping", axis: "security", origin: "ai",
    knownBug: "BUG-A3-01",
    // Audit: case gốc đi từ pending nên bị máy trạng thái chặn TRƯỚC khi tới bước kiểm role
    // -> test đúng vì lý do sai. Phải đưa đơn về shipping để chuyển đổi hợp lệ về trạng thái.
    prereq: taoDon(daySang(["confirmed", "shipping"])), headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "delivered" },
    tests: [
      "pm.test('khách hàng không được tự tuyên bố đã nhận hàng', () => pm.response.to.have.status(403));",
      ...trangThaiPhaiLa("shipping"),
    ],
  },
  {
    id: "TC-A3-030", name: "Mass assignment — body kèm role: admin", axis: "security", origin: "ai",
    knownBug: "BUG-A3-01",
    prereq: taoDon(), headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", rawBody: '{"status": "confirmed", "role": "admin"}',
    tests: ["pm.test('trường role trong body không nâng được quyền', () => pm.response.to.have.status(403));"],
  },
  {
    id: "TC-A3-031", name: "JWT sửa role thành admin mà không ký lại", axis: "security", origin: "ai",
    prereq: [
      ...taoDon(),
      "// Lấy token user rồi đổi payload role thành admin, GIỮ NGUYÊN chữ ký cũ.",
      "const t = pm.environment.get('token').split('.');",
      "const p = JSON.parse(atob(t[1]));",
      "p.role = 'admin';",
      "const gia = btoa(JSON.stringify(p)).replace(/=+$/, '').replace(/\\+/g, '-').replace(/\\//g, '_');",
      "pm.variables.set('tokenGiaMao', t[0] + '.' + gia + '.' + t[2]);",
    ],
    headers: { Authorization: "Bearer {{tokenGiaMao}}" }, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "pm.test('chữ ký phải phát hiện payload bị sửa', () =>",
      "  pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
    ],
  },
  {
    id: "TC-A3-032", name: "SEC-05 — SQL injection trong status", axis: "security", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status",
    rawBody: JSON.stringify({ status: "confirmed'; UPDATE orders SET status='delivered'--" }),
    tests: [
      "pm.test('bị từ chối vì không thuộc enum', () => pm.response.to.have.status(400));",
      "// Đếm TOÀN BỘ đơn delivered là sai: các case khác trong bộ cũng tạo ra đơn",
      "// delivered một cách hợp lệ. Chỉ được khẳng định trên chính đơn đang thử.",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/' + pm.variables.get('donId'),",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('đơn đang thử không bị injection làm đổi trạng thái', () =>",
      "  pm.expect(res.json().status).to.eql('pending')));",
    ],
  },
  {
    id: "TC-A3-034", name: "Hai chuyển đổi mâu thuẫn đồng thời không được cùng thành công", axis: "security", origin: "ai",
    knownBug: "BUG-A3-03",
    // Audit chốt lại oracle: bản gốc nói "đơn không rơi vào trạng thái vô lý" — không đo được.
    // KHÔNG dựng ở pre-request: Postman CHỜ mọi callback của pre-request xong mới
    // gửi request chính, nên hai lệnh sẽ chạy TUẦN TỰ chứ không đồng thời — và
    // test sẽ pass vì lý do sai. Phải bắn cả hai lệnh trong cùng một test script,
    // không chờ nhau, mới tạo được tranh chấp thật.
    prereq: taoDon(),
    headers: admin, method: "GET", path: "/api/orders/{{donId}}",
    tests: [
      "const base = pm.environment.get('baseUrl');",
      "const sid = pm.environment.get('studentId');",
      "const id = pm.variables.get('donId');",
      "const h = { 'Content-Type': 'application/json', 'X-Student-Id': sid,",
      "            'Authorization': 'Bearer ' + pm.environment.get('adminToken') };",
      "const ma = {};",
      "let xong = 0;",
      "const check = () => {",
      "  if (++xong < 2) return;",
      "  pm.test('hai chuyển đổi mâu thuẫn không được cùng trả 200 (confirmed=' + ma.confirmed + ', canceled=' + ma.canceled + ')', () =>",
      "    pm.expect(ma.confirmed === 200 && ma.canceled === 200).to.be.false);",
      "};",
      "['confirmed', 'canceled'].forEach(s => pm.sendRequest({",
      "  url: base + '/api/admin/orders/' + id + '/status', method: 'PUT', header: h,",
      "  body: { mode: 'raw', raw: JSON.stringify({ status: s }) }",
      "}, (e, r) => { ma[s] = r && r.code; check(); }));",
    ],
  },

  // ── 4. SCHEMA & HTTP ────────────────────────────────────────────────────
  {
    id: "TC-A3-035", name: "Response 200 khớp schema", axis: "schema", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "pm.test('khớp schema {message}', () => pm.response.to.have.jsonSchema({",
      "  type: 'object', required: ['message'], properties: { message: { type: 'string' } } }));",
    ],
  },
  {
    id: "TC-A3-036", name: "Response lỗi chuyển đổi sai phải là JSON", axis: "schema", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "delivered" },
    tests: [
      "pm.test('trả 400', () => pm.response.to.have.status(400));",
      "pm.test('Content-Type là JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
      "pm.test('có trường mô tả lỗi', () => pm.expect(pm.response.json()).to.have.property('error'));",
    ],
  },
  {
    id: "TC-A3-037", name: "Trạng thái đơn sau khi đổi vẫn thuộc enum", axis: "schema", origin: "ai",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/orders/' + pm.variables.get('donId'),",
      "  header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => pm.test('status thuộc đúng 5 giá trị', () =>",
      "  pm.expect(res.json().status).to.be.oneOf(['pending','confirmed','shipping','delivered','canceled'])));",
    ],
  },
  ...[
    ["TC-A3-038", "GET"],
    ["TC-A3-039", "POST"],
    ["TC-A3-040", "DELETE"],
  ].map(([id, m]) => ({
    id, name: `Sai method — ${m}`, axis: "schema", origin: "ai",
    prereq: taoDon(), headers: admin, method: m,
    path: "/api/admin/orders/{{donId}}/status",
    tests: ["pm.test('trả 404 hoặc 405', () => pm.expect(pm.response.code).to.be.oneOf([404, 405]));"],
  })),
  {
    id: "TC-A3-041", name: "Body JSON hỏng", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-06",
    prereq: taoDon(), headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", rawBody: '{"status":',
    tests: [
      "pm.test('trả 400', () => pm.response.to.have.status(400));",
      "pm.test('thân là JSON chứ không phải HTML', () =>",
      "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
    ],
  },
  {
    id: "TC-A3-042", name: "Content-Type: text/plain", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-05",
    prereq: taoDon(), headers: admin, method: "PUT", contentType: "text/plain",
    path: "/api/admin/orders/{{donId}}/status", rawBody: '{"status":"confirmed"}',
    tests: ["pm.test('trả 400 hoặc 415, không được 500', () => pm.expect(pm.response.code).to.be.oneOf([400, 415]));"],
  },

  // ── 5. TỰ BỔ SUNG (bước 3) ──────────────────────────────────────────────
  {
    id: "TC-A3-E01", name: "FR-12 áp cho TOÀN BỘ /api/admin/* — kiểm cả họ, không chỉ một endpoint", axis: "extended", origin: "human",
    knownBug: "BUG-A3-04",
    headers: user, method: "GET", path: "/api/admin/users",
    tests: [
      "// FR-12 phát biểu 'TAT CA cac API Admin' — ràng buộc dạng 'với mọi', nên phải",
      "// kiểm trên cả tập, không phải trên một phần tử.",
      "pm.test('GET /api/admin/users phải chặn user thường', () => pm.response.to.have.status(403));",
      "const con = [",
      "  ['GET', '/api/admin/orders', null],",
      "  ['POST', '/api/admin/coupons', { code: 'HW06CHK', type: 'percent', discount_value: 99, min_order_amount: 0, expired_at: '2099-01-01', max_uses_per_user: 1 }],",
      "  ['POST', '/api/admin/import-products', { products: [{ name: 'X', price: 1, description: '', imageUrl: '', category_id: 1 }] }],",
      "  ['DELETE', '/api/admin/users/999999', null],",
      "];",
      "let xong = 0, lot = [];",
      "con.forEach(([m, p, b]) => pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + p, method: m,",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
      "            'Authorization': 'Bearer ' + pm.environment.get('token') },",
      "  ...(b ? { body: { mode: 'raw', raw: JSON.stringify(b) } } : {})",
      "}, (err, res) => {",
      "  if (res && res.code === 200) lot.push(m + ' ' + p);",
      "  if (++xong === con.length) pm.test('không endpoint admin nào lọt (lọt: ' + (lot.join(', ') || 'không') + ')', () =>",
      "    pm.expect(lot.length).to.eql(0));",
      "}));",
    ],
  },
  {
    id: "TC-A3-E02", name: "Người dùng lạ không được hủy đơn của người khác", axis: "extended", origin: "human",
    knownBug: "BUG-A3-05",
    prereq: [
      ...taoDon(),
      "// Tạo một tài khoản HOÀN TOÀN XA LẠ, không liên quan gì tới đơn hàng trên.",
      "const email = 'la-' + Date.now() + '@hw06.local';",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/register', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ name: 'Nguoi La', email: email, password: 'Test1234!' }) }",
      "}, () => pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'Test1234!' }) }",
      "}, (e, r) => pm.variables.set('tokenNguoiLa', r.json().token)));",
    ],
    headers: { Authorization: "Bearer {{tokenNguoiLa}}" }, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "canceled" },
    tests: [
      "pm.test('người lạ không được đụng vào đơn của người khác', () =>",
      "  pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
      ...trangThaiPhaiLa("pending"),
    ],
  },
  {
    id: "TC-A3-E03", name: "Khách hàng không được tự đẩy đơn của mình tới delivered", axis: "extended", origin: "human",
    knownBug: "BUG-A3-01",
    prereq: taoDon(),
    headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "confirmed" },
    tests: [
      "// Nếu bước đầu đã bị chặn thì cả vòng đời an toàn. Nếu lọt, thử luôn hai bước sau.",
      "if (pm.response.code !== 200) {",
      "  pm.test('khách không tự xác nhận được đơn', () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));",
      "} else {",
      "  const id = pm.variables.get('donId');",
      "  const b = (s, cb) => pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/admin/orders/' + id + '/status', method: 'PUT',",
      "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
      "              'Authorization': 'Bearer ' + pm.environment.get('token') },",
      "    body: { mode: 'raw', raw: JSON.stringify({ status: s }) } }, cb);",
      "  b('shipping', () => b('delivered', () => pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/orders/' + id,",
      "    header: { 'X-Student-Id': pm.environment.get('studentId') }",
      "  }, (e, r) => pm.test('khách không được tự đẩy đơn tới delivered (thực tế: ' + r.json().status + ')', () =>",
      "    pm.expect(r.json().status).to.not.eql('delivered')))));",
      "}",
    ],
  },
  {
    id: "TC-A3-E04", name: "Đơn đã hủy không được sống lại thành delivered", axis: "extended", origin: "human",
    knownBug: "BUG-A3-02",
    prereq: taoDon(daySang(["canceled"])),
    headers: admin, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "delivered" },
    tests: [
      "pm.test('canceled là trạng thái kết thúc (FR-10)', () => pm.response.to.have.status(400));",
      ...trangThaiPhaiLa("canceled"),
    ],
  },
  {
    id: "TC-A3-E05", name: "Chuỗi ghép hai lỗi — khách tự ghi doanh thu vào dashboard", axis: "extended", origin: "human",
    knownBug: "BUG-A3-06",
    prereq: [
      "// Bước 1: khai thác BUG-A2-01 — tự khai đơn trị giá tùy ý.",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/checkout', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
      "            'Authorization': 'Bearer ' + pm.environment.get('token') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ total_amount: 999999999999, shipping_address: 'x' }) }",
      "}, (err, res) => {",
      "  const id = res.json().orderId;",
      "  pm.variables.set('donId', id);",
      "  // Bước 2: khai thác BUG-A3-01 — tự đẩy đơn qua confirmed, shipping.",
      "  const b = (s, cb) => pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/admin/orders/' + id + '/status', method: 'PUT',",
      "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId'),",
      "              'Authorization': 'Bearer ' + pm.environment.get('token') },",
      "    body: { mode: 'raw', raw: JSON.stringify({ status: s }) } }, cb);",
      "  b('confirmed', () => b('shipping', () => {}));",
      "});",
    ],
    headers: user, method: "PUT",
    path: "/api/admin/orders/{{donId}}/status", body: { status: "delivered" },
    tests: [
      "// Bước 3: đọc doanh thu theo cách FR-13 định nghĩa — tổng total_amount các đơn delivered.",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/admin/orders',",
      "  header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
      "}, (err, res) => {",
      "  const doanhThu = res.json().filter(o => o.status === 'delivered')",
      "    .reduce((s, o) => s + Number(o.total_amount || 0), 0);",
      "  pm.test('khách hàng không được tự ghi doanh thu vào hệ thống (doanh thu hiện tại: ' + doanhThu + ')', () =>",
      "    pm.expect(doanhThu).to.be.below(999999999999));",
      "});",
    ],
  },
];
