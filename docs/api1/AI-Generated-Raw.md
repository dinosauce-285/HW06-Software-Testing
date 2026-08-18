# API 1 — `POST /api/login` — Bước 1: Test case do AI sinh (nguyên văn)

> **Đề mục 6:82.** Đưa đặc tả API cho AI và dẫn dắt **từng bước** — không dùng một prompt gộp.
> Mục tiêu: ≥ 35 test case, phủ 4 trục *phân vùng miền / chuyển trạng thái / bảo mật / kiểm schema*.
>
> **Công cụ AI:** Claude Opus 5 (Claude Code CLI) — **Ngày:** 18/08/2026
> **Nguyên tắc cách ly:** ở bước này AI **chỉ được đọc đặc tả** (`sut/api_specification.md` mục 1.2 và
> `sut/README.md` FR-01, FR-02, SEC-01–07). AI **không** được đọc `sut/backend/server.js`.
>
> **Vì sao phải cách ly:** nếu để AI đọc mã nguồn, nó sẽ viết *expected result* theo đúng cái mà
> chương trình đang làm — kể cả khi chương trình sai. Như vậy mọi test case đều PASS và không
> phát hiện được lỗi nào. Sinh từ đặc tả thì *expected* là **điều hệ thống phải làm**; chỗ nào
> hành vi thật lệch khỏi nó chính là bug. Đây cũng là điều kiện để bước 2 (audit) và bước 3
> (extend) trung thực — xem `Audit.md`.

## Đặc tả dùng làm đầu vào

Trích nguyên văn phần liên quan, đây là toàn bộ những gì AI được thấy ở bước này:

**`api_specification.md` §1.2 — Đăng nhập**
- Endpoint: `POST /api/login`
- Body: `{"email": "test@domain.com", "password": "Password123!"}`
- Thành công (200 OK): trả về chuỗi JWT `token` và thông tin `user`.

**`README.md` — FR-02: Đăng nhập & Khóa tài khoản**
- Người dùng nhập Email và Mật khẩu.
- Sau mỗi lần đăng nhập sai, hệ thống tăng bộ đếm lên **đúng 1 đơn vị**.
- Sai từ **3 lần trở lên** liên tiếp → khóa **30 giây**. Trả thông báo lỗi phù hợp; **không để lộ chi tiết nguyên nhân**.
- Thành công trả về JWT Token, gửi kèm qua header `Authorization: Bearer <token>`.
- Trường email phải đúng định dạng email.

**`README.md` — FR-01 (ràng buộc mật khẩu, dùng cho phân vùng miền)**
- Tối thiểu **8 ký tự**, có ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số, 1 ký tự đặc biệt (`@ $ ! % * ? &`).

**`README.md` — SEC-01…SEC-07**
- SEC-01 mật khẩu không lưu plaintext · SEC-02 API bảo mật cần JWT hợp lệ · SEC-03 API admin phải kiểm `role`
- SEC-04 escape dữ liệu người dùng · SEC-05 dùng parameterized query · SEC-06 không cho client đổi `role`
- SEC-07 OTP đủ entropy, có hạn, dùng một lần

**Dữ liệu nền (từ `setup_guide.md` + seed):** user `test@eshop.com` / `Test1234!`, admin `admin@eshop.com` / `Admin123!`

---

## Bước 1.1 — Rút ràng buộc kiểm thử từ đặc tả

**Prompt:** *"Đọc phần đặc tả `POST /api/login` ở trên. Chưa sinh test case vội. Trước hết hãy liệt kê ra: (a) các tham số đầu vào và kiểu của chúng, (b) mọi ràng buộc mà đặc tả nêu ra, (c) mọi trạng thái mà tài khoản có thể ở trong đó, (d) những điểm đặc tả nói mập mờ hoặc bỏ trống. Trình bày thành bảng."*

**Output AI:**

**(a) Tham số đầu vào**

| Tham số | Kiểu | Bắt buộc | Nguồn |
| --- | --- | --- | --- |
| `email` | string | Có | body JSON |
| `password` | string | Có | body JSON |

**(b) Ràng buộc đặc tả nêu**

