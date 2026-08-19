# AI-driven API Test Generator — Thiết kế và Pseudocode

> **Đề mục 7:95.** Thiết kế một bộ sinh test case API bằng AI cho SUT: đưa vào đặc tả API, nó sinh
> ra test case. Cần **sơ đồ tự vẽ** và **pseudocode**.
>
> **Lưu ý về sơ đồ:** đề mục 11:133 nói sơ đồ **phải do tôi tự vẽ**, không được để AI sinh trực
> tiếp. Sơ đồ nằm ở `generator/architecture.png` — xem `generator/DIAGRAM-SPEC.md` để biết tôi đã
> quyết định vẽ những gì và vì sao.
>
> **Tài liệu này chỉ chứa pseudocode và lập luận thiết kế** — phần đề cho phép.

---

## 1. Thiết kế này đến từ đâu

Đây **không phải** một thiết kế nghĩ ra trên giấy. Mỗi khối trong đó tương ứng với một thứ tôi đã
làm bằng tay ở ba API, và mỗi cơ chế phòng vệ tương ứng với một lỗi cụ thể mà AI đã mắc.

| Khối trong thiết kế | Sinh ra từ |
| --- | --- |
| Cách ly khỏi mã nguồn | Quyết định ở bước 1 của API 1 — nếu AI đọc `server.js` thì expected sẽ chép lại hành vi sai |
| Chia 7 lượt prompt theo kỹ thuật | Đề mục 2:20 cấm prompt gộp |
| Lượt hỏi "ngoài danh sách còn gì" | API 1: AI neo vào SEC-01→07, bỏ trắng tính sẵn sàng |
| Bắt khai báo giả định | API 1: AI khẳng định ràng buộc mà đặc tả không có (30 % INVALID) |
| Bắt ghi rõ chuỗi thao tác | API 1: cả 9 case trạng thái không có tiền đề |
| Lượt hỏi về đồng thời | API 2: tôi quên hỏi và đúng chỗ đó thủng |
| **Khối phân tích liên endpoint** | API 3: 3/5 lỗi tự tìm nằm giữa các endpoint, không nằm trong endpoint nào |
| Kiểm tính thi hành được | API 3: TC-A3-025 cần token không dựng nổi; TC-A3-029 đúng vì lý do sai |
| Cổng thẩm định của người | Đề mục 2:21 — nộp raw output là không đạt |

## 2. Ba nguyên tắc chi phối thiết kế

**(1) Cách ly nguồn.** Bộ sinh chỉ được đọc **đặc tả**, không được đọc mã nguồn SUT. Nếu đọc mã
nguồn, nó sẽ viết *expected result* theo đúng cái chương trình đang làm — kể cả khi chương trình
sai — và mọi test đều PASS. Cách ly là điều kiện để test case có khả năng **phát hiện lỗi**.

**(2) Không có bước nào tự tin.** Mỗi lượt sinh đều đi kèm một lượt tự kiểm. Cụ thể: mọi khẳng định
phải chỉ ra được **điều khoản đặc tả** làm căn cứ; nếu không có thì phải tự đánh dấu là **giả
định**. Cơ chế này ra đời vì 30 % case của API 1 khẳng định những ràng buộc không tồn tại.

**(3) Con người là cổng cuối, không phải người quan sát.** Bộ sinh **không** xuất ra "test case
hoàn chỉnh". Nó xuất ra **bản nháp có gắn nhãn độ tin cậy**, và bắt buộc dừng ở cổng thẩm định của
người trước khi thành bộ test chạy được.

---

## 3. Pseudocode

