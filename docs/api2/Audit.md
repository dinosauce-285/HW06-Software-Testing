# API 2 — `POST /api/checkout` — Bước 2: Thẩm định của người (Audit)

> **Đề mục 6:83.** Gán nhãn VALID / INVALID / INCOMPLETE cho từng case, kèm lý do, và sửa case sai.
>
> **Người thẩm định:** 23127262 — **Ngày:** 19/08/2026 — **Đối tượng:** 60 case ở `AI-Generated-Raw.md`
> Định nghĩa nhãn giữ nguyên như `api1/Audit.md` mục 1, gồm cả nguyên tắc: **test thất bại vì SUT
> có lỗi thì vẫn VALID** — chỉ gán INVALID khi bản thân test case sai.

## 1. Hành vi thật của SUT — đo bằng `curl` trên DB sạch

| Phép đo | Đặc tả đòi | SUT thực tế |
| --- | --- | --- |
| Giỏ 200 000 ₫, client khai `total_amount: 1` | Đơn ghi **200 000** (D2) | Đơn ghi **1** — nhận thẳng số client gửi |
| `total_amount` âm | Backend tự tính, không thể âm | Tạo đơn với **-500 000** |
| `total_amount: "abc"` | Bị bỏ qua | Lưu **chuỗi `"abc"`** vào cột số |
| `total_amount: null` / `true` / `1e308` | Bị bỏ qua | Lưu `null` / `1` / `1E+308` |
| Giỏ hàng sau khi thanh toán | **Bị xóa** (D4) | **Còn nguyên** |
| Thanh toán khi giỏ **rỗng** | Không có gì để đặt | **Tạo đơn thành công** |
| Thiếu `shipping_address` | *(đặc tả im lặng)* | Tạo đơn, địa chỉ `null` |
| Trạng thái đơn mới | `pending` (D5) | `pending` ✔ |
| Client tự đặt `status` / `user_id` / `id` | Phải bỏ qua | **Bỏ qua đúng** ✔ |
| Không có token / token rác | 401 | 401 / 403 ✔ |
| SQLi trong `shipping_address` | An toàn | **An toàn** ✔, lưu nguyên văn |
| `GET /api/orders/:id` không token | Phải chặn | **200 — đọc được đơn người khác** |
| `Content-Type: text/plain` | 400/415 | **500** |
| `GET /api/checkout` | 404/405 | 404 nhưng thân **HTML** |

## 2. Nhận định trọng tâm: đặc tả tự mâu thuẫn, và AI đã chọn đúng bên

`api_specification.md` §4.3 mô tả body **có** `total_amount`, trong khi FR-08 nói thẳng
*"Backend phải tự tính lại tổng tiền; **không chấp nhận** giá trị `total_amount` do client gửi lên"*.

AI phát hiện mâu thuẫn này ngay ở bước 2.1 (mục H2) và **tự quyết định lấy FR-08 làm chuẩn**, lập
luận rằng yêu cầu nghiệp vụ thắng ví dụ minh họa. Tôi đồng ý với lựa chọn đó, vì:

- §4.3 chỉ là **ví dụ về hình dạng request**, không phải phát biểu quy tắc;
- FR-08 là **phát biểu quy tắc**, dùng chữ "không chấp nhận" — không có chỗ diễn giải khác;
- nếu đọc ngược lại thì câu FR-08 kia trở thành thừa, mà đặc tả không viết thừa một câu như vậy.

Đây là điểm sáng nhất trong output AI của cả bài: nó không im lặng chọn bừa mà **nêu mâu thuẫn ra,
tuyên bố lựa chọn, và giải thích lý do**. Nhờ vậy tôi thẩm định được lựa chọn đó thay vì phải đoán.

## 3. Một điểm yếu của bộ test mà chỉ thấy khi chạy: 13 case, 1 lỗi

Cả 13 case TC-A2-001→013 phân vùng rất đẹp trên đầu vào của client (khớp / thấp / âm / sai kiểu /
thiếu / tràn). Nhưng chúng có **chung một oracle** — "đơn phải ghi tổng của giỏ" — và **chung một
nguyên nhân gốc**. Khi backend bỏ qua giỏ hàng thì cả 13 cùng thất bại vì đúng một dòng mã.

