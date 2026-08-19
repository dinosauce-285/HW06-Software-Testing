# API 2 — `POST /api/checkout` — Bước 1: Test case do AI sinh (nguyên văn)

> **Đề mục 6:82.** Đưa đặc tả cho AI và dẫn dắt **từng bước**, không dùng prompt gộp.
> Mục tiêu ≥ 35 case, phủ 4 trục: phân vùng miền, chuyển trạng thái, bảo mật, kiểm schema.
>
> **Công cụ AI:** Claude Opus 5 (Claude Code CLI) — **Ngày:** 19/08/2026
> **Nguyên tắc cách ly:** AI chỉ được đọc `sut/api_specification.md` (§4.2, §4.3, §4.4, §4.5) và
> `sut/README.md` (FR-07, FR-08, FR-10, SEC-01–07). **Không** được đọc `sut/backend/server.js`.
> Lý do đã trình bày ở `api1/AI-Generated-Raw.md`: sinh từ mã nguồn thì expected sẽ chép lại đúng
> hành vi sai của chương trình, và mọi test đều PASS.

## Đặc tả dùng làm đầu vào

**`api_specification.md` §4.3 — Đặt hàng**
- Endpoint: `POST /api/checkout` · Header: `Authorization: Bearer <token>`
- Body: `{"total_amount": 200000, "shipping_address": "123 Le Loi, TP.HCM"}`

**`README.md` — FR-08: Thanh toán**
- Chỉ người dùng **đã đăng nhập** mới thanh toán được.
- Tổng tiền **tính tự động từ giỏ hàng**, người dùng **không được chỉnh sửa trực tiếp**.
- **Backend phải tự tính lại tổng tiền; không chấp nhận giá trị `total_amount` do client gửi lên.**
- Sau thanh toán thành công, **giỏ hàng được xóa**.

**`README.md` — FR-10: máy trạng thái đơn hàng**
- 5 trạng thái: `pending → confirmed → shipping → delivered`, cộng nhánh `canceled`.
- Đơn mới tạo vào trạng thái **`pending`**.
- `delivered` và `canceled` là trạng thái **kết thúc**.

**`api_specification.md` §4.2 — Thêm vào giỏ:** `POST /api/cart`, body `{"id", "name", "price", "quantity"}`
**§4.4 — Lịch sử đơn:** `GET /api/orders/my-orders` · **§4.5 — Chi tiết đơn:** `GET /api/orders/:id`

---

## Bước 2.1 — Rút ràng buộc kiểm thử từ đặc tả

**Prompt:** *"Đọc đặc tả `POST /api/checkout` ở trên. Chưa sinh test case. Trước hết liệt kê: (a) tham số đầu vào, (b) mọi ràng buộc đặc tả nêu ra, (c) những gì phải thay đổi trong hệ thống sau một lần gọi thành công, (d) chỗ đặc tả nói mập mờ. Trình bày thành bảng."*

**Output AI:**

**(a) Đầu vào**

| Tham số | Kiểu | Bắt buộc | Nguồn |
| --- | --- | --- | --- |
| `Authorization` | header | **Có** | `Bearer <JWT>` |
| `total_amount` | number | Có (theo ví dụ) | body JSON |
| `shipping_address` | string | Có (theo ví dụ) | body JSON |

**(b) Ràng buộc**

| Mã | Ràng buộc | Nguồn |
| --- | --- | --- |
| D1 | Phải đăng nhập mới thanh toán được | FR-08 |
| D2 | **Backend tự tính lại tổng tiền, KHÔNG nhận `total_amount` từ client** | FR-08 |
| D3 | Tổng tiền lấy từ giỏ hàng của chính người dùng đó | FR-08 |
| D4 | Sau khi thành công, **giỏ hàng bị xóa** | FR-08 |
| D5 | Đơn mới tạo ở trạng thái **`pending`** | FR-10 |
| D6 | Response trả về định danh đơn hàng | §4.3 |
| D7 | Truy vấn CSDL phải parameterized | SEC-05 |
| D8 | API bảo mật phải yêu cầu JWT hợp lệ | SEC-02 |

**(c) Hệ quả sau một lần gọi thành công — đây mới là phần đáng kiểm nhất**

