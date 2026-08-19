# API 3 — `PUT /api/admin/orders/:id/status` — Bước 2: Thẩm định của người (Audit)

> **Đề mục 6:83.** Gán nhãn VALID / INVALID / INCOMPLETE, kèm lý do, và sửa case sai.
>
> **Người thẩm định:** 23127262 — **Ngày:** 19/08/2026 — **Đối tượng:** 67 case ở `AI-Generated-Raw.md`
> Định nghĩa nhãn giữ nguyên như `api1/Audit.md` mục 1. Bổ sung một quy ước mới cho API này:
> **case trùng lặp hoàn toàn với một case khác** cũng bị gán INVALID, vì nó không mang thêm thông
> tin nào mà vẫn tốn thời gian chạy và làm phồng số liệu thống kê.

## 1. Ma trận chuyển trạng thái thật của SUT — đo trọn 25 ô

Tôi dựng 25 đơn hàng riêng biệt, mỗi đơn đưa về đúng trạng thái nguồn rồi gọi endpoint bằng token
admin. Bảng dưới là mã HTTP **đo được**:

| từ \ tới | `pending` | `confirmed` | `shipping` | `delivered` | `canceled` |
| --- | :---: | :---: | :---: | :---: | :---: |
| **`pending`** | 400 | **200** | 400 | 400 | **200** |
| **`confirmed`** | 400 | 400 | **200** | 400 | **200** |
| **`shipping`** | 400 | 400 | 400 | **200** | 400 |
| **`delivered`** | 400 | 400 | 400 | 400 | 400 |
| **`canceled`** | 400 | 400 | 400 | **200 ← SAI** | 400 |

**Đối chiếu với sơ đồ FR-10: khớp 24/25 ô.** Đúng một ô lệch — `canceled → delivered` được chấp
nhận, trong khi FR-10 nói rõ `canceled` là **trạng thái kết thúc**, không chuyển đi đâu được nữa.

Đây là điểm đáng ghi nhận về SUT: máy trạng thái được cài gần như đúng đặc tả. Cái sai là một
trường hợp duy nhất, và nó lại là trường hợp nguy hiểm nhất về mặt nghiệp vụ (đơn đã hủy trở thành
đã giao).

## 2. Các phép đo khác

| Phép đo | Đặc tả đòi | SUT thực tế |
| --- | --- | --- |
| **Token của user thường** | **403** (FR-12, SEC-03) | **200 — và đơn thật sự đổi trạng thái** |
| User tự lái đơn của mình `pending→confirmed→shipping→delivered` | Phải bị chặn ở bước đầu | **Cả ba bước đều 200** |
| Không có token | 401 | 401 ✔ |
| Token sai chữ ký | 401/403 | 403 ✔ |
| JWT sửa `role` thành `admin` mà không ký lại | Phải bị phát hiện | **403 ✔** — chữ ký được kiểm đúng |
| `status` ngoài enum / sai kiểu / thiếu (8 biến thể) | 400 | **400 cả 8** ✔ |
| `:id` = 999999 / `abc` / 0 / −1 / 1.5 / rỗng | 404 | **404 cả 6** ✔ |
| SQL injection trong `status` | An toàn | **400, không đơn nào khác bị đổi** ✔ |
| `GET`/`POST`/`DELETE` cùng đường dẫn | 404/405 | 404 ✔ |
| Response thành công / lỗi | JSON | **JSON cả hai** ✔ |
| `Content-Type: text/plain` | 400/415 | **500** (cùng khuyết tật BUG-A1-05) |
| Hai chuyển đổi mâu thuẫn **đồng thời** | Một cái phải thất bại | **Cả hai trả 200**, chỉ một cái có hiệu lực |

## 3. Ba nhận định của người thẩm định

### 3.1 Giả định d2 của AI là sai — và tôi không báo nó thành lỗi

