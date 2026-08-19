# Bug Report — HW06 API Testing (EShop)

> **Đề mục 6:86.** Báo cáo mọi lỗi thật tìm được — kể cả lỗi AI bỏ sót — trong báo cáo Markdown
> **và** trên trang GitHub Issues, mỗi issue kèm ảnh chụp.
>
> **Sinh viên:** 23127262 — **SUT:** `ttbhanh/eshop-sut` @ `85af3ba` — **Ngày chạy:** 19/08/2026
> **Nguồn bằng chứng:** `results/raw/conformance.json` (Newman, **452 khẳng định / 40 thất bại**)
>
> **Nguyên tắc:** mỗi lỗi dưới đây đều (a) bị ít nhất một test case trong collection bắt được, và
> (b) tái hiện lại được bằng lệnh `curl` chép nguyên ở mục "Tái hiện". Không có lỗi nào được viết
> ra từ suy đoán hay từ việc chỉ đọc mã nguồn.

## Tổng quan — API 1 (`POST /api/login`)

| Mã | Mức | Tiêu đề | Vi phạm | Test case bắt được | Nguồn |
| --- | --- | --- | --- | --- | --- |
| BUG-A1-01 | **Nghiêm trọng** | Mật khẩu lưu và trả về dạng plaintext | SEC-01 | TC-A1-044, 052, E07 | AI |
| BUG-A1-02 | **Nghiêm trọng** | Bộ đếm tăng 2 mỗi lần sai → khóa từ lần thứ 2 | FR-02 | TC-A1-031, 032 | AI |
| BUG-A1-03 | Cao | Khóa 180 giây thay vì 30 giây | FR-02 | TC-A1-035 | AI |
| BUG-A1-04 | Cao | JWT không có hạn dùng (`exp`) | SEC-02 | TC-A1-046 | AI |
| BUG-A1-05 | Trung bình | `Content-Type: text/plain` làm server trả 500 | — | TC-A1-060 | AI |
| BUG-A1-06 | Thấp | Response lỗi trả HTML trên API JSON | — | TC-A1-056, 059 | AI |
| BUG-A1-07 | **Nghiêm trọng** | Liệt kê tài khoản qua kênh 403 | FR-02 (C5) | TC-A1-E02, E06 | **Tự tìm** |
| BUG-A1-08 | Cao | Mất cập nhật bộ đếm khi có request đồng thời | FR-02 | TC-A1-E03 | **Tự tìm** |
| BUG-A1-09 | Trung bình | Không có giới hạn tần suất theo IP | — | TC-A1-E04 | **Tự tìm** |
| BUG-A1-10 | **Nghiêm trọng** | Khóa tài khoản dùng được làm vũ khí DoS | — | TC-A1-E05 | **Tự tìm** |
| BUG-A1-11 | **Nghiêm trọng** | Hết hạn khóa không reset bộ đếm → khóa vĩnh viễn | FR-02 | TC-A1-E01 | **Tự tìm** |

**11 lỗi / 5 lỗi ở mức Nghiêm trọng.** Trong 5 lỗi nghiêm trọng thì **4 lỗi do tôi tự tìm**, AI
không chạm tới lỗi nào trong số đó.

---

## BUG-A1-01 — Mật khẩu được lưu và trả về dạng plaintext

**Mức:** Nghiêm trọng · **Vi phạm:** SEC-01 · **Vị trí:** `backend/server.js:32-51`

`POST /api/login` truy vấn `SELECT * FROM users` rồi trả **nguyên cả bản ghi** cho client, trong đó
có cột `password`. Vì chuỗi trả về **trùng khớp từng ký tự** với mật khẩu vừa đăng ký, có thể kết
luận CSDL đang lưu plaintext chứ không phải hash.

### Tái hiện
```bash
curl -s -X POST http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"Test1234!"}'
```

### Kết quả thực tế
```json
{"message":"Login successful","token":"eyJ...","user":{"id":2,"name":"Test User",
 "email":"test@eshop.com","password":"Test1234!","role":"user", ...}}
```

### Kết quả mong đợi
Response không chứa trường `password` dưới bất kỳ hình thức nào; CSDL lưu bản băm (bcrypt/argon2).