Endpoint này **ghi dữ liệu**, nên không thể chỉ kiểm response. Phải kiểm cả 4 hệ quả:

1. Có một bản ghi đơn hàng mới, `status = 'pending'`
2. `total_amount` của đơn **bằng tổng giỏ hàng do backend tự tính**, không bằng số client gửi
3. Đơn thuộc về **đúng** người dùng gắn với token
4. **Giỏ hàng rỗng đi**

**(d) Chỗ đặc tả bỏ trống**

| # | Đặc tả không nói | Vì sao cần test |
| --- | --- | --- |
| H1 | Thanh toán khi **giỏ rỗng** thì sao | Tổng tiền tính từ giỏ, mà giỏ rỗng thì tổng = 0 — có được tạo đơn không? |
| H2 | Vì sao body vẫn có `total_amount` nếu backend không nhận | Mâu thuẫn nội tại giữa §4.3 và FR-08 — **phải kiểm bên nào thắng** |
| H3 | Có kiểm tồn kho không | FR-08 không nhắc tới tồn kho |
| H4 | Giới hạn độ dài `shipping_address` | Không nêu ngưỡng |
| H5 | `shipping_address` có bắt buộc không | Ví dụ có nhưng không nói rõ |

> **Ghi chú của AI:** mục H2 là điểm căng nhất của đặc tả này. §4.3 mô tả body **có** `total_amount`,
> trong khi FR-08 nói thẳng backend **không được chấp nhận** giá trị đó. Tôi sẽ coi FR-08 là chuẩn
> (yêu cầu nghiệp vụ thắng ví dụ minh họa) và sinh test case theo hướng đó.

---

## Bước 2.2 — Phân vùng tương đương trên `total_amount`

**Prompt:** *"Tập trung vào `total_amount`. Áp dụng phân vùng tương đương. Nhớ ràng buộc D2: backend phải tự tính lại và bỏ qua giá trị client gửi. Với mỗi case ghi rõ giỏ hàng được dựng thế nào, vì kết quả mong đợi phụ thuộc vào giỏ chứ không phụ thuộc số client gửi."*

**Output AI:**

Mọi case dưới đây dựng giỏ trước bằng `POST /api/cart` với **1 sản phẩm giá 100 000 × 2 = 200 000 ₫**,
trừ khi ghi khác.

| ID | Lớp tương đương | `total_amount` client gửi | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A2-001 | Hợp lệ — khớp giỏ | `200000` | 200, tạo đơn, đơn có tổng = **200 000** |
| TC-A2-002 | **Sai lệch — thấp hơn giỏ** | `1` | 200 nhưng đơn phải ghi **200 000**, không phải 1 (D2) |
| TC-A2-003 | **Sai lệch — bằng 0** | `0` | Đơn vẫn phải ghi **200 000** (D2) |
| TC-A2-004 | **Sai lệch — số âm** | `-500000` | Đơn phải ghi **200 000**; tuyệt đối không tạo đơn tổng âm |
| TC-A2-005 | Sai lệch — cao hơn giỏ | `999999999` | Đơn phải ghi **200 000** |
| TC-A2-006 | Sai kiểu — chuỗi chữ | `"abc"` | Bị bỏ qua, đơn ghi **200 000** |
| TC-A2-007 | Sai kiểu — chuỗi số | `"200000"` | Bị bỏ qua, đơn ghi **200 000** |
| TC-A2-008 | Sai kiểu — boolean | `true` | Bị bỏ qua, đơn ghi **200 000** |
| TC-A2-009 | Thiếu hẳn trường | *(không gửi)* | 200 — vì backend tự tính, trường này lẽ ra không cần |
| TC-A2-010 | `null` | `null` | Bị bỏ qua, đơn ghi **200 000** |
| TC-A2-011 | Số thực | `200000.55` | Đơn ghi **200 000** |
| TC-A2-012 | Ký hiệu khoa học | `2e5` | Đơn ghi **200 000** |
| TC-A2-013 | Số rất lớn (tràn) | `1e308` | Đơn ghi **200 000**, không sập server |

