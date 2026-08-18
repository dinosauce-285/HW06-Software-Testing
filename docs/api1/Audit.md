# API 1 — `POST /api/login` — Bước 2: Thẩm định của người (Audit)

> **Đề mục 6:83.** Gán nhãn **VALID / INVALID / INCOMPLETE** cho từng test case AI sinh ra, kèm lý do,
> và sửa những case sai hoặc thiếu. *"Bạn hoàn toàn chịu trách nhiệm về bộ test case cuối cùng."*
>
> **Người thẩm định:** 23127262 — **Ngày:** 18/08/2026
> **Đối tượng:** 60 test case ở `AI-Generated-Raw.md`

## 1. Định nghĩa nhãn (chốt trước khi soi, để không tự bẻ tiêu chí giữa chừng)

| Nhãn | Nghĩa | Cách xử lý |
| --- | --- | --- |
| **VALID** | Test case đúng: bám vào một ràng buộc **có thật** trong đặc tả, có oracle rõ ràng, tái hiện được | Giữ nguyên |
| **INVALID** | Test case sai: khẳng định một yêu cầu mà **đặc tả không hề đặt ra**, hoặc lập luận sai bản chất | Sửa lại *expected*, hoặc hạ xuống mức khuyến nghị |
| **INCOMPLETE** | Ý tưởng đúng nhưng thiếu điều kiện tiền đề, thiếu cách quan sát kết quả, hoặc oracle mơ hồ ("400 hoặc 401") | Bổ sung cho đủ để chạy tự động được |

> **Nguyên tắc phân biệt quan trọng:** một test case **thất bại vì SUT có lỗi thì vẫn là VALID** —
> đó chính là công dụng của nó. Chỉ gán INVALID khi bản thân *test case* sai, không phải khi
> *hệ thống* sai.

## 2. Hành vi thật của SUT — đo trực tiếp bằng `curl` trước khi gán nhãn

Không thể thẩm định nếu chỉ đọc đặc tả. Toàn bộ số liệu dưới đây tôi đo trên SUT đang chạy
(`localhost:3000`, commit `85af3ba`), reset DB sạch trước mỗi nhóm phép đo.

| Phép đo | Đặc tả đòi | SUT thực tế |
| --- | --- | --- |
| Bộ đếm sau mỗi lần sai | +1 | **+2** (0 → 2 → 4) |
| Số lần sai trước khi khóa | ≥ 3 | **2** |
| Thời lượng khóa | 30 giây | **180 giây** |
| Thông báo khi bị khóa | không lộ nguyên nhân | `"Tài khoản đã bị khóa. Vui lòng thử lại sau."` — **lộ thẳng** |
| Đang khóa + mật khẩu đúng | phải chặn | 403, chặn đúng ✔ |
| Đăng nhập đúng | reset bộ đếm | về 0 ✔ |
| Response đăng nhập thành công | không lộ mật khẩu | chứa `"password":"Test1234!"` **plaintext** |
| JWT | phải hợp lệ | `{id, role, iat}` — **không có `exp`** |
| Email sai định dạng | *(đặc tả giao cho tầng UI)* | 401, API không kiểm định dạng |
| Email không tồn tại vs sai mật khẩu | phải giống nhau | giống hệt: 401 `Invalid email or password` ✔ |
| SQL injection ở `email`/`password` | phải an toàn | 401, **an toàn** ✔ (dùng parameterized query) |
| `GET` / `PUT /api/login` | 404/405 | 404 ✔ (nhưng body là HTML) |
| Body JSON hỏng | 400 | 400 ✔ (nhưng body là **HTML**) |
| `Content-Type: text/plain` | 400/415 | **500** |
| Mật khẩu 1 000 ký tự, email 321 ký tự | không sập | 401 ✔ |

## 3. Ba lỗi hệ thống của bộ test AI sinh ra

Trước khi vào bảng 60 dòng, đây là ba khuôn lỗi lặp lại — chúng giải thích gần hết số nhãn xấu:

**(a) AI gán yêu cầu của tầng giao diện cho tầng API.** FR-02 ghi *"Trường email phải dùng
`type="email"` (có validate HTML5 format)"* — đây là ràng buộc của **form HTML**, không phải của
endpoint. AI đọc thành "API phải trả 400 khi email sai định dạng" rồi sinh ra 6 test case dựa trên
điều đó. API trả 401 là **không vi phạm đặc tả nào cả**. Nếu tôi nộp nguyên si, tôi sẽ báo 6 bug ma.