AI cho rằng `shipping → canceled` phải hợp lệ với admin, dựa vào câu *"Khi đơn ở `shipping`, User
không được tự hủy — chỉ Admin mới có thể thao tác"*. SUT trả **400**.

Tôi **không** ghi đây là lỗi, vì:

- Sơ đồ FR-10 là phần **quy phạm** của đặc tả và nó **không có** mũi tên `shipping → canceled`;
- câu văn kia nằm trong mục *"Ràng buộc trạng thái kết thúc"* và đang nói về **quyền thao tác**,
  không định nghĩa thêm cạnh mới cho đồ thị;
- đọc theo hướng của AI thì phải thêm một cạnh mà sơ đồ cố tình không vẽ — suy diễn quá xa.

Cách xử lý: giữ case M15 lại nhưng đổi kỳ vọng thành **400**, và ghi vào mục *"câu hỏi cần làm rõ
với người viết đặc tả"* thay vì mục lỗi. **Báo một lỗi ma còn tệ hơn bỏ sót một lỗi thật** — nó làm
mất uy tín của cả bản báo cáo.

Điểm cộng cho AI: nó **không im lặng chọn bừa** mà nêu rõ mâu thuẫn, tuyên bố lựa chọn và giải
thích. Nhờ vậy tôi có cái để thẩm định. Nếu nó chỉ viết "expected 200" thì tôi đã phải tự dò ra.

### 3.2 Một case của AI không thể phát hiện được thứ nó định phát hiện

TC-A3-029 — *"token user thường + chuyển sang `delivered` → 403"*. Nghe hợp lý, nhưng case này
**không dựng trạng thái ban đầu**. Đơn mới luôn ở `pending`, mà `pending → delivered` vốn đã là
chuyển đổi không hợp lệ, nên SUT trả **400 vì lý do máy trạng thái**, chưa kịp đụng tới chuyện
`role`. Test sẽ "thất bại đúng như mong đợi" nhưng **vì lý do hoàn toàn khác**.

Đây là lỗi thiết kế oracle nguy hiểm hơn cả case sai hẳn: nó tạo cảm giác đã kiểm SEC-03 trong khi
chưa kiểm gì cả. Sửa: đưa đơn về `shipping` trước, rồi mới dùng token user gọi `delivered` — lúc đó
chuyển đổi hợp lệ về mặt trạng thái, nên nếu vẫn 200 thì **chắc chắn** là do thiếu kiểm `role`.

### 3.3 Một case không thể chạy được vì không dựng nổi đầu vào

TC-A3-025 — *"token đúng cấu trúc nhưng hết hạn → 401"*. Muốn có token hết hạn thì phải tự ký một
token với `exp` trong quá khứ, mà muốn ký thì phải biết khóa bí mật của server — thứ không có trong
đặc tả. AI viết case này theo thói quen của danh mục bảo mật chung chứ không kiểm xem **có dựng nổi
đầu vào hay không**.

Ngoài ra, hệ thống này **không hề phát hành token có `exp`** (đã ghi ở BUG-A1-04), nên khái niệm
"token hết hạn" không tồn tại. Tôi gán INCOMPLETE và chuyển hướng case sang thứ kiểm được: **token
hợp lệ vĩnh viễn** — vốn đã được BUG-A1-04 ghi nhận.

## 4. Bảng thẩm định

### 4.1 Phân vùng miền — `status` (TC-001 → 010)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A3-001, 002 | **VALID** | Hai chuyển đổi hợp lệ từ `pending`. Chạy thật: 200 ✔ |
| TC-A3-003 → 010 | **VALID** | Tám phân vùng không hợp lệ: ngoài enum, sai hoa thường, thừa khoảng trắng, rỗng, thiếu trường, `null`, sai kiểu, mảng. Chạy thật: **400 cả tám** ✔ — SUT xử lý đúng |

