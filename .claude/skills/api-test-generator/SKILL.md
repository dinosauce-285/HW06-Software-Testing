---
name: api-test-generator
description: "Generate, audit, extend and execute API test cases from a specification, using AI as a disciplined assistant rather than a black box. Use when testing a REST endpoint from its spec, auditing AI-generated test cases, hunting for bugs the AI missed, building a Postman collection, or wiring a Newman CI gate. Covers the full pipeline - isolate the spec, generate per technique, audit against measured behaviour, extend across endpoints, execute, report."
---

# Sinh test case API từ đặc tả — quy trình 6 giai đoạn

Quy trình này rút ra từ ba lần chạy thật trên backend EShop (HW06): **194 test case, 26 lỗi**.
Mỗi cảnh báo trong tài liệu ứng với một lỗi **đã thật sự mắc phải và đã sửa** — không có mục nào
là lý thuyết suông.

**Nguyên tắc bao trùm:** không con số nào được xuất hiện trong báo cáo nếu không rút ra được từ
output thô của Newman hoặc từ một lệnh `curl` chạy lại được.

**Số liệu chứng minh quy trình có tác dụng** — tỉ lệ test case VALID qua ba lần áp dụng:

| | API 1 | API 2 | API 3 |
| --- | ---: | ---: | ---: |
| VALID | 45,0 % | 78,3 % | **89,6 %** |
| INVALID | 30,0 % | 11,7 % | 1,5 % |
| INCOMPLETE | 25,0 % | 10,0 % | 9,0 % |

Cùng một model. Toàn bộ mức tăng đến từ việc **ghi lại vì sao AI sai rồi biến thành danh mục kiểm
tra prompt** — xem giai đoạn 6.

---

## Giai đoạn 1 — Cách ly ngữ cảnh

**Chỉ đưa cho AI đặc tả. Tuyệt đối không đưa mã nguồn.**

Nếu AI đọc được mã nguồn, nó sẽ viết *kết quả mong đợi* theo đúng cái chương trình **đang làm** —
kể cả khi chương trình sai. Kết quả: mọi test đều PASS và không phát hiện được lỗi nào. Cách ly là
**điều kiện cần** để test case có khả năng bắt lỗi.

```bash
# ĐÚNG: chỉ trích phần đặc tả liên quan
sed -n '/### FR-08/,/### FR-09/p' README.md
sed -n '/#### 4.3/,/#### 4.4/p' api_specification.md

# SAI: đừng bao giờ đưa cái này vào ngữ cảnh sinh test
# cat backend/server.js
```

**Kèm theo phải đưa:** các FR **tham chiếu tới** endpoint đang xét, không chỉ FR của chính nó.

> ⚠️ **Lỗi đã mắc:** ở API 3 tôi không đưa FR-13 (Dashboard tính doanh thu từ đơn `delivered`),
> nên AI không có cách nào biết trạng thái `delivered` mang ý nghĩa tiền bạc. Nó tìm ra lỗi
> `canceled → delivered` nhưng dừng ở *"sai so với sơ đồ"*, không đi tới *"đơn đã hủy được tính vào
> doanh thu"*.

---

## Giai đoạn 2 — Bắt AI phân tích trước, viết sau

Đây là **một lượt prompt riêng**, chưa sinh test case nào.

```
Chưa sinh test case. Hãy liệt kê:
  (a) tham số đầu vào và kiểu
  (b) mọi ràng buộc — MỖI ràng buộc phải trích rõ điều khoản đặc tả
  (c) trạng thái hệ thống thay đổi thế nào sau một lần gọi thành công
  (d) chỗ đặc tả mập mờ, bỏ trống, hoặc TỰ MÂU THUẪN
Với mỗi mục (d), nêu cách bạn chọn xử lý và LÝ DO.
```

**Vì sao mục (b) bắt trích điều khoản:** ràng buộc nào không trích được thì **không phải ràng
buộc** — nó là giả định. Ở API 1, 30 % test case INVALID đều do AI khẳng định những quy tắc mà đặc
tả không hề đặt ra.

**Vì sao mục (c) quan trọng với endpoint ghi dữ liệu:** với `POST`/`PUT`, oracle **không nằm ở
response**. Nó nằm ở bản ghi được tạo/sửa. Phải đọc lại bằng một request khác rồi mới khẳng định.

> ⚠️ Mã HTTP đúng **không** chứng minh dữ liệu đúng. Có endpoint trả 400 mà vẫn ghi vào CSDL.