**(b) AI kéo ràng buộc của FR-01 (đăng ký) sang FR-02 (đăng nhập).** Quy tắc "mật khẩu ≥ 8 ký tự,
đủ 4 nhóm" chi phối lúc **tạo** mật khẩu. Endpoint đăng nhập chỉ so khớp chuỗi — nó **không được
phép** từ chối vì lý do độ phức tạp, nếu không thì tài khoản cũ sẽ không đăng nhập được. Hai test
case TC-024/025 tuy vẫn trả 401 nhưng **đúng vì lý do sai** (sai mật khẩu, chứ không phải vì ngắn),
nên chúng là oracle giả.

**(c) AI viết test chuyển trạng thái mà quên trạng thái.** Cả 9 case TC-031→039 đều không ghi
**điều kiện tiền đề** (phải reset tài khoản trước) và không nói **quan sát bộ đếm bằng cách nào**.
Tôi phát hiện điều này lúc chạy thử: chạy tuần tự từ TC-017 xuống, đến TC-021 thì nhận 403 thay vì
401 — vì các case phía trên đã vô tình làm khóa tài khoản. Một bộ test có phụ thuộc trạng thái ngầm
sẽ cho kết quả khác nhau tùy thứ tự chạy, tức là **không dùng được trong CI**.

## 4. Bảng thẩm định đầy đủ 60 test case

### 4.1 Phân vùng miền — `email` (TC-001 → 014)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-001 | **VALID** | Đường hạnh phúc, oracle rõ (C6) | — |
| TC-002 | **VALID** | Email chưa đăng ký → 401 chung chung, đúng C5 | — |
| TC-003 | **INVALID** | Khuôn (a): đòi API kiểm định dạng, đặc tả giao cho UI | expected → **401** |
| TC-004 | **INVALID** | Khuôn (a) | expected → **401** |
| TC-005 | **INVALID** | Khuôn (a) | expected → **401** |
| TC-006 | **INVALID** | Khuôn (a) | expected → **401** |
| TC-007 | **INVALID** | Khuôn (a) | expected → **401** |
| TC-008 | **INVALID** | Đòi 400 cho email rỗng — đặc tả không nêu | expected → **401**; ghi vào mục *khuyến nghị*, không phải bug |
| TC-009 | **INVALID** | Như trên, với trường bị thiếu hẳn | expected → **401** |
| TC-010 | **INVALID** | Khuôn (a) | expected → **401** |
| TC-011 | **INCOMPLETE** | Oracle bỏ ngỏ: *"200 nếu trim, hoặc 400"* — không tự động hóa được | Chốt **401** (đo được), ghi chú: SUT không trim |
| TC-012 | **INCOMPLETE** | Oracle bỏ ngỏ | Chốt **401**; ghi chú: email **phân biệt hoa/thường**, lệch RFC 5321 nhưng đặc tả im lặng → khuyến nghị |
| TC-013 | **INVALID** | Đòi 400 cho sai kiểu — đặc tả không nêu | expected → **401** |
| TC-014 | **INVALID** | Như trên | expected → **401** |

### 4.2 Phân vùng miền — `password` (TC-015 → 023)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-015 | **VALID** | Đường hạnh phúc | — |
| TC-016 | **VALID** | Có oracle kép: 401 **và** bộ đếm +1 (C3) | — |
| TC-017 | **INVALID** | Đòi 400 cho mật khẩu rỗng | expected → **401** |
| TC-018 | **INVALID** | Đòi 400 cho trường thiếu | expected → **401** |
| TC-019 | **VALID** | Mật khẩu toàn khoảng trắng phải bị từ chối | — |
| TC-020 | **VALID** | Mật khẩu **phải** phân biệt hoa/thường — ràng buộc thật | — |
| TC-021 | **INVALID** | Đòi 400 cho sai kiểu | expected → **401** |
| TC-022 | **INVALID** | Như trên | expected → **401** |
| TC-023 | **VALID** | Mật khẩu đúng nhưng của tài khoản khác → phải 401. Test quan trọng | — |

