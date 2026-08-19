# API 3 — `PUT /api/admin/orders/:id/status` — Bước 1: Test case do AI sinh (nguyên văn)

> **Đề mục 6:82.** Dẫn AI từng bước, không prompt gộp. ≥ 35 case, phủ 4 trục.
>
> **Công cụ AI:** Claude Opus 5 (Claude Code CLI) — **Ngày:** 19/08/2026
> **Nguyên tắc cách ly:** AI chỉ đọc `api_specification.md` §6.2 và `README.md` (FR-10, FR-12,
> FR-18, SEC-01–07). **Không** đọc `sut/backend/server.js`.

## Đặc tả dùng làm đầu vào

**`api_specification.md` §6.2**
- `PUT /api/admin/orders/:id/status` · Body `{"status": "confirmed"}`
- Các trạng thái: `pending`, `confirmed`, `shipping`, `delivered`, `canceled`
- Đầu mục §6 ghi: *"Tất cả API dưới đây yêu cầu `Authorization: Bearer <token>` và tài khoản phải có quyền Admin."*

**`README.md` — FR-12: Kiểm soát truy cập**
- **Tất cả** API `/api/admin/*` đều phải yêu cầu: (1) token JWT hợp lệ, **và** (2) `role = 'admin'` trong token.

**`README.md` — FR-18: Quản lý đơn hàng (Admin)**
- Admin chuyển trạng thái đơn **theo đúng State Machine ở FR-10**.

**`README.md` — FR-10: Máy trạng thái**
```
pending ──► confirmed ──► shipping ──► delivered
   │            │
   ▼            ▼
canceled     canceled
```
- `delivered` và `canceled` là **trạng thái kết thúc** — không chuyển đi đâu được nữa.
- Đơn ở `shipping` thì **User không được tự hủy — chỉ Admin mới thao tác được**.
- Mọi chuyển đổi không hợp lệ phải **trả lỗi** kèm thông báo phù hợp.

**SEC-03:** API admin phải kiểm `role = 'admin'` trong token, **không chỉ kiểm sự tồn tại của token**.

---

## Bước 3.1 — Rút ràng buộc và dựng ma trận chuyển trạng thái

**Prompt:** *"Đọc đặc tả trên. Chưa sinh test case. Hãy: (a) liệt kê tham số đầu vào, (b) liệt kê ràng buộc, (c) dựng **ma trận chuyển trạng thái đầy đủ 5×5** đánh dấu ô nào hợp lệ ô nào không, (d) chỉ ra chỗ đặc tả mập mờ hoặc tự mâu thuẫn. Nhớ bài học lần trước: nếu đặc tả không nói rõ thì phải ghi rõ đó là giả định của bạn, và sau khi liệt kê SEC-01→07 thì nói thêm những rủi ro **ngoài** danh sách đó."*

**Output AI:**

**(a) Đầu vào**

| Tham số | Vị trí | Kiểu | Bắt buộc |
| --- | --- | --- | --- |
| `id` | path | integer | Có |
| `status` | body JSON | string (enum 5 giá trị) | Có |
| `Authorization` | header | `Bearer <JWT>` **của tài khoản admin** | Có |

**(b) Ràng buộc**

| Mã | Ràng buộc | Nguồn |
| --- | --- | --- |
| E1 | Phải có token JWT hợp lệ | FR-12, §6 |
| E2 | Token phải mang `role = 'admin'` — **không chỉ kiểm token có tồn tại hay không** | **FR-12, SEC-03** |
| E3 | Chỉ chấp nhận chuyển đổi nằm trong máy trạng thái FR-10 | FR-18 |
| E4 | `delivered` và `canceled` là trạng thái **kết thúc** | FR-10 |
| E5 | Chuyển đổi không hợp lệ phải trả **lỗi** kèm thông báo | FR-10 |
| E6 | `status` chỉ nhận đúng 5 giá trị trong enum | §6.2 |

**(c) Ma trận chuyển trạng thái 5×5 — 25 ô**