### 4.2 Phân vùng miền — `:id` (TC-011 → 017)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-A3-011, 012 | **VALID** | Đơn có thật / không tồn tại | — |
| TC-A3-013 | **INCOMPLETE** | Oracle *"400 hoặc 404"* quá lỏng | Chốt **404** (đo được) |
| TC-A3-014 → 017 | **VALID** | id = 0, âm, số thực, chuỗi SQLi. Chạy thật: 404 cả bốn ✔ | — |

### 4.3 Giá trị biên (TC-018 → 022)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-A3-018 | **INCOMPLETE** | Oracle có điều kiện: *"200 nếu tồn tại"* — không tự động hóa được vì không biết đơn id=1 có tồn tại lúc chạy hay không | Tự tạo đơn trong tiền đề rồi dùng id của nó |
| TC-A3-019 | **INVALID** | **Trùng hoàn toàn** với TC-A3-014 (cùng `:id = 0`, cùng kỳ vọng 404) | Bỏ, gộp vào TC-A3-014 |
| TC-A3-020 → 022 | **VALID** | `MAX_SAFE_INTEGER`, số vượt giới hạn, id rỗng. Chạy thật: 404 cả ba, không 500 ✔ | — |

### 4.4 Ma trận chuyển trạng thái (M01 → M25)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| M01 → M14, M16 → M25 | **VALID** (24 ô) | Phủ trọn ma trận, oracle rõ ràng, và AI tự thêm được yêu cầu kiểm **trạng thái lưu trong CSDL** chứ không chỉ mã HTTP — đúng và quan trọng |
| **M15** | **INCOMPLETE** | Ô mập mờ `shipping → canceled`, xem mục 3.1 | Đổi kỳ vọng thành **400** theo sơ đồ FR-10; ghi câu hỏi vào mục cần làm rõ |
| **M24** | *(VALID)* | `canceled → delivered`. Chạy thật: **200** → **BUG-A3-02** |

### 4.5 Bảo mật (TC-023 → 034)

| ID | Nhãn | Lý do | Sửa thành |
| --- | --- | --- | --- |
| TC-A3-023, 024, 026 | **VALID** | Thiếu token / sai chữ ký / thiếu `Bearer`. Chạy thật: 401, 403, 401 ✔ | — |
| TC-A3-025 | **INCOMPLETE** | Không dựng nổi đầu vào, xem mục 3.3 | Chuyển sang kiểm token **không có hạn** (nối với BUG-A1-04) |
| **TC-A3-027** | **VALID** | **Case quan trọng nhất cả API.** Token user thường. Chạy thật: **200** → BUG-A3-01 | — |
| TC-A3-028 | **VALID** | Token user + đơn của chính người đó — chứng minh vấn đề không phải quyền sở hữu mà là thiếu kiểm `role` | — |
| TC-A3-029 | **INCOMPLETE** | Oracle không phân biệt được nguyên nhân, xem mục 3.2 | Đưa đơn về `shipping` trong tiền đề |
| TC-A3-030, 031 | **VALID** | Mass assignment `role` trong body; JWT sửa payload không ký lại. Chạy thật: **403 cả hai** ✔ | — |
| TC-A3-032, 033 | **VALID** | SQLi trong `status` và `:id`. Chạy thật: an toàn ✔ | — |
| TC-A3-034 | **INCOMPLETE** | *"Đơn không rơi vào trạng thái vô lý"* — không định nghĩa được thế nào là vô lý | Chốt oracle: hai chuyển đổi **mâu thuẫn** thì **không được cùng trả 200** |

### 4.6 Schema và HTTP (TC-035 → 042)

| ID | Nhãn | Lý do |
| --- | --- | --- |
| TC-A3-035 → 037 | **VALID** | Chạy thật: `{"message":"Order status updated"}` và `{"error":"Invalid state transition from … to …"}`, đều `application/json` ✔ |
| TC-A3-038 → 040 | **VALID** | Sai method. Chạy thật: 404 ✔ |
| TC-A3-041 | **VALID** | Body JSON hỏng — bắt lại khuyết tật BUG-A1-06 |
| TC-A3-042 | **VALID** | `text/plain`. Chạy thật: **500** — khuyết tật BUG-A1-05 |