### 4.3 Giá trị biên (TC-024 → 030)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-024 | **INVALID** | Khuôn (b): áp ràng buộc FR-01 lên endpoint đăng nhập | Đổi mục đích: dùng làm case *mật khẩu sai độ dài bất kỳ vẫn 401*, bỏ lập luận về ngưỡng 8 |
| TC-025 | **INVALID** | Khuôn (b), cùng lý do | Gộp vào TC-024 sau khi sửa |
| TC-026 | **VALID** | Chống sập vì đầu vào dài — oracle rõ (không 500) | — |
| TC-027 | **INCOMPLETE** | Có nêu giả định RFC 5321 (tốt) nhưng thiếu oracle cho trường hợp SUT không giới hạn | Chốt **401**, khẳng định thêm `response time < 2 s` |
| TC-028 | **INCOMPLETE** | Oracle *"400 hoặc 401"* quá lỏng | Chốt: **không phải 5xx** |
| TC-029 | **VALID** | Biên dưới phần local | — |
| TC-030 | **INVALID** | Đòi 400 cho body rỗng | expected → **401** |

### 4.4 Chuyển trạng thái — khóa tài khoản (TC-031 → 039)

Cả 9 case đều dính khuôn (c). Ý tưởng đúng, phủ máy trạng thái tốt, nhưng **không case nào chạy
được** ở dạng AI viết ra. Bổ sung chung cho cả nhóm:

- **Tiền đề bắt buộc:** chạy `./scripts/reset-db.sh` (hoặc gọi API đăng nhập đúng một lần) để đưa
  `login_attempts` về 0 **trước mỗi** case.
- **Cách quan sát bộ đếm:** `GET /api/admin/users` bằng token admin, đọc `login_attempts` và
  `locked_until` của `test@eshop.com`. Không có cách nào khác nhìn thấy bộ đếm từ phía client.

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-031 | **INCOMPLETE** | Thiếu tiền đề + cách quan sát | Thêm cả hai. **Chạy thật: counter = 2, không phải 1** → giữ expected theo spec, đây là bug |
| TC-032 | **INCOMPLETE** | Như trên | Thêm cả hai. **Chạy thật: sau 2 lần sai đã bị khóa** → bug |
| TC-033 | **INCOMPLETE** | Như trên | Thêm cả hai. **Chạy thật: khóa từ lần 2** → bug |
| TC-034 | **INCOMPLETE** | Thiếu tiền đề | Thêm. Chạy thật: 403, **SUT xử lý đúng** ✔ |
| TC-035 | **INCOMPLETE** | Không nói chờ tối đa bao lâu, chờ bằng cách nào | Chốt: chờ 30 s rồi thử lại. **Chạy thật: vẫn khóa, phải chờ 180 s** → bug |
| TC-036 | **INCOMPLETE** | Thiếu cách quan sát | Thêm. Chạy thật: đăng nhập đúng reset về 0, **SUT xử lý đúng** ✔ |
| TC-037 | **INCOMPLETE** | Thiếu tiền đề cho tài khoản thứ hai | Thêm. Case này **quan trọng** — chứng minh khóa không lan sang tài khoản khác |
| TC-038 | **INCOMPLETE** | Oracle mơ hồ: *"không cộng dồn quá quy định"* | Chốt: `locked_until` sau lần sai thứ 5 **không** xa hơn sau lần thứ 3 |
| TC-039 | **INCOMPLETE** | Thiếu oracle đo được | Chốt: 3 lần sai với email không tồn tại → cả 3 đều trả **đúng cùng một** 401, không lần nào ra 403 |

### 4.5 Bảo mật (TC-040 → 051)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-040 | **VALID** | SQLi tautology, oracle rõ. Chạy thật: **an toàn** ✔ | — |
| TC-041 | **VALID** | SQLi chèn chú thích. Chạy thật: **an toàn** ✔ | — |
| TC-042 | **VALID** | Dấu nháy đơn lẻ — case tốt nhất trong nhóm vì bắt cả lỗi rò rỉ thông báo CSDL. Chạy thật: **an toàn** ✔ | — |
| TC-043 | **VALID** | SQLi ở `password`. Chạy thật: **an toàn** ✔ | — |
| TC-044 | **VALID** | **Case giá trị nhất cả bộ.** Chạy thật: response chứa `"password":"Test1234!"` → vi phạm SEC-01 | — |
| TC-045 | **VALID** | Cấu trúc JWT 3 phần. Chạy thật: đạt ✔ | — |
| TC-046 | **VALID** | Đòi claim `exp`. Chạy thật: **không có `exp`** → token vĩnh viễn, vi phạm tinh thần SEC-02 | — |
| TC-047 | **VALID** | Payload JWT không chứa dữ liệu nhạy cảm. Chạy thật: chỉ có `{id, role, iat}` ✔ | — |
| TC-048 | **VALID** | So sánh hai thông báo lỗi — đúng trọng tâm C5. Chạy thật: giống hệt ✔ | — |
| TC-049 | **INCOMPLETE** | Kênh phụ thời gian: không nêu **cỡ mẫu** cũng không nêu **ngưỡng** → không kết luận được | Chốt: 20 lần mỗi nhóm, so trung vị, ngưỡng chênh < 50 ms |
| TC-050 | **VALID** | Payload XSS + đòi response là JSON đã escape. Chạy thật: 401 JSON ✔ | — |
| TC-051 | **INCOMPLETE** | Đòi cứng 400; trả 401 cũng là hành vi an toàn | Chốt: **không được** 200 và **không được** 5xx |

