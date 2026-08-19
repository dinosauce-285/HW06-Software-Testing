# API 2 — `POST /api/checkout` — Bước 3: Test case tự bổ sung (Extend)

> **Đề mục 6:84.** Thêm ít nhất 5 test case AI bỏ sót, và giải thích **vì sao** AI bỏ sót.
>
> **Người viết:** 23127262 — **Ngày:** 19/08/2026
> Cả 5 case đều đã tái hiện bằng `curl` trước khi viết, số liệu chép nguyên ở dưới.

## 1. Năm test case bổ sung

### TC-A2-E01 — Thanh toán không có tính bất biến: bấm 5 lần thành 5 đơn

| | |
| --- | --- |
| **Trục** | Chuyển trạng thái + đồng thời |
| **Tiền đề** | Giỏ có **một** lần hàng: iPhone × 2 |
| **Thao tác** | Bắn **5 request thanh toán đồng thời** (mô phỏng bấm nút liên tục / trình duyệt gửi lại) |
| **Mong đợi** | Đúng **1** đơn được tạo — cùng một giỏ không thể thành nhiều đơn |
| **Thực tế đo được** | **5 đơn**, mỗi đơn 200 000 ₫ |

```
số đơn đã tạo: 5  (mong đợi: 1)
```

**Hệ quả thật:** khách bấm nút hai lần, hoặc mạng chập chờn khiến trình duyệt gửi lại request, là
bị lập nhiều đơn cho cùng một giỏ hàng. Không có khoá bất biến (idempotency key), không có kiểm
trùng, và vì giỏ hàng cũng không bị xóa (BUG-A2-02) nên không có gì chặn lần gửi thứ hai cả.

**Vì sao AI bỏ sót:** đây là **cùng một lỗ hổng tôi đã gặp ở API 1** (TC-A1-E03, tranh chấp đồng
thời trên bộ đếm đăng nhập). Ở API 2 tôi đã sửa prompt bảo mật để AI bước ra ngoài danh sách SEC,
nhưng **tôi quên không thêm vế về tính đồng thời**. Bài học rút ra ở API 1 chỉ được áp dụng một
nửa. Đây là lỗi của tôi chứ không phải của model — và nó cho thấy bài học về prompt phải được ghi
thành danh mục kiểm tra, chứ nhớ trong đầu thì sẽ sót.

### TC-A2-E02 — Duyệt tuần tự toàn bộ đơn hàng của mọi khách, không cần token

| | |
| --- | --- |
| **Trục** | Bảo mật (SEC-02) |
| **Thao tác** | Gọi `GET /api/orders/1`, `/2`, `/3`… **không kèm bất kỳ header xác thực nào** |
| **Mong đợi** | 401 — endpoint này nằm trong nhóm yêu cầu `Authorization: Bearer <token>` |
| **Thực tế đo được** | Mọi đơn đều đọc được, đầy đủ `user_id`, số tiền và **địa chỉ giao hàng** |

```
/api/orders/1 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
/api/orders/2 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
/api/orders/3 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
```

**Hệ quả thật:** định danh đơn hàng là số nguyên **tăng dần**, nên chỉ cần một vòng lặp từ 1 tới N
là lấy sạch địa chỉ nhà và giá trị đơn hàng của **toàn bộ** khách hàng trong hệ thống. Không cần
tài khoản, không cần token, không có giới hạn tần suất chặn lại.

**Vì sao AI bỏ sót:** AI **có** viết TC-A2-050 kiểm IDOR — nhưng nó dừng ở mức *"người dùng B không
được đọc đơn của người dùng A"*. Đó là kiểm **thuộc tính**, và thuộc tính đó đủ để phát hiện lỗi.
Cái AI không làm là bước tiếp: *"nếu thuộc tính này vỡ thì khai thác được tới đâu?"* Khoảng cách
giữa *"B đọc được đơn của A"* và *"bất kỳ ai cũng rút được toàn bộ CSDL khách hàng"* là khoảng cách
giữa một lỗi trung bình và một sự cố lộ dữ liệu. AI kiểm thuộc tính; con người phải nghĩ tiếp thành
chuỗi khai thác.