## 5. Kết quả thẩm định

| Nhãn | Số lượng | Tỉ lệ | API 1 | API 2 |
| --- | --- | --- | --- | --- |
| **VALID** | 60 | **89,6 %** | 45,0 % | 78,3 % |
| **INVALID** | 1 | 1,5 % | 30,0 % | 11,7 % |
| **INCOMPLETE** | 6 | 9,0 % | 25,0 % | 10,0 % |

### Xu hướng qua ba API: 45 % → 78 % → 90 %

Cùng một model, cùng một người dẫn. Toàn bộ mức tăng đến từ **cách viết prompt**, và mỗi bước tăng
đều truy được về một bài học cụ thể:

| Bài học rút ra ở | Áp dụng vào | Hiệu quả quan sát được |
| --- | --- | --- |
| API 1 — AI neo vào danh sách SEC cho sẵn | API 2 + 3: thêm vế *"ngoài danh sách đó còn rủi ro gì"* | API 2 tự tìm ra mass assignment; API 3 tự nêu vấn đề đồng thời và thiếu nhật ký kiểm toán |
| API 1 — case trạng thái không có tiền đề | API 2 + 3: bắt *"ghi rõ chuỗi thao tác"* | Nhóm trạng thái API 3 đạt 24/25 VALID |
| API 1 — AI khẳng định ràng buộc không có trong đặc tả | API 2 + 3: bắt *"ghi rõ đâu là giả định"* | API 3: AI tự đánh dấu 5 giả định d1–d5 và **tự phát hiện đặc tả tự mâu thuẫn** |
| API 2 — tôi quên hỏi về tính đồng thời | API 3: đưa hẳn vào prompt bảo mật | AI tự sinh TC-A3-034, và case đó bắt được BUG-A3-03 thật |

Bài học lớn nhất của cả bài: **chất lượng đầu ra của AI là hàm số của chất lượng prompt, và hàm đó
cải thiện được một cách có hệ thống** — miễn là mỗi lần AI sai thì mình ghi lại *vì sao* rồi biến
nó thành một mục trong danh mục kiểm tra prompt, chứ không chỉ sửa kết quả rồi đi tiếp.

## 6. Ứng viên bug

| # | Test case bắt được | Mô tả | Vi phạm |
| --- | --- | --- | --- |
| BUG-A3-01 | TC-A3-027, 028, 029 | **Không kiểm `role`** — token user thường đổi được trạng thái mọi đơn hàng | **FR-12, SEC-03** |
| BUG-A3-02 | M24 | `canceled → delivered` được chấp nhận, phá vỡ ràng buộc trạng thái kết thúc | **FR-10** |
| BUG-A3-03 | TC-A3-034 | Hai chuyển đổi mâu thuẫn đồng thời **cùng trả 200**, chỉ một cái có hiệu lực | FR-10 |

**Không đếm lại:** `text/plain → 500` (TC-042) và body lỗi dạng HTML (TC-041) đã ghi ở BUG-A1-05 /
BUG-A1-06.

## 7. Câu hỏi cần làm rõ với người viết đặc tả

| # | Câu hỏi | Vì sao quan trọng |
| --- | --- | --- |
| Q1 | Admin có được hủy đơn đang ở `shipping` không? Sơ đồ FR-10 nói không, câu văn ngay dưới lại ngụ ý có | Ảnh hưởng trực tiếp tới ô M15; hiện SUT trả 400 (theo sơ đồ) |
| Q2 | Chuyển sang **chính trạng thái hiện tại** (`X → X`) nên coi là lỗi hay là thao tác vô hại? | 5 ô trên đường chéo; hiện SUT trả 400 cho cả 5 |
