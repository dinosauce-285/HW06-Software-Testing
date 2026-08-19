# AI Audit Report — HW06 API Testing

**Khoa Công nghệ Thông tin (FIT) — Trường Đại học Khoa học Tự nhiên (HCMUS)**
**CS423 / CSC13003 — Kiểm chứng Phần mềm (AI-augmented · 2026)**

*Phụ lục bắt buộc theo mẫu 6 mục của Khoa. Nhật ký tương tác nguyên văn (tên công cụ, ngày giờ,
prompt, output) nằm ở `docs/AI-Prompt-Log.md`, trích tự động bằng `scripts/extract-prompt-log.py`.*

---

## 1. Thông tin Sinh viên

| Mục | Giá trị |
| --- | --- |
| **Họ tên sinh viên (in hoa)** | LÝ QUỐC THÀNH |
| **MSSV** | 23127262 |
| **Lớp / Khoá** | *(sinh viên điền)* |
| **Mã bài tập** | HW#06 — API Testing |
| **Ngày làm bài** | 18/08/2026 – 19/08/2026 |
| **Công cụ AI đã dùng** | Claude Opus 5 (`claude-opus-5`) qua Claude Code CLI |
| **Có dùng AI?** | ☑ Có ☐ Không |

**Tuyên bố (mục 9:113):** *"Tôi có dùng công cụ AI cho các tác vụ sau"* — sinh test case từ đặc tả,
soạn thảo tài liệu, viết script phụ trợ. Toàn bộ output đã được tôi rà soát và chỉnh sửa; chi tiết
ở mục 3.

---

## 2. Phạm vi audit

| | |
| --- | --- |
| Số API kiểm thử | 3 (`POST /api/login`, `POST /api/checkout`, `PUT /api/admin/orders/:id/status`) |
| Test case do AI sinh | **187** |
| Test case tôi tự bổ sung | **17** |
| Số lượt tương tác đã ghi | **14** lượt / 2 phiên — xem `AI-Prompt-Log.md` |
| Lỗi phát hiện | **26** |

**Artifact do AI sinh và đã audit:** test case cho 3 API, JSON Schema, bảng dữ liệu ma trận trạng
thái, và bản nháp các tài liệu. **Không dùng AI** cho: sơ đồ thiết kế generator (đề mục 11:133 cấm),
số liệu chạy Newman (lấy từ output thô), và ảnh bằng chứng (render từ lệnh chạy thật).

---

## 3. Bảng Audit — 1 hàng / artifact

> Cột (4) dẫn chiếu ISTQB Foundation Level Syllabus v4.0 hoặc điều khoản đặc tả EShop.