**Mục (d) thường có kết quả bất ngờ.** Trong ba lần chạy, AI phát hiện **2 chỗ đặc tả tự mâu
thuẫn** mà tôi đọc bằng mắt đã bỏ qua. Nếu nó nêu mâu thuẫn kèm lựa chọn và lý do thì bạn thẩm định
được; nếu nó im lặng chọn bừa thì bạn không biết đường nào mà lần.

---

## Giai đoạn 3 — Sinh theo từng kỹ thuật, mỗi kỹ thuật một lượt prompt

**Không gộp.** Mỗi lượt một kỹ thuật, đúng như đã học trên lớp.

| Lượt | Kỹ thuật | Ghi chú bắt buộc trong prompt |
| --- | --- | --- |
| 3a | Phân vùng tương đương — **mỗi tham số một lượt** | *"Kết quả mong đợi phải bám ĐẶC TẢ, không phải đoán hệ thống đang làm gì. Nếu đặc tả không nói, ghi rõ là giả định."* |
| 3b | Giá trị biên | *"Biên nào không có trong đặc tả thì nêu rõ bạn lấy chuẩn nào (ví dụ RFC 5321)."* |
| 3c | Chuyển trạng thái | *"Dựng ma trận ĐẦY ĐỦ n×n. Mỗi case ghi rõ chuỗi thao tác dựng trạng thái ban đầu."* |
| 3d | Bảo mật — **hai lượt** | xem bên dưới |
| 3e | Schema và giao thức HTTP | *"Viết JSON Schema cho response trước, rồi sinh case."* |

### 3d là chỗ quan trọng nhất — phải tách làm hai lượt

**Lượt một:** *"Duyệt lần lượt SEC-01 → SEC-07, nêu rõ cái nào không áp dụng và vì sao."*

**Lượt hai:** *"Giờ BƯỚC RA NGOÀI danh sách vừa duyệt. Endpoint này còn rủi ro gì mà danh sách kia
không phủ?"* — gợi ý các trục thường bị bỏ quên:

- **tính sẵn sàng** (DoS, khoá tài khoản dùng làm vũ khí)
- **tính đồng thời** (đọc-sửa-ghi, mất cập nhật, thiếu tính bất biến)
- **vòng đời dữ liệu** (token của tài khoản đã xoá, đã khoá)
- **quyền sở hữu** — khác hẳn với **vai trò**
- **client tự đặt trường thuộc quyền server** (mass assignment)

> ⚠️ **Lỗi đã mắc:** ở API 1 tôi chỉ hỏi *"duyệt SEC-01→07"*. AI làm đúng răm rắp và bỏ trắng toàn
> bộ trục tính sẵn sàng — vì trong 7 mục đó không có mục nào nói về nó. Đây là hiệu ứng **neo vào
> danh sách cho sẵn**: đưa AI một danh sách đóng thì nó tối ưu **trong** danh sách. Thêm lượt hai ở
> API 2 thì AI tự tìm ra nhóm mass assignment và chuyện giả mạo giá.

### Khi ma trận trạng thái ≥ 10 ô: chuyển sang data-driven

Đừng sinh n² case rời. Yêu cầu AI xuất **bảng dữ liệu**, rồi chạy một request lặp qua file CSV.

```bash
npx newman run collections/<tên>.postman_collection.json \
  -e environments/local.postman_environment.json \
  -d data/<ma-tran>.csv
```

Với 5 trạng thái là 25 ô — một request thay cho 25 request chép đi chép lại.

---

## Giai đoạn 4 — Phân tích liên endpoint

**Khối này tìm ra những lỗi nặng nhất, và không lượt prompt nào ở giai đoạn 3 thấy được.**

Chạy sau khi đã phân tích từ hai endpoint trở lên:

```
Bỏ qua từng endpoint riêng lẻ. Trả lời ba câu:
1. Ràng buộc nào được phát biểu cho CẢ MỘT HỌ endpoint (dạng "tất cả các API X
   phải...")? Kiểm nó trên TOÀN BỘ họ, không chỉ trên một endpoint.
2. Trạng thái do endpoint A tạo ra chảy vào endpoint B ở đâu? Có FR nào diễn giải
   trạng thái đó thành tiền, quyền, hay báo cáo không?
3. Ghép hai lỗi đã tìm được ở hai endpoint khác nhau thì có tạo ra kịch bản nào
   nghiêm trọng hơn tổng của chúng không?
```