| Mã | Ràng buộc | Nguồn |
| --- | --- | --- |
| C1 | `email` phải đúng định dạng email | FR-02 |
| C2 | Mật khẩu ≥ 8 ký tự, đủ 4 nhóm ký tự | FR-01 |
| C3 | Mỗi lần sai → bộ đếm **+1** (đúng 1 đơn vị) | FR-02 |
| C4 | Sai **≥ 3 lần** liên tiếp → khóa **30 giây** | FR-02 |
| C5 | Thông báo lỗi **không được lộ nguyên nhân** | FR-02 |
| C6 | Thành công → trả JWT `token` + `user` | FR-02, §1.2 |
| C7 | Mật khẩu không được lưu/lộ dạng plaintext | SEC-01 |
| C8 | Truy vấn CSDL phải parameterized | SEC-05 |

**(c) Các trạng thái của tài khoản**

```
        đăng nhập sai (x3)
UNLOCKED ─────────────────► LOCKED
    ▲                          │
    │  đăng nhập đúng          │ hết 30 giây
    └──────────────────────────┘
    (bộ đếm reset về 0)
```
Ba trạng thái quan sát được: `UNLOCKED (counter = 0…2)` · `LOCKED (30s)` · `UNLOCKED sau khi hết hạn khóa`.

**(d) Điểm đặc tả bỏ trống — cần kiểm thử để làm rõ**

| # | Đặc tả không nói gì về | Vì sao cần test |
| --- | --- | --- |
| G1 | Email có phân biệt hoa/thường không | Ảnh hưởng tới cả xác thực lẫn khóa tài khoản |
| G2 | Bộ đếm có reset sau khi đăng nhập thành công không | FR-02 nói "liên tiếp" nhưng không nói cách reset |
| G3 | Khi đang bị khóa mà nhập **đúng** mật khẩu thì sao | Quyết định khóa có thật sự chặn hay không |
| G4 | JWT có thời hạn (`exp`) không | SEC-02 nói "hợp lệ" nhưng không định nghĩa |
| G5 | Giới hạn độ dài `email` / `password` | Không có ngưỡng nào được nêu |
| G6 | Có rate limit theo IP ngoài khóa tài khoản không | Chống brute force phân tán |

---

## Bước 1.2 — Phân vùng tương đương trên `email`

**Prompt:** *"Chỉ tập trung vào tham số `email`. Áp dụng kỹ thuật phân vùng tương đương (equivalence partitioning): chia miền giá trị thành các lớp hợp lệ và không hợp lệ, mỗi lớp lấy một giá trị đại diện. Với mỗi test case ghi rõ: ID, lớp tương đương, giá trị đầu vào, kết quả mong đợi **theo đúng đặc tả** (status code + nội dung). Đừng suy đoán hệ thống đang làm gì — chỉ bám vào đặc tả."*

**Output AI:**

| ID | Lớp tương đương | `email` | `password` | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- | --- |
| TC-A1-001 | Hợp lệ — đã đăng ký | `test@eshop.com` | `Test1234!` | 200, có `token` + `user` (C6) |
| TC-A1-002 | Hợp lệ — chưa đăng ký | `khongtontai@eshop.com` | `Test1234!` | 401, thông báo chung chung (C5) |
| TC-A1-003 | Không hợp lệ — thiếu `@` | `testeshop.com` | `Test1234!` | 400, lỗi định dạng email (C1) |
| TC-A1-004 | Không hợp lệ — thiếu domain | `test@` | `Test1234!` | 400 (C1) |
| TC-A1-005 | Không hợp lệ — thiếu phần local | `@eshop.com` | `Test1234!` | 400 (C1) |
| TC-A1-006 | Không hợp lệ — thiếu TLD | `test@eshop` | `Test1234!` | 400 (C1) |
| TC-A1-007 | Không hợp lệ — hai dấu `@` | `test@@eshop.com` | `Test1234!` | 400 (C1) |
| TC-A1-008 | Không hợp lệ — chuỗi rỗng | `""` | `Test1234!` | 400, thiếu trường bắt buộc |
| TC-A1-009 | Không hợp lệ — thiếu hẳn trường | *(không gửi khoá `email`)* | `Test1234!` | 400, thiếu trường bắt buộc |
| TC-A1-010 | Không hợp lệ — chỉ có khoảng trắng | `"   "` | `Test1234!` | 400 (C1) |
| TC-A1-011 | Biên nhập nhằng — có khoảng trắng thừa | `" test@eshop.com "` | `Test1234!` | 200 nếu hệ thống trim, hoặc 400 — **đặc tả không nói (G5)** |
| TC-A1-012 | Biên nhập nhằng — viết hoa | `TEST@ESHOP.COM` | `Test1234!` | 200 — email theo RFC không phân biệt hoa/thường ở phần domain **(G1)** |
| TC-A1-013 | Không hợp lệ — sai kiểu dữ liệu | `12345` (number) | `Test1234!` | 400, phải là string |
| TC-A1-014 | Không hợp lệ — `null` | `null` | `Test1234!` | 400 |