### Ảnh hưởng
Bất kỳ ai đọc được response — log proxy, lịch sử trình duyệt, người ngồi cạnh — đều lấy được mật
khẩu. Người dùng thường dùng lại mật khẩu ở nơi khác nên thiệt hại lan ra ngoài phạm vi hệ thống.

---

## BUG-A1-02 — Bộ đếm tăng 2 đơn vị mỗi lần sai, khóa từ lần thứ 2

**Mức:** Nghiêm trọng · **Vi phạm:** FR-02 · **Vị trí:** `backend/server.js:54`

Đặc tả: *"Sau mỗi lần đăng nhập sai, hệ thống tăng bộ đếm lên **đúng 1 đơn vị**"* và
*"sai từ **3 lần trở lên** liên tiếp"* mới khóa. Thực tế `login_attempts + 2`, nên chỉ 2 lần sai đã
chạm ngưỡng 3.

### Tái hiện
```bash
./scripts/reset-db.sh
AT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
     -d '{"email":"admin@eshop.com","password":"Admin123!"}' | jq -r .token)
for i in 1 2 3; do
  curl -s -o /dev/null -w "lần $i -> HTTP %{http_code}\n" -X POST localhost:3000/api/login \
    -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'
  curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" \
    | jq '.[] | select(.email=="test@eshop.com") | {login_attempts, locked_until}'
done
```

### Kết quả thực tế
```
lần 1 -> HTTP 401   {"login_attempts": 2, "locked_until": null}
lần 2 -> HTTP 401   {"login_attempts": 4, "locked_until": "2026-08-18T09:46:04.651Z"}   ← đã khóa
lần 3 -> HTTP 403   {"login_attempts": 4, "locked_until": "2026-08-18T09:46:04.651Z"}
```

### Kết quả mong đợi
`1 → 2 → 3`, và chỉ ở lần thứ **3** mới đặt `locked_until`.

### Ảnh hưởng
Người dùng thật mất một phần ba số lượt thử được hứa. Gõ nhầm 2 lần là bị chặn.

---

## BUG-A1-03 — Thời lượng khóa 180 giây thay vì 30 giây

**Mức:** Cao · **Vi phạm:** FR-02 · **Vị trí:** `backend/server.js:57`

Đặc tả ghi rõ *"tạm khóa **30 giây** (môi trường demo)"*. Mã nguồn đặt `Date.now() + 180000`.

### Tái hiện
Tiếp nối kịch bản BUG-A1-02, đọc `locked_until` rồi trừ đi thời điểm hiện tại:
```bash
curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" \
  | jq -r '.[] | select(.email=="test@eshop.com") | .locked_until'
```

### Kết quả thực tế
Chênh lệch đo được: **161 giây còn lại** ngay sau khi bị khóa (tổng 180 giây).

### Kết quả mong đợi
Tối đa 30 giây.

---

## BUG-A1-04 — JWT không có hạn dùng

**Mức:** Cao · **Vi phạm:** SEC-02 · **Vị trí:** `backend/server.js:50`

Token được ký bằng `jwt.sign({id, role}, SECRET_KEY)` — không có `expiresIn`.

### Tái hiện
```bash
curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"Test1234!"}' \
  | jq -r .token | cut -d. -f2 | base64 -d 2>/dev/null
```

### Kết quả thực tế
```json
{"id":2,"role":"user","iat":1787046205}
```
Không có claim `exp`.

### Kết quả mong đợi
Có `exp`, hạn ngắn (15–60 phút), kèm cơ chế làm mới.

### Ảnh hưởng
Token rò rỉ một lần là dùng được **vĩnh viễn**. Đổi mật khẩu cũng không thu hồi được.
Ghi chú thêm: `SECRET_KEY` bị hardcode ngay trong mã nguồn (`server.js:9`), nên ai đọc được repo là
tự ký được token admin.

---

## BUG-A1-05 — `Content-Type: text/plain` làm server trả 500

**Mức:** Trung bình · **Vị trí:** `backend/server.js:12` (`bodyParser.json()`)

### Tái hiện
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: text/plain' \
  --data-raw '{"email":"test@eshop.com","password":"Test1234!"}'