Ba câu này sinh ra ba lỗi nghiêm trọng nhất của HW06:

| Câu | Lỗi tìm ra |
| --- | --- |
| 1 | FR-12 nói *"tất cả API admin phải kiểm role"* — kiểm cả họ thì phát hiện **toàn bộ** `/api/admin/*` đều thủng, một tài khoản khách chiếm được trọn quyền quản trị |
| 2 | Trạng thái `delivered` chảy vào công thức doanh thu FR-13 |
| 3 | Ghép "client tự đặt số tiền" với "user tự đổi trạng thái" → khách **tự ghi doanh thu** vào dashboard |

> **Quy tắc:** AI tìm lỗi, **con người ghép lỗi thành chuỗi khai thác**. Mức nghiêm trọng thật của
> hệ thống nằm ở chuỗi ghép, không nằm ở từng lỗi rời.

---

## Giai đoạn 5 — Thẩm định: đo trước, gán nhãn sau

**Không thẩm định được nếu chỉ đọc đặc tả.** Phải đo hành vi thật trước.

```bash
./scripts/reset-db.sh        # DB sạch trước mỗi nhóm phép đo
curl -s -w '\n<- HTTP %{http_code}  %{content_type}\n' ...
```

Rồi gán nhãn từng case:

| Nhãn | Nghĩa | Xử lý |
| --- | --- | --- |
| **VALID** | Bám một ràng buộc **có thật**, oracle rõ, tái hiện được | giữ nguyên |
| **INVALID** | Khẳng định yêu cầu **đặc tả không đặt ra**, hoặc lập luận sai bản chất, hoặc **trùng lặp** | sửa oracle hoặc hạ xuống khuyến nghị |
| **INCOMPLETE** | Ý đúng nhưng thiếu tiền đề / thiếu cách quan sát / oracle mơ hồ | bổ sung cho chạy được |

> **Nguyên tắc phân biệt:** test **thất bại vì SUT có lỗi thì vẫn VALID** — đó chính là công dụng
> của nó. Chỉ gán INVALID khi bản thân *test case* sai, không phải khi *hệ thống* sai.

### Bảy cổng tự kiểm — chạy trên từng case

| # | Câu hỏi | Nhãn khi vi phạm |
| --- | --- | --- |
| 1 | Có truy được về điều khoản đặc tả không? | CẦN XÁC NHẬN |
| 2 | Oracle có chữ "hoặc" / "tuỳ" không? | ORACLE MƠ HỒ |
| 3 | Có dựng nổi đầu vào bằng API công khai không? | KHÔNG THI HÀNH ĐƯỢC |
| 4 | Case cần trạng thái ban đầu — đã có tiền đề chưa? | THIẾU TIỀN ĐỀ |
| 5 | **Có thể thất bại vì lý do KHÁC không?** | OBSERVABILITY |
| 6 | Có trùng case khác không? | TRÙNG LẶP |
| 7 | Trục nào không có case nào? | *(cảnh báo độ phủ)* |

> ⚠️ **Cổng 5 là cổng dễ bỏ qua nhất và nguy hiểm nhất.** Ví dụ thật: case *"token user thường
> chuyển đơn sang `delivered` phải bị chặn"* — nhưng đơn mới ở `pending`, mà `pending → delivered`
> vốn đã là chuyển đổi không hợp lệ. SUT trả 400 vì **máy trạng thái**, chưa kịp đụng tới `role`.
> Test "thất bại đúng như mong đợi" nhưng **vì lý do hoàn toàn khác** — tạo cảm giác đã kiểm phân
> quyền trong khi chưa kiểm gì cả.
>
> ⚠️ **Cổng 3, ví dụ thật:** case *"token hết hạn"* không dựng nổi đầu vào — muốn ký token hết hạn
> phải biết khoá bí mật của server, thứ không có trong đặc tả. Mà hệ thống này còn không phát hành
> token có `exp`.

---

## Giai đoạn 6 — Ghi bài học thành DANH MỤC, không giữ trong đầu

Sau mỗi lần thẩm định, ghi lại **vì sao AI sai**, rồi biến thành một dòng trong danh mục kiểm tra
prompt cho lần sau.

> ⚠️ **Lỗi đã mắc:** ở API 1 tôi rút ra hai bài học — *"phải hỏi về rủi ro ngoài danh sách"* và
> *"phải hỏi về tính đồng thời"*. Sang API 2 tôi áp dụng bài học thứ nhất (tỉ lệ VALID tăng
> 45 % → 78 %) nhưng **quên** bài học thứ hai, và đúng chỗ đó thủng. Bài học giữ trong đầu thì lần
> sau vẫn sót. **Phải ghi thành danh mục.**