> **Ghi chú của AI:** cả 13 case này có chung một oracle — **tổng tiền của đơn được tạo phải bằng
> tổng giỏ hàng**, bất kể client gửi gì. Đó chính là cách kiểm D2. Nếu bất kỳ case nào tạo ra đơn
> mang đúng con số client gửi thì đó là lỗ hổng nghiệp vụ nghiêm trọng: khách trả tiền tùy ý.

## Bước 2.3 — Phân vùng tương đương trên `shipping_address`

**Prompt:** *"Chuyển sang `shipping_address`, giữ giỏ hàng và `total_amount` ở giá trị hợp lệ. Vẫn dùng phân vùng tương đương. Nếu đặc tả không nói trường này có bắt buộc hay không thì ghi rõ đó là giả định của bạn."*

**Output AI:**

| ID | Lớp tương đương | `shipping_address` | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A2-014 | Hợp lệ | `"123 Le Loi, Q1, TP.HCM"` | 200, đơn lưu đúng địa chỉ |
| TC-A2-015 | Rỗng | `""` | 400 — *giả định:* đơn hàng không thể thiếu địa chỉ giao |
| TC-A2-016 | Thiếu hẳn trường | *(không gửi)* | 400 — cùng giả định |
| TC-A2-017 | Chỉ có khoảng trắng | `"     "` | 400 — cùng giả định |
| TC-A2-018 | Rất dài — 5 000 ký tự | `"a"×5000` | 400 hoặc 200 kèm cắt bớt; **không được** 500 |
| TC-A2-019 | Có dấu tiếng Việt | `"số 5, đường Nguyễn Huệ, Quận 1"` | 200, lưu và trả về **nguyên vẹn** dấu |
| TC-A2-020 | Emoji | `"123 Le Loi 🏠"` | 200, không vỡ mã hóa |
| TC-A2-021 | Sai kiểu — số | `12345` | 400 |
| TC-A2-022 | `null` | `null` | 400 |
| TC-A2-023 | Xuống dòng nhiều lần | `"123 Le Loi\n\n\nQ1"` | 200, giữ nguyên hoặc chuẩn hóa |

## Bước 2.4 — Phân tích giá trị biên

**Prompt:** *"Áp dụng phân tích giá trị biên. Chú ý biên nằm ở SỐ LƯỢNG và GIÁ trong giỏ hàng, vì tổng tiền là hàm của chúng — không phải ở con số client gửi lên."*

**Output AI:**

| ID | Biên | Cách dựng | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A2-024 | Giỏ có **1** sản phẩm, số lượng 1 | 1 × 100 000 | 200, đơn = **100 000** |
| TC-A2-025 | Số lượng = 0 | 1 sản phẩm, `quantity = 0` | Đơn = **0** hoặc từ chối; không được ra số âm |
| TC-A2-026 | Số lượng âm | `quantity = -5` | **400** — số lượng âm là vô nghĩa, sẽ làm tổng tiền âm |
| TC-A2-027 | Số lượng rất lớn | `quantity = 1000000` | Đơn = tích đúng, không tràn số |
| TC-A2-028 | Giá âm trong giỏ | `price = -100000` | **400** — không được tạo đơn tổng âm |
| TC-A2-029 | Giỏ nhiều dòng | 3 sản phẩm khác nhau | Đơn = **đúng tổng** cả 3 dòng |
| TC-A2-030 | Địa chỉ 1 ký tự | `"a"` | 200 hoặc 400 tùy quy tắc; **không** 500 |

## Bước 2.5 — Kiểm thử chuyển trạng thái và hệ quả sau ghi

**Prompt:** *"Giờ tới trục chuyển trạng thái. `POST /api/checkout` là điểm SINH RA đơn hàng, tức là điểm vào của máy trạng thái FR-10. Sinh test case kiểm: (1) trạng thái khởi tạo, (2) bốn hệ quả bạn đã liệt kê ở bước 2.1 mục (c), (3) hành vi khi gọi lặp lại. Mỗi case ghi rõ chuỗi thao tác."*

**Output AI:**