Đây không phải lỗi của test case (tôi giữ cả 13 là **VALID**), mà là điều cần nói rõ trong báo cáo:
**13 test thất bại không có nghĩa là 13 lỗi.** Nếu đếm lỗi theo số assertion thất bại thì con số sẽ
bị thổi lên gấp mười lần. Tôi gộp chúng thành **một** lỗi BUG-A2-01.

## 4. Bảng thẩm định đầy đủ

### 4.1 Phân vùng miền — `total_amount` (TC-001 → 013)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A2-001 | **VALID** | Đường hạnh phúc, oracle đúng theo D2 |
| TC-A2-002 → 005 | **VALID** | Bốn phân vùng sai lệch (thấp / bằng 0 / âm / cao). Chạy thật: đơn ghi đúng số client gửi → BUG-A2-01 |
| TC-A2-006 → 008 | **VALID** | Sai kiểu (chuỗi chữ / chuỗi số / boolean). Chạy thật: lưu thẳng vào CSDL → BUG-A2-04 |
| TC-A2-009 | **VALID** | Thiếu hẳn trường — case tinh tế nhất nhóm: nếu backend thật sự tự tính thì thiếu trường vẫn phải thành công. Chạy thật: **200** ✔ (nhưng đơn ghi `null`) |
| TC-A2-010 → 013 | **VALID** | `null`, số thực, ký hiệu khoa học, tràn số. Chạy thật: lưu nguyên trạng → BUG-A2-04 |

### 4.2 Phân vùng miền — `shipping_address` (TC-014 → 023)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-A2-014 | **VALID** | Đường hạnh phúc | — |
| TC-A2-015 | **INVALID** | Đòi 400 khi địa chỉ rỗng — **đặc tả không hề đặt ra ràng buộc bắt buộc**. AI có tự ghi rõ *"giả định"*, đó là cách làm đúng, nhưng giả định vẫn không phải là yêu cầu | expected → **200**, chuyển xuống mục *khuyến nghị* |
| TC-A2-016 | **INVALID** | Như trên, với trường bị thiếu. Chạy thật: tạo đơn với địa chỉ `null` | expected → **200** + khuyến nghị |
| TC-A2-017 | **INVALID** | Như trên, chuỗi toàn khoảng trắng | expected → **200** + khuyến nghị |
| TC-A2-018 | **INCOMPLETE** | Oracle ba nhánh *"400 hoặc 200 kèm cắt bớt; không được 500"* — không tự động hóa được | Chốt: **không phải 5xx** và địa chỉ lưu lại **nguyên độ dài** |
| TC-A2-019 | **VALID** | Dấu tiếng Việt phải trả về nguyên vẹn — bắt lỗi mã hóa | — |
| TC-A2-020 | **VALID** | Emoji (ký tự ngoài BMP) — bắt lỗi cắt chuỗi theo byte | — |
| TC-A2-021 | **INVALID** | Đòi 400 khi sai kiểu — đặc tả không nêu | expected → **200** |
| TC-A2-022 | **INVALID** | Như trên với `null` | expected → **200** |
| TC-A2-023 | **INCOMPLETE** | Oracle *"giữ nguyên hoặc chuẩn hóa"* — hai kết quả trái ngược nhau | Chốt: **giữ nguyên** ký tự xuống dòng |

### 4.3 Giá trị biên (TC-024 → 030)

Nhóm này có một vấn đề sâu hơn nhãn: AI dựng biên trên **số lượng và giá trong giỏ**, hoàn toàn
hợp lý *nếu* backend tính tổng từ giỏ. Nhưng backend không đọc giỏ, nên mấy case này đang kiểm
`POST /api/cart` chứ không kiểm `POST /api/checkout`.

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-A2-024 | **VALID** | Giỏ tối thiểu, oracle rõ ràng | — |
| TC-A2-025 | **INCOMPLETE** | Oracle *"0 hoặc từ chối"* | Chốt: tổng đơn = **0** |
| TC-A2-026 | **INVALID** | Đòi 400 cho số lượng âm — ràng buộc này thuộc về endpoint giỏ hàng, mà đặc tả cũng không nêu | Đổi oracle sang **tổng đơn**, không phải status của checkout |
| TC-A2-027 | **VALID** | Số lượng rất lớn, kiểm tràn số | — |
| TC-A2-028 | **INVALID** | Như TC-026, với giá âm | Đổi oracle sang tổng đơn |
| TC-A2-029 | **VALID** | Giỏ nhiều dòng — kiểm phép cộng, đúng trọng tâm D3 | — |
| TC-A2-030 | **INCOMPLETE** | Oracle *"200 hoặc 400"* | Chốt: **không phải 5xx** |