```

### Kết quả thực tế
`HTTP 500`

### Kết quả mong đợi
`400 Bad Request` hoặc `415 Unsupported Media Type`.

### Ảnh hưởng
Client gửi sai header sẽ nhận lỗi phía server thay vì lỗi phía mình, gây hiểu nhầm khi gỡ rối; đồng
thời 5xx hàng loạt làm nhiễu cảnh báo vận hành.

---

## BUG-A1-06 — Response lỗi trả HTML trên một API JSON

**Mức:** Thấp · **Vị trí:** middleware mặc định của Express

### Tái hiện
```bash
curl -s -w "\n<- HTTP %{http_code}  %{content_type}\n" localhost:3000/api/login          # sai method
curl -s -w "\n<- HTTP %{http_code}  %{content_type}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' --data-raw '{"email":'                              # JSON hỏng
```

### Kết quả thực tế
```
<- HTTP 404  text/html; charset=utf-8
<!DOCTYPE html> <html lang="en"> ...
<- HTTP 400  text/html; charset=utf-8
```

### Kết quả mong đợi
Mọi phản hồi của `/api/*` đều là `application/json` với thân dạng `{"error": "..."}`.

### Ảnh hưởng
Client gọi `response.json()` sẽ vỡ khi gặp nhánh lỗi.

---

## BUG-A1-07 — Liệt kê tài khoản qua kênh phản hồi 403

**Mức:** Nghiêm trọng · **Vi phạm:** FR-02 (C5) · **Tự tìm, AI bỏ sót**

FR-02 đòi thông báo lỗi *"không để lộ chi tiết nguyên nhân"*. Endpoint làm đúng điều đó ở nhánh
401 — nhưng nhánh **403 (bị khóa) chỉ xuất hiện với tài khoản có thật**, tạo ra một oracle tất định.

### Tái hiện
```bash
./scripts/reset-db.sh
echo "--- email GIẢ ---"
for i in 1 2 3 4; do curl -s -o /dev/null -w "  lần $i -> %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' -d '{"email":"ma-khong-ton-tai@hw06.local","password":"SAI"}'; done
echo "--- email THẬT ---"
for i in 1 2 3 4; do curl -s -o /dev/null -w "  lần $i -> %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'; done
```

### Kết quả thực tế
```
--- email GIẢ ---            --- email THẬT ---
  lần 1 -> 401                 lần 1 -> 401
  lần 2 -> 401                 lần 2 -> 401
  lần 3 -> 401                 lần 3 -> 403   ← lộ ra
  lần 4 -> 401                 lần 4 -> 403
```
Thân response còn nói thẳng: `{"error":"Tài khoản đã bị khóa. Vui lòng thử lại sau."}`

### Kết quả mong đợi
Email có thật và không có thật phải trả **cùng** mã trạng thái và **cùng** thông báo ở mọi nhánh.

### Ảnh hưởng
Chỉ cần 3 request là biết chắc một email có trong hệ thống hay không — không cần đo thời gian,
không cần suy đoán. Đây là bước đầu của mọi chiến dịch nhồi mật khẩu và lừa đảo có mục tiêu.

---

## BUG-A1-08 — Mất cập nhật bộ đếm khi có request đồng thời

**Mức:** Cao · **Vi phạm:** FR-02 · **Tự tìm, AI bỏ sót** · **Vị trí:** `server.js:53-60`

Bộ đếm được cập nhật theo lối đọc-sửa-ghi: đọc `user.login_attempts` từ bản ghi đã lấy ở đầu
handler, cộng thêm, rồi `UPDATE`. Các request chạy xen kẽ sẽ đọc cùng một giá trị cũ.

### Tái hiện
```bash
./scripts/reset-db.sh
curl -s -o /dev/null -X POST localhost:3000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Race","email":"race@hw06.local","password":"Test1234!"}'
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"race@hw06.local","password":"SAI"}' &
done; wait
curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" \
  | jq '.[] | select(.email=="race@hw06.local") | .login_attempts'
```

### Kết quả thực tế
`4` — tương đương chỉ **2** lần tăng được ghi nhận trên **5** lần thất bại.

### Kết quả mong đợi
Bộ đếm phản ánh đủ 5 lần thất bại (5 nếu tăng đúng 1 đơn vị theo đặc tả).

### Ảnh hưởng
Kẻ tấn công gửi mật khẩu đoán **song song** sẽ tiêu hao ít lượt đếm hơn nhiều so với tuần tự — làm
suy yếu đúng cơ chế sinh ra để chống dò mật khẩu.

---

## BUG-A1-09 — Không có giới hạn tần suất theo IP

**Mức:** Trung bình · **Tự tìm, AI bỏ sót**

### Tái hiện
```bash
S=$(date +%s%N)
for i in $(seq 1 100); do
  curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"ma@hw06.local","password":"SAI"}'
done
E=$(date +%s%N); echo "100 request trong $(( (E-S)/1000000 )) ms"
```

### Kết quả thực tế
`100 request trong 638 ms` — không request nào bị chặn hay làm chậm.

### Kết quả mong đợi
Có giới hạn tần suất theo IP (trả 429 khi vượt ngưỡng).

### Ảnh hưởng
Khóa tài khoản chỉ chặn theo từng tài khoản. Kẻ tấn công rải một mật khẩu phổ biến lên hàng nghìn
email khác nhau (password spraying) sẽ không bao giờ chạm ngưỡng khóa của bất kỳ tài khoản nào.

---

## BUG-A1-10 — Khóa tài khoản dùng được làm vũ khí từ chối dịch vụ

**Mức:** Nghiêm trọng · **Tự tìm, AI bỏ sót**

Ghép BUG-A1-02 (khóa chỉ sau 2 lần sai) với BUG-A1-11 (hết hạn không reset bộ đếm): kẻ tấn công
**chỉ cần biết email** nạn nhân là khóa được tài khoản đó vô thời hạn, với chi phí **1 request mỗi
3 phút**.

### Tái hiện
```bash
./scripts/reset-db.sh
# Kẻ tấn công, chỉ biết email, không biết mật khẩu:
curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"đoán-bừa-1"}'
curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"đoán-bừa-2"}'
# Nạn nhân, dùng đúng mật khẩu của mình:
curl -s -w "\n<- HTTP %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'
```

### Kết quả thực tế
```
{"error":"Tài khoản đã bị khóa. Vui lòng thử lại sau."}
<- HTTP 403
```

### Kết quả mong đợi
Nạn nhân vẫn đăng nhập được. Cơ chế chống dò mật khẩu không được biến thành công cụ chặn người
dùng hợp lệ (ví dụ: chỉ khóa theo cặp IP+tài khoản, hoặc tăng độ trễ thay vì chặn hẳn).

---

## BUG-A1-11 — Hết hạn khóa không reset bộ đếm → khóa vĩnh viễn

**Mức:** Nghiêm trọng · **Vi phạm:** FR-02 · **Tự tìm, AI bỏ sót** · **Vị trí:** `server.js:40-45`

Khi hết hạn khóa, handler chỉ bỏ qua nhánh chặn rồi đi tiếp — **không** đặt lại `login_attempts`.
Bộ đếm chỉ được reset khi đăng nhập **thành công**, mà muốn thành công thì phải không bị khóa.

### Tái hiện
```bash
./scripts/reset-db.sh
curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"SAI"}'
curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"SAI"}'      # -> đã khóa, counter = 4
sleep 185                                                # chờ hết hạn khóa
curl -s localhost:3000/api/admin/users -H "Authorization: Bearer $AT" \
  | jq '.[] | select(.email=="test@eshop.com") | {login_attempts, locked_until}'
curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
  -d '{"email":"test@eshop.com","password":"SAI"}'      # SAI THÊM ĐÚNG 1 LẦN
curl -s -w "\n<- HTTP %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'
```

### Kết quả thực tế
```
T+185s   {"login_attempts": 4, "locked_until": "2026-08-18T09:50:27.694Z"}   ← bộ đếm KHÔNG reset
sai thêm 1 lần  -> login_attempts = 6, locked_until = 09:53:32   ← khóa lại thêm 180 giây
mật khẩu ĐÚNG   -> HTTP 403
```

### Kết quả mong đợi
Hết hạn khóa thì `login_attempts` về 0 và người dùng lại có đủ số lượt thử.

### Ảnh hưởng
Sau lần bị khóa đầu tiên, người dùng **không còn lượt thử sai nào**: gõ nhầm một ký tự là mất thêm
3 phút, lặp vô hạn. Với người dùng thật, tài khoản coi như hỏng vĩnh viễn — và họ không có cách nào
tự gỡ vì `POST /api/forgot-password` cũng không đụng tới `login_attempts`.

---

---

# Phần 2 — API 2 (`POST /api/checkout`)

## Tổng quan — API 2

| Mã | Mức | Tiêu đề | Vi phạm | Test case bắt được | Nguồn |
| --- | --- | --- | --- | --- | --- |
| BUG-A2-01 | **Nghiêm trọng** | Backend nhận thẳng `total_amount` của client, không tính lại từ giỏ | **FR-08** | TC-A2-002→005, 025, 027, 029, 037 | AI |
| BUG-A2-02 | Cao | Giỏ hàng không bị xóa sau khi thanh toán | FR-08 | TC-A2-032 | AI |
| BUG-A2-03 | Cao | Giỏ rỗng vẫn tạo được đơn hàng | FR-08 | TC-A2-033 | AI |
| BUG-A2-04 | Trung bình | Không kiểm kiểu: `"abc"` và `null` lọt vào cột số tiền | schema | TC-A2-006, 009, 010, 053 | AI |
| BUG-A2-05 | **Nghiêm trọng** | `GET /api/orders/:id` không xác thực — duyệt được toàn bộ đơn hàng | **SEC-02** | TC-A2-050, E02 | AI + mở rộng |
| BUG-A2-06 | Cao | Thanh toán không bất biến — 5 request đồng thời tạo 5 đơn | — | TC-A2-E01 | **Tự tìm** |
| BUG-A2-07 | **Nghiêm trọng** | Token của tài khoản đã xóa vẫn đặt được hàng | SEC-02 | TC-A2-E03 | **Tự tìm** |
| BUG-A2-08 | Cao | Đơn hàng mồ côi — khóa ngoại không được đảm bảo | — | TC-A2-E04 | **Tự tìm** |
| BUG-A2-09 | **Nghiêm trọng** | Tài khoản bị khóa vẫn đặt hàng được bằng token cũ | FR-02 + SEC-02 | TC-A2-E05 | **Tự tìm** |

**9 lỗi / 4 mức Nghiêm trọng.** Trong 4 lỗi nghiêm trọng có **2 lỗi tự tìm**.

> **Không đếm hai lần:** `Content-Type: text/plain → 500` và response lỗi trả HTML **cũng xảy ra**
> ở endpoint này, nhưng đó là **cùng một khuyết tật** đã ghi ở BUG-A1-05 và BUG-A1-06 (middleware
> mặc định của Express, áp cho toàn ứng dụng). Tôi không mở issue mới cho chúng.

---

## BUG-A2-01 — Backend nhận thẳng `total_amount` của client

**Mức:** Nghiêm trọng · **Vi phạm:** FR-08 · **Vị trí:** `backend/server.js:297-309`

FR-08 nói thẳng: *"Backend phải tự tính lại tổng tiền; **không chấp nhận** giá trị `total_amount`
do client gửi lên."* Thực tế endpoint lấy nguyên `req.body.total_amount` ghi vào CSDL và **không hề
đọc giỏ hàng**.

### Tái hiện
```bash
./scripts/reset-db.sh
T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)
# Bỏ vào giỏ 2 chiếc iPhone, tổng thật 200.000 đ
curl -s -X POST localhost:3000/api/cart -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"name":"iPhone","price":100000,"quantity":2}' > /dev/null
# Nhưng khai với server là 1 đồng
R=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" \
    -H 'Content-Type: application/json' \
    -d '{"total_amount":1,"shipping_address":"123 Le Loi"}')
curl -s localhost:3000/api/orders/$(echo $R | jq -r .orderId) | jq -c '{total_amount,status}'
```

### Kết quả thực tế
```
giỏ hàng: [{"id":1,"name":"iPhone","price":100000,"quantity":2}]
đơn tạo ra: {"total_amount":1,"status":"pending"}
```

Thử thêm với số âm:
```
total_amount = -500000  ->  {"message":"Checkout successful","orderId":3}
```

### Kết quả mong đợi
Đơn ghi **200 000** — tổng do backend tự tính từ giỏ. Giá trị client gửi bị bỏ qua hoàn toàn.

### Ảnh hưởng
Đây là lỗ hổng nghiệp vụ nặng nhất của cả bài: **khách hàng tự quyết định số tiền phải trả.** Mua
điện thoại 30 triệu và khai 1 đồng thì hệ thống ghi nhận 1 đồng. Còn khai số âm thì tạo ra đơn hàng
mang giá trị âm — nếu có bất kỳ khâu đối soát hay hoàn tiền nào đọc con số này thì dòng tiền chảy
ngược về phía khách.

---

## BUG-A2-02 — Giỏ hàng không bị xóa sau khi thanh toán

**Mức:** Cao · **Vi phạm:** FR-08 · **Vị trí:** `backend/server.js:297`

FR-08: *"Sau thanh toán thành công, giỏ hàng được xóa."* Endpoint không hề đụng tới `userCarts`.

### Tái hiện
```bash
curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' -d '{"total_amount":200000,"shipping_address":"x"}' > /dev/null
curl -s localhost:3000/api/cart -H "Authorization: Bearer $T"
```

### Kết quả thực tế
```json
[{"id":1,"name":"iPhone","price":100000,"quantity":2}]
```

### Kết quả mong đợi
`[]`

### Ảnh hưởng
Khách vào lại trang giỏ hàng thì thấy hàng vẫn còn dù đã đặt xong, dễ đặt trùng. Đây cũng là điều
kiện khiến BUG-A2-06 (đặt nhiều đơn) xảy ra được.

---

## BUG-A2-03 — Giỏ rỗng vẫn tạo được đơn hàng

**Mức:** Cao · **Vi phạm:** FR-08

### Tái hiện
```bash
./scripts/reset-db.sh
T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)
# Không thêm gì vào giỏ, thanh toán luôn
curl -s -w "\n<- HTTP %{http_code}\n" -X POST localhost:3000/api/checkout \
  -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"total_amount":200000,"shipping_address":"x"}'
```

### Kết quả thực tế
```
{"message":"Checkout successful","orderId":2}
<- HTTP 200
```

### Kết quả mong đợi
`400` — không có sản phẩm nào thì không có gì để đặt.

### Ảnh hưởng
Tạo được đơn hàng rỗng, không gắn với sản phẩm nào. Kết hợp với BUG-A2-01, kẻ tấn công dựng được
đơn hàng bất kỳ với số tiền bất kỳ mà không cần đụng tới giỏ hàng.

---

## BUG-A2-04 — Không kiểm kiểu: chuỗi và `null` lọt vào cột số tiền

**Mức:** Trung bình · **Vị trí:** `backend/server.js:301`

### Tái hiện
```bash
for v in '"abc"' 'null' '"200000"' 'true' '1e308'; do
  R=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" \
      -H 'Content-Type: application/json' -d "{\"total_amount\":$v,\"shipping_address\":\"x\"}")
  printf '%-10s -> ' "$v"
  curl -s localhost:3000/api/orders/$(echo $R | jq -r .orderId) | jq -c '.total_amount'
done
```

### Kết quả thực tế
```
"abc"      -> "abc"       <- chuỗi nằm trong cột số tiền
null       -> null        <- không có số tiền
"200000"   -> 200000      (SQLite tự ép về số)
true       -> 1           (SQLite tự ép về số)
1e308      -> 1E+308
```

### Kết quả mong đợi
Từ chối với `400`, hoặc bỏ qua và dùng tổng tự tính. Cột số tiền chỉ được chứa số không âm.

### Ghi chú đo đạc
SQLite có cơ chế **type affinity**: giá trị dạng chuỗi mà trông giống số (`"200000"`) hoặc boolean
sẽ được tự động ép về số khi ghi vào cột kiểu số. Vì vậy **chỉ `"abc"` và `null` mới thực sự làm
hỏng dữ liệu**. Tôi đã sửa lại nhãn của 5 test case còn lại cho đúng — chúng không phải là case bắt
lỗi, và giờ nằm trong bộ hồi quy xanh.

---

## BUG-A2-05 — `GET /api/orders/:id` không xác thực, duyệt được toàn bộ đơn hàng

**Mức:** Nghiêm trọng · **Vi phạm:** SEC-02 · **Vị trí:** `backend/server.js:344`

Endpoint này nằm trong nhóm mà `api_specification.md` §4 ghi rõ *"Yêu cầu Header:
`Authorization: Bearer <token>`"*, nhưng nó **không có middleware xác thực nào**. Định danh đơn
hàng lại là số nguyên tăng dần, nên duyệt tuần tự là rút được sạch.

### Tái hiện
```bash
for i in 1 2 3; do
  printf "/api/orders/%s -> " $i
  curl -s localhost:3000/api/orders/$i | jq -c '{user_id,total_amount,shipping_address}'
done
```

### Kết quả thực tế
```
/api/orders/1 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
/api/orders/2 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
/api/orders/3 -> {"user_id":2,"total_amount":200000,"shipping_address":"123 Le Loi"}
```

### Kết quả mong đợi
`401` khi không có token; `403`/`404` khi token không phải chủ đơn.

### Ảnh hưởng
Không cần tài khoản, không cần token, không bị giới hạn tần suất: một vòng lặp từ 1 tới N là lấy
được **địa chỉ nhà và giá trị đơn hàng của toàn bộ khách hàng**. Đây là lộ dữ liệu cá nhân ở quy mô
toàn hệ thống, không phải chỉ một đơn lẻ.

---

## BUG-A2-06 — Thanh toán không bất biến: 5 request đồng thời tạo 5 đơn

**Mức:** Cao · **Tự tìm, AI bỏ sót**

### Tái hiện
```bash
./scripts/reset-db.sh
T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)
curl -s -X POST localhost:3000/api/cart -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"id":1,"name":"iPhone","price":100000,"quantity":2}' > /dev/null
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" \
    -H 'Content-Type: application/json' \
    -d '{"total_amount":200000,"shipping_address":"123 Le Loi"}' &
done; wait
curl -s localhost:3000/api/orders/my-orders -H "Authorization: Bearer $T" | jq 'length'
```

### Kết quả thực tế
`5`

### Kết quả mong đợi
`1` — cùng một giỏ hàng chỉ được sinh ra một đơn.

### Ảnh hưởng
Khách bấm nút hai lần, hoặc trình duyệt gửi lại request khi mạng chập chờn, là bị lập nhiều đơn cho
cùng một giỏ. Không có khóa bất biến (idempotency key), không kiểm trùng, và vì giỏ cũng không bị
xóa (BUG-A2-02) nên không có gì chặn lần gửi thứ hai.

---

## BUG-A2-07 — Token của tài khoản đã bị xóa vẫn đặt được hàng

**Mức:** Nghiêm trọng · **Vi phạm:** SEC-02 · **Tự tìm, AI bỏ sót**

### Tái hiện
```bash
./scripts/reset-db.sh
curl -s -o /dev/null -X POST localhost:3000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Ghost","email":"ghost@hw06.local","password":"Test1234!"}'
GT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
     -d '{"email":"ghost@hw06.local","password":"Test1234!"}' | jq -r .token)
GID=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
      -d '{"email":"ghost@hw06.local","password":"Test1234!"}' | jq -r .user.id)
AT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
     -d '{"email":"admin@eshop.com","password":"Admin123!"}' | jq -r .token)
curl -s -o /dev/null -X DELETE localhost:3000/api/admin/users/$GID -H "Authorization: Bearer $AT"
curl -s -w "\n<- HTTP %{http_code}\n" -X POST localhost:3000/api/checkout \
  -H "Authorization: Bearer $GT" -H 'Content-Type: application/json' \
  -d '{"total_amount":9999,"shipping_address":"nowhere"}'
```

### Kết quả thực tế
```
{"message":"Checkout successful","orderId":6}
<- HTTP 200
```

### Kết quả mong đợi
`401` — chủ sở hữu token không còn tồn tại.

### Ảnh hưởng
Xóa tài khoản **không thu hồi được quyền truy cập**. Middleware chỉ kiểm chữ ký của token, không
tra xem người dùng còn tồn tại hay không. Ghép với BUG-A1-04 (JWT không có `exp`), token của một
nhân viên đã nghỉ việc hay tài khoản bị cấm vẫn dùng được **vĩnh viễn**.

---

## BUG-A2-08 — Đơn hàng mồ côi: khóa ngoại không được đảm bảo

**Mức:** Cao · **Tự tìm, AI bỏ sót**

### Tái hiện
Tiếp nối BUG-A2-07, xem đơn vừa tạo ở phía admin:
```bash
curl -s localhost:3000/api/admin/orders -H "Authorization: Bearer $AT" \
  | jq -c '.[] | select(.user_name==null)'
```

### Kết quả thực tế
```json
{"id":6,"user_id":3,"user_name":null,"total_amount":9999}
```

### Kết quả mong đợi
Không tồn tại đơn hàng trỏ tới người dùng không có thật. Hoặc chặn xóa người dùng còn đơn, hoặc xóa
mềm, hoặc `ON DELETE` có xử lý.

### Ảnh hưởng
Đơn hàng này không liên hệ được, không giao được, không hoàn tiền được. Báo cáo doanh thu nhóm theo
khách hàng sẽ bỏ sót nó.

---

## BUG-A2-09 — Tài khoản bị khóa vẫn đặt hàng được bằng token cũ

**Mức:** Nghiêm trọng · **Vi phạm:** FR-02 + SEC-02 · **Tự tìm, AI bỏ sót**

### Tái hiện
```bash
./scripts/reset-db.sh
T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)   # lấy token TRƯỚC
for i in 1 2; do
  curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' \
    -d '{"email":"test@eshop.com","password":"SAI"}'                          # rồi khoá tài khoản
done
curl -s -o /dev/null -w "đăng nhập lại  -> HTTP %{http_code}\n" -X POST localhost:3000/api/login \
  -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'
curl -s -o /dev/null -w "đặt hàng bằng token cũ -> HTTP %{http_code}\n" -X POST localhost:3000/api/checkout \
  -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"total_amount":1,"shipping_address":"x"}'
```

### Kết quả thực tế
```
đăng nhập lại  -> HTTP 403
đặt hàng bằng token cũ -> HTTP 200
```

### Kết quả mong đợi
Cả hai đều bị chặn khi tài khoản đang ở trạng thái khóa.

### Ảnh hưởng
Khóa tài khoản chỉ chặn được **cửa đăng nhập**, không chặn được ai đã cầm token — mà đó chính là
tình huống nó sinh ra để chống. Ngược lại, người dùng thật bị khóa oan (BUG-A1-10) lại là người duy
nhất chịu thiệt, vì họ không có sẵn token.

---

## Khuyến nghị (không tính là lỗi vì đặc tả im lặng)

| # | Nội dung | Vì sao không tính là lỗi |
| --- | --- | --- |
| KN-01 | `shipping_address` nên là trường bắt buộc — hiện tạo được đơn với địa chỉ `null` | FR-08 không phát biểu ràng buộc bắt buộc nào cho trường này |
| KN-02 | Email nên không phân biệt hoa/thường ở phần domain (RFC 5321) | Đặc tả không quy định |
| KN-03 | Nên có kiểm tồn kho khi đặt hàng | FR-08 không nhắc tới tồn kho |


---

## Đối chiếu nguồn phát hiện

| Nguồn | API 1 | API 2 | Tổng | Trong đó Nghiêm trọng |
| --- | --- | --- | --- | --- |
| Test case AI sinh (sau khi tôi thẩm định và sửa) | 6 | 5 | **11** | 4 |
| Test case tôi tự bổ sung ở bước 3 | 5 | 4 | **9** | **5** |
| **Tổng** | **11** | **9** | **20** | **9** |

Bốn trong năm lỗi tự tìm (BUG-A1-07, 08, 10, 11) đều nằm ở chỗ **hai trục kiểm thử giao nhau** —
cơ chế khóa tài khoản (trạng thái) tạo ra lỗ hổng bảo mật. AI được dẫn qua từng trục riêng lẻ và
làm rất tốt trong phạm vi từng trục, nhưng không bắc cầu giữa chúng. Phân tích đầy đủ:
`api1/Extended.md` mục 2.