Hàng = trạng thái hiện tại, cột = trạng thái muốn chuyển tới. ✅ hợp lệ · ❌ phải bị từ chối

| từ \\ tới | `pending` | `confirmed` | `shipping` | `delivered` | `canceled` |
| --- | :---: | :---: | :---: | :---: | :---: |
| **`pending`** | ❌ | ✅ | ❌ | ❌ | ✅ |
| **`confirmed`** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **`shipping`** | ❌ | ❌ | ❌ | ✅ | ⚠️ *(xem d2)* |
| **`delivered`** | ❌ | ❌ | ❌ | ❌ | ❌ |
| **`canceled`** | ❌ | ❌ | ❌ | ❌ | ❌ |

**Đếm: 4 ô hợp lệ, 20 ô phải bị từ chối, 1 ô mập mờ.**

Nhận xét: 5 ô trên đường chéo (`X → X`) là **chuyển sang chính nó**. Đặc tả không nói gì về chúng.
Tôi xếp vào ❌ vì máy trạng thái không có vòng lặp tự thân, nhưng **đây là giả định của tôi** —
nhiều hệ thống coi thao tác này là vô hại (idempotent).

**(d) Chỗ đặc tả mập mờ hoặc tự mâu thuẫn**

| # | Vấn đề | Phân tích |
| --- | --- | --- |
| **d1** | Đường chéo `X → X` | Không được nhắc tới. Tôi **giả định** phải từ chối. |
| **d2** | `shipping → canceled` | **Mâu thuẫn thật sự.** Sơ đồ FR-10 **không có** mũi tên này. Nhưng câu *"Khi đơn ở `shipping`, User không được tự hủy — **chỉ Admin mới có thể thao tác**"* lại ngụ ý admin **hủy được**. Hai chỗ nói ngược nhau. |
| d3 | Ai được gọi endpoint này | §6 và FR-12 nói rõ: chỉ admin. Không mập mờ. |
| d4 | Trả mã lỗi nào cho chuyển đổi sai | FR-10 chỉ nói "trả về lỗi", không nói mã. Tôi **giả định** `400`. |
| d5 | Đơn không tồn tại | Không nói. Tôi **giả định** `404`. |

**Cách tôi xử lý d2:** endpoint này **chỉ dành cho admin**, mà câu văn nói rõ ở trạng thái `shipping`
thì *"chỉ Admin mới có thể thao tác"* — nghĩa là có một thao tác nào đó admin làm được mà user
không. Thao tác đang bàn ở đó là **hủy đơn**. Vì vậy tôi coi `shipping → canceled` là **hợp lệ khi
người gọi là admin**, và ghi rõ đây là chỗ đặc tả cần làm rõ lại. Test case cho ô này tôi tách
riêng và đánh dấu "cần xác nhận với người viết đặc tả" thay vì khẳng định cứng.

---

## Bước 3.2 — Phân vùng tương đương trên `status`

**Prompt:** *"Tập trung vào trường `status` trong body. Áp dụng phân vùng tương đương trên miền giá trị enum. Giữ đơn hàng ở trạng thái `pending` cho mọi case."*

**Output AI:**

Mọi case dựng một đơn mới (luôn ở `pending`) rồi gọi endpoint bằng token admin.

| ID | Lớp tương đương | `status` gửi lên | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A3-001 | Hợp lệ — trong enum, đúng luật | `"confirmed"` | 200, đơn chuyển sang `confirmed` |
| TC-A3-002 | Hợp lệ — trong enum, đúng luật | `"canceled"` | 200, đơn chuyển sang `canceled` |
| TC-A3-003 | Không hợp lệ — ngoài enum | `"shipped"` | 400, đơn **không đổi** |
| TC-A3-004 | Không hợp lệ — sai hoa/thường | `"CONFIRMED"` | 400 — enum phân biệt hoa thường |
| TC-A3-005 | Không hợp lệ — có khoảng trắng thừa | `" confirmed "` | 400 |
| TC-A3-006 | Không hợp lệ — chuỗi rỗng | `""` | 400 |
| TC-A3-007 | Không hợp lệ — thiếu hẳn trường | *(không gửi)* | 400 |
| TC-A3-008 | Không hợp lệ — `null` | `null` | 400 |
| TC-A3-009 | Không hợp lệ — sai kiểu | `123` | 400 |
| TC-A3-010 | Không hợp lệ — mảng | `["confirmed"]` | 400 |