### 4.4 Chuyển trạng thái và hệ quả sau ghi (TC-031 → 039)

Nhóm mạnh nhất của bộ. AI đã tự rút ra ở bước 2.1 rằng endpoint này **ghi dữ liệu** nên không thể
chỉ kiểm response — phải kiểm cả 4 hệ quả. Đó là đúng trọng tâm.

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A2-031 | **VALID** | Trạng thái khởi tạo `pending`. Chạy thật: **đúng** ✔ |
| TC-A2-032 | **VALID** | Giỏ phải bị xóa. Chạy thật: **còn nguyên** → BUG-A2-02 |
| TC-A2-033 | **VALID** | Giỏ rỗng phải bị từ chối. Chạy thật: **tạo đơn** → BUG-A2-03 |
| TC-A2-034 | **VALID** | Checkout hai lần liên tiếp. Hệ quả trực tiếp của TC-032 |
| TC-A2-035 | **VALID** | Đơn nằm trong lịch sử của đúng người dùng |
| TC-A2-036 | **VALID** | So tổng đơn với tổng giỏ — chính là oracle của D2 |
| TC-A2-037 | **VALID** | Thêm cùng sản phẩm hai lần (FR-07) |
| TC-A2-038 | **VALID** | Giỏ tách theo người dùng |
| TC-A2-039 | **INCOMPLETE** | Thiếu tiền đề: cần token admin để gọi `GET /api/admin/orders` | Bổ sung lấy `{{adminToken}}` từ folder Setup |

### 4.5 Bảo mật (TC-040 → 051)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A2-040 → 044 | **VALID** | Năm biến thể thiếu/hỏng token. Chạy thật: 401 và 403, **SUT xử lý đúng** ✔ |
| TC-A2-045 | **VALID** | Mass assignment `user_id`. Chạy thật: **bị bỏ qua đúng** ✔ |
| TC-A2-046 | **VALID** | Mass assignment `status`. Chạy thật: **bị bỏ qua đúng**, đơn vẫn `pending` ✔ |
| TC-A2-047 | **VALID** | Mass assignment `id`. Chạy thật: **bị bỏ qua đúng** ✔ |
| TC-A2-048 | **VALID** | SQLi trong địa chỉ. Chạy thật: **an toàn**, lưu nguyên văn ✔ |
| TC-A2-049 | **INCOMPLETE** | *"Trả về đã escape"* mơ hồ với một API JSON: escape HTML hay escape JSON? | Chốt: response là JSON hợp lệ, chuỗi lưu **nguyên văn** (escape là việc của tầng hiển thị, SEC-04) |
| TC-A2-050 | **VALID** | IDOR trên `GET /api/orders/:id`. Chạy thật: **200 dù không có token** → BUG-A2-05 |
| TC-A2-051 | **VALID** | Giả mạo giá trong giỏ — hệ quả của BUG-A2-01 |

### 4.6 Schema và HTTP (TC-052 → 060)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A2-052 | **VALID** | Schema response, `orderId` phải là số nguyên |
| TC-A2-053 | **VALID** | Schema đơn hàng có `total_amount: {"type":"number","minimum":0}`. Chạy thật: lưu chuỗi `"abc"` → **vi phạm schema** → BUG-A2-04 |
| TC-A2-054 | **VALID** | Enum trạng thái. Chạy thật: đúng ✔ |
| TC-A2-055 | **VALID** | Response lỗi phải là JSON |
| TC-A2-056 → 057 | **VALID** | Sai method. Chạy thật: 404 nhưng thân HTML |
| TC-A2-058 | **VALID** | Body JSON hỏng |
| TC-A2-059 | **VALID** | `text/plain`. Chạy thật: **500** |
| TC-A2-060 | **VALID** | `Content-Type` JSON trên mọi nhánh |

