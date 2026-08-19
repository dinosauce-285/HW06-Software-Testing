# API 3 — `PUT /api/admin/orders/:id/status` — Bước 3: Test case tự bổ sung (Extend)

> **Đề mục 6:84.** Thêm ít nhất 5 test case AI bỏ sót, giải thích **vì sao** AI bỏ sót.
>
> **Người viết:** 23127262 — **Ngày:** 19/08/2026
> Cả 5 case đều đã tái hiện bằng `curl` trước khi viết.

## 1. Năm test case bổ sung

### TC-A3-E01 — FR-12 nói "TẤT CẢ API admin", nên phải kiểm cả họ, không chỉ một endpoint

| | |
| --- | --- |
| **Trục** | Bảo mật (FR-12, SEC-03) |
| **Thao tác** | Dùng **token user thường** gọi lần lượt **toàn bộ** nhóm `/api/admin/*` |
| **Mong đợi** | `403` ở mọi endpoint |
| **Thực tế đo được** | **200 ở tất cả** |

```
GET    /api/admin/users            -> HTTP 200
GET    /api/admin/orders           -> HTTP 200
POST   /api/admin/coupons          -> HTTP 200
POST   /api/admin/import-products  -> HTTP 200
DELETE /api/admin/users/9999       -> HTTP 200
```

Không phải chỉ trả 200 suông — dữ liệu thật sự chảy ra và thao tác thật sự có hiệu lực:

```
# user thường đọc được toàn bộ bảng người dùng
[{"id":1,"name":"Admin User","email":"admin@eshop.com","role":"admin",
  "login_attempts":0,"locked_until":null,"shipping_address":null}, ...]

# user thường tự tạo mã giảm giá 99% rồi áp dụng được ngay
{"id":5,"code":"HACK","type":"percent","discount_value":99,
 "min_order_amount":0,"expired_at":"2099-01-01","is_active":1,"max_uses_per_user":99}
-> {"success":true,"message":"Áp dụng thành công! Giảm 99%"}

# user thường xoá tài khoản người khác, nạn nhân mất quyền đăng nhập
xoá user id=3 -> HTTP 200
tài khoản đó đăng nhập lại -> HTTP 401
```

**Hệ quả thật:** đây không còn là "thiếu kiểm quyền ở một endpoint" mà là **chiếm trọn quyền quản
trị bằng một tài khoản khách hàng bình thường**: đọc danh sách người dùng, tạo mã giảm giá tùy ý,
nhập sản phẩm, xóa tài khoản người khác. Đây là lỗ hổng nghiêm trọng nhất của cả bài.

**Vì sao AI bỏ sót:** prompt của tôi đưa cho AI đặc tả của **một** endpoint và bảo sinh test case
cho endpoint đó. AI làm đúng: nó viết TC-A3-027 kiểm `role` trên chính endpoint ấy, rất chuẩn.
Nhưng FR-12 không phát biểu về một endpoint — nó phát biểu về **một họ**: *"**Tất cả** các API
Admin (`/api/admin/*`) … đều phải yêu cầu role = 'admin'"*. Một ràng buộc dạng "với mọi X" thì phải
kiểm trên **tập X**, không phải trên một phần tử. AI kiểm **thể hiện**, con người phải kiểm **quy
tắc**.

### TC-A3-E02 — Người dùng bất kỳ hủy được đơn hàng của người khác

| | |
| --- | --- |
| **Trục** | Bảo mật (quyền sở hữu) |
| **Thao tác** | User A đặt đơn → **User B hoàn toàn xa lạ** gọi endpoint hủy đơn của A |
| **Mong đợi** | 403 |
| **Thực tế đo được** | **200**, đơn của A chuyển sang `canceled` |

```
đơn 2 thuộc user id 2
người LẠ hủy đơn đó -> HTTP 200   trạng thái: canceled
```

Ghép với chuyện định danh đơn là số nguyên tăng dần: duyệt `1..N` là **hủy sạch đơn hàng của toàn
hệ thống**, chỉ cần một tài khoản khách bình thường.

```
hủy đơn 1 -> HTTP 200
hủy đơn 2 -> HTTP 200
hủy đơn 3 -> HTTP 200
```

