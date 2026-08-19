# Bug Report — HW06 API Testing (EShop)

> **Đề mục 6:86.** Báo cáo mọi lỗi thật tìm được — kể cả lỗi AI bỏ sót — trong báo cáo Markdown
> **và** trên trang GitHub Issues, mỗi issue kèm ảnh chụp.
>
> **Sinh viên:** 23127262 — **SUT:** `ttbhanh/eshop-sut` @ `85af3ba` — **Ngày chạy:** 19/08/2026
> **Nguồn bằng chứng:** `results/raw/conformance.json` (Newman, 254 khẳng định / 20 thất bại)
>
> **Nguyên tắc:** mỗi lỗi dưới đây đều (a) bị ít nhất một test case trong collection bắt được, và
> (b) tái hiện lại được bằng lệnh `curl` chép nguyên ở mục "Tái hiện". Không có lỗi nào được viết
> ra từ suy đoán hay từ việc chỉ đọc mã nguồn.

## Tổng quan

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

## Đối chiếu nguồn phát hiện

| Nguồn | Số lỗi | Trong đó Nghiêm trọng |
| --- | --- | --- |
| Test case AI sinh (sau khi tôi thẩm định và sửa) | 6 | 2 |
| Test case tôi tự bổ sung ở bước 3 | **5** | **3** |

Bốn trong năm lỗi tự tìm (BUG-A1-07, 08, 10, 11) đều nằm ở chỗ **hai trục kiểm thử giao nhau** —
cơ chế khóa tài khoản (trạng thái) tạo ra lỗ hổng bảo mật. AI được dẫn qua từng trục riêng lẻ và
làm rất tốt trong phạm vi từng trục, nhưng không bắc cầu giữa chúng. Phân tích đầy đủ:
`api1/Extended.md` mục 2.
