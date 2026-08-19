# Prompt nguyên văn — 7 lượt

Chép lại dùng được ngay. Thay `<ENDPOINT>`, `<FR>`, `<SEC-LIST>` cho phù hợp.

**Nguyên tắc trước khi bắt đầu:** ngữ cảnh **chỉ chứa đặc tả**. Không dán mã nguồn SUT vào bất kỳ
lượt nào.

---

## Lượt 1 — Phân tích (chưa sinh test case)

```
[dán phần đặc tả của <ENDPOINT>, các <FR> liên quan, và <SEC-LIST>]

Đọc phần đặc tả trên. Chưa sinh test case vội. Trước hết hãy liệt kê:
  (a) các tham số đầu vào và kiểu của chúng
  (b) mọi ràng buộc mà đặc tả nêu ra — MỖI ràng buộc phải trích rõ điều khoản
  (c) những gì phải thay đổi trong hệ thống sau một lần gọi thành công
  (d) chỗ đặc tả nói mập mờ, bỏ trống, hoặc TỰ MÂU THUẪN

Với mỗi mục ở (d), nêu cách bạn chọn xử lý và LÝ DO chọn như vậy.
Trình bày thành bảng.
```

**Kiểm ngay khi có kết quả:** ràng buộc nào ở (b) không trích được điều khoản → đánh dấu là *giả
định*, không phải ràng buộc.

---

## Lượt 2 — Phân vùng tương đương (một lượt cho MỖI tham số)

```
Chỉ tập trung vào tham số `<TÊN>`. Áp dụng kỹ thuật phân vùng tương đương:
chia miền giá trị thành các lớp hợp lệ và không hợp lệ, mỗi lớp lấy một giá
trị đại diện.

Với mỗi test case ghi rõ: ID, lớp tương đương, giá trị đầu vào, kết quả mong
đợi THEO ĐÚNG ĐẶC TẢ (status code + nội dung).

Đừng suy đoán hệ thống đang làm gì — chỉ bám vào đặc tả.
Nếu đặc tả không nói, ghi rõ đó là GIẢ ĐỊNH của bạn.
```

---

## Lượt 3 — Giá trị biên

```
Áp dụng kỹ thuật phân tích giá trị biên cho các tham số này.

Với những biên mà đặc tả KHÔNG nêu ngưỡng, hãy nói rõ bạn đang chọn biên theo
chuẩn nào (ví dụ RFC 5321 cho độ dài email) và đánh dấu nó là giả định.
```

> Với endpoint tính toán từ dữ liệu khác (ví dụ tổng tiền tính từ giỏ hàng), thêm:
> *"Chú ý biên nằm ở dữ liệu nguồn, không phải ở con số client gửi lên."*

---

## Lượt 4 — Chuyển trạng thái

```
Bây giờ bỏ qua phân vùng miền, chuyển sang kỹ thuật kiểm thử chuyển trạng thái.

Hãy dựng bảng chuyển trạng thái ĐẦY ĐỦ n×n, đánh dấu ô nào hợp lệ ô nào không.
Rồi sinh test case phủ: (1) mọi chuyển đổi hợp lệ, (2) các chuyển đổi KHÔNG
được phép xảy ra, (3) hành vi ngay tại biên.

Mỗi test case phải ghi rõ CHUỖI THAO TÁC dựng trạng thái ban đầu, chứ không
chỉ một request đơn lẻ.
```

**Nếu ma trận ≥ 10 ô, thêm:**

```
Vì các case này cùng một khuôn, chỉ khác dữ liệu, hãy trình bày dưới dạng
BẢNG DỮ LIỆU để chạy data-driven bằng Collection Runner, đừng viết n² case rời rạc.
```

---

## Lượt 5a — Bảo mật, trong danh sách

```
Chuyển sang trục bảo mật. Duyệt lần lượt <SEC-LIST> và xác định cái nào áp
dụng được cho endpoint này. Với mỗi cái áp dụng được, sinh test case cụ thể
kèm payload thật. Nêu rõ mục nào KHÔNG áp dụng và vì sao.
```

## Lượt 5b — Bảo mật, NGOÀI danh sách ← lượt quan trọng nhất

```
Giờ BƯỚC RA NGOÀI danh sách vừa duyệt.

Endpoint này còn rủi ro gì mà danh sách kia không phủ? Nghĩ kỹ về:
  - tính sẵn sàng (từ chối dịch vụ, cơ chế bảo vệ bị dùng ngược làm vũ khí)
  - tính đồng thời (đọc-sửa-ghi, mất cập nhật, thiếu tính bất biến)
  - vòng đời dữ liệu (token của tài khoản đã bị xoá hoặc đã bị khoá)
  - quyền sở hữu — KHÁC với vai trò
  - client tự đặt trường vốn thuộc quyền server (mass assignment)
```

> Bỏ lượt này thì mất khoảng một phần ba số lỗi nghiêm trọng. Đo được: ở API 1 (không có lượt này)
> AI bỏ trắng trục tính sẵn sàng; ở API 2 và 3 (có lượt này) AI tự tìm ra mass assignment, giả mạo
> giá, và vấn đề đồng thời.

---

## Lượt 6 — Schema và giao thức HTTP

```
Bước cuối cho endpoint này. Hãy viết JSON Schema mà response thành công phải
thoả mãn, rồi sinh test case kiểm schema (đúng hình dạng, đúng kiểu từng
trường) và các test case ở tầng giao thức HTTP: sai method, sai Content-Type,
body hỏng.
```

> Mẹo: nếu có ràng buộc kiểu *"không được lộ trường X"*, biến nó thành mệnh đề schema
> `"not": { "required": ["X"] }` — kiểm được tự động thay vì kiểm bằng mắt.

---

## Lượt 7 — Liên endpoint (chạy sau khi xong ≥ 2 endpoint)

```
Bỏ qua từng endpoint riêng lẻ. Nhìn cả nhóm endpoint đã phân tích. Trả lời ba câu:

1. Ràng buộc nào được phát biểu cho CẢ MỘT HỌ endpoint (dạng "tất cả các API X
   phải...")? Ràng buộc dạng "với mọi" thì phải kiểm trên TOÀN BỘ họ, không phải
   trên một phần tử.

2. Trạng thái do endpoint A tạo ra chảy vào endpoint B ở đâu? Có yêu cầu chức
   năng nào diễn giải trạng thái đó thành tiền, quyền, hay số liệu báo cáo không?

3. Ghép hai lỗi đã tìm được ở hai endpoint khác nhau thì có tạo ra kịch bản nào
   nghiêm trọng hơn tổng của chúng không?
```

---

## Lượt phụ — bắt AI tự phản biện trước khi bạn thẩm định

```
Rà lại toàn bộ test case bạn vừa sinh. Với mỗi case, tự trả lời:
  1. Khẳng định này truy được về điều khoản đặc tả nào? Nếu không có, đánh dấu.
  2. Oracle có chữ "hoặc" / "tuỳ" không? Nếu có, chốt lại một kết quả duy nhất.
  3. Có dựng nổi đầu vào bằng API công khai không? Nếu không, đánh dấu.
  4. Case cần trạng thái ban đầu — đã ghi tiền đề chưa?
  5. Case này có thể thất bại vì một LÝ DO KHÁC với điều đang kiểm không?
  6. Có case nào trùng lặp không?
  7. Trục nào không có case nào? Cố ý hay bỏ sót?
```

Lượt này không thay được việc bạn tự thẩm định, nhưng nó dọn sạch phần lớn lỗi cơ học trước, để
bạn dồn sức vào phần cần phán đoán.