## Bước 1.3 — Phân vùng tương đương trên `password`

**Prompt:** *"Giờ chuyển sang tham số `password`, giữ `email` cố định ở giá trị hợp lệ `test@eshop.com`. Vẫn dùng phân vùng tương đương, và lưu ý ràng buộc mật khẩu mạnh ở FR-01. Ghi rõ với mỗi case nó thuộc lớp nào."*

**Output AI:**

| ID | Lớp tương đương | `password` | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A1-015 | Hợp lệ — đúng mật khẩu | `Test1234!` | 200, có `token` (C6) |
| TC-A1-016 | Không hợp lệ — sai mật khẩu | `SaiRoi123!` | 401, thông báo chung chung (C5), bộ đếm +1 (C3) |
| TC-A1-017 | Không hợp lệ — chuỗi rỗng | `""` | 400, thiếu trường bắt buộc |
| TC-A1-018 | Không hợp lệ — thiếu hẳn trường | *(không gửi khoá `password`)* | 400 |
| TC-A1-019 | Không hợp lệ — chỉ có khoảng trắng | `"        "` | 401 |
| TC-A1-020 | Không hợp lệ — khác hoa/thường | `test1234!` | 401 — mật khẩu **phải** phân biệt hoa/thường |
| TC-A1-021 | Không hợp lệ — sai kiểu dữ liệu | `12345678` (number) | 400, phải là string |
| TC-A1-022 | Không hợp lệ — `null` | `null` | 400 |
| TC-A1-023 | Không hợp lệ — đúng mật khẩu của **tài khoản khác** | `Admin123!` | 401 — mật khẩu phải gắn với đúng tài khoản |

## Bước 1.4 — Phân tích giá trị biên

**Prompt:** *"Áp dụng kỹ thuật phân tích giá trị biên (boundary value analysis) cho hai tham số này. Ràng buộc độ dài mật khẩu tối thiểu là 8 (FR-01). Với những biên mà đặc tả KHÔNG nêu ngưỡng, hãy nói rõ là bạn đang chọn biên theo chuẩn nào (ví dụ RFC 5321) và đánh dấu nó là giả định."*

**Output AI:**

| ID | Biên | Đầu vào | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A1-024 | Độ dài mật khẩu = 7 (dưới min) | `Test12!` | 401/400 — dưới ngưỡng FR-01 nên không thể là mật khẩu hợp lệ |
| TC-A1-025 | Độ dài mật khẩu = 8 (đúng min) | `Test123!` | 401 (sai mật khẩu nhưng đúng khuôn dạng) |
| TC-A1-026 | Mật khẩu rất dài — 1 000 ký tự | `"A1!" + "a"×997` | 401, **không được** 500 — độ dài không được làm sập server |
| TC-A1-027 | Email dài 320 ký tự *(giả định RFC 5321: 64 + 1 + 255)* | `"a"×64 + "@" + "b"×251 + ".com"` | 401 — vẫn phải xử lý được |
| TC-A1-028 | Email dài 321 ký tự — vượt biên trên | `"a"×65 + "@" + …` | 400 hoặc 401, không được 500 |
| TC-A1-029 | Phần local dài 1 ký tự — biên dưới | `a@eshop.com` | 401 — vẫn là email đúng định dạng |
| TC-A1-030 | Body JSON rỗng hoàn toàn | `{}` | 400, thiếu cả hai trường bắt buộc |

## Bước 1.5 — Kiểm thử chuyển trạng thái (máy trạng thái khóa tài khoản)

**Prompt:** *"Bây giờ bỏ qua phân vùng miền, chuyển sang kỹ thuật kiểm thử chuyển trạng thái. Máy trạng thái ở đây là cơ chế khóa tài khoản của FR-02. Hãy vẽ lại bảng chuyển trạng thái, rồi sinh test case phủ: (1) mọi chuyển trạng thái hợp lệ, (2) các chuyển trạng thái KHÔNG được phép xảy ra, (3) hành vi ngay tại biên của bộ đếm. Mỗi test case phải ghi rõ chuỗi thao tác chứ không chỉ một request đơn lẻ."*

**Output AI:**

**Bảng chuyển trạng thái theo FR-02:**