### Danh mục kiểm tra prompt (bản hiện tại)

- [ ] Đã cách ly khỏi mã nguồn chưa?
- [ ] Đã đưa các FR **tham chiếu tới** endpoint này chưa, không chỉ FR của chính nó?
- [ ] Có lượt phân tích riêng trước khi sinh case không?
- [ ] Mỗi kỹ thuật một lượt prompt riêng, không gộp?
- [ ] Bảo mật đã tách **hai** lượt (trong danh sách / ngoài danh sách) chưa?
- [ ] Đã hỏi về **tính đồng thời** chưa?
- [ ] Đã hỏi về **quyền sở hữu**, không chỉ **vai trò**, chưa?
- [ ] Đã hỏi về **vòng đời** (tài khoản bị xoá / bị khoá) chưa?
- [ ] Case trạng thái đã có tiền đề và cách quan sát chưa?
- [ ] Endpoint ghi dữ liệu — oracle đã đọc lại bản ghi chưa?
- [ ] Ma trận ≥ 10 ô — đã chuyển data-driven chưa?
- [ ] Đã chạy giai đoạn 4 (liên endpoint) sau khi xong ≥ 2 endpoint chưa?

---

## Thi hành: những cái bẫy đã vấp

### Cô lập trạng thái giữa các case

Case nào làm bẩn trạng thái dùng chung sẽ phá mọi case chạy sau nó.

> ⚠️ **Đã vấp hai lần.** (1) Các case gửi mật khẩu sai vào tài khoản seed làm **khoá** tài khoản đó
> — khoá kéo dài 180 giây và không API nào gỡ được — nên mọi case sau nhận 403. (2) Một case của
> API 1 khoá tài khoản seed, làm hỏng **toàn bộ** folder của API 2 chạy sau.
>
> **Cách sửa:** mỗi case tự đăng ký tài khoản riêng trong pre-request:
> ```js
> const email = 'st-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@test.local';
> ```

### Postman **chờ** callback của pre-request

Muốn tạo tranh chấp đồng thời thì phải bắn cả hai request **trong cùng một test script**, không
chờ nhau. Đặt ở pre-request thì Postman chờ xong mới gửi request chính → hai lệnh chạy **tuần tự**
và test pass vì lý do sai.

### Đừng khẳng định trên trạng thái toàn cục

> ⚠️ **Đã vấp:** case SQLi khẳng định *"không đơn nào trong hệ thống có trạng thái delivered"* —
> nhưng các case khác cũng tạo ra đơn `delivered` một cách hợp lệ. Chỉ được khẳng định trên **chính
> đối tượng đang thử**.

### Cẩn thận với type affinity của SQLite

> ⚠️ **Đã vấp:** đánh dấu 7 case sai kiểu là "bắt lỗi", nhưng SQLite tự ép `"200000"` và `true` về
> số khi ghi vào cột kiểu số. Chỉ `"abc"` và `null` mới thật sự làm hỏng dữ liệu. 5 case kia không
> bắt được gì.

### Hai collection từ một nguồn khai báo

Bộ test khẳng định theo **đặc tả**, mà SUT có lỗi thật, nên case bắt lỗi sẽ FAIL — đó là công dụng
của chúng. Nhưng cổng CI thì cần luôn xanh. Cách giải:

```js
{ id: "TC-...", knownBug: "BUG-A2-03", ... }   // đánh dấu case đang bắt lỗi đã biết
```

- **Bộ đầy đủ** — có cả case bắt lỗi → dùng làm bằng chứng bug
- **Bộ hồi quy** — bỏ các case đó → cổng CI, fail ở đây nghĩa là có **hồi quy mới**

### Sinh collection, đừng viết tay

3 API × ~60 case = ~180 request. Khai báo tập trung trong `tests/*.cases.js`, sinh ra JSON bằng
script. Đổi một khẳng định dùng chung thì sửa một chỗ thay vì 180 chỗ.

---

## Tài liệu tham chiếu

- `references/prompts.md` — prompt nguyên văn của cả 7 lượt, chép lại dùng được ngay
- `references/pitfalls.md` — danh sách đầy đủ các lỗi đã mắc, kèm cách phát hiện và cách sửa