## Bước 3.3 — Phân vùng tương đương trên tham số `:id`

**Prompt:** *"Chuyển sang tham số `id` trên đường dẫn. Vẫn phân vùng tương đương. Giữ `status` ở giá trị hợp lệ."*

**Output AI:**

| ID | Lớp tương đương | `:id` | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A3-011 | Hợp lệ — đơn có thật | id vừa tạo | 200 |
| TC-A3-012 | Không tồn tại | `999999` | 404 *(giả định d5)* |
| TC-A3-013 | Không hợp lệ — không phải số | `abc` | 400 hoặc 404, **không** 500 |
| TC-A3-014 | Không hợp lệ — số 0 | `0` | 404 |
| TC-A3-015 | Không hợp lệ — số âm | `-1` | 404 |
| TC-A3-016 | Không hợp lệ — số thực | `1.5` | 404 |
| TC-A3-017 | Bảo mật — chuỗi SQLi | `1 OR 1=1` | 404, **không** đổi hàng loạt đơn |

## Bước 3.4 — Phân tích giá trị biên

**Prompt:** *"Áp dụng phân tích giá trị biên cho `:id`."*

**Output AI:**

| ID | Biên | `:id` | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A3-018 | Biên dưới hợp lệ | `1` (đơn đầu tiên) | 200 nếu tồn tại |
| TC-A3-019 | Ngay dưới biên dưới | `0` | 404 |
| TC-A3-020 | Số nguyên lớn nhất an toàn | `9007199254740991` | 404, không tràn |
| TC-A3-021 | Vượt giới hạn số nguyên | `99999999999999999999` | 404, không 500 |
| TC-A3-022 | `:id` rỗng (`/orders//status`) | *(rỗng)* | 404 |

## Bước 3.5 — Kiểm thử chuyển trạng thái: phủ trọn ma trận 25 ô

**Prompt:** *"Đây là trục quan trọng nhất của API này. Sinh test case phủ **cả 25 ô** của ma trận bạn dựng ở bước 3.1 — cả ô hợp lệ lẫn ô phải bị từ chối. Vì 25 case này cùng một khuôn, chỉ khác dữ liệu, hãy trình bày dưới dạng **bảng dữ liệu** để chạy data-driven bằng Collection Runner, chứ đừng viết 25 case rời rạc."*

**Output AI:**

Đúng vậy — 25 ô này cùng một kịch bản: *đưa đơn về trạng thái X → gọi API chuyển sang Y → kiểm
kết quả*. Chỉ có `X`, `Y` và kỳ vọng là khác. Đây là dạng bài lý tưởng cho **data-driven**: một
request duy nhất trong collection, chạy lặp qua file dữ liệu 25 dòng.

**Bảng dữ liệu (đề xuất lưu thành `data/api3-transitions.csv`):**

