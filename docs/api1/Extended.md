# API 1 — `POST /api/login` — Bước 3: Test case tự bổ sung (Extend)

> **Đề mục 6:84.** Thêm **ít nhất 5** test case của riêng mình mà AI đã bỏ sót — đặc biệt quanh
> bảo mật và chuyển trạng thái — và giải thích **vì sao** AI bỏ sót.
>
> **Người viết:** 23127262 — **Ngày:** 18/08/2026
> Cả 7 case dưới đây tôi đều đã tái hiện thật bằng `curl` trước khi viết, số liệu kèm theo.

## 1. Bảy test case bổ sung

### TC-A1-E01 — Bộ đếm không được reset khi hết hạn khóa → khóa vĩnh viễn

Đây là case giá trị nhất trong cả bộ.

| | |
| --- | --- |
| **Trục** | Chuyển trạng thái |
| **Tiền đề** | Tài khoản mới, `login_attempts = 0` |
| **Thao tác** | Sai 2 lần → bị khóa → **chờ hết hạn khóa** → sai **đúng 1 lần** nữa |
| **Mong đợi (spec)** | Hết khóa thì bộ đếm về 0, người dùng lại có đủ 3 lượt thử |
| **Thực tế đo được** | Bộ đếm **vẫn giữ nguyên 4** sau khi hết khóa; sai thêm 1 lần → 6 → **khóa lại ngay 180 giây nữa**; mật khẩu đúng ngay sau đó nhận **403** |

```
T+0     sai 1 → 401, counter = 2
        sai 2 → 401, counter = 4, locked_until = 09:50:27   [đã khóa]
T+185s  counter = 4, locked_until = 09:50:27   ← thời gian KHÔNG reset bộ đếm
        sai thêm ĐÚNG 1 lần → counter = 6, locked_until = 09:53:32   [khóa lại]
        thử mật khẩu ĐÚNG → HTTP 403
```

**Hệ quả thật:** sau lần bị khóa đầu tiên, người dùng **không còn lượt thử sai nào**. Gõ nhầm một
ký tự là mất thêm 3 phút, lặp lại vô hạn. Với người dùng thật, tài khoản coi như hỏng vĩnh viễn.

**Vì sao AI bỏ sót:** FR-02 mô tả *trạng thái* (khóa 30 giây) nhưng **im lặng về chuyển tiếp
ngược** — không nói bộ đếm ra sao sau khi hết khóa. AI suy diễn hợp lý rằng nó về 0, vẽ mũi tên đó
vào bảng chuyển trạng thái ở bước 1.5, rồi **không sinh test case để kiểm chính điều nó vừa suy
diễn**. Đây là giới hạn cốt lõi của việc sinh test từ đặc tả: AI kiểm những gì đặc tả **nói**, chứ
không kiểm những gì đặc tả **bỏ trống** — kể cả khi chính nó đã liệt kê chỗ bỏ trống đó (mục G2 ở
bước 1.1).

### TC-A1-E02 — Liệt kê tài khoản qua kênh phản hồi 403

| | |
| --- | --- |
| **Trục** | Bảo mật (C5) |
| **Thao tác** | Gửi 3 lần mật khẩu sai cho một email, đọc mã trạng thái lần thứ 3 |
| **Mong đợi (spec)** | Không phân biệt được email nào có thật (C5) |
| **Thực tế đo được** | Email **có thật** → `401, 401, 403`. Email **không tồn tại** → `401, 401, 401, 401` |

**Hệ quả thật:** một oracle liệt kê tài khoản **tất định**, không cần đo thời gian, không cần đoán.
Cứ 3 request là biết chắc một email có tồn tại trong hệ thống hay không.

**Vì sao AI bỏ sót:** đây là **lỗi do cách tôi chia prompt**, không phải giới hạn model. Tôi tách
bước 1.5 (chuyển trạng thái) và bước 1.6 (bảo mật) thành hai lượt riêng biệt. Lỗ hổng này chỉ hiện
ra khi **ghép hai trục lại**: cơ chế khóa (trạng thái) tạo ra một kênh rò rỉ (bảo mật). AI làm rất
tốt trong phạm vi từng lượt prompt — TC-048 so sánh hai thông báo lỗi ở nhánh 401 hoàn toàn chính
xác — nhưng nó **không bắc cầu giữa các lượt**. Bài học: chia nhỏ prompt giúp phủ sâu từng trục,
nhưng phải có thêm một lượt hỏi *"những trục này giao nhau ở đâu?"*.