## 5. Kết quả thẩm định

| Nhãn | Số lượng | Tỉ lệ | So với API 1 |
| --- | --- | --- | --- |
| **VALID** | 47 | 78,3 % | 45,0 % → **+33,3 điểm phần trăm** |
| **INVALID** | 7 | 11,7 % | 30,0 % → −18,3 |
| **INCOMPLETE** | 6 | 10,0 % | 25,0 % → −15,0 |

### Vì sao chất lượng nhảy vọt — và công không thuộc về AI

Cùng một model, cùng một kiểu API, nhưng tỉ lệ VALID tăng từ 45 % lên 78 %. Nguyên nhân nằm ở **ba
thay đổi trong cách tôi viết prompt**, rút ra từ chính những gì AI làm hỏng ở API 1:

| Bài học từ API 1 | Thay đổi ở API 2 | Kết quả |
| --- | --- | --- |
| AI neo vào danh sách SEC-01→07, bỏ trắng những rủi ro ngoài danh sách | Bước 2.6 thêm vế *"ngoài danh sách SEC ra còn rủi ro gì khác"* | AI tự tìm ra nhóm mass assignment (3 case) và giả mạo giá — những thứ API 1 nó không nghĩ tới |
| AI viết case chuyển trạng thái mà quên tiền đề | Bước 2.5 yêu cầu *"mỗi case ghi rõ chuỗi thao tác"* và hỏi trước về *"hệ quả sau một lần gọi thành công"* | 8/9 case nhóm trạng thái là VALID, so với 0/9 ở API 1 |
| AI khẳng định những ràng buộc đặc tả không có | Bước 2.3 yêu cầu *"nếu đặc tả không nói thì ghi rõ đó là giả định của bạn"* | AI ghi rõ chữ "giả định" ở 3 case — vẫn phải hạ xuống khuyến nghị, nhưng đã **trung thực về căn cứ** |

Nói cách khác: **ở API 1, phần lớn cái tôi ghi là "lỗi của AI" thật ra là lỗi của prompt.** Bằng
chứng là khi sửa prompt thì cùng model cho ra kết quả tốt hơn hẳn, mà không cần đổi công cụ.

## 6. Ứng viên bug

| # | Test case bắt được | Mô tả | Vi phạm |
| --- | --- | --- | --- |
| BUG-A2-01 | TC-A2-002→005, 036, 051 | Backend nhận thẳng `total_amount` của client, không tính lại từ giỏ | **FR-08 (D2)** |
| BUG-A2-02 | TC-A2-032, 034 | Giỏ hàng không bị xóa sau khi thanh toán | FR-08 (D4) |
| BUG-A2-03 | TC-A2-033 | Giỏ rỗng vẫn tạo được đơn hàng | FR-08 (D3) |
| BUG-A2-04 | TC-A2-006→008, 010→013, 053 | Không kiểm kiểu: chuỗi, `null`, boolean lọt vào cột số tiền | schema |
| BUG-A2-05 | TC-A2-050 | `GET /api/orders/:id` không có xác thực — đọc được đơn người khác | **SEC-02** |

**Không tính là lỗi mới:** `text/plain → 500` (TC-059) và response lỗi trả HTML (TC-056→058) là
**cùng một khuyết tật** đã ghi ở BUG-A1-05 và BUG-A1-06, chỉ quan sát lại ở endpoint khác. Tôi
**không** mở issue mới cho chúng — đếm hai lần sẽ thổi phồng số lỗi.

**Khuyến nghị (không tính là lỗi vì đặc tả im lặng):** `shipping_address` nên là trường bắt buộc.
Hiện tại tạo được đơn hàng với địa chỉ giao `null`, điều này vô nghĩa về mặt nghiệp vụ — nhưng
FR-08 không hề phát biểu ràng buộc đó, nên tôi ghi nó vào mục khuyến nghị chứ không đếm vào số bug.
