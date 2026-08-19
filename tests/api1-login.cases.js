/**
 * API 1 — POST /api/login (Pool A, FR-02)
 *
 * Bảng test case sau khi đã THẨM ĐỊNH (xem docs/api1/Audit.md).
 * Cột `expected` ở đây là kết quả đã sửa, không phải bản thô AI sinh ra.
 *
 * Ý nghĩa các trường:
 *   axis     domain | boundary | state | security | schema  -> quyết định case nằm ở folder nào
 *   knownBug đánh dấu case đang bắt một lỗi ĐÃ BIẾT của SUT. Case này sẽ FAIL và
 *            đó là chủ đích. Bộ hồi quy dùng cho CI sẽ loại chúng ra.
 *   origin   'ai' = do AI sinh ở bước 1 | 'human' = tôi tự bổ sung ở bước 3
 */

const U = "{{userEmail}}";
const P = "{{userPassword}}";
/** Tài khoản dùng-một-lần do pre-request tạo ra. Xem ghi chú ở freshUser(). */
const F = "{{freshEmail}}";

/** Trả về mảng lệnh pre-request tạo một tài khoản mới toanh cho các case trạng thái.
 *  Vì sao cần: khóa tài khoản kéo dài 180 giây và KHÔNG thể gỡ bằng API nào cả.
 *  Nếu dùng chung một tài khoản thì case nào chạy sau cũng gặp tài khoản đang bị
 *  khóa, kết quả phụ thuộc thứ tự chạy. Mỗi case một tài khoản riêng thì độc lập. */
const freshUser = (extra = []) => [
  "const email = 'st-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@hw06.local';",
  "pm.variables.set('freshEmail', email);",
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/register',",
  "  method: 'POST',",
  "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
  "  body: { mode: 'raw', raw: JSON.stringify({ name: 'HW06 State', email: email, password: 'Test1234!' }) }",
  "}, (err, res) => {",
  "  if (err || res.code !== 200) console.log('Không tạo được tài khoản nền: ' + (err || res.code));",
  ...extra,
  "});",
];

/** Sinh N lần đăng nhập sai LIÊN TIẾP trên tài khoản vừa tạo (dùng trong pre-request). */
const failLogins = (n) => [
  `  let done = 0;`,
  `  const wrong = () => pm.sendRequest({`,
  `    url: pm.environment.get('baseUrl') + '/api/login',`,
  `    method: 'POST',`,
  `    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },`,
  `    body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'SaiRoi000!' }) }`,
  `  }, () => { if (++done < ${n}) wrong(); });`,
  `  wrong();`,
];

/** Khẳng định "đọc bộ đếm của tài khoản qua API admin" — cách DUY NHẤT quan sát được nó. */
const assertCounter = (expr, label) => [
  "pm.sendRequest({",
  "  url: pm.environment.get('baseUrl') + '/api/admin/users',",
  "  header: { 'Authorization': 'Bearer ' + pm.environment.get('adminToken'), 'X-Student-Id': pm.environment.get('studentId') }",
  "}, (err, res) => {",
  "  const u = res.json().find(x => x.email === pm.variables.get('freshEmail'));",
  `  pm.test(${JSON.stringify(label)}, () => { ${expr} });`,
  "});",
];

const generic401 = [
  "pm.test('trả 401', () => pm.response.to.have.status(401));",
  "pm.test('thông báo lỗi chung chung, không lộ nguyên nhân (C5)', () =>",
  "  pm.expect(pm.response.json().error).to.eql('Invalid email or password'));",
];