### TC-A1-E03 — Tranh chấp đồng thời làm mất cập nhật bộ đếm

| | |
| --- | --- |
| **Trục** | Chuyển trạng thái + Bảo mật |
| **Thao tác** | Bắn **5 request đăng nhập sai đồng thời** vào cùng một tài khoản |
| **Mong đợi** | Bộ đếm phản ánh đủ 5 lần thất bại |
| **Thực tế đo được** | Bộ đếm chỉ lên **4** — tương đương **2** lần tăng, mất 3 |

**Hệ quả thật:** cơ chế đọc-sửa-ghi (`login_attempts + 2` đọc từ bản ghi cũ) bị mất cập nhật khi có
đồng thời. Kẻ tấn công gửi mật khẩu đoán **song song** thay vì tuần tự sẽ tiêu tốn ít lượt đếm hơn
nhiều — chính là làm suy yếu chức năng mà khóa tài khoản sinh ra để chống.

**Vì sao AI bỏ sót:** đặc tả viết bằng ngôn ngữ tuần tự (*"sau mỗi lần đăng nhập sai"*), và bản
thân danh sách kỹ thuật tôi đưa ở các lượt prompt cũng chỉ có phân vùng miền / trạng thái / bảo mật
/ schema — **không có mục nào về đồng thời**. AI bám sát khung tôi đưa. Đây là giới hạn kép: đặc tả
không mô tả đồng thời, và prompt không yêu cầu nghĩ tới nó.

### TC-A1-E04 — Không có giới hạn tần suất theo IP

| | |
| --- | --- |
| **Trục** | Bảo mật |
| **Thao tác** | Gửi 100 request đăng nhập liên tiếp từ cùng một IP |
| **Mong đợi** | Có cơ chế chặn ở tầng IP, hoặc ít nhất làm chậm dần |
| **Thực tế đo được** | **100 request xong trong 638 ms**, không request nào bị chặn |

### TC-A1-E05 — Khóa tài khoản trở thành vũ khí từ chối dịch vụ

| | |
| --- | --- |
| **Trục** | Bảo mật (tính sẵn sàng) |
| **Thao tác** | Kẻ tấn công **chỉ cần biết email** nạn nhân, gửi 2 mật khẩu sai mỗi 3 phút |
| **Mong đợi** | Nạn nhân vẫn đăng nhập được bằng mật khẩu đúng của mình |
| **Thực tế đo được** | Nạn nhân bị 403 vô thời hạn; ghép với E01 thì chỉ cần **1 request mỗi 3 phút** là đủ duy trì khóa vĩnh viễn |

**Vì sao AI bỏ sót E04 và E05:** ở bước 1.6 tôi bảo AI *"duyệt lần lượt SEC-01 đến SEC-07"*. AI làm
đúng răm rắp: duyệt đủ 7 mục, tuyên bố rõ mục nào áp dụng được và mục nào không. Nhưng **cả 7 mục
đều nói về tính bí mật và phân quyền — không mục nào nói về tính sẵn sàng**. AI coi danh sách được
đưa là **toàn bộ không gian bảo mật** và không bước ra ngoài nó. Đây là hiệu ứng neo (anchoring):
đưa cho AI một danh sách đóng thì nó tối ưu **trong** danh sách đó thay vì tự hỏi danh sách còn
thiếu gì. Prompt lẽ ra phải là *"duyệt SEC-01→07, **rồi nói xem còn rủi ro nào nằm ngoài danh sách
này**"*.

### TC-A1-E06 — Thông báo khi bị khóa nói thẳng lý do

| | |
| --- | --- |
| **Trục** | Bảo mật (C5) |
| **Thao tác** | Kích hoạt khóa rồi đọc thân response |
| **Mong đợi (spec)** | *"không để lộ chi tiết nguyên nhân"* (FR-02) |
| **Thực tế đo được** | `403 {"error":"Tài khoản đã bị khóa. Vui lòng thử lại sau."}` — lộ cả **trạng thái tài khoản** lẫn **sự tồn tại** của nó |