| ID | Chuỗi thao tác | Kết quả mong đợi (theo spec) |
| --- | --- | --- |
| TC-A2-031 | Thêm vào giỏ → checkout → đọc đơn vừa tạo | `status = "pending"` (D5) — điểm vào máy trạng thái FR-10 |
| TC-A2-032 | Thêm vào giỏ → checkout → `GET /api/cart` | **Giỏ rỗng** (D4) |
| TC-A2-033 | Giỏ **rỗng** → checkout luôn | **400** — không có gì để đặt (H1) |
| TC-A2-034 | Thêm vào giỏ → checkout → checkout **lần nữa** | Lần hai phải **400**, vì giỏ đã bị xóa ở lần một |
| TC-A2-035 | Checkout → `GET /api/orders/my-orders` | Đơn mới nằm trong danh sách của **chính** người dùng đó |
| TC-A2-036 | Checkout → so tổng đơn với tổng giỏ tự tính | Hai số **bằng nhau** (D2, D3) |
| TC-A2-037 | Thêm cùng một sản phẩm **hai lần** → checkout | Tổng = giá × tổng số lượng, không nhân đôi nhầm (FR-07) |
| TC-A2-038 | User A checkout → đăng nhập User B → `GET /api/cart` | Giỏ của B **không** bị ảnh hưởng — giỏ tách theo người dùng |
| TC-A2-039 | Checkout → đơn phải xuất hiện ở `GET /api/admin/orders` | Đơn nhìn thấy được ở phía admin |

## Bước 2.6 — Kiểm thử bảo mật

**Prompt:** *"Trục bảo mật. Duyệt SEC-01 → SEC-07, nêu rõ cái nào áp dụng cho endpoint này và cái nào không. Sau đó — và đây là phần tôi muốn bạn nghĩ kỹ — hãy tự hỏi ngoài danh sách SEC ra thì endpoint GHI DỮ LIỆU như thế này còn rủi ro gì khác. Đừng chỉ bó trong 7 mục."*

**Output AI:**

**Đối chiếu phạm vi:** SEC-01 ✗ (không đụng mật khẩu) · SEC-02 ✓ · SEC-03 ✗ (không phải API admin)
· SEC-04 ✓ (địa chỉ do người dùng nhập, sẽ hiển thị lại) · SEC-05 ✓ · SEC-06 ✓ (theo nghĩa rộng:
client không được tự đặt trường thuộc về server) · SEC-07 ✗

| ID | Loại | Thao tác | Kết quả mong đợi (theo spec) |
| --- | --- | --- | --- |
| TC-A2-040 | SEC-02 | Gọi **không có** header `Authorization` | **401** (D1) |
| TC-A2-041 | SEC-02 | Token sai định dạng `Bearer abc.def` | 401/403 |
| TC-A2-042 | SEC-02 | Token đúng cấu trúc nhưng **sai chữ ký** | 401/403 |
| TC-A2-043 | SEC-02 | Header `Authorization` rỗng | 401 |
| TC-A2-044 | SEC-02 | Thiếu tiền tố `Bearer`, gửi mỗi token | 401 |
| TC-A2-045 | **Ngoài SEC** | Body kèm `"user_id": <id người khác>` | Bị **bỏ qua**; đơn phải thuộc về chủ token |
| TC-A2-046 | **Ngoài SEC** | Body kèm `"status": "delivered"` | Bị **bỏ qua**; đơn vẫn phải là `pending` (D5) |
| TC-A2-047 | **Ngoài SEC** | Body kèm `"id": 999999` | Bị bỏ qua; định danh đơn do server sinh |
| TC-A2-048 | SEC-05 | SQLi trong `shipping_address`: `', 'x'); DROP TABLE orders;--` | Lưu **nguyên văn** chuỗi đó, bảng `orders` còn nguyên |
| TC-A2-049 | SEC-04 | XSS trong `shipping_address`: `<script>alert(1)</script>` | Lưu và trả về đã escape, response là JSON |
| TC-A2-050 | **Ngoài SEC** | User A tạo đơn → User B đọc `GET /api/orders/<id của A>` | **403/404** — B không được xem đơn của A (IDOR) |
| TC-A2-051 | **Ngoài SEC** | Giả mạo giá: đưa vào giỏ `price = 1` cho sản phẩm giá 30 triệu | Backend phải lấy giá **từ CSDL**, không lấy giá client gửi |