### TC-A2-E03 — Token của tài khoản đã bị xóa vẫn đặt được hàng

| | |
| --- | --- |
| **Trục** | Bảo mật + vòng đời |
| **Thao tác** | Đăng ký tài khoản → lấy token → **admin xóa tài khoản đó** → dùng token cũ gọi checkout |
| **Mong đợi** | 401 — chủ sở hữu token không còn tồn tại |
| **Thực tế đo được** | `{"message":"Checkout successful","orderId":6}` — **HTTP 200** |

**Hệ quả thật:** xóa tài khoản **không** thu hồi được quyền truy cập. Kết hợp với BUG-A1-04 (JWT
không có `exp`), token của một nhân viên đã nghỉ việc hoặc một tài khoản bị cấm vẫn dùng được
**vĩnh viễn**. Middleware chỉ kiểm chữ ký của token, không hề tra xem người dùng còn tồn tại không.

### TC-A2-E04 — Đơn hàng mồ côi: khóa ngoại không được đảm bảo

| | |
| --- | --- |
| **Trục** | Toàn vẹn dữ liệu |
| **Thao tác** | Tiếp nối E03 — xem đơn vừa tạo ở `GET /api/admin/orders` |
| **Mong đợi** | Không tồn tại đơn trỏ tới người dùng không có thật |
| **Thực tế đo được** | `{"id":6,"user_id":3,"user_name":null,"total_amount":9999}` |

**Hệ quả thật:** bảng đơn hàng giữ `user_id = 3` trong khi bảng người dùng không còn bản ghi nào có
id đó. Phía admin hiển thị tên khách là `null`. Đơn hàng này không thể liên hệ, không thể giao,
không thể hoàn tiền — và nếu có báo cáo doanh thu nhóm theo khách thì nó sẽ rơi ra ngoài mọi nhóm.

**Vì sao AI bỏ sót E03 và E04:** cả hai chỉ lộ ra khi **ghép ba endpoint thuộc ba pool khác nhau**
— đăng ký (Pool A), xóa người dùng (Pool C), thanh toán (Pool B). Prompt của tôi ở bước 1 chỉ đưa
cho AI đặc tả của **một** endpoint và bảo nó sinh test cho endpoint đó. Trong phạm vi ấy AI làm rất
tốt. Nhưng lỗi vòng đời dữ liệu thì **không nằm trong bất kỳ endpoint đơn lẻ nào** — nó nằm ở chỗ
các endpoint gặp nhau theo thời gian. Muốn AI tìm ra, prompt phải là *"vẽ vòng đời của một tài
khoản và một đơn hàng, rồi tìm những thao tác làm hai vòng đời đó lệch nhau"* — một câu hỏi hoàn
toàn khác với *"sinh test case cho POST /api/checkout"*.

### TC-A2-E05 — Tài khoản đang bị khóa vẫn đặt hàng bình thường bằng token cũ

| | |
| --- | --- |
| **Trục** | Bảo mật + chuyển trạng thái (ghép FR-02 với FR-08) |
| **Thao tác** | Đăng nhập lấy token → cố tình sai mật khẩu cho tới khi tài khoản bị khóa → dùng **token lấy trước đó** gọi checkout |
| **Mong đợi** | Tài khoản bị khóa thì mọi thao tác cần xác thực đều phải bị chặn |
| **Thực tế đo được** | Đăng nhập lại: **403** (đã khóa) · nhưng đặt hàng bằng token cũ: **200** |

```
đăng nhập lại (phải bị khoá)  -> HTTP 403
nhưng đặt hàng bằng token cũ  -> HTTP 200
```