**Vì sao AI bỏ sót:** AI **có** hiểu đúng ràng buộc C5 và **có** viết TC-048 để kiểm — nhưng chỉ
kiểm ở nhánh 401. Nó coi C5 là thuộc tính của *một* response, trong khi C5 phải đúng trên **mọi**
nhánh phản hồi của endpoint. Cùng gốc với E02: AI kiểm điểm, không kiểm mặt.

### TC-A1-E07 — Mật khẩu được lưu plaintext ở tầng CSDL, không chỉ lộ ở response

| | |
| --- | --- |
| **Trục** | Bảo mật (SEC-01) |
| **Thao tác** | Đăng ký tài khoản mới với mật khẩu đã biết → đăng nhập → đối chiếu chuỗi trong response với chuỗi vừa đặt |
| **Mong đợi (spec)** | *"Mật khẩu không được lưu dưới dạng plaintext"* (SEC-01) |
| **Thực tế đo được** | Response trả về `"password":"Test1234!"` — **đúng nguyên chuỗi vừa đăng ký**, chứng tỏ CSDL đang lưu plaintext chứ không phải hash |

**Vì sao AI bỏ sót:** TC-044 của AI kiểm SEC-01 ở **tầng truyền** (response không được chứa mật
khẩu). Nhưng SEC-01 nói về **tầng lưu trữ**. Muốn kết luận về lưu trữ phải suy một bước nữa:
*response trả về nguyên bản ghi ⇒ thứ nhìn thấy chính là thứ đang nằm trong CSDL ⇒ CSDL lưu
plaintext*. AI dừng ở quan sát trực tiếp, không suy diễn sang tầng mà API không phơi bày.

## 2. Tổng hợp: bốn nguyên nhân khiến AI bỏ sót

| # | Nguyên nhân | Thuộc về | Case liên quan |
| --- | --- | --- | --- |
| 1 | **Prompt chia theo trục, không có lượt hỏi giao điểm** — lỗ hổng nằm ở chỗ hai trục gặp nhau | Chất lượng prompt *(lỗi của tôi)* | E02, E06 |
| 2 | **AI kiểm cái đặc tả nói, không kiểm cái đặc tả im lặng** — kể cả khi chính nó đã chỉ ra chỗ im lặng | Giới hạn của việc sinh từ đặc tả | E01 |
| 3 | **Hiệu ứng neo vào danh sách cho sẵn** — đưa SEC-01→07 thì AI chỉ nghĩ trong 7 mục đó, bỏ trắng tính sẵn sàng | Chất lượng prompt + xu hướng của model | E04, E05 |
| 4 | **Mô hình tư duy tuần tự, không có khái niệm đồng thời** | Giới hạn model + đặc tả | E03 |
| 5 | **Dừng ở quan sát trực tiếp, không suy sang tầng bị che** | Giới hạn model | E07 |

Đáng chú ý: **hai trong bốn nguyên nhân là lỗi của tôi, không phải của AI.** Nếu bước 1.6 tôi hỏi
thêm một câu *"còn rủi ro nào ngoài SEC-01→07?"* và có một lượt prompt cuối hỏi *"các trục vừa rồi
giao nhau ở đâu?"*, thì E02, E04, E05, E06 nhiều khả năng AI đã tự tìm ra. Đây là bài học mang sang
API 2 và API 3.

## 3. Đóng góp vào kết quả cuối

| Nguồn | Số case | Bug phát hiện |
| --- | --- | --- |
| AI sinh (sau thẩm định) | 59 | 5 |
| Tự bổ sung | 7 | **4 lỗi mới** (E01, E02+E06 cùng gốc C5, E03, E05) |
| **Tổng** | **66** | |

Bốn lỗi mới này **không lỗi nào** bị AI chạm tới, và ba trong số đó (E01, E02, E05) nghiêm trọng
hơn phần lớn những gì AI tìm được — vì chúng ảnh hưởng trực tiếp tới việc người dùng thật có đăng
nhập được hay không.