```
════════════════════════════════════════════════════════════════════════════
  ĐẦU VÀO   spec_file      : đặc tả API (Markdown / OpenAPI)
            endpoint       : endpoint cần sinh test
            fr_lien_quan[] : các yêu cầu chức năng có liên quan
            sec_list[]     : danh sách yêu cầu bảo mật của hệ thống
  ĐẦU RA    ban_nhap       : test case kèm nhãn độ tin cậy, CHỜ người thẩm định
════════════════════════════════════════════════════════════════════════════

HÀM SinhTestCase(spec_file, endpoint, fr_lien_quan, sec_list):

    ┌── GIAI ĐOẠN 0: CHUẨN BỊ NGỮ CẢNH ─────────────────────────────────────┐
    │  Mục tiêu: đưa AI đúng thứ nó cần, và KHÔNG đưa thứ làm hỏng kết quả  │
    └───────────────────────────────────────────────────────────────────────┘

    nguHoanh ← TríchĐặcTả(spec_file, endpoint, fr_lien_quan, sec_list)

    KHẲNG ĐỊNH nguHoanh KHÔNG chứa mã nguồn SUT        // nguyên tắc (1)
        NẾU vi phạm: DỪNG, báo "ngữ cảnh nhiễm mã nguồn"

    // Bài học từ API 3: thiếu FR-13 nên AI không biết `delivered` nghĩa là tiền.
    fr_lien_quan ← fr_lien_quan ∪ TìmFRThamChiếuTới(endpoint)


    ┌── GIAI ĐOẠN 1: PHÂN TÍCH (chưa sinh test case) ───────────────────────┐
    │  Bắt AI hiểu trước, viết sau. Đây là lượt prompt tách riêng.          │
    └───────────────────────────────────────────────────────────────────────┘

    phanTich ← Hỏi(nguHoanh, """
        Chưa sinh test case. Hãy liệt kê:
          (a) tham số đầu vào và kiểu
          (b) mọi ràng buộc, MỖI ràng buộc phải trích rõ điều khoản đặc tả
          (c) trạng thái hệ thống thay đổi thế nào sau một lần gọi thành công
          (d) chỗ đặc tả mập mờ, bỏ trống, hoặc TỰ MÂU THUẪN
        Với mỗi mục (d), nêu cách bạn chọn xử lý và LÝ DO.
    """)

    // Cổng kiểm 1: ràng buộc nào không trích được điều khoản thì không phải ràng buộc
    VỚI MỖI rb TRONG phanTich.rangBuoc:
        NẾU rb.dieuKhoan RỖNG:
            rb.nhan ← "GIẢ ĐỊNH"                       // nguyên tắc (2)

    NẾU phanTich.mauThuan KHÔNG RỖNG:
        GhiVàoBáoCáo("câu hỏi cần làm rõ với người viết đặc tả", phanTich.mauThuan)


    ┌── GIAI ĐOẠN 2: SINH THEO TỪNG KỸ THUẬT ──────────────────────────────┐
    │  MỖI kỹ thuật = MỘT lượt prompt riêng (đề mục 2:20 cấm prompt gộp)   │
    └───────────────────────────────────────────────────────────────────────┘

    banNhap ← []

    // 2a. Phân vùng tương đương — mỗi tham số một lượt
    VỚI MỖI thamSo TRONG phanTich.thamSo:
        banNhap += Hỏi(nguHoanh, phanTich, f"""
            Chỉ xét tham số {thamSo}. Áp dụng phân vùng tương đương.
            Mỗi lớp lấy một giá trị đại diện.
            Kết quả mong đợi phải bám ĐẶC TẢ, không phải đoán hệ thống đang làm gì.
            Nếu đặc tả không nói, ghi rõ "giả định".
        """)

    // 2b. Giá trị biên
    banNhap += Hỏi(..., """
        Phân tích giá trị biên. Biên nào không có trong đặc tả thì nêu rõ
        bạn lấy chuẩn nào (ví dụ RFC 5321) và đánh dấu là giả định.
    """)

    // 2c. Chuyển trạng thái — chỉ chạy nếu endpoint đụng tới máy trạng thái
    NẾU phanTich.coMayTrangThai:
        maTran ← Hỏi(..., "Dựng ma trận chuyển trạng thái ĐẦY ĐỦ n×n")

        // Bài học API 3: n×n ô cùng một khuôn -> data-driven, không viết n² case rời
        NẾU |maTran| ≥ NGƯỠNG_DATA_DRIVEN:            // ngưỡng dùng: 10
            banNhap += SinhBảngDữLiệu(maTran)          // -> CSV + 1 request
        NGƯỢC LẠI:
            banNhap += SinhCaseRời(maTran)

        // Bài học API 3: mã HTTP đúng không có nghĩa là dữ liệu đúng
        VỚI MỖI case TRONG banNhap[trạng thái]:
            case.oracle += "đọc lại bản ghi, khẳng định trạng thái ĐÃ LƯU"

    // 2d. Bảo mật — hai lượt, KHÔNG gộp
    banNhap += Hỏi(..., f"Duyệt lần lượt {sec_list}. Nêu rõ cái nào không áp dụng và vì sao.")
    banNhap += Hỏi(..., """
        Giờ BƯỚC RA NGOÀI danh sách vừa duyệt.
        Endpoint này còn rủi ro gì mà danh sách kia không phủ?
        Gợi ý các trục thường bị bỏ quên: tính sẵn sàng (DoS), tính đồng thời,
        vòng đời dữ liệu (xoá/khoá tài khoản), quyền sở hữu (khác với vai trò),
        client tự đặt trường thuộc quyền server.
    """)                                               // ← khối này ra đời từ 3 lỗi của API 1+2

    // 2e. Schema và giao thức
    banNhap += Hỏi(..., "Viết JSON Schema cho response, rồi sinh case tầng HTTP")


    ┌── GIAI ĐOẠN 3: PHÂN TÍCH LIÊN ENDPOINT ──────────────────────────────┐
    │  Khối quan trọng nhất. Lỗi nặng nhất nằm GIỮA các endpoint,          │
    │  nên không lượt prompt nào ở giai đoạn 2 có thể thấy được.           │
    └───────────────────────────────────────────────────────────────────────┘

    NẾU CóKếtQuảCủaEndpointKhác():
        banNhap += Hỏi(TấtCảEndpointĐãPhânTích, """
            Bỏ qua từng endpoint riêng lẻ. Trả lời ba câu:
            1. Ràng buộc nào được phát biểu cho CẢ MỘT HỌ endpoint
               (dạng "tất cả các API X phải...")? Kiểm nó trên TOÀN BỘ họ,
               không chỉ trên một endpoint.
            2. Trạng thái do endpoint A tạo ra chảy vào endpoint B ở đâu?
               Có FR nào diễn giải trạng thái đó thành tiền, quyền, hay báo cáo không?
            3. Ghép hai lỗi đã tìm được ở hai endpoint khác nhau thì có tạo ra
               kịch bản nào nghiêm trọng hơn tổng của chúng không?
        """)
        // Ba câu này chính là ba lỗi nghiêm trọng tôi tự tìm ở API 3


    ┌── GIAI ĐOẠN 4: TỰ KIỂM (AI phản biện chính nó) ───────────────────────┐
    └───────────────────────────────────────────────────────────────────────┘

    VỚI MỖI case TRONG banNhap:

        // Kiểm 1 — có căn cứ không
        NẾU case.canCu KHÔNG NẰM TRONG phanTich.rangBuoc:
            case.nhan ← "CẦN NGƯỜI XÁC NHẬN — không truy được về điều khoản nào"

        // Kiểm 2 — oracle có dứt khoát không   (API 1+2: 25 % và 10 % case dính lỗi này)
        NẾU case.oracle CHỨA "hoặc" HAY "tuỳ":
            case.nhan ← "ORACLE MƠ HỒ"

        // Kiểm 3 — có dựng nổi đầu vào không   (API 3: TC-A3-025)
        NẾU KHÔNG DựngĐượcĐầuVào(case, chỉ_dùng_API_công_khai):
            case.nhan ← "KHÔNG THI HÀNH ĐƯỢC"

        // Kiểm 4 — có tiền đề chưa            (API 1: cả 9 case trạng thái)
        NẾU case.canTrangThaiBanDau VÀ case.tienDe RỖNG:
            case.nhan ← "THIẾU TIỀN ĐỀ"

        // Kiểm 5 — thất bại có đúng vì lý do đang kiểm không   (API 3: TC-A3-029)
        lyDoKhac ← TìmLýDoThấtBạiKhác(case, phanTich)
        NẾU lyDoKhac KHÁC RỖNG:
            case.nhan ← f"OBSERVABILITY — có thể thất bại vì {lyDoKhac} chứ không phải vì điều đang kiểm"

        // Kiểm 6 — trùng lặp                   (API 3: TC-A3-019)
        NẾU TồnTạiCaseTươngĐương(case, banNhap):
            case.nhan ← "TRÙNG LẶP"

    // Kiểm 7 — độ phủ: trục nào trống thì báo, đừng im lặng
    VỚI MỖI truc TRONG [miền, biên, trạng thái, bảo mật, schema, liên-endpoint]:
        NẾU ĐếmCase(banNhap, truc) == 0:
            CảnhBáo(f"trục {truc} không có case nào — cố ý hay bỏ sót?")


    ┌── GIAI ĐOẠN 5: CỔNG THẨM ĐỊNH CỦA NGƯỜI (BẮT BUỘC) ──────────────────┐
    │  Đề mục 2:21 — nộp raw output là không đạt.                          │
    │  Bộ sinh DỪNG ở đây. Nó không tự xuất ra bộ test chạy được.          │
    └───────────────────────────────────────────────────────────────────────┘

    XuấtRa(banNhap, kèm_nhãn=TRUE, kèm_căn_cứ=TRUE)

    ĐỢI người:
        - gán VALID / INVALID / INCOMPLETE cho từng case
        - đo hành vi THẬT của SUT bằng curl để có cơ sở thẩm định
        - sửa oracle của case INVALID và INCOMPLETE
        - ghi lại VÌ SAO AI sai   →  đưa vào DANH MỤC KIỂM TRA PROMPT

    // ── Vòng học: đây là thứ làm tỉ lệ VALID tăng 45 % → 78 % → 90 % ──
    danhMucPrompt ← danhMucPrompt ∪ BàiHọcTừLượtNày()
    // Bài học phải được GHI THÀNH DANH MỤC. Giữ trong đầu thì lần sau vẫn sót
    // — chính tôi đã quên trục đồng thời ở API 2 dù đã rút ra ở API 1.

    TRẢ VỀ boTestDaThamDinh
```