| # | (1) Prompt + Công cụ | (2) Output AI | (3) Verdict | (4) Lý do | (5) Bản SV sửa |
| --- | --- | --- | --- | --- | --- |
| **1** | **Claude Opus 5** · 18/08 16:19<br>*"Đọc phần đặc tả `POST /api/login`. Chưa sinh test case vội. Hãy liệt kê tham số, ràng buộc, trạng thái, và chỗ đặc tả mập mờ."* | Bảng 2 tham số, 8 ràng buộc C1–C8, sơ đồ 3 trạng thái khoá tài khoản, **6 điểm đặc tả bỏ trống G1–G6** | **VALID** | ISTQB §4.2 — phân tích đặc tả phải đi trước thiết kế test. Việc AI tự nêu 6 chỗ bỏ trống là đúng yêu cầu "xác định tính kiểm thử được của cơ sở kiểm thử" | Giữ nguyên. Dùng G1–G6 làm đầu vào cho bước extend |
| **2** | **Claude Opus 5** · 18/08 16:2x<br>*"Chỉ tập trung vào tham số `email`. Áp dụng phân vùng tương đương… Kết quả mong đợi theo đúng đặc tả."* | 14 case TC-A1-001→014. Trong đó TC-003→007, 010 đòi **HTTP 400** cho email sai định dạng | **INVALID** | Đặc tả FR-02 ghi *"trường email phải dùng `type="email"`"* — đây là ràng buộc của **form HTML**, không phải của API. ISTQB §1.4.2: oracle phải dẫn từ cơ sở kiểm thử, không suy diễn | Đổi 6 case sang **HTTP 401** (đo được). Chuyển yêu cầu 400 xuống mục *khuyến nghị*, không tính là lỗi |
| **3** | như trên, tham số `password` | 9 case TC-A1-015→023, trong đó TC-024/025 đòi từ chối mật khẩu < 8 ký tự | **INVALID** | Quy tắc độ phức tạp thuộc **FR-01 (đăng ký)**, không áp cho FR-02 (đăng nhập). Nếu áp thì tài khoản cũ không đăng nhập được. ISTQB §4.2.1 — phân vùng phải theo đúng miền của hàm đang xét | Gộp TC-025 vào TC-024, bỏ lập luận về ngưỡng 8, giữ lại như case *"mật khẩu sai độ dài bất kỳ vẫn 401"* |
| **4** | **Claude Opus 5** · 18/08<br>*"Chuyển sang kỹ thuật kiểm thử chuyển trạng thái… phủ mọi chuyển đổi hợp lệ và không hợp lệ."* | Bảng chuyển trạng thái + 9 case TC-A1-031→039. **Không case nào có tiền đề**, không case nào nói cách quan sát bộ đếm | **INCOMPLETE** | ISTQB §4.2.4 — kiểm thử chuyển trạng thái đòi xác định **trạng thái khởi đầu**. Thiếu tiền đề thì kết quả phụ thuộc thứ tự chạy | Thêm cho cả 9 case: (a) mỗi case tự đăng ký tài khoản riêng, (b) quan sát bộ đếm qua `GET /api/admin/users` |
| **5** | **Claude Opus 5** · 18/08<br>*"Viết JSON Schema mà response 200 phải thoả mãn."* | Schema đầy đủ, có mệnh đề `"not": {"required": ["password"]}` | **VALID** | Biến ràng buộc SEC-01 thành **ràng buộc schema kiểm được tự động** thay vì kiểm bằng mắt. Vượt mức tôi yêu cầu | Giữ nguyên, đưa thẳng vào TC-A1-052 |
| **6** | **Claude Opus 5** · 18/08<br>*"Duyệt lần lượt SEC-01 đến SEC-07, xác định cái nào áp dụng cho `POST /api/login`."* | 12 case bảo mật TC-A1-040→051, duyệt đủ 7 mục, nêu rõ mục nào không áp dụng | **INCOMPLETE** | Duyệt đúng danh sách nhưng **bỏ trắng trục tính sẵn sàng** — SEC-01→07 không có mục nào về nó. Đây là hiệu ứng neo vào danh sách cho sẵn | Tôi tự bổ sung 4 case: khoá tài khoản làm DoS, thiếu rate limit, liệt kê tài khoản qua kênh 403, khoá vĩnh viễn |
| **7** | **Claude Opus 5** · 19/08<br>*"…Duyệt SEC-01→07, **rồi nói thêm những rủi ro NGOÀI danh sách đó**."* (prompt đã sửa sau bài học #6) | 12 case + **tự tìm ra nhóm mass assignment** (client tự đặt `user_id`, `status`, `id`) và **giả mạo giá trong giỏ** | **VALID** | Chính là 3 rủi ro mà lượt trước bỏ sót. Chứng minh nguyên nhân nằm ở prompt, không ở model | Giữ nguyên cả 4 case. Chạy thật: SUT **xử lý đúng** — vẫn giữ vì test pass cũng là bằng chứng |
| **8** | **Claude Opus 5** · 19/08<br>*"Sinh test case cho `POST /api/checkout`… Phân tích trước, chưa sinh case."* | Phát hiện **đặc tả tự mâu thuẫn**: §4.3 mô tả body có `total_amount`, còn FR-08 nói *"không chấp nhận `total_amount` do client gửi"*. AI nêu mâu thuẫn, **chọn FR-08** và giải thích lý do | **VALID** | ISTQB §3.2.2 — rà soát tĩnh cơ sở kiểm thử để phát hiện mâu thuẫn. AI làm đúng việc của một reviewer, và **nêu ra** thay vì im lặng chọn bừa | Đồng ý với lựa chọn. Ghi bổ sung lập luận: FR-08 là phát biểu quy tắc, §4.3 chỉ là ví dụ hình dạng request |
| **9** | như trên, tham số `shipping_address` | 10 case, trong đó 5 case đòi **400** khi địa chỉ rỗng/thiếu/sai kiểu. AI **có tự ghi rõ** đây là *"giả định"* | **INVALID** | FR-08 không hề phát biểu trường này bắt buộc. Việc AI đánh dấu giả định là đúng phương pháp, nhưng giả định vẫn không phải yêu cầu | Đổi kỳ vọng sang **200** + khẳng định *không phải 5xx*. Chuyển thành khuyến nghị KN-01 |
| **10** | **Claude Opus 5** · 19/08<br>*"…dựng ma trận chuyển trạng thái ĐẦY ĐỦ 5×5… 25 ô cùng khuôn nên hãy trình bày dạng bảng dữ liệu để chạy data-driven."* | Ma trận 25 ô đầy đủ + bảng dữ liệu CSV. **Tự thêm oracle tôi không yêu cầu**: *"chỉ kiểm mã HTTP thì chưa đủ — có thể trả 400 mà vẫn ghi vào CSDL"* | **VALID** | ISTQB §4.2.4 — phủ trọn ma trận là mức phủ N-1 switch. Oracle bổ sung là đúng nguyên tắc kiểm **hệ quả** với endpoint ghi dữ liệu | Giữ nguyên. Dựng thành `data/api3-transitions.csv` + collection data-driven riêng |
| **11** | như trên, nhóm bảo mật | TC-A3-029: *"token user thường + chuyển sang `delivered` → 403"* | **INCOMPLETE** | Case **không dựng trạng thái ban đầu**. Đơn mới ở `pending`, mà `pending → delivered` vốn đã không hợp lệ → SUT trả 400 vì **máy trạng thái**, chưa đụng tới `role`. Test "đúng vì lý do sai" | Thêm tiền đề đưa đơn về `shipping` trước. Lúc đó chuyển đổi hợp lệ về trạng thái, nên 200 chắc chắn là do thiếu kiểm `role` |
| **12** | như trên | TC-A3-025: *"token đúng cấu trúc nhưng hết hạn → 401"* | **INCOMPLETE** | **Không dựng nổi đầu vào**: muốn ký token hết hạn phải biết khoá bí mật của server, thứ không có trong đặc tả. Hệ thống này còn không phát hành token có `exp` | Chuyển hướng sang kiểm chính điều đó: *"token admin phải có claim `exp`"* — nối với BUG-A1-04 |
| **13** | như trên | Ô M15 `shipping → canceled`: AI đọc câu *"chỉ Admin mới có thể thao tác"* rồi kết luận admin **hủy được** đơn đang giao | **INVALID** | Sơ đồ FR-10 là phần **quy phạm** và **không có** cạnh này. Câu văn đó nói về **quyền thao tác**, không định nghĩa thêm cạnh cho đồ thị. Đo thật: SUT trả 400 (theo sơ đồ) | Đổi kỳ vọng thành **400**. **Không** báo thành lỗi — chuyển vào mục *"câu hỏi cần làm rõ với người viết đặc tả"* (Q1) |
| **14** | **Claude Opus 5** · 19/08<br>*"Rà lại toàn bộ test case vừa sinh, tự trả lời 7 câu tự kiểm."* | AI tự đánh dấu được các case oracle mơ hồ (*"400 hoặc 401"*) và case trùng lặp | **VALID** | Dọn sạch phần lỗi cơ học trước khi tôi thẩm định, giúp tôi dồn sức vào phần cần phán đoán | Giữ nguyên; vẫn tự thẩm định lại toàn bộ vì AI **không** tự phát hiện được nhóm INVALID ở hàng 2, 3, 9, 13 |

---

## 4. Tổng kết Độ chính xác AI

Tổng hợp từ ba bảng thẩm định chi tiết (`docs/api1/Audit.md`, `api2/Audit.md`, `api3/Audit.md`):

| Chỉ số | Số lượng | Tỉ lệ |
| --- | ---: | ---: |
| **Tổng artifact AI sinh đã audit** (test case) | **187** | 100 % |
| **VALID** (đúng, dùng nguyên) | **134** | **71,7 %** |
| **INVALID** (sai; loại bỏ hoặc sửa kỳ vọng) | **26** | **13,9 %** |
| **INCOMPLETE** (chấp nhận sau khi sửa) | **27** | **14,4 %** |

### Diễn biến qua ba API — số liệu quan trọng nhất của bản audit này

| | API 1 | API 2 | API 3 |
| --- | ---: | ---: | ---: |
| VALID | 45,0 % | 78,3 % | **89,6 %** |
| INVALID | 30,0 % | 11,7 % | 1,5 % |
| INCOMPLETE | 25,0 % | 10,0 % | 9,0 % |

**Cùng một model, cùng một người dẫn.** Toàn bộ mức tăng đến từ ba thay đổi trong cách viết prompt,
mỗi thay đổi rút ra từ một lỗi cụ thể ở lượt trước:

| Bài học từ | Thay đổi prompt | Kết quả đo được |
| --- | --- | --- |
| Hàng 6 — AI neo vào danh sách SEC | thêm vế *"ngoài danh sách còn rủi ro gì"* | hàng 7 — AI tự tìm mass assignment, giả mạo giá |
| Hàng 4 — case trạng thái thiếu tiền đề | bắt *"ghi rõ chuỗi thao tác"* | API 3 đạt 24/25 case trạng thái VALID |
| Hàng 2, 3 — khẳng định ràng buộc không có | bắt *"ghi rõ đâu là giả định"* | hàng 9 — AI tự đánh dấu giả định; hàng 8 — tự phát hiện đặc tả mâu thuẫn |

### Điều prompt **không** chữa được

| API | Lỗi AI tìm ra | Lỗi tôi tự tìm | Trong đó mức Nghiêm trọng |
| --- | ---: | ---: | ---: |
| API 1 | 6 | 5 | 4/5 tự tìm |
| API 2 | 5 | 4 | 2/4 tự tìm |
| API 3 | 3 | 3 | 3/3 tự tìm |
| **Tổng** | **14** | **12** | **8/13 lỗi Nghiêm trọng là tự tìm** |

Tỉ lệ INVALID giảm mạnh (30 % → 1,5 %), nhưng cột "lỗi tôi tự tìm" **không giảm**. Lý do: prompt
tốt hơn giúp AI **viết test case đúng hơn**, nhưng không giúp nó **nhìn rộng hơn phạm vi ngữ cảnh
được đưa**. Cả 12 lỗi tôi tự tìm đều nằm giữa các endpoint hoặc cần ghép nhiều lỗi thành chuỗi.

---

## 5. Kết luận — Khi nào nên / không nên dùng AI?

AI mạnh ở **độ phủ cơ học**: phân vùng tương đương, giá trị biên, enum, JSON Schema — phần tốn
nhiều công mà giá trị phán đoán thấp. Nó cũng tốt ở **rà soát tĩnh đặc tả**: tự phát hiện hai chỗ
đặc tả tự mâu thuẫn mà tôi đọc đã bỏ qua.

AI sai hai kiểu. Kiểu **chữa được bằng prompt**: khẳng định ràng buộc không tồn tại, neo vào danh
sách cho sẵn, quên tiền đề trạng thái — sửa prompt thì VALID đi từ 45 % lên 90 %. Kiểu **không chữa
được**: AI chỉ thấy endpoint được đưa cho nó, nên lỗi nằm *giữa* các endpoint đều vô hình — mà đó
lại là những lỗi nghiêm trọng nhất.

**Khuyến nghị:** dùng AI để phủ rộng, **không** cho đọc mã nguồn khi sinh test, và luôn giữ cổng
thẩm định của người, có **đo hành vi thật bằng `curl`**.

*(150 chữ)*

---

## 6. Mandatory Disclosure

> *"Test case, script và bản nháp báo cáo trong bài này được sinh phiên bản đầu bởi Claude Opus 5
> (Claude Code CLI); tôi đã rà soát toàn bộ 187 test case và chỉnh sửa 53 case (26 INVALID, 27
> INCOMPLETE), bổ sung 17 test case tự nghĩ mà AI bỏ sót — trong đó có 12 test case dẫn tới các lỗi
> nghiêm trọng nhất của bài. Sơ đồ thiết kế AI test generator, toàn bộ số liệu chạy Newman, và các
> ảnh bằng chứng tái hiện lỗi do tôi tự thực hiện. AI Audit Report chi tiết đính kèm ở Phụ lục A
> (`docs/AI-Prompt-Log.md`). Tôi cam đoan không dùng AI để sinh bất kỳ artifact nào thuộc danh mục
> bị cấm."*

---

## Chữ ký

| Mục | Giá trị |
| --- | --- |
| **Họ tên sinh viên (in hoa)** | LÝ QUỐC THÀNH |
| **MSSV** | 23127262 |
| **Lớp / Khoá** | *(sinh viên điền)* |
| **Môn học** | CS423 / CSC13003 — Kiểm chứng Phần mềm |
| **Giảng viên** | *(sinh viên điền)* |
| **Ngày** | 19/08/2026 |
| **Chữ ký** | |

---

## Phụ lục A — Nhật ký tương tác nguyên văn

`docs/AI-Prompt-Log.md` — **14 lượt tương tác / 2 phiên làm việc**, ghi đủ tên công cụ, ngày giờ
(UTC+7), prompt **nguyên văn 100 %** (không sửa, không paraphrase, kể cả lỗi chính tả), và output
của AI. Trích tự động bằng `scripts/extract-prompt-log.py` từ transcript gốc
`~/.claude/projects/-home-qt-projects-hw06/*.jsonl`.

## Tham khảo

- Kharbach, M. (2026). *AI Use Policy Templates for Higher Education.* CC BY-NC-SA 4.0.
- ISTQB Foundation Level Syllabus v4.0 — §1.4.2 (oracle), §3.2.2 (rà soát tĩnh), §4.2 (kỹ thuật hộp đen), §4.2.4 (chuyển trạng thái).
- Anthropic (2025). *Building reliable AI test agents* — engineering blog.