| case_id | tu_trang_thai | toi_trang_thai | hop_le | ma_mong_doi | ghi_chu |
| --- | --- | --- | --- | --- | --- |
| M01 | pending | pending | không | 400 | đường chéo, giả định d1 |
| M02 | pending | confirmed | **có** | 200 | admin xác nhận |
| M03 | pending | shipping | không | 400 | nhảy cóc qua confirmed |
| M04 | pending | delivered | không | 400 | nhảy cóc hai bậc |
| M05 | pending | canceled | **có** | 200 | hủy khi chờ xử lý |
| M06 | confirmed | pending | không | 400 | lùi trạng thái |
| M07 | confirmed | confirmed | không | 400 | đường chéo |
| M08 | confirmed | shipping | **có** | 200 | admin giao hàng |
| M09 | confirmed | delivered | không | 400 | nhảy cóc qua shipping |
| M10 | confirmed | canceled | **có** | 200 | hủy khi đã xác nhận |
| M11 | shipping | pending | không | 400 | lùi trạng thái |
| M12 | shipping | confirmed | không | 400 | lùi trạng thái |
| M13 | shipping | shipping | không | 400 | đường chéo |
| M14 | shipping | delivered | **có** | 200 | admin hoàn tất |
| M15 | shipping | canceled | **cần xác nhận** | 200 | **ô mập mờ d2** — sơ đồ không có mũi tên, nhưng câu văn ngụ ý admin hủy được |
| M16 | delivered | pending | không | 400 | rời trạng thái kết thúc |
| M17 | delivered | confirmed | không | 400 | rời trạng thái kết thúc |
| M18 | delivered | shipping | không | 400 | rời trạng thái kết thúc |
| M19 | delivered | delivered | không | 400 | đường chéo |
| M20 | delivered | canceled | không | 400 | **rời trạng thái kết thúc** |
| M21 | canceled | pending | không | 400 | rời trạng thái kết thúc |
| M22 | canceled | confirmed | không | 400 | rời trạng thái kết thúc |
| M23 | canceled | shipping | không | 400 | rời trạng thái kết thúc |
| M24 | canceled | delivered | không | 400 | **rời trạng thái kết thúc** |
| M25 | canceled | canceled | không | 400 | đường chéo |

**Cách dựng trạng thái ban đầu:** đơn mới luôn ở `pending`, nên muốn đưa về `confirmed` thì gọi
API một lần, về `shipping` thì hai lần, về `delivered` thì ba lần, về `canceled` thì một lần từ
`pending`. Mỗi dòng dữ liệu phải tự dựng đơn của riêng mình, không dùng chung đơn với dòng khác.

**Khẳng định cho mỗi dòng:** ngoài mã trạng thái HTTP, còn phải **đọc lại đơn** và kiểm:
- nếu hợp lệ: trạng thái đơn **đã đổi** thành `toi_trang_thai`
- nếu không hợp lệ: trạng thái đơn **vẫn nguyên** `tu_trang_thai`

Chỉ kiểm mã HTTP thì chưa đủ — có thể trả 400 nhưng vẫn ghi vào CSDL.

## Bước 3.6 — Kiểm thử bảo mật

**Prompt:** *"Trục bảo mật. Duyệt SEC-01 → SEC-07 và nói rõ cái nào áp dụng. Rồi bước ra ngoài danh sách: endpoint admin đổi trạng thái dữ liệu như thế này còn rủi ro gì mà 7 mục kia không phủ?"*

**Output AI:**

**Đối chiếu:** SEC-01 ✗ · SEC-02 ✓ · **SEC-03 ✓ (trọng tâm)** · SEC-04 ✗ (tầng UI) · SEC-05 ✓ · SEC-06 ✗ · SEC-07 ✗

| ID | Loại | Thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A3-023 | SEC-02 | Không có header `Authorization` | **401** |
| TC-A3-024 | SEC-02 | Token sai chữ ký | 401/403 |
| TC-A3-025 | SEC-02 | Token đúng cấu trúc nhưng hết hạn | 401 |
| TC-A3-026 | SEC-02 | Thiếu tiền tố `Bearer` | 401 |
| TC-A3-027 | **SEC-03** | **Token của user thường (`role = 'user'`)** | **403** — đây là case quan trọng nhất của cả API. FR-12 đòi kiểm `role`, không chỉ kiểm token có tồn tại |
| TC-A3-028 | **SEC-03** | Token user thường + đơn của **chính người đó** | **403** — vẫn phải chặn; endpoint này là của admin, không phải "chủ đơn" |
| TC-A3-029 | **SEC-03** | Token user thường + chuyển sang `delivered` | **403** — nếu lọt thì user tự đánh dấu đã nhận hàng |
| TC-A3-030 | Ngoài SEC | Body kèm `"role": "admin"` | Bị bỏ qua, vẫn 403 nếu token là user |
| TC-A3-031 | Ngoài SEC | Sửa payload JWT đổi `role` thành `admin` **không ký lại** | 401/403 — chữ ký phải phát hiện |
| TC-A3-032 | SEC-05 | SQLi trong `status`: `confirmed'; UPDATE orders SET status='delivered'--` | 400, không đơn nào khác bị đổi |
| TC-A3-033 | SEC-05 | SQLi trong `:id` | 404, không đổi hàng loạt |
| TC-A3-034 | Ngoài SEC | Hai request đổi trạng thái **đồng thời** trên cùng một đơn | Chỉ một cái thắng; đơn không rơi vào trạng thái vô lý |