module.exports = [
  // ─────────────────────────────────────────────────────────────────────────
  // 0. SETUP — lấy token dùng chung cho các case cần quyền admin
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "SETUP-01", name: "Lấy token admin", axis: "setup", origin: "human",
    path: "/api/login", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    tests: [
      "pm.test('đăng nhập admin thành công', () => pm.response.to.have.status(200));",
      "pm.environment.set('adminToken', pm.response.json().token);",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 1. PHÂN VÙNG MIỀN — email (TC-001…014) và password (TC-015…023)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TC-A1-001", name: "Email hợp lệ đã đăng ký + mật khẩu đúng", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "pm.test('trả 200', () => pm.response.to.have.status(200));",
      "const b = pm.response.json();",
      "pm.test('có token', () => pm.expect(b.token).to.be.a('string').and.not.empty);",
      "pm.test('có thông tin user', () => pm.expect(b.user).to.be.an('object'));",
      "pm.environment.set('token', b.token);",
      "pm.environment.set('userId', b.user.id);",
    ],
  },
  { id: "TC-A1-002", name: "Email đúng định dạng nhưng chưa đăng ký", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "khongtontai@eshop.com", password: P }, tests: generic401 },
  { id: "TC-A1-003", name: "Email thiếu ký tự @", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "testeshop.com", password: P }, tests: generic401 },
  { id: "TC-A1-004", name: "Email thiếu phần domain", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "test@", password: P }, tests: generic401 },
  { id: "TC-A1-005", name: "Email thiếu phần local", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "@eshop.com", password: P }, tests: generic401 },
  { id: "TC-A1-006", name: "Email thiếu TLD", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "test@eshop", password: P }, tests: generic401 },
  { id: "TC-A1-007", name: "Email có hai dấu @", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "test@@eshop.com", password: P }, tests: generic401 },
  { id: "TC-A1-008", name: "Email là chuỗi rỗng", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "", password: P }, tests: generic401 },
  { id: "TC-A1-009", name: "Thiếu hẳn trường email", axis: "domain", origin: "ai",
    path: "/api/login", body: { password: P }, tests: generic401 },
  { id: "TC-A1-010", name: "Email chỉ gồm khoảng trắng", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "   ", password: P }, tests: generic401 },
  {
    id: "TC-A1-011", name: "Email có khoảng trắng thừa hai đầu — SUT không trim", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: " test@eshop.com ", password: P },
    tests: [...generic401, "// Ghi chú audit: đặc tả im lặng về việc trim. Chốt oracle theo hành vi đo được."],
  },
  {
    id: "TC-A1-012", name: "Email viết HOA — SUT phân biệt hoa/thường", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: "TEST@ESHOP.COM", password: P },
    tests: [...generic401, "// Lệch RFC 5321 (domain không phân biệt hoa/thường) nhưng đặc tả không quy định -> khuyến nghị, không tính bug."],
  },
  { id: "TC-A1-013", name: "Email sai kiểu — số", axis: "domain", origin: "ai",
    path: "/api/login", rawBody: '{"email": 12345, "password": "Test1234!"}', tests: generic401 },
  { id: "TC-A1-014", name: "Email là null", axis: "domain", origin: "ai",
    path: "/api/login", rawBody: '{"email": null, "password": "Test1234!"}', tests: generic401 },

  {
    id: "TC-A1-015", name: "Mật khẩu đúng", axis: "domain", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: ["pm.test('trả 200', () => pm.response.to.have.status(200));",
            "pm.test('có token', () => pm.expect(pm.response.json().token).to.be.a('string'));"],
  },
  { id: "TC-A1-016", name: "Mật khẩu sai", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", body: { email: F, password: "SaiRoi123!" }, tests: generic401 },
  { id: "TC-A1-017", name: "Mật khẩu là chuỗi rỗng", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", body: { email: F, password: "" }, tests: generic401 },
  { id: "TC-A1-018", name: "Thiếu hẳn trường password", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", body: { email: F }, tests: generic401 },
  { id: "TC-A1-019", name: "Mật khẩu chỉ gồm khoảng trắng", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", body: { email: F, password: "        " }, tests: generic401 },
  {
    id: "TC-A1-020", name: "Mật khẩu sai hoa/thường — phải bị từ chối", axis: "domain", origin: "ai",
    prereq: freshUser(), path: "/api/login", body: { email: F, password: "test1234!" },
    tests: [...generic401, "// Mật khẩu BẮT BUỘC phân biệt hoa/thường — khác hẳn trường email."],
  },
  { id: "TC-A1-021", name: "Mật khẩu sai kiểu — số", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": 12345678}', tests: generic401 },
  { id: "TC-A1-022", name: "Mật khẩu là null", axis: "domain", origin: "ai", prereq: freshUser(),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": null}', tests: generic401 },
  {
    id: "TC-A1-023", name: "Mật khẩu đúng nhưng của TÀI KHOẢN KHÁC", axis: "domain", origin: "ai",
    prereq: freshUser(), path: "/api/login", body: { email: F, password: "{{adminPassword}}" },
    tests: [...generic401, "// Chứng minh mật khẩu được ràng buộc với đúng tài khoản, không dùng chéo được."],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GIÁ TRỊ BIÊN (TC-024…030) — TC-025 đã gộp vào TC-024 khi audit
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TC-A1-024", name: "Mật khẩu sai với độ dài dưới ngưỡng FR-01 (7 ký tự)", axis: "boundary", origin: "ai",
    prereq: freshUser(), path: "/api/login", body: { email: F, password: "Test12!" },
    tests: [...generic401,
      "// Audit: bỏ lập luận 'ngắn hơn 8 nên bị từ chối'. Endpoint đăng nhập KHÔNG được",
      "// áp ràng buộc độ phức tạp của FR-01 — nếu áp thì tài khoản cũ sẽ không vào được."],
  },
  {
    id: "TC-A1-026", name: "Mật khẩu 1 000 ký tự — không được làm sập server", axis: "boundary", origin: "ai",
    prereq: freshUser(), path: "/api/login", rawBody: JSON.stringify({ email: "{{freshEmail}}", password: "A1!" + "a".repeat(997) }),
    tests: ["pm.test('trả 401', () => pm.response.to.have.status(401));",
            "pm.test('không phải lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));"],
  },
  {
    id: "TC-A1-027", name: "Email dài 320 ký tự — biên trên RFC 5321", axis: "boundary", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "a".repeat(64) + "@" + "b".repeat(251) + ".com", password: "x" }),
    tests: ["pm.test('trả 401', () => pm.response.to.have.status(401));",
            "pm.test('phản hồi dưới 2 giây', () => pm.expect(pm.response.responseTime).to.be.below(2000));"],
  },
  {
    id: "TC-A1-028", name: "Email 321 ký tự — vượt biên trên", axis: "boundary", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "a".repeat(65) + "@" + "b".repeat(251) + ".com", password: "x" }),
    tests: ["pm.test('không phải lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));"],
  },
  { id: "TC-A1-029", name: "Phần local dài 1 ký tự — biên dưới", axis: "boundary", origin: "ai",
    path: "/api/login", body: { email: "a@eshop.com", password: "x" }, tests: generic401 },
  { id: "TC-A1-030", name: "Body JSON rỗng hoàn toàn", axis: "boundary", origin: "ai",
    path: "/api/login", rawBody: "{}", tests: generic401 },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CHUYỂN TRẠNG THÁI — máy trạng thái khóa tài khoản (TC-031…039)
  //    Mọi case dùng TÀI KHOẢN MỚI TẠO, xem ghi chú ở hàm freshUser().
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TC-A1-031", name: "Sai 1 lần → bộ đếm phải bằng ĐÚNG 1 (C3)", axis: "state", origin: "ai",
    knownBug: "BUG-A1-02",
    prereq: freshUser(),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('trả 401', () => pm.response.to.have.status(401));",
      ...assertCounter("pm.expect(u.login_attempts).to.eql(1)", "bộ đếm tăng đúng 1 đơn vị (FR-02)"),
    ],
  },
  {
    id: "TC-A1-032", name: "Sai 2 lần → CHƯA được khóa, mật khẩu đúng vẫn vào được (C4)", axis: "state", origin: "ai",
    knownBug: "BUG-A1-02",
    prereq: freshUser(failLogins(2)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "Test1234!"}',
    tests: [
      "pm.test('sai 2 lần chưa đủ để khóa — đăng nhập đúng phải thành công', () => pm.response.to.have.status(200));",
      "pm.test('không bị trả 403', () => pm.expect(pm.response.code).to.not.eql(403));",
    ],
  },
  {
    id: "TC-A1-033", name: "Sai 3 lần → chuyển sang trạng thái LOCKED", axis: "state", origin: "ai",
    prereq: freshUser(failLogins(2)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: ["pm.test('đã chuyển sang LOCKED', () => pm.response.to.have.status(403));"],
  },
  {
    id: "TC-A1-034", name: "Đang LOCKED + mật khẩu ĐÚNG → vẫn phải chặn", axis: "state", origin: "ai",
    prereq: freshUser(failLogins(3)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "Test1234!"}',
    tests: ["pm.test('khóa chặn cả mật khẩu đúng', () => pm.response.to.have.status(403));"],
  },
  {
    id: "TC-A1-035", name: "Thời lượng khóa phải là 30 giây (C4)", axis: "state", origin: "ai",
    knownBug: "BUG-A1-03",
    prereq: freshUser(failLogins(3)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('đang bị khóa', () => pm.response.to.have.status(403));",
      ...assertCounter(
        "const giay = Math.round((new Date(u.locked_until) - Date.now()) / 1000); pm.expect(giay, 'số giây còn lại').to.be.at.most(30)",
        "khóa không quá 30 giây (FR-02)",
      ),
    ],
  },
  {
    id: "TC-A1-036", name: "Đăng nhập đúng phải reset bộ đếm về 0", axis: "state", origin: "ai",
    prereq: freshUser(failLogins(1)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "Test1234!"}',
    tests: [
      "pm.test('đăng nhập thành công', () => pm.response.to.have.status(200));",
      ...assertCounter("pm.expect(u.login_attempts).to.eql(0)", "bộ đếm được reset về 0"),
    ],
  },
  {
    id: "TC-A1-037", name: "Khóa một tài khoản KHÔNG lan sang tài khoản khác", axis: "state", origin: "ai",
    prereq: freshUser(failLogins(3)),
    path: "/api/login", body: { email: "{{adminEmail}}", password: "{{adminPassword}}" },
    tests: ["pm.test('tài khoản khác vẫn đăng nhập bình thường', () => pm.response.to.have.status(200));"],
  },
  {
    id: "TC-A1-038", name: "Sai 5 lần → thời gian khóa không cộng dồn vô hạn", axis: "state", origin: "ai",
    prereq: freshUser(failLogins(5)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('vẫn ở trạng thái LOCKED', () => pm.response.to.have.status(403));",
      ...assertCounter(
        "const giay = Math.round((new Date(u.locked_until) - Date.now()) / 1000); pm.expect(giay, 'số giây còn lại').to.be.at.most(180)",
        "thời gian khóa không cộng dồn theo số lần sai",
      ),
    ],
  },
  {
    id: "TC-A1-039", name: "Sai 3 lần với email KHÔNG tồn tại → không lộ sự tồn tại", axis: "state", origin: "ai",
    prereq: [
      "const email = 'khongtontai-' + Date.now() + '@hw06.local';",
      "pm.variables.set('ghostEmail', email);",
      "let done = 0;",
      "const wrong = () => pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'SaiRoi000!' }) }",
      "}, () => { if (++done < 2) wrong(); });",
      "wrong();",
    ],
    path: "/api/login", rawBody: '{"email": "{{ghostEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('luôn là 401, không bao giờ ra 403', () => pm.response.to.have.status(401));",
      "pm.test('cùng một thông báo lỗi', () => pm.expect(pm.response.json().error).to.eql('Invalid email or password'));",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. BẢO MẬT (TC-040…051)
  // ─────────────────────────────────────────────────────────────────────────
  { id: "TC-A1-040", name: "SQL injection — tautology OR '1'='1", axis: "security", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "' OR '1'='1", password: "x" }), tests: generic401 },
  { id: "TC-A1-041", name: "SQL injection — chèn chú thích để bỏ qua mật khẩu", axis: "security", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "admin@eshop.com'--", password: "x" }),
    tests: [...generic401, "pm.test('không cấp token', () => pm.expect(pm.response.text()).to.not.include('token'));"] },
  {
    id: "TC-A1-042", name: "Dấu nháy đơn lẻ trong email — không được lộ lỗi CSDL", axis: "security", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "O'Neill@eshop.com", password: "x" }),
    tests: [...generic401,
      "pm.test('không rò rỉ thông báo của CSDL', () => pm.expect(pm.response.text()).to.not.match(/SQLITE|syntax error/i));"],
  },
  { id: "TC-A1-043", name: "SQL injection ở trường password", axis: "security", origin: "ai",
    prereq: freshUser(), path: "/api/login", rawBody: JSON.stringify({ email: "{{freshEmail}}", password: "' OR 1=1--" }), tests: generic401 },
  {
    id: "TC-A1-044", name: "SEC-01 — response TUYỆT ĐỐI không được chứa mật khẩu", axis: "security", origin: "ai",
    knownBug: "BUG-A1-01",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "pm.test('đăng nhập thành công', () => pm.response.to.have.status(200));",
      "pm.test('response không chứa trường password', () =>",
      "  pm.expect(pm.response.json().user).to.not.have.property('password'));",
      "pm.test('response không chứa mật khẩu dạng plaintext ở bất kỳ đâu', () =>",
      "  pm.expect(pm.response.text()).to.not.include(pm.environment.get('userPassword')));",
    ],
  },
  {
    id: "TC-A1-045", name: "SEC-02 — token đúng cấu trúc JWT ba phần", axis: "security", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "const t = pm.response.json().token;",
      "pm.test('JWT gồm 3 phần ngăn bởi dấu chấm', () => pm.expect(t.split('.')).to.have.lengthOf(3));",
      "pm.test('giải mã được phần payload', () => JSON.parse(atob(t.split('.')[1])));",
    ],
  },
  {
    id: "TC-A1-046", name: "SEC-02 — JWT phải có hạn dùng (claim exp)", axis: "security", origin: "ai",
    knownBug: "BUG-A1-05",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "const p = JSON.parse(atob(pm.response.json().token.split('.')[1]));",
      "pm.test('token có claim exp — không được dùng vĩnh viễn', () => pm.expect(p).to.have.property('exp'));",
    ],
  },
  {
    id: "TC-A1-047", name: "SEC-02 — payload JWT không chứa dữ liệu nhạy cảm", axis: "security", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "const p = JSON.parse(atob(pm.response.json().token.split('.')[1]));",
      "pm.test('payload không chứa mật khẩu', () => pm.expect(p).to.not.have.property('password'));",
    ],
  },
  {
    id: "TC-A1-048", name: "C5 — email không tồn tại và sai mật khẩu phải trả GIỐNG NHAU", axis: "security", origin: "ai",
    prereq: freshUser(), path: "/api/login", body: { email: F, password: "SaiRoi123!" },
    tests: [
      "const mine = { code: pm.response.code, body: pm.response.text() };",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: 'khong-he-ton-tai@hw06.local', password: 'SaiRoi123!' }) }",
      "}, (err, res) => {",
      "  pm.test('cùng status code', () => pm.expect(res.code).to.eql(mine.code));",
      "  pm.test('cùng nội dung thông báo', () => pm.expect(res.text()).to.eql(mine.body));",
      "});",
    ],
  },
  {
    id: "TC-A1-049", name: "C5 — kênh phụ thời gian không được tiết lộ email có tồn tại", axis: "security", origin: "ai",
    prereq: [
      "// Cỡ mẫu 10/nhóm theo audit. Nhưng KHÔNG được bắn 10 lần vào cùng một tài khoản:",
      "// khóa xảy ra ngay từ lần sai thứ 2, và nhánh 403 có đường đi khác hẳn nên phép đo",
      "// sẽ đo nhầm chi phí của việc bị khóa thay vì chi phí tra cứu email.",
      "// Cách đúng: 10 tài khoản CÓ THẬT khác nhau, mỗi tài khoản đúng MỘT lần thử sai.",
      "const ds = [];",
      "let tao = 0;",
      "const taoTiep = () => {",
      "  const email = 'timing-' + Date.now() + '-' + tao + '@hw06.local';",
      "  ds.push(email);",
      "  pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/register', method: 'POST',",
      "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "    body: { mode: 'raw', raw: JSON.stringify({ name: 'Timing', email: email, password: 'Test1234!' }) }",
      "  }, () => { if (++tao < 10) taoTiep(); else pm.variables.set('dsTimingEmail', JSON.stringify(ds)); });",
      "};",
      "taoTiep();",
    ],
    path: "/api/login", rawBody: '{"email": "khong-he-ton-tai-0@hw06.local", "password": "SaiRoi123!"}',
    tests: [
      "const trungVi = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };",
      "const dsCo = JSON.parse(pm.variables.get('dsTimingEmail'));",
      "const dsKhong = dsCo.map((_, i) => 'khong-he-ton-tai-' + i + '@hw06.local');",
      "const do_ = (ds, i, acc, xong) => i === ds.length ? xong(acc) : pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: ds[i], password: 'SaiRoi123!' }) }",
      "}, (e, r) => do_(ds, i + 1, acc.concat(r.responseTime), xong));",
      "do_(dsCo, 0, [], (co) =>",
      "  do_(dsKhong, 0, [], (khong) => {",
      "    const chenh = Math.abs(trungVi(co) - trungVi(khong));",
      "    pm.test('chênh lệch trung vị dưới 50 ms (thực đo: ' + chenh + ' ms)', () => pm.expect(chenh).to.be.below(50));",
      "  }));",
    ],
  },
  {
    id: "TC-A1-050", name: "SEC-04 — payload XSS trong email trả JSON, không trả HTML", axis: "security", origin: "ai",
    path: "/api/login", rawBody: JSON.stringify({ email: "<script>alert(1)</script>@x.com", password: "x" }),
    tests: [...generic401,
      "pm.test('Content-Type là JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));"],
  },
  {
    id: "TC-A1-051", name: "Injection kiểu đối tượng — {\"$ne\": null}", axis: "security", origin: "ai",
    path: "/api/login", rawBody: '{"email": {"$ne": null}, "password": "x"}',
    tests: [
      "pm.test('không được cấp quyền truy cập', () => pm.expect(pm.response.code).to.not.eql(200));",
      "pm.test('không được sập server', () => pm.expect(pm.response.code).to.be.below(500));",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SCHEMA & GIAO THỨC HTTP (TC-052…060)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TC-A1-052", name: "Response 200 khớp JSON Schema của đặc tả", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-01",
    path: "/api/login", body: { email: U, password: P },
    tests: [
      "const schema = {",
      "  type: 'object', required: ['message', 'token', 'user'],",
      "  properties: {",
      "    message: { type: 'string' },",
      "    token: { type: 'string', pattern: '^[\\\\w-]+\\\\.[\\\\w-]+\\\\.[\\\\w-]+$' },",
      "    user: {",
      "      type: 'object', required: ['id', 'name', 'email', 'role'],",
      "      properties: {",
      "        id: { type: 'integer' }, name: { type: 'string' },",
      "        email: { type: 'string' }, role: { type: 'string', enum: ['user', 'admin'] }",
      "      },",
      "      not: { required: ['password'] }",
      "    }",
      "  }",
      "};",
      "pm.test('response thỏa mãn schema (mệnh đề not.required chặn SEC-01)', () =>",
      "  pm.response.to.have.jsonSchema(schema));",
    ],
  },
  {
    id: "TC-A1-053", name: "user.id phải là số nguyên", axis: "schema", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: ["pm.test('user.id là số nguyên', () => pm.expect(pm.response.json().user.id).to.be.a('number'));"],
  },
  {
    id: "TC-A1-054", name: "user.role chỉ nhận 'user' hoặc 'admin'", axis: "schema", origin: "ai",
    path: "/api/login", body: { email: U, password: P },
    tests: ["pm.test('role hợp lệ', () => pm.expect(['user', 'admin']).to.include(pm.response.json().user.role));"],
  },
  {
    id: "TC-A1-055", name: "Response lỗi 401 phải là JSON, không phải HTML", axis: "schema", origin: "ai",
    prereq: freshUser(), path: "/api/login", body: { email: F, password: "SaiRoi123!" },
    tests: [
      "pm.test('trả 401', () => pm.response.to.have.status(401));",
      "pm.test('Content-Type là JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
      "pm.test('thân là JSON hợp lệ có trường error', () => pm.expect(pm.response.json()).to.have.property('error'));",
    ],
  },
  {
    id: "TC-A1-056", name: "Sai method GET — response vẫn phải là JSON của API", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-07", method: "GET", path: "/api/login",
    tests: [
      "pm.test('trả 404 hoặc 405', () => pm.expect([404, 405]).to.include(pm.response.code));",
      "pm.test('Content-Type là JSON chứ không phải HTML', () =>",
      "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
    ],
  },
  {
    id: "TC-A1-057", name: "Sai method PUT", axis: "schema", origin: "ai", method: "PUT", path: "/api/login",
    tests: ["pm.test('trả 404 hoặc 405', () => pm.expect([404, 405]).to.include(pm.response.code));"],
  },
  {
    id: "TC-A1-059", name: "Body sai cú pháp JSON → 400 kèm thân JSON", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-07", path: "/api/login", rawBody: '{"email":',
    tests: [
      "pm.test('trả 400', () => pm.response.to.have.status(400));",
      "pm.test('Content-Type là JSON chứ không phải HTML', () =>",
      "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
    ],
  },
  {
    id: "TC-A1-060", name: "Content-Type: text/plain → phải 400/415, không được 500", axis: "schema", origin: "ai",
    knownBug: "BUG-A1-06", path: "/api/login", contentType: "text/plain",
    rawBody: '{"email":"test@eshop.com","password":"Test1234!"}',
    tests: [
      "pm.test('trả 400 hoặc 415', () => pm.expect([400, 415]).to.include(pm.response.code));",
      "pm.test('không được là lỗi 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TỰ BỔ SUNG — bước 3, những gì AI bỏ sót (xem docs/api1/Extended.md)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TC-A1-E02", name: "Liệt kê tài khoản qua kênh 403 — email thật lộ mình ra", axis: "extended", origin: "human",
    knownBug: "BUG-A1-08",
    prereq: [
      "// Bắn 2 lần sai vào email CÓ THẬT để đẩy nó vào trạng thái khóa.",
      "let done = 0;",
      "const wrong = () => pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: pm.environment.get('userEmail'), password: 'SaiRoi000!' }) }",
      "}, () => { if (++done < 2) wrong(); });",
      "wrong();",
    ],
    path: "/api/login", body: { email: U, password: "SaiRoi000!" },
    tests: [
      "// Email THẬT giờ đang bị khóa. So với email GIẢ chịu đúng số lần sai như vậy:",
      "const thatCode = pm.response.code;",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: 'ma-' + Date.now() + '@hw06.local', password: 'SaiRoi000!' }) }",
      "}, (err, res) => {",
      "  pm.test('email thật và email giả phải trả CÙNG mã trạng thái (C5)', () =>",
      "    pm.expect(thatCode, 'email thật=' + thatCode + ' vs email giả=' + res.code).to.eql(res.code));",
      "});",
    ],
  },
  {
    id: "TC-A1-E06", name: "Thông báo khi bị khóa không được nói thẳng lý do (C5)", axis: "extended", origin: "human",
    knownBug: "BUG-A1-08",
    prereq: freshUser(failLogins(3)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('đang bị khóa', () => pm.response.to.have.status(403));",
      "pm.test('thông báo không được tiết lộ tài khoản bị khóa', () =>",
      "  pm.expect(pm.response.text()).to.not.match(/khóa|khoá|locked/i));",
    ],
  },
  {
    id: "TC-A1-E03", name: "Đồng thời — 5 lần sai song song không được làm mất cập nhật bộ đếm", axis: "extended", origin: "human",
    knownBug: "BUG-A1-09",
    prereq: freshUser([
      "  // Bắn 5 request SONG SONG (không chờ nhau) để tạo tranh chấp đọc-sửa-ghi.",
      "  for (let i = 0; i < 5; i++) pm.sendRequest({",
      "    url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "    header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "    body: { mode: 'raw', raw: JSON.stringify({ email: email, password: 'SaiRoi000!' }) }",
      "  }, () => {});",
    ]),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      ...assertCounter(
        "pm.expect(u.login_attempts, 'bộ đếm phải phản ánh đủ 6 lần sai').to.be.at.least(6)",
        "đồng thời không làm mất cập nhật bộ đếm",
      ),
    ],
  },
  {
    id: "TC-A1-E04", name: "Phải có giới hạn tần suất theo IP", axis: "extended", origin: "human",
    knownBug: "BUG-A1-10",
    path: "/api/login", rawBody: '{"email": "ma-rate-limit@hw06.local", "password": "SAI"}',
    tests: [
      "// Gửi 30 request liên tiếp từ cùng một nguồn; ít nhất một cái phải bị chặn (429).",
      "let da = 0, chan = 0;",
      "const ban = () => pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/login', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ email: 'ma-rate-limit@hw06.local', password: 'SAI' }) }",
      "}, (err, res) => {",
      "  if (res && res.code === 429) chan++;",
      "  if (++da < 30) ban();",
      "  else pm.test('có cơ chế giới hạn tần suất (' + chan + '/30 request bị chặn)', () =>",
      "    pm.expect(chan).to.be.above(0));",
      "});",
      "ban();",
    ],
  },
  {
    id: "TC-A1-E05", name: "Không được dùng khóa tài khoản làm vũ khí DoS lên người khác", axis: "extended", origin: "human",
    knownBug: "BUG-A1-11",
    prereq: freshUser(failLogins(2)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "Test1234!"}',
    tests: [
      "pm.test('nạn nhân vẫn đăng nhập được bằng mật khẩu ĐÚNG của mình', () =>",
      "  pm.response.to.have.status(200));",
      "// Kẻ tấn công chỉ cần biết email là khóa được tài khoản người khác — vi phạm tính sẵn sàng.",
    ],
  },
  {
    id: "TC-A1-E07", name: "SEC-01 ở tầng lưu trữ — CSDL không được lưu plaintext", axis: "extended", origin: "human",
    knownBug: "BUG-A1-01",
    prereq: [
      "const email = 'sec01-' + Date.now() + '@hw06.local';",
      "const pass = 'MatKhau' + Math.floor(Math.random() * 1e6) + '!';",
      "pm.variables.set('sec01Email', email);",
      "pm.variables.set('sec01Pass', pass);",
      "pm.sendRequest({",
      "  url: pm.environment.get('baseUrl') + '/api/register', method: 'POST',",
      "  header: { 'Content-Type': 'application/json', 'X-Student-Id': pm.environment.get('studentId') },",
      "  body: { mode: 'raw', raw: JSON.stringify({ name: 'SEC01', email: email, password: pass }) }",
      "}, () => {});",
    ],
    path: "/api/login", rawBody: '{"email": "{{sec01Email}}", "password": "{{sec01Pass}}"}',
    tests: [
      "pm.test('đăng nhập thành công', () => pm.response.to.have.status(200));",
      "pm.test('bản ghi trả về không được chứa đúng chuỗi mật khẩu vừa đăng ký', () =>",
      "  pm.expect(pm.response.text()).to.not.include(pm.variables.get('sec01Pass')));",
      "// Nếu khẳng định trên thất bại: thứ CSDL lưu chính là chuỗi gốc, tức là plaintext chứ không phải hash.",
    ],
  },
  {
    id: "TC-A1-E01", name: "Hết hạn khóa phải reset bộ đếm — nếu không sẽ khóa vĩnh viễn", axis: "extended", origin: "human",
    knownBug: "BUG-A1-12",
    prereq: freshUser(failLogins(3)),
    path: "/api/login", rawBody: '{"email": "{{freshEmail}}", "password": "SaiRoi000!"}',
    tests: [
      "pm.test('đang bị khóa', () => pm.response.to.have.status(403));",
      ...assertCounter(
        "pm.expect(u.login_attempts, 'bộ đếm khi bị khóa').to.be.at.most(3)",
        "bộ đếm không được vượt ngưỡng khóa — nếu vượt thì sau khi hết hạn chỉ cần 1 lần sai là khóa lại",
      ),
      "// Kiểm chứng đầy đủ cần chờ hết 180 giây, không đưa vào bộ chạy tự động vì quá chậm.",
      "// Bằng chứng thủ công: docs/api1/Extended.md mục TC-A1-E01.",
    ],
  },
];