---

## 4. Vì sao bộ sinh **không** tự động hoàn toàn

Cám dỗ lớn nhất khi thiết kế thứ này là để nó chạy một mạch từ đặc tả ra bộ test chạy được. Tôi cố
tình không làm vậy, vì số liệu của chính bài này:

| API | AI sinh | Sau thẩm định phải sửa | Lỗi AI **không** tìm ra |
| --- | ---: | ---: | ---: |
| API 1 | 60 case | 33 (55 %) | 5/11 |
| API 2 | 60 case | 13 (22 %) | 4/9 |
| API 3 | 67 case | 7 (10 %) | 3/6 |

Tỉ lệ phải sửa giảm rất nhanh — nhưng **cột cuối thì không**. Ở cả ba API, khoảng một nửa số lỗi
nghiêm trọng là do người tìm ra, và đó luôn là những lỗi **nằm giữa các endpoint** hoặc **cần ghép
nhiều lỗi thành chuỗi**. Prompt tốt hơn giúp AI viết test case *đúng hơn*; nó không giúp AI *nhìn
rộng hơn phạm vi ngữ cảnh được đưa*.

Vì vậy giá trị thật của bộ sinh không phải là "thay người viết test", mà là:

1. **Phủ nhanh phần cơ học** — phân vùng miền, biên, enum, schema, các biến thể token. Đây là phần
   chiếm nhiều thời gian nhất mà giá trị phán đoán thấp nhất.