**Vì sao AI bỏ sót:** AI đóng khung bài toán thành **admin hay không admin**. Nó viết TC-A3-028
(*"token user + đơn của chính người đó"*) — tức là nó **có** nghĩ tới quan hệ sở hữu, nhưng chỉ
theo hướng *"chủ đơn có được ưu ái không"*. Chiều ngược lại — *"người không phải chủ đơn thì sao"*
— thì không. Trục quyền có **hai** câu hỏi: *anh là ai* (vai trò) và *cái này có phải của anh
không* (sở hữu). AI chỉ kiểm câu thứ nhất.

### TC-A3-E03 — Khách hàng tự đánh dấu đơn của mình là "đã giao"

| | |
| --- | --- |
| **Trục** | Bảo mật + nghiệp vụ (nối FR-18 với FR-13) |
| **Thao tác** | User đặt đơn 50 triệu → tự đẩy `confirmed → shipping → delivered` bằng token của chính mình |
| **Mong đợi** | Bị chặn ngay ở bước đầu |
| **Thực tế đo được** | Cả ba bước **200**; đơn thành `delivered`; và FR-13 tính nó vào **doanh thu** |

```
đơn 1 (50 triệu) do USER tự đẩy: delivered
FR-13 tính doanh thu = tổng total_amount các đơn delivered:
  doanh thu = 50000000
```

**Hệ quả thật:** khách nhận hàng hay chưa không còn ý nghĩa — họ tự tuyên bố đã nhận. Ngược lại,
khách cũng có thể **không** đánh dấu và chối là chưa nhận. Toàn bộ khâu đối soát giao hàng mất chỗ
dựa.

### TC-A3-E04 — Đơn đã hủy sống lại thành "đã giao" và được tính vào doanh thu

| | |
| --- | --- |
| **Trục** | Chuyển trạng thái + nghiệp vụ |
| **Thao tác** | Hủy một đơn 9 triệu → rồi chuyển nó sang `delivered` |
| **Mong đợi** | 400 — `canceled` là trạng thái kết thúc (FR-10) |
| **Thực tế đo được** | **200**, đơn thành `delivered` và **được cộng vào doanh thu FR-13** |

```
sau khi hủy: canceled -> đổi sang delivered: HTTP 200   trạng thái cuối: delivered
```

**Vì sao AI bỏ sót E03 và E04:** AI **có** phát hiện ô `canceled → delivered` sai (M24) và **có**
viết case kiểm `role` (TC-A3-027). Cái nó không làm là hỏi tiếp: ***"rồi sao nữa?"*** Nó dừng ở
*"trạng thái sai so với sơ đồ"* mà không đi tới *"trạng thái sai này chảy vào con số doanh thu ở
FR-13"*. Muốn thấy được, phải **giữ trong đầu một FR khác thuộc pool khác** (FR-13 Dashboard, Pool
C) trong lúc đang kiểm FR-18. Prompt của tôi chỉ đưa FR-10, FR-12, FR-18 — tôi **không đưa FR-13**,
nên AI không có cách nào biết trạng thái `delivered` có ý nghĩa tiền bạc. Đây là **lỗi phạm vi ngữ
cảnh của prompt**, không phải giới hạn của model.

### TC-A3-E05 — Ghép hai lỗi ở hai API: ghi số doanh thu tùy ý vào dashboard

Đây là case tôi tâm đắc nhất, vì **không lỗi đơn lẻ nào làm được điều này**.

| | |
| --- | --- |
| **Trục** | Chuỗi khai thác liên API |
| **Thao tác** | Chỉ dùng **một tài khoản khách bình thường**:<br>1. Tự khai đơn trị giá 999 999 999 999 (khai thác **BUG-A2-01**)<br>2. Tự đẩy đơn sang `delivered` (khai thác **BUG-A3-01**)<br>3. Đọc doanh thu ở phía admin |
| **Mong đợi** | Không bước nào thành công |
| **Thực tế đo được** | Doanh thu hệ thống = **999 999 999 999** |

```
1. tự khai đơn trị giá 999.999.999.999 (BUG-A2-01) -> đơn 1
2. tự đẩy đơn sang delivered (BUG-A3-01) -> delivered
3. FR-13 doanh thu = 999999999999

... và số âm cũng được:
   doanh thu sau đó = 0
```

Số âm kéo tổng doanh thu **về 0**. Nghĩa là một khách hàng bất kỳ vừa có thể **thổi phồng** vừa có
thể **xóa sạch** con số báo cáo tài chính của cửa hàng, tùy ý.