### 4.6 Schema và giao thức HTTP (TC-052 → 060)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-052 | **VALID** | Có JSON Schema cụ thể, kiểm được bằng `ajv` trong Postman. Mệnh đề `"not": {"required": ["password"]}` là điểm sáng — nó biến SEC-01 thành ràng buộc schema | — |
| TC-053 | **VALID** | Kiểu của `user.id` | — |
| TC-054 | **VALID** | `user.role` chỉ nhận 2 giá trị | — |
| TC-055 | **VALID** | Response lỗi phải là JSON. Chạy thật: 401 trả JSON ✔ | — |
| TC-056 | **VALID** | `Content-Type` đúng trên **mọi** response — chạy thật: 401 đạt, nhưng 404 và 400 trả `text/html` → lỗi | — |
| TC-057 | **VALID** | Sai method. Chạy thật: 404 ✔ | — |
| TC-058 | **VALID** | Sai method. Chạy thật: 404 ✔ | — |
| TC-059 | **INCOMPLETE** | Chỉ khẳng định status 400, bỏ sót phần thân. Chạy thật: 400 nhưng thân là **HTML** | Bổ sung khẳng định `Content-Type: application/json` |
| TC-060 | **VALID** | Chạy thật: **500** thay vì 400/415 → lỗi | — |

## 5. Kết quả thẩm định

| Nhãn | Số lượng | Tỉ lệ |
| --- | --- | --- |
| **VALID** | 27 | 45,0 % |
| **INVALID** | 18 | 30,0 % |
| **INCOMPLETE** | 15 | 25,0 % |
| **Tổng** | **60** | 100 % |

**Sau khi sửa:** 18 case INVALID đã đổi *expected*, 2 trong số đó (TC-024, TC-025) gộp làm một vì
trùng mục đích sau khi bỏ lập luận sai → **bộ test case cuối cùng còn 59 case**, tất cả đều chạy
tự động được và không phụ thuộc thứ tự.

**Nhận xét:** AI mạnh ở **độ phủ** — nó không bỏ sót trục nào, tự nhận ra 6 điểm đặc tả bỏ trống ở
bước 1.1, và tự viết được JSON Schema có mệnh đề `not.required` để biến SEC-01 thành ràng buộc kiểm
được. Nhưng AI yếu ở **tính thi hành**: 25 % số case không chạy được vì thiếu tiền đề hoặc oracle mơ
hồ, và 30 % khẳng định những yêu cầu mà đặc tả không hề đặt ra. Nói ngắn gọn: AI viết ra *ý tưởng
kiểm thử*, không phải *test case*.

## 6. Ứng viên bug phát hiện qua thẩm định

Chuyển sang `../Bug-Report.md` sau khi chạy Newman xác nhận:

| # | Test case bắt được | Mô tả | Vi phạm |
| --- | --- | --- | --- |
| 1 | TC-044 | Response đăng nhập trả về `password` dạng plaintext | SEC-01 |
| 2 | TC-031, 032, 033 | Bộ đếm tăng **2** mỗi lần sai → khóa từ lần thứ **2** | FR-02 (C3, C4) |
| 3 | TC-035 | Khóa **180 giây** thay vì 30 giây | FR-02 (C4) |
| 4 | *(chưa có case — bổ sung ở bước 3)* | Thông báo khóa nói thẳng lý do | FR-02 (C5) |
| 5 | TC-046 | JWT không có `exp` → token dùng vĩnh viễn | SEC-02 |
| 6 | TC-060 | `Content-Type: text/plain` làm server trả **500** | — |
| 7 | TC-056, TC-059 | Response lỗi 404/400 trả `text/html` trên API JSON | — |

> Mục 4 chưa có test case nào bắt được — AI viết TC-048 so sánh hai thông báo lỗi ở nhánh 401 nhưng
> **quên nhánh 403**. Đây là một trong các case tôi tự bổ sung ở bước 3, xem `Extended.md`.
