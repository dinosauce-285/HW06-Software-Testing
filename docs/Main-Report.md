# HW06 — API Testing (EShop) — Báo cáo chính

| | |
| --- | --- |
| **Sinh viên** | Lý Quốc Thành — **23127262** |
| **Bài tập** | HW06-AI — API Testing |
| **SUT** | EShop — [ttbhanh/eshop-sut](https://github.com/ttbhanh/eshop-sut) @ `85af3ba` |
| **Repo công khai** | https://github.com/dinosauce-285/HW06-Software-Testing |
| **Công cụ** | Postman + Newman · Claude Opus 5 (Claude Code CLI) |
| **Ngày thực hiện** | 18/08/2026 – 19/08/2026 |
| **Header bắt buộc** | `X-Student-Id: 23127262` trên **mọi** request *(mục 6:85)* |

---

## 0. Tóm tắt kết quả

| Chỉ số | Giá trị |
| --- | ---: |
| Số API kiểm thử | **3** (một cho mỗi pool A, B, C) |
| Test case AI sinh ra | **187** |
| Test case tự bổ sung | **17** |
| **Tổng test case** | **204** |
| Test case đã thực thi | 194 |
| Khẳng định (bộ đầy đủ) | **619** — 59 thất bại |
| Khẳng định (ma trận data-driven) | **150** — 2 thất bại |
| Khẳng định (bộ hồi quy CI) | **448** — 0 thất bại |
| **Lỗi phát hiện** | **26** — 13 mức Nghiêm trọng |
| GitHub Issue đã mở | **26** (#1–#26), mỗi issue kèm ảnh bằng chứng |
| Số commit | 23 |

**Nguyên tắc xuyên suốt:** không con số nào trong báo cáo này được gõ tay. Mọi số liệu đều rút ra
từ `results/raw/*.json` (output thô Newman) hoặc từ một lệnh `curl` chạy lại được — đề mục 11 nói
TA có đối chiếu.

---

## 1. Lựa chọn API *(mục 5:72)*

| # | Pool | FR | Endpoint | Vì sao chọn |
| --- | --- | --- | --- | --- |
| **API 1** | A | FR-02 Đăng nhập & khoá tài khoản | `POST /api/login` | Phân vùng miền dày trên hai tham số, có **máy trạng thái khoá tài khoản**, chạm SEC-01/02/05 |
| **API 2** | B | FR-08 Thanh toán | `POST /api/checkout` | Endpoint **ghi dữ liệu** — oracle nằm ở hệ quả chứ không ở response; sinh đơn `pending` làm đầu vào cho API 3 |
| **API 3** | C | FR-18 Quản lý đơn (admin) | `PUT /api/admin/orders/:id/status` | **Máy trạng thái FR-10 đầy đủ 5×5** + kiểm soát truy cập FR-12/SEC-03 |

Ba API nối thành một luồng nghiệp vụ trọn vẹn: **đăng nhập → lấy token → đặt hàng → admin chuyển
trạng thái đơn**. Nhờ vậy chúng dùng chung biến `{{token}}` / `{{orderId}}` và cho phép kiểm cả
những lỗi **nằm giữa các endpoint** — chính là nhóm lỗi nghiêm trọng nhất tìm được (mục 5).

> **Cam kết không trùng lặp *(mục 5:76)*:** ba API trên đã được thông báo và xác nhận không trùng
> với thành viên nào trong nhóm. *(Sinh viên xác nhận lại trước khi nộp.)*

---

## 2. Quy trình thực hiện — 5 bước cho mỗi API *(mục 6:82-86)*

Mỗi bước là một commit riêng *(mục 12:137)*.

### Bước 1 — Sinh bằng AI, dẫn từng bước *(mục 6:82)*

Đề cấm prompt gộp kiểu *"sinh hết test case từ spec"*. Tôi chia **7 lượt prompt cho mỗi API**, mỗi
lượt một kỹ thuật kiểm thử:

| Lượt | Nội dung |
| --- | --- |
| 1 | Phân tích đặc tả — **chưa sinh case**: tham số, ràng buộc (kèm điều khoản), hệ quả sau ghi, chỗ đặc tả mập mờ |
| 2 | Phân vùng tương đương — **một lượt cho mỗi tham số** |
| 3 | Phân tích giá trị biên |
| 4 | Kiểm thử chuyển trạng thái |
| 5a | Bảo mật — duyệt SEC-01 → SEC-07 |
| 5b | Bảo mật — **những rủi ro ngoài danh sách đó** |
| 6 | JSON Schema + tầng giao thức HTTP |

#### Quyết định thiết kế quan trọng nhất: cách ly AI khỏi mã nguồn

AI **chỉ được đọc đặc tả**, tuyệt đối không đọc `sut/backend/server.js`.

Lý do: nếu AI đọc mã nguồn, nó sẽ viết *kết quả mong đợi* theo đúng cái chương trình **đang làm** —
kể cả khi chương trình sai. Kết quả là **mọi test đều PASS và không phát hiện được lỗi nào**. Sinh
từ đặc tả thì *expected* là **điều hệ thống phải làm**, và chỗ nào hành vi thật lệch khỏi nó chính
là bug. Cách ly là **điều kiện cần** để bộ test có khả năng bắt lỗi, và cũng là điều kiện để bước 2
và bước 3 trung thực.

### Bước 2 — Thẩm định *(mục 6:83)*

Gán nhãn **VALID / INVALID / INCOMPLETE** cho từng case, kèm lý do, rồi sửa case sai.

**Không thể thẩm định nếu chỉ đọc đặc tả.** Trước mỗi lần gán nhãn tôi đo hành vi thật của SUT bằng
`curl` trên DB sạch (`./scripts/reset-db.sh`). Bảng đo nằm ở đầu mỗi file `Audit.md`.

Nguyên tắc phân biệt quan trọng: **test thất bại vì SUT có lỗi thì vẫn VALID** — đó chính là công
dụng của nó. Chỉ gán INVALID khi bản thân *test case* sai.

### Bước 3 — Bổ sung *(mục 6:84)*

Thêm **17 test case tự nghĩ** mà AI bỏ sót, mỗi case đều tái hiện bằng `curl` **trước khi viết**,
kèm phân tích **vì sao AI sót** (mục 6).

### Bước 4 — Thực thi *(mục 6:85)*

Chạy bằng Newman, xuất báo cáo HTML + JSON thô. Chi tiết ở mục 4.

### Bước 5 — Báo cáo lỗi *(mục 6:86)*

26 lỗi ghi ở `docs/Bug-Report.md` **và** 26 GitHub Issue, mỗi issue kèm ảnh render từ lệnh chạy
thật có in hostname, thời điểm và phiên bản SUT.

---

## 3. Kết quả thẩm định — số liệu đáng chú ý nhất của bài

| | API 1 | API 2 | API 3 | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Case AI sinh | 60 | 60 | 67 | **187** |
| **VALID** | 27 (45,0 %) | 47 (78,3 %) | 60 (**89,6 %**) | 134 (71,7 %) |
| INVALID | 18 (30,0 %) | 7 (11,7 %) | 1 (1,5 %) | 26 (13,9 %) |
| INCOMPLETE | 15 (25,0 %) | 6 (10,0 %) | 6 (9,0 %) | 27 (14,4 %) |

**Cùng một model, cùng một người dẫn.** Tỉ lệ VALID đi **45 % → 78 % → 90 %**. Toàn bộ mức tăng đến
từ ba thay đổi trong cách viết prompt, mỗi thay đổi rút ra từ một lỗi cụ thể ở API trước:

| Bài học rút ra ở | Thay đổi prompt | Hiệu quả đo được |
| --- | --- | --- |
| API 1 — AI neo vào danh sách SEC cho sẵn, bỏ trắng trục tính sẵn sàng | thêm lượt 5b: *"ngoài danh sách đó còn rủi ro gì?"* | API 2 tự tìm ra nhóm mass assignment và giả mạo giá; API 3 tự nêu vấn đề đồng thời |
| API 1 — cả 9 case chuyển trạng thái không có tiền đề | bắt *"mỗi case ghi rõ chuỗi thao tác"* | API 3 đạt **24/25** case ma trận VALID |
| API 1 — AI khẳng định ràng buộc đặc tả không có (30 % INVALID) | bắt *"ghi rõ đâu là giả định của bạn"* | API 3 tự đánh dấu 5 giả định và **tự phát hiện đặc tả tự mâu thuẫn** |

### Ba khuôn lỗi hệ thống của AI (quan sát ở API 1)

1. **Gán ràng buộc tầng giao diện cho tầng API** — 6 case. Đặc tả ghi *"trường email phải dùng
   `type="email"`"*, đó là ràng buộc của **form HTML**; AI đọc thành ràng buộc của endpoint.
2. **Kéo ràng buộc từ FR này sang FR khác** — 2 case. Quy tắc độ phức tạp mật khẩu thuộc FR-01
   (đăng ký), không áp cho FR-02 (đăng nhập).
3. **Viết test chuyển trạng thái mà quên trạng thái** — 9 case, không case nào có tiền đề.

---

## 4. Thực thi

### 4.1 Ba collection sinh ra từ một nguồn khai báo

Bộ test **không** viết tay JSON. Ba API × ~60 case là ~180 request; viết tay thì không soát được,
và đổi một khẳng định dùng chung phải sửa 180 chỗ. Tôi khai báo tập trung ở `tests/*.cases.js` rồi
sinh ra collection bằng `scripts/build-collection.js`.

| Collection | Nội dung | Kết quả |
| --- | --- | --- |
| `EShop-API-Tests` | **đầy đủ** — 169 request | 480 request thực gọi · **619 khẳng định / 59 fail** |
| `EShop-API-Regression` | bỏ case bắt lỗi đã biết — 120 request | **448 khẳng định / 0 fail** — cổng CI |
| `EShop-API3-Transitions` | data-driven, 1 request × 25 dòng CSV | **150 khẳng định / 2 fail** |

**Vì sao phải tách hai bộ:** bộ test khẳng định theo **đặc tả**, mà SUT có 26 lỗi thật, nên case
bắt lỗi **sẽ FAIL** — đó đúng là công dụng của chúng. Nhưng đề mục 6:91 lại đòi một lượt CI *"toàn
bộ test case đều pass"*. Nếu để cổng CI chạy bộ đầy đủ thì nó **đỏ vĩnh viễn**, và một cổng luôn đỏ
thì không ai nhìn nữa. Cách giải là mô hình **quarantine**: lỗi đã biết vẫn hiển thị đầy đủ trong
báo cáo, còn cổng CI chỉ chặn khi có **hồi quy mới**.

### 4.2 Chứng minh kết quả sạch

Sau mỗi lượt chạy tôi đối chiếu tự động hai điều:

```
>> Fail ngoài dự kiến: 0          — mọi khẳng định thất bại đều truy được về một mã lỗi
>> knownBug không fail: 0         — mọi case đánh dấu "bắt lỗi" đều thật sự bắt được
```

Điều thứ hai đã bắt được sai sót của chính tôi: 6 case từng bị đánh dấu nhầm là "bắt lỗi" nhưng
không bắt được gì — SQLite có **type affinity**, tự ép chuỗi trông giống số (`"200000"`) về số khi
ghi vào cột kiểu số, nên chỉ `"abc"` và `null` mới thật sự làm hỏng dữ liệu.

### 4.3 Ma trận chuyển trạng thái — 25 ô chạy data-driven

Đây là chỗ tính năng data-driven của Postman thật sự đúng bài: 5 trạng thái × 5 trạng thái = 25 cặp
**cùng một khuôn**, chỉ khác dữ liệu. Một request lặp qua `data/api3-transitions.csv` thay cho 25
request chép đi chép lại.

Kết quả đo: **khớp sơ đồ FR-10 ở 24/25 ô**. Ô lệch duy nhất là `canceled → delivered` — trạng thái
kết thúc lại chuyển đi được (BUG-A3-02).

---

## 5. Lỗi phát hiện

### 5.1 Tổng quan

| Nguồn | API 1 | API 2 | API 3 | Tổng | Nghiêm trọng |
| --- | ---: | ---: | ---: | ---: | ---: |
| Test case AI sinh (sau thẩm định) | 6 | 5 | 3 | **14** | 5 |
| Test case tôi tự bổ sung | 5 | 4 | 3 | **12** | **8** |
| **Tổng** | **11** | **9** | **6** | **26** | **13** |

**Trong 13 lỗi mức Nghiêm trọng, 8 lỗi do tôi tự tìm.**

### 5.2 Năm lỗi nặng nhất

| Mã | Mô tả | Vì sao nặng |
| --- | --- | --- |
| **BUG-A3-04** | **Toàn bộ** `/api/admin/*` không kiểm `role` | Một tài khoản khách bình thường đọc được bảng người dùng, tự tạo mã giảm giá 99 % dùng được ngay, nhập sản phẩm, và **xóa tài khoản người khác** |
| **BUG-A2-01** | Backend nhận thẳng `total_amount` của client | **Khách tự quyết định số tiền phải trả.** Giỏ 200 000 ₫ khai 1 đồng thì đơn ghi 1 đồng; số âm cũng lọt |
| **BUG-A3-06** | Ghép BUG-A2-01 + BUG-A3-01 | Khách **tự ghi số doanh thu tùy ý** vào dashboard FR-13, hoặc kéo về 0 bằng đơn âm |
| **BUG-A1-11** | Hết hạn khoá không reset bộ đếm | Sau lần khoá đầu, gõ nhầm **một** lần là khoá lại 3 phút, lặp vô hạn → tài khoản hỏng vĩnh viễn |
| **BUG-A1-07** | Liệt kê tài khoản qua kênh 403 | Email thật trả 403 sau 3 lần sai, email giả luôn 401 → oracle liệt kê tài khoản **tất định** |

Chi tiết đầy đủ 26 lỗi, kèm lệnh tái hiện và kết quả đo: `docs/Bug-Report.md`.

### 5.3 Những gì SUT làm **đúng** — ghi lại cho cân bằng

Báo cáo chỉ liệt kê lỗi thì dễ gây hiểu nhầm là mọi thứ đều hỏng. Những điều sau đã kiểm và đạt:

| Kiểm tra | Kết quả |
| --- | --- |
| SQL injection ở `login`, `checkout`, `order status` | **An toàn** — dùng parameterized query |
| Chữ ký JWT | **Kiểm đúng** — sửa `role` trong payload không ký lại thì bị chặn 403 |
| Mass assignment (`user_id`, `status`, `id`, `role` trong body) | **Bị bỏ qua đúng** |
| Ma trận chuyển trạng thái | **Đúng 24/25 ô** |
| `status` ngoài enum / sai kiểu (8 biến thể) | **Từ chối cả 8** |
| `:id` không hợp lệ (6 biến thể) | **404 cả 6**, không 500 |
| Thông báo lỗi ở nhánh 401 | **Không lộ nguyên nhân**, đúng FR-02 |

### 5.4 Câu hỏi cần làm rõ với người viết đặc tả

Hai chỗ đặc tả tự mâu thuẫn — tôi **không** báo thành lỗi vì cách đọc còn tranh cãi được:

| # | Câu hỏi | Tình trạng |
| --- | --- | --- |
| Q1 | Admin có được hủy đơn đang `shipping` không? Sơ đồ FR-10 nói không, câu văn ngay dưới ngụ ý có | SUT trả 400 (theo sơ đồ) |
| Q2 | Chuyển sang **chính trạng thái hiện tại** (`X → X`) là lỗi hay thao tác vô hại? | SUT trả 400 cho cả 5 ô đường chéo |

---

## 6. Vì sao AI bỏ sót 12 lỗi — phân tích nguyên nhân

Đây là phần đề yêu cầu ở bước 3 *(mục 6:84)*. Gộp cả ba API, các nguyên nhân rơi vào **năm nhóm**:

| # | Nguyên nhân | Thuộc về | Ví dụ |
| --- | --- | --- | --- |
| 1 | **Prompt đóng khung trong một endpoint** — lỗi vòng đời nằm ở chỗ nhiều endpoint gặp nhau theo thời gian | prompt *(lỗi của tôi)* | token của tài khoản đã xoá / đã khoá vẫn đặt hàng được |
| 2 | **Ràng buộc dạng "với mọi X" bị kiểm trên một phần tử** — AI kiểm thể hiện, không kiểm quy tắc | prompt *(lỗi của tôi)* | FR-12 nói "tất cả API admin", AI kiểm đúng một endpoint |
| 3 | **Ngữ cảnh prompt thiếu FR liên quan** | prompt *(lỗi của tôi)* | không đưa FR-13 nên AI không biết `delivered` nghĩa là tiền |
| 4 | **AI kiểm thuộc tính, không nghĩ tiếp thành chuỗi khai thác** | xu hướng model | dừng ở *"B đọc được đơn của A"*, không tới *"duyệt id là rút sạch CSDL"* |
| 5 | **Trục quyền có hai câu hỏi, AI chỉ kiểm một** — kiểm *vai trò*, quên *quyền sở hữu* | xu hướng model | người lạ hủy được đơn của người khác |

**Ba trong năm nguyên nhân là lỗi của tôi, không phải của AI.** Và đây là điều tôi rút ra rõ nhất
từ bài này: prompt tốt hơn giúp AI **viết test case đúng hơn** (INVALID giảm 30 % → 1,5 %), nhưng
**không** giúp nó nhìn rộng hơn phạm vi ngữ cảnh được đưa — cột "lỗi tôi tự tìm" không hề giảm qua
ba API. **AI tìm lỗi rời; ghép lỗi thành kịch bản khai thác vẫn là việc của người.**

Một bài học phụ nhưng đắt: ở API 1 tôi rút ra **hai** bài học, sang API 2 chỉ áp dụng **một** và
quên bài học về tính đồng thời — đúng chỗ đó lại thủng. Bài học phải được ghi thành **danh mục
kiểm tra prompt**, giữ trong đầu thì lần sau vẫn sót. Danh mục đó nay nằm trong Agent Skill.

---

## 7. Tính năng Postman đã dùng *(mục 6:90)*

**27 tính năng**, liệt kê đầy đủ kèm chỗ chứng minh ở `docs/Postman-Features.md`. Nhóm chính:

- **Tổ chức:** collection, folder lồng theo trục kiểm thử, environment, 4 loại phạm vi biến
- **Script:** pre-request và test ở **cấp collection** (gắn `X-Student-Id` cho mọi request) và cấp request, `pm.sendRequest` dựng tiền đề nhiều bước, khẳng định bất đồng bộ lồng nhau, gửi request song song
- **Kiểm tra:** JSON Schema (`pm.response.to.have.jsonSchema`), khẳng định trên **hệ quả** chứ không chỉ response
- **Data-driven:** file CSV + `pm.iterationData` + tên request động theo dữ liệu
- **Chạy:** Newman CLI, reporter `htmlextra` và `json`, chạy theo folder, tích hợp GitHub Actions

**Ba tính năng cố tình không dùng** — mock server, monitor, visualizer — đều có ghi lý do kỹ thuật.
Đề khuyến khích dùng nhiều tính năng, nhưng dùng một tính năng sai chỗ chỉ để điền vào bảng thì
không phải kiểm thử.

---

## 8. CI/CD *(mục 6:91)*

Pipeline GitHub Actions tự dựng SUT từ đầu (clone → `npm install` → seed DB → chạy backend nền →
chờ sẵn sàng) rồi chạy bộ hồi quy.

| Lượt | Commit | Kết quả |
| --- | --- | --- |
| **Pass toàn bộ** | `88ce596` | ✅ [run 32222002026](https://github.com/dinosauce-285/HW06-Software-Testing/actions/runs/32222002026) — **448 khẳng định / 0 fail** |
| **Fail đúng 1 case** | `7c1cd9c` | ❌ [run 32223024403](https://github.com/dinosauce-285/HW06-Software-Testing/actions/runs/32223024403) — **451 khẳng định / 1 fail** |

Lượt fail **không** được tạo bằng cách sửa bừa một khẳng định. Tôi mô phỏng đúng tình huống mà cổng
CI sinh ra để chặn: gỡ một test case ra khỏi khu cách ly như thể lỗi của nó đã được sửa — nhưng lỗi
vẫn còn, và cổng chặn lại.

Chi tiết cấu hình, ảnh chụp trang Actions và đánh giá hạn chế: `docs/CI-CD-Report.md`.

---

## 9. AI Test Generator *(mục 7:95)*

Thiết kế bộ sinh test case tự động: **6 giai đoạn**, mỗi khối truy được về một lỗi thật đã quan sát
trong ba pipeline.

- **Pseudocode + lập luận thiết kế:** `generator/pseudocode.md`
- **Sơ đồ:** `generator/architecture.png` — **tự vẽ**, không do AI sinh *(mục 11:133)*
- **Agent Skill:** `.claude/skills/api-test-generator/` — SKILL.md + prompt nguyên văn 7 lượt +
  danh sách đầy đủ các bẫy đã vấp

Điểm thiết kế đáng nói nhất: bộ sinh **cố tình không tự động hoàn toàn**. Nó dừng ở **cổng thẩm
định của người**, xuất ra bản nháp có gắn nhãn độ tin cậy chứ không xuất ra bộ test chạy được. Căn
cứ là số liệu ở mục 3 và 5: tỉ lệ phải sửa giảm rất nhanh, nhưng số lỗi AI **không** tìm ra thì
không giảm.

---

## 10. Danh mục tài liệu

| Tài liệu | Nội dung |
| --- | --- |
| `docs/Main-Report.md` | Báo cáo này |
| `docs/Bug-Report.md` | 26 lỗi, mỗi lỗi có lệnh tái hiện và kết quả đo |
| `docs/AI-Audit-Report.md` | Mẫu 6 mục của Khoa, 14 artifact đã audit |
| `docs/AI-Prompt-Log.md` | 14 lượt tương tác nguyên văn, trích tự động |
| `docs/AI-Critique.md` | 300 từ |
| `docs/CI-CD-Report.md` | Cấu hình pipeline + 2 lượt chạy mẫu |
| `docs/Postman-Features.md` | 27 tính năng đã dùng + 3 tính năng cố tình không dùng |
| `docs/Test-Cases.csv` | 194 test case (mở bằng Excel) |
| `docs/Test-Summary.md` | Bảng tổng kết, sinh tự động từ output Newman |
| `docs/api{1,2,3}/` | AI-Generated-Raw · Audit · Extended cho từng API |
| `generator/` | Pseudocode + sơ đồ tự vẽ |
| `collections/` · `environments/` · `data/` | 3 collection, 1 environment, 1 file dữ liệu |
| `results/raw/` · `results/html/` | Output thô và báo cáo HTML của Newman |
| `evidence/bugs/` · `evidence/ci/` · `evidence/postman/` | 26 + 2 + ảnh Postman Console |
| `git-log.txt` | Nhật ký commit |

---

## 11. Tự đánh giá

| No. | Tiêu chí | Điểm | Tự chấm | Căn cứ |
| --- | --- | ---: | ---: | --- |
| 1 | API 1 — trọn pipeline | 30 | **30** | 60 case AI + 7 tự bổ sung, audit đủ 3 nhãn, 11 lỗi + 11 issue kèm ảnh |
| 2 | API 2 — trọn pipeline | 30 | **30** | 60 + 5 case, 9 lỗi + 9 issue, phát hiện lỗi nghiệp vụ nặng nhất (BUG-A2-01) |
| 3 | API 3 — trọn pipeline | 30 | **30** | 67 + 5 case, ma trận 25 ô data-driven, 6 lỗi + 6 issue |
| 4 | Agent Skill (AI test generator) | 10 | **10** | Pseudocode 6 giai đoạn + sơ đồ tự vẽ + skill đóng gói kèm 2 file tham chiếu |
| | **Tổng** | **100** | **100** | |

*(Sinh viên xác nhận điểm tự chấm và điền link video demo trước khi nộp.)*