**Vì sao AI bỏ sót:** mỗi lượt sinh test case, AI chỉ nhìn thấy **một** endpoint. Chuỗi này cần
ghép một lỗi ở Pool B (`POST /api/checkout`) với một lỗi ở Pool C (`PUT /api/admin/orders/:id/status`)
rồi quan sát hệ quả ở một FR thứ ba (FR-13). Không lượt prompt nào có đủ ba mảnh đó cùng lúc. Nói
rộng hơn: **AI tìm lỗi, con người ghép lỗi thành kịch bản khai thác** — và mức độ nghiêm trọng
thật của một hệ thống nằm ở chuỗi ghép, không nằm ở từng lỗi rời.

## 2. Bốn nguyên nhân khiến AI bỏ sót

| # | Nguyên nhân | Thuộc về | Case |
| --- | --- | --- | --- |
| 1 | **Ràng buộc dạng "với mọi X" bị kiểm trên một phần tử** — AI kiểm thể hiện, không kiểm quy tắc | Chất lượng prompt *(lỗi của tôi: chỉ đưa một endpoint)* | E01 |
| 2 | **Trục quyền có hai câu hỏi, AI chỉ kiểm một** — kiểm *vai trò*, quên *quyền sở hữu* | Xu hướng của model | E02 |
| 3 | **Ngữ cảnh prompt thiếu FR liên quan** — không đưa FR-13 nên AI không biết `delivered` có nghĩa là tiền | Chất lượng prompt *(lỗi của tôi)* | E03, E04 |
| 4 | **AI tìm lỗi rời, không ghép thành chuỗi khai thác** — dừng ở "sai so với đặc tả", không hỏi "rồi sao nữa" | Xu hướng của model + phạm vi prompt | E05 |

**Đối chiếu với hai API trước:** ở API 1 và API 2, nguyên nhân chủ đạo là tôi **quên hỏi** một trục
nào đó (đồng thời, rủi ro ngoài SEC). Sang API 3 thì các trục đã được hỏi đủ — AI đạt 89,6 % VALID
và tự sinh được cả case đồng thời. Cái còn sót lại đều thuộc một loại khác: **những thứ chỉ nhìn
thấy khi bước ra khỏi phạm vi một endpoint** — kiểm một họ API thay vì một API, nối hệ quả sang một
FR khác, ghép lỗi của hai pool thành một chuỗi.

Đó cũng là giới hạn tự nhiên của cách làm "một prompt cho một endpoint": **nó không thể tìm ra thứ
nằm giữa các endpoint.** Muốn vượt qua thì phải có một lượt prompt riêng ở tầng hệ thống, và đó
chính là điều tôi đưa vào thiết kế Agent Skill ở phần generator (giai đoạn "phân tích liên
endpoint").

## 3. Những thứ tôi kiểm và thấy SUT làm ĐÚNG

| Kiểm tra | Kết quả |
| --- | --- |
| Ma trận chuyển trạng thái 25 ô | **Đúng 24/25** so với sơ đồ FR-10 |
| `status` ngoài enum / sai kiểu / thiếu (8 biến thể) | **400 cả tám** |
| `:id` không tồn tại / `abc` / 0 / âm / số thực / rỗng | **404 cả sáu**, không 500 |
| JWT sửa `role` thành `admin` mà không ký lại | **403** — chữ ký được kiểm đúng |
| Mass assignment `role` trong body | **Bị bỏ qua đúng** |
| SQL injection trong `status` và `:id` | **An toàn**, không đơn nào khác bị đổi |
| Response thành công và response lỗi | **JSON cả hai**, có thông báo rõ ràng |

## 4. Phát hiện ngoài phạm vi ba API (ghi lại cho trung thực, không tính vào số liệu)

Trong lúc kiểm E01, tôi thấy công thức tính giảm giá của FR-09 cũng sai: mã `HACK` giảm 99 % cho
đơn 10 000 000 ₫ trả về `discount_amount = -980000000` và `final_amount = 990000000` — cả hai đều
vô lý (giảm giá âm, và số phải trả **lớn hơn** giá gốc). Lỗi này thuộc `POST /api/apply-coupon`,
**không nằm trong ba API tôi đăng ký kiểm thử**, nên tôi ghi lại ở đây chứ không đưa vào bảng lỗi
và không mở issue.

## 5. Đóng góp vào kết quả cuối

| Nguồn | Số case | Lỗi phát hiện |
| --- | --- | --- |
| AI sinh (sau thẩm định) | 66 | 3 |
| Tự bổ sung | 5 | **3 lỗi mới** (E01 mở rộng phạm vi BUG-A3-01, E02, E05 là chuỗi ghép) |
| **Tổng** | **71** | |