> **Ghi chú của AI:** ba mục "Ngoài SEC" ở trên (TC-A2-045, 046, 047) đều cùng một khuôn — **client
> tự ý đặt trường vốn thuộc quyền server** (mass assignment). Danh sách SEC-01→07 không có mục nào
> nói về nó, nhưng với một endpoint ghi dữ liệu thì đây là rủi ro rõ ràng nhất. TC-A2-051 cũng vậy:
> nếu giá lấy từ giỏ do client tự khai thì việc backend "tự tính lại tổng" chẳng có ý nghĩa gì.

## Bước 2.7 — Kiểm schema và tầng giao thức HTTP

**Prompt:** *"Bước cuối. Viết JSON Schema cho response thành công, cho đối tượng đơn hàng trả về ở `GET /api/orders/:id`, và sinh test case tầng HTTP."*

**Output AI:**

**Schema response 200 của `POST /api/checkout`:**
```json
{
  "type": "object",
  "required": ["message", "orderId"],
  "properties": {
    "message": { "type": "string" },
    "orderId": { "type": "integer", "minimum": 1 }
  }
}
```

**Schema đối tượng đơn hàng:**
```json
{
  "type": "object",
  "required": ["id", "user_id", "total_amount", "status", "shipping_address"],
  "properties": {
    "id":               { "type": "integer" },
    "user_id":          { "type": "integer" },
    "total_amount":     { "type": "number", "minimum": 0 },
    "status":           { "type": "string", "enum": ["pending","confirmed","shipping","delivered","canceled"] },
    "shipping_address": { "type": "string" }
  }
}
```

| ID | Loại | Thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A2-052 | Schema | Checkout thành công | Response khớp schema, `orderId` là **số nguyên** |
| TC-A2-053 | Schema | Đọc đơn vừa tạo | Khớp schema đơn hàng; `total_amount` **≥ 0** |
| TC-A2-054 | Schema | `status` của đơn mới | Thuộc đúng 5 giá trị enum, và phải là `pending` |
| TC-A2-055 | Schema | Response lỗi khi thiếu token | JSON có trường mô tả lỗi, không phải HTML |
| TC-A2-056 | HTTP | `GET /api/checkout` | 404 hoặc 405 |
| TC-A2-057 | HTTP | `PUT /api/checkout` | 404 hoặc 405 |
| TC-A2-058 | HTTP | Body JSON hỏng | 400 kèm thân JSON |
| TC-A2-059 | HTTP | `Content-Type: text/plain` | 400 hoặc 415, không được 500 |
| TC-A2-060 | HTTP | `Content-Type: application/json` trên mọi response | Đúng kể cả ở nhánh lỗi |

---

## Tổng kết bước 1

| Trục | Số case | ID |
| --- | --- | --- |
| Phân vùng miền (`total_amount`, `shipping_address`) | 23 | TC-A2-001 → 023 |
| Giá trị biên (số lượng, giá, độ dài) | 7 | TC-A2-024 → 030 |
| Chuyển trạng thái và hệ quả sau ghi | 9 | TC-A2-031 → 039 |
| Bảo mật | 12 | TC-A2-040 → 051 |
| Schema và HTTP | 9 | TC-A2-052 → 060 |
| **Tổng** | **60** | vượt mức ≥ 35 của đề |

**Số lượt prompt: 7.**

**Khác biệt so với API 1:** ở API 1 tôi hỏi *"duyệt SEC-01→07"* và AI bó gọn trong 7 mục, bỏ trắng
trục tính sẵn sàng — bài học đã ghi ở `api1/Extended.md` mục 2. Lần này tôi thêm vế *"ngoài danh
sách SEC ra còn rủi ro gì khác"*, và AI tự tìm ra được nhóm mass assignment (TC-A2-045→047) lẫn
chuyện giả mạo giá (TC-A2-051) — những thứ mà ở API 1 nó sẽ không nghĩ tới.

> ⚠️ **Đây là output thô, chưa thẩm định.** Cột "kết quả mong đợi" mới là *điều đặc tả đòi hỏi*.
> Thẩm định ở `Audit.md`.