> **Ghi chú của AI (phần "ngoài danh sách"):** ba rủi ro tôi thấy mà SEC-01→07 không phủ:
> 1. **Đồng thời** (TC-A3-034) — máy trạng thái đọc-rồi-ghi, hai request cùng lúc có thể cùng đọc
>    `pending` rồi cùng ghi, làm đơn nhảy sai bậc.
> 2. **Không có nhật ký kiểm toán** — đặc tả không đòi, nhưng thao tác đổi trạng thái đơn hàng là
>    thao tác có hệ quả tiền bạc; không lưu lại ai đổi, đổi lúc nào thì không truy trách nhiệm được.
> 3. **Không thông báo cho khách** — đơn bị hủy mà khách không hay biết.
>    Hai mục sau nằm ngoài phạm vi kiểm thử API, tôi chỉ nêu chứ không sinh test case.

## Bước 3.7 — Kiểm schema và tầng giao thức

**Prompt:** *"Bước cuối: schema của response và các case tầng HTTP."*

**Output AI:**

| ID | Loại | Thao tác | Kết quả mong đợi |
| --- | --- | --- | --- |
| TC-A3-035 | Schema | Response 200 | `{"message": "..."}`, là JSON hợp lệ |
| TC-A3-036 | Schema | Response lỗi chuyển đổi sai | JSON có trường mô tả lỗi, **không** phải HTML |
| TC-A3-037 | Schema | Đơn sau khi đổi | `status` vẫn thuộc đúng 5 giá trị enum |
| TC-A3-038 | HTTP | `GET` lên cùng đường dẫn | 404/405 |
| TC-A3-039 | HTTP | `POST` lên cùng đường dẫn | 404/405 |
| TC-A3-040 | HTTP | `DELETE` lên cùng đường dẫn | 404/405 |
| TC-A3-041 | HTTP | Body JSON hỏng | 400 kèm thân JSON |
| TC-A3-042 | HTTP | `Content-Type: text/plain` | 400/415, không 500 |

---

## Tổng kết bước 1

| Trục | Số case | ID |
| --- | --- | --- |
| Phân vùng miền (`status`, `:id`) | 17 | TC-A3-001 → 017 |
| Giá trị biên | 5 | TC-A3-018 → 022 |
| **Chuyển trạng thái (ma trận 25 ô, data-driven)** | **25** | M01 → M25 |
| Bảo mật | 12 | TC-A3-023 → 034 |
| Schema và HTTP | 8 | TC-A3-035 → 042 |
| **Tổng** | **67** | |

**Số lượt prompt: 7.**

**Điều làm khác so với hai API trước:** ở bước 3.5 tôi yêu cầu AI **trình bày dưới dạng bảng dữ
liệu thay vì 25 case rời**. Kết quả là AI tự nhận ra đây là bài toán data-driven và còn nêu thêm
được yêu cầu mà tôi không nghĩ tới: *"chỉ kiểm mã HTTP thì chưa đủ — có thể trả 400 nhưng vẫn ghi
vào CSDL"*. Đó là một oracle đúng và quan trọng.

> ⚠️ Output thô, chưa thẩm định. Xem `Audit.md`.