| Trạng thái hiện tại | Sự kiện | Trạng thái kế tiếp | Đặc tả |
| --- | --- | --- | --- |
| `counter = n` (n < 2) | đăng nhập sai | `counter = n+1` | C3 |
| `counter = 2` | đăng nhập sai | `LOCKED` 30 giây | C4 |
| `counter = n` bất kỳ | đăng nhập đúng | `counter = 0` | suy ra từ "liên tiếp" (G2) |
| `LOCKED` | mọi lần đăng nhập | vẫn `LOCKED`, từ chối | C4 |
| `LOCKED` | hết 30 giây | `UNLOCKED, counter = 0` | C4 |

| ID | Chuỗi thao tác | Kết quả mong đợi (theo spec) |
| --- | --- | --- |
| TC-A1-031 | Reset tài khoản → sai **1** lần | 401; bộ đếm = **1** (C3) |
| TC-A1-032 | Reset → sai **2** lần liên tiếp | 401 cả hai lần; bộ đếm = **2**; **chưa** bị khóa (C3, C4) |
| TC-A1-033 | Reset → sai **3** lần liên tiếp | Lần 3 trả lỗi khóa (403); tài khoản chuyển `LOCKED` (C4) |
| TC-A1-034 | Sai 3 lần → rồi nhập **đúng** mật khẩu ngay | Vẫn bị từ chối — khóa phải chặn cả mật khẩu đúng **(G3)** |
| TC-A1-035 | Sai 3 lần → đợi **hết 30 giây** → nhập đúng mật khẩu | 200, có `token`; bộ đếm về 0 (C4) |
| TC-A1-036 | Reset → sai 2 lần → **đúng** 1 lần → sai 2 lần nữa | Không bị khóa, vì đăng nhập đúng đã reset bộ đếm **(G2)** |
| TC-A1-037 | Khóa tài khoản `test@eshop.com` → đăng nhập `admin@eshop.com` mật khẩu đúng | 200 — khóa chỉ áp cho **một** tài khoản, không lan sang tài khoản khác |
| TC-A1-038 | Reset → sai 5 lần liên tiếp (vượt ngưỡng) | Vẫn `LOCKED`, thời gian khóa **không** cộng dồn quá quy định |
| TC-A1-039 | Đăng nhập sai với email **không tồn tại** 3 lần | Không tạo được bản ghi khóa nào; không rò rỉ việc email có tồn tại hay không (C5) |

## Bước 1.6 — Kiểm thử bảo mật (SEC-01 → SEC-07)

**Prompt:** *"Chuyển sang trục bảo mật. Duyệt lần lượt SEC-01 đến SEC-07 và xác định cái nào áp dụng được cho endpoint `POST /api/login`. Với mỗi cái áp dụng được, sinh test case cụ thể kèm payload thật. Nêu rõ SEC nào KHÔNG áp dụng và vì sao."*

**Output AI:**

**Đối chiếu phạm vi:** SEC-01 ✓ · SEC-02 ✓ (endpoint này *sinh* ra token) · SEC-03 ✗ (không phải API admin) · SEC-04 ✗ (thuộc tầng giao diện) · SEC-05 ✓ · SEC-06 ✗ (không nhận `role`) · SEC-07 ✗ (thuộc FR-03 quên mật khẩu)

| ID | SEC | Kỹ thuật | Payload / thao tác | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- | --- |
| TC-A1-040 | SEC-05 | SQL injection — tautology | `email = "' OR '1'='1"` | 401, **không** đăng nhập được, **không** 500 |
| TC-A1-041 | SEC-05 | SQL injection — chèn chú thích | `email = "admin@eshop.com'--"` | 401, không bỏ qua được bước kiểm mật khẩu |
| TC-A1-042 | SEC-05 | SQL injection — dấu nháy đơn lẻ | `email = "O'Neill@eshop.com"` | 401 kèm JSON hợp lệ, **không** lộ thông báo lỗi CSDL |
| TC-A1-043 | SEC-05 | SQL injection ở `password` | `password = "' OR 1=1--"` | 401 |
| TC-A1-044 | SEC-01 | Lộ dữ liệu nhạy cảm | Đăng nhập đúng, soi toàn bộ response body | Response **tuyệt đối không** chứa trường `password` dưới bất kỳ dạng nào |
| TC-A1-045 | SEC-02 | Cấu trúc JWT | Đăng nhập đúng, tách `token` | Token gồm **3 phần** ngăn bởi dấu `.`, giải mã được phần payload |
| TC-A1-046 | SEC-02 | JWT phải có hạn dùng | Giải mã payload của token | Phải có claim `exp` **(G4)** — token vô hạn là lỗ hổng |
| TC-A1-047 | SEC-02 | JWT không được chứa dữ liệu nhạy cảm | Giải mã payload của token | Không chứa `password`, không chứa email dạng rõ nếu tránh được |
| TC-A1-048 | C5 | Rò rỉ qua thông báo lỗi | So sánh response của *email không tồn tại* và *email đúng + mật khẩu sai* | Hai response phải **giống hệt nhau** về status và message (C5) |
| TC-A1-049 | C5 | Rò rỉ qua thời gian phản hồi | Đo thời gian hai trường hợp trên | Chênh lệch không đủ để suy ra email có tồn tại hay không |
| TC-A1-050 | SEC-04 | Payload XSS trong email | `email = "<script>alert(1)</script>@x.com"` | 400/401, response trả JSON đã escape, không phải HTML |
| TC-A1-051 | SEC-02 | Injection kiểu đối tượng | `email = {"$ne": null}` | 400 — phải từ chối, không được coi là truy vấn |