2. **Không bỏ sót trục nào** — con người mệt thì quên; danh mục thì không.
3. **Dồn thời gian của người vào chỗ đáng** — thẩm định, ghép chuỗi khai thác, và đọc những chỗ
   đặc tả im lặng.

## 5. Giới hạn đã biết của thiết kế

| Giới hạn | Vì sao | Cách giảm nhẹ |
| --- | --- | --- |
| Không thấy được lỗi nằm ngoài đặc tả | Cách ly nguồn là điều kiện để phát hiện lỗi, nhưng cũng khiến bộ sinh mù với những gì đặc tả không nhắc | Giai đoạn 2d lượt hai + giai đoạn 3 |
| Không diễn đạt được tính đồng thời trong Postman | Pre-request script bị chờ tuần tự (đã vấp ở TC-A3-034) | Đánh dấu case đồng thời là "cần kiểm bằng công cụ khác", kèm lệnh `curl` |
| Ma trận n×n phình theo n² | 5 trạng thái đã là 25 ô; 8 trạng thái thành 64 | Data-driven từ ngưỡng 10 ô trở lên |
| Chất lượng phụ thuộc chất lượng đặc tả | Đặc tả EShop tự mâu thuẫn ở 2 chỗ, cả 2 đều được AI phát hiện | Xuất ra mục "câu hỏi cần làm rõ" thay vì tự chọn im lặng |