**Hệ quả thật:** khóa tài khoản chỉ chặn được **cửa đăng nhập**, không chặn được ai đã cầm token
trong tay. Với kẻ tấn công đã chiếm được token thì cơ chế khóa hoàn toàn vô nghĩa — mà đó chính là
tình huống nó sinh ra để chống. Ngược lại, người dùng thật bị khóa oan (BUG-A1-10) lại là người
duy nhất chịu thiệt, vì họ không có token sẵn.

**Vì sao AI bỏ sót:** trạng thái khóa nằm trong **CSDL**, còn quyền truy cập nằm trong **token
không trạng thái**. Muốn thấy lỗ hổng này phải cùng lúc giữ trong đầu FR-02 (Pool A) và FR-08
(Pool B) rồi hỏi *"trạng thái ở bên này có được phản ánh sang bên kia không?"*. Prompt của tôi đóng
khung AI trong một endpoint, nên câu hỏi đó chưa từng được đặt ra.

## 2. Những thứ tôi kiểm và thấy SUT làm ĐÚNG

Ghi lại để bộ test có giá trị hai chiều — không phải cái gì cũng là lỗi:

| Kiểm tra | Kết quả |
| --- | --- |
| `GET /api/orders/my-orders` chỉ trả đơn của chính người dùng | **Đúng** — lọc theo `user_id` của token |
| Client tự đặt `status`, `user_id`, `id` trong body | **Bị bỏ qua đúng** — không dính mass assignment |
| SQL injection trong `shipping_address` | **An toàn** — dùng parameterized query, chuỗi lưu nguyên văn |
| `GET /api/orders/abc` và `/api/orders/1 OR 1` | **404**, không lộ lỗi CSDL |
| Trạng thái đơn mới tạo | **`pending`**, đúng điểm vào máy trạng thái FR-10 |

## 3. Bốn nguyên nhân khiến AI bỏ sót — và ba trong bốn là lỗi prompt

| # | Nguyên nhân | Thuộc về | Case |
| --- | --- | --- | --- |
| 1 | **Prompt đóng khung trong một endpoint** — lỗi vòng đời nằm ở chỗ nhiều endpoint gặp nhau theo thời gian, không nằm trong endpoint nào cả | Chất lượng prompt *(lỗi của tôi)* | E03, E04, E05 |
| 2 | **AI kiểm thuộc tính, không nghĩ tiếp thành chuỗi khai thác** — dừng ngay khi chứng minh được thuộc tính bị vi phạm | Xu hướng của model | E02 |
| 3 | **Vẫn thiếu trục đồng thời** — tôi đã biết từ API 1 mà vẫn quên đưa vào prompt API 2 | Chất lượng prompt *(lỗi của tôi, lặp lại)* | E01 |
| 4 | **Toàn vẹn tham chiếu giữa các bảng không nhìn thấy được từ đặc tả API** | Giới hạn của việc sinh từ đặc tả | E04 |

**Điều đáng nói nhất:** ở API 1 tôi kết luận *"phải hỏi AI về những rủi ro ngoài danh sách cho
sẵn"* và đã áp dụng — kết quả là AI tự tìm ra nhóm mass assignment, tỉ lệ VALID tăng từ 45 % lên
78 %. Nhưng bài học thứ hai của API 1 — *"phải hỏi về tính đồng thời"* — thì tôi **quên áp dụng**,
và đúng chỗ đó lại thủng (E01). Bài học rút ra phải được ghi thành **danh mục kiểm tra prompt**,
chứ giữ trong đầu thì lần sau vẫn sót. Danh mục đó tôi sẽ dùng cho API 3 và đưa vào thiết kế Agent
Skill ở phần generator.

## 4. Đóng góp vào kết quả cuối

| Nguồn | Số case | Lỗi phát hiện |
| --- | --- | --- |
| AI sinh (sau thẩm định) | 60 | 5 |
| Tự bổ sung | 5 | **4 lỗi mới** (E01, E03+E04 cùng gốc, E05; E02 là bản mở rộng của BUG-A2-05) |
| **Tổng** | **65** | **9** |