## Bước 1.7 — Kiểm tra schema và tầng giao thức HTTP

**Prompt:** *"Bước cuối. Đặc tả nói response thành công trả về `token` và `user`. Hãy sinh test case kiểm tra schema của response — đúng hình dạng, đúng kiểu dữ liệu của từng trường — và các test case ở tầng giao thức HTTP (sai method, sai Content-Type, body hỏng). Viết luôn JSON Schema mà response 200 phải thỏa mãn."*

**Output AI:**

**JSON Schema mong đợi cho response 200:**

```json
{
  "type": "object",
  "required": ["message", "token", "user"],
  "properties": {
    "message": { "type": "string" },
    "token":   { "type": "string", "pattern": "^[\\w-]+\\.[\\w-]+\\.[\\w-]+$" },
    "user": {
      "type": "object",
      "required": ["id", "name", "email", "role"],
      "properties": {
        "id":    { "type": "integer" },
        "name":  { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "role":  { "type": "string", "enum": ["user", "admin"] }
      },
      "not": { "required": ["password"] }
    }
  }
}
```

| ID | Loại | Thao tác | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A1-052 | Schema | Đăng nhập đúng, kiểm response theo schema trên | Thỏa mãn hoàn toàn, không dư trường lạ |
| TC-A1-053 | Schema | Kiểm kiểu của `user.id` | Phải là số nguyên, không phải chuỗi |
| TC-A1-054 | Schema | Kiểm `user.role` | Chỉ nhận `"user"` hoặc `"admin"` |
| TC-A1-055 | Schema | Kiểm response lỗi 401 | Phải là JSON có trường mô tả lỗi, không phải HTML |
| TC-A1-056 | HTTP | `Content-Type: application/json` trên mọi response | Header đúng, kể cả khi lỗi |
| TC-A1-057 | HTTP | Gọi `GET /api/login` | 404 hoặc 405 — không được 200 |
| TC-A1-058 | HTTP | Gọi `PUT /api/login` | 404 hoặc 405 |
| TC-A1-059 | HTTP | Gửi body sai cú pháp JSON `{"email":` | 400, thông báo lỗi rõ ràng, không 500 |
| TC-A1-060 | HTTP | Gửi `Content-Type: text/plain` kèm body JSON | 400 hoặc 415 |

---

## Tổng kết bước 1

| Trục | Số test case | ID |
| --- | --- | --- |
| Phân vùng miền (email + password + biên) | 30 | TC-A1-001 → 030 |
| Chuyển trạng thái (khóa tài khoản) | 9 | TC-A1-031 → 039 |
| Bảo mật (SEC-01/02/04/05 + C5) | 12 | TC-A1-040 → 051 |
| Kiểm schema + giao thức HTTP | 9 | TC-A1-052 → 060 |
| **Tổng** | **60** | vượt mức ≥ 35 của đề (mục 6:82) |

**Số lượt prompt để đạt kết quả này: 7** — mỗi lượt một kỹ thuật kiểm thử, đúng yêu cầu
"dẫn AI qua từng bước của kỹ thuật như đã dạy trên lớp" (mục 2:20).

> ⚠️ **Toàn bộ nội dung trên là output thô của AI, CHƯA qua thẩm định.**
> Cột "kết quả mong đợi" mới chỉ là *điều đặc tả đòi hỏi*, chưa đối chiếu với hành vi thật của SUT.
> Việc thẩm định nằm ở `Audit.md` (bước 2).
