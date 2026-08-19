# Sơ đồ AI Test Generator — bản mô tả để TỰ VẼ

> ⚠️ **Đề mục 11:133 — chống gian lận:** *"The AI test-generator diagram, which must be self-drawn
> — designed by you, not generated directly by an AI."* TA có kiểm mục này.
>
> **Vì vậy file `architecture.png` phải do chính bạn vẽ.** Tài liệu này chỉ liệt kê **nội dung cần
> có** trên sơ đồ, rút ra từ pseudocode ở `pseudocode.md`. Không dán ảnh do AI sinh vào đây, và
> cũng đừng dùng Mermaid rồi render ra ảnh — hãy vẽ bằng tay trên một công cụ vẽ.
>
> **Công cụ gợi ý:** draw.io (diagrams.net), Excalidraw, Figma, hoặc vẽ tay rồi chụp lại. Đề nói rõ
> *"any diagramming tool is fine"* — cái bị cấm là **để AI sinh ra hình**, không phải việc dùng
> công cụ.

---

## Cần vẽ gì — 6 khối theo chiều dọc

Sơ đồ là một luồng từ trên xuống. Mỗi khối là một hộp, kèm nhãn ngắn.

### Khối 0 — ĐẦU VÀO (trên cùng)

Ba mũi tên đi vào một hộp `CHUẨN BỊ NGỮ CẢNH`:

- `api_specification.md` (đặc tả endpoint)
- `FR liên quan` (yêu cầu chức năng)
- `SEC-01 → SEC-07` (yêu cầu bảo mật)

**Chi tiết quan trọng phải thể hiện:** một mũi tên **bị gạch chéo / đánh dấu cấm** đi từ
`sut/backend/server.js` tới hộp này, kèm nhãn **"CÁCH LY — không đọc mã nguồn"**.

> Đây là chi tiết đắt nhất của cả sơ đồ. Nó thể hiện quyết định thiết kế cốt lõi: nếu bộ sinh đọc
> mã nguồn, nó sẽ viết *expected* theo hành vi sai của chương trình và mọi test đều PASS.

### Khối 1 — PHÂN TÍCH (chưa sinh test case)

Một hộp, bên trong liệt kê 4 đầu ra:

- (a) tham số và kiểu
- (b) ràng buộc — **mỗi ràng buộc phải trích được điều khoản**
- (c) hệ quả sau một lần gọi thành công
- (d) chỗ đặc tả mập mờ / tự mâu thuẫn

Từ (d) có một mũi tên rẽ **ra ngoài luồng chính**, đi tới hộp nhỏ
`Câu hỏi cần làm rõ với người viết đặc tả`.

### Khối 2 — SINH THEO TỪNG KỸ THUẬT

Vẽ thành **5 hộp con song song** (hoặc xếp chồng), nhấn mạnh rằng **mỗi hộp là MỘT lượt prompt
riêng** — không gộp:

1. Phân vùng tương đương *(một lượt cho mỗi tham số)*
2. Giá trị biên
3. Chuyển trạng thái → **có nhánh rẽ**: nếu ma trận ≥ 10 ô thì đi sang hộp `Sinh bảng dữ liệu CSV`,
   ngược lại `Sinh case rời`
4. Bảo mật → **vẽ thành 2 hộp nối tiếp**: `Duyệt SEC-01→07` rồi `BƯỚC RA NGOÀI danh sách`
5. Schema và giao thức HTTP

> Chỗ số 4 nên làm nổi bật (màu khác / viền đậm): hộp thứ hai là thứ tìm ra được nhóm mass
> assignment ở API 2 và vấn đề đồng thời ở API 3.

### Khối 3 — PHÂN TÍCH LIÊN ENDPOINT

Một hộp riêng, **nhận đầu vào từ kết quả của NHIỀU endpoint** (vẽ nhiều mũi tên chụm vào).
Bên trong ghi 3 câu hỏi:

1. Ràng buộc nào phát biểu cho **cả một họ** endpoint? → kiểm trên toàn bộ họ
2. Trạng thái từ endpoint A chảy vào đâu? FR nào diễn giải nó thành **tiền / quyền / báo cáo**?
3. Ghép hai lỗi ở hai endpoint có tạo ra kịch bản **nghiêm trọng hơn tổng** không?

> Nên tô đậm khối này. Nó sinh ra 3 lỗi nghiêm trọng nhất của cả bài (BUG-A3-04, A3-05, A3-06).

### Khối 4 — TỰ KIỂM (AI phản biện chính nó)

Một hộp chứa 7 cổng kiểm, mỗi cổng gắn nhãn khi thất bại:

| Cổng | Nhãn gắn khi vi phạm |
| --- | --- |
| 1. Có truy được về điều khoản đặc tả không | `CẦN NGƯỜI XÁC NHẬN` |
| 2. Oracle có dứt khoát không (có chữ "hoặc"?) | `ORACLE MƠ HỒ` |
| 3. Có dựng nổi đầu vào bằng API công khai không | `KHÔNG THI HÀNH ĐƯỢC` |
| 4. Có tiền đề trạng thái chưa | `THIẾU TIỀN ĐỀ` |
| 5. Có thể thất bại vì lý do khác không | `OBSERVABILITY` |
| 6. Có trùng case khác không | `TRÙNG LẶP` |
| 7. Trục nào không có case nào | *(cảnh báo độ phủ)* |

### Khối 5 — CỔNG THẨM ĐỊNH CỦA NGƯỜI *(bắt buộc)*

Vẽ thành **cổng chặn ngang luồng**, không phải hộp thường — thể hiện bộ sinh **dừng** ở đây, không
tự xuất ra bộ test chạy được.

Bên trong:
- gán VALID / INVALID / INCOMPLETE
- **đo hành vi thật của SUT bằng `curl`**
- sửa oracle
- ghi lại **vì sao AI sai**

### Vòng lặp học — mũi tên quay ngược (chi tiết đừng quên)

Từ Khối 5 vẽ một **mũi tên quay ngược lên Khối 2**, nhãn:
**`DANH MỤC KIỂM TRA PROMPT`**.

Kèm chú thích ngắn cạnh mũi tên: **45 % → 78 % → 90 %** (tỉ lệ VALID qua API 1 → 2 → 3).

> Đây là luận điểm chính của cả thiết kế: chất lượng đầu ra của AI là **hàm số của chất lượng
> prompt**, và hàm đó cải thiện được một cách có hệ thống — miễn là mỗi lần AI sai thì bài học được
> **ghi thành danh mục**, chứ không chỉ sửa kết quả rồi đi tiếp.

---

## Sau khi vẽ xong

1. Lưu thành `generator/architecture.png` (hoặc `.svg`).
2. Giữ lại file nguồn (`.drawio` / `.excalidraw`) trong cùng thư mục — nó là bằng chứng bạn tự vẽ.
3. Xoá file này khỏi bài nộp **hoặc** giữ lại như phần ghi chú thiết kế, tuỳ bạn — nhưng **đừng**
   để người chấm hiểu nhầm rằng sơ đồ do AI sinh.

## Gợi ý bố cục

Sơ đồ dọc, khổ A4 hoặc 1600×2000 px. Ba màu là đủ:

- **Xám** — luồng chính
- **Đỏ / cam** — hai chỗ cần nhấn: mũi tên cấm "không đọc mã nguồn", và cổng thẩm định của người
- **Xanh** — mũi tên quay ngược của vòng lặp học

Đừng vẽ quá chi tiết. Người chấm cần thấy **quyết định thiết kế**, không cần thấy từng lệnh.
