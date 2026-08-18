# HW06 — API Testing (EShop) — quy ước làm việc

> File này là **nguồn sự thật** cho mọi phiên làm việc trên repo này.
> Đề bài: `2026.HW06.API Testing_En.md`. Quy chế chung: `___2026.Homework.Policies.md`.
> Trích dẫn đề theo dạng `mục:dòng`, ví dụ *(mục 6:82)*.

---

## 1. Biến cố định

| Biến | Giá trị |
| --- | --- |
| MSSV | `23127262` |
| Header bắt buộc mọi request | `X-Student-Id: 23127262` *(mục 6:85, mục 11:131)* |
| Repo công khai | https://github.com/dinosauce-285/HW06-Software-Testing |
| SUT | `sut/` — clone của `ttbhanh/eshop-sut` @ `85af3ba` (ghi trong `SUT-VERSION.txt`) |
| Base URL | `http://localhost:3000` |
| Tài khoản admin seed | `admin@eshop.com` / `Admin123!` |
| Tài khoản user seed | `test@eshop.com` / `Test1234!` |
| Công cụ chạy test | Postman + Newman (`npm test`) |
| Tên file nộp | `23127262_HW06_AI_API_<grade>.zip` *(mục 14:146)* |
| Link video demo skill | *(chưa chốt)* |
| Self-assessed grade | *(chưa chốt)* |

## 2. Ba API đã chốt *(mục 5:72)*

| # | Pool | FR | Endpoint | Trục kiểm thử chính |
| --- | --- | --- | --- | --- |
| **API 1** | A | FR-02 | `POST /api/login` | phân vùng miền email/password, state khoá tài khoản, SEC-01/02/05 |
| **API 2** | B | FR-08 | `POST /api/checkout` | phân vùng miền `total_amount`/`shipping_address`, sinh đơn `pending`, SEC-02 |
| **API 3** | C | FR-18 | `PUT /api/admin/orders/:id/status` | máy trạng thái FR-10, SEC-03 leo thang quyền |

Ba API nối thành một luồng: login → `{{token}}` → checkout → `{{orderId}}` → admin đổi trạng thái.
**Không đổi lựa chọn này** trừ khi phát hiện trùng với thành viên nhóm.

## 3. Lỗi đã xác nhận bằng curl/đọc code (dùng làm mỏ neo, KHÔNG bịa thêm)

Mỗi dòng dưới đây đã được kiểm chứng thật, ghi rõ vị trí trong `sut/backend/server.js`:

| Mã | Vị trí | Mô tả | Vi phạm |
| --- | --- | --- | --- |
| B-01 | `server.js:51` | `POST /api/login` trả **nguyên cả bản ghi user**, gồm `password` dạng plaintext | SEC-01 |
| B-02 | `server.js:54` | Sai lệch khoá tài khoản: `login_attempts + 2` mỗi lần sai → khoá sau **2** lần chứ không phải 3 | FR-02 |
| B-03 | `server.js:552` | Máy trạng thái cho phép `canceled → delivered` | FR-10 |
| B-04 | `server.js:525` | `PUT /api/admin/orders/:id/status` chỉ gọi `authenticateToken`, **không kiểm `role`** → user thường đổi được trạng thái đơn (curl trả 200) | SEC-03 |
| B-05 | `server.js:494`, `504`, `510` | Toàn bộ nhóm `/api/admin/*` thiếu kiểm `role` như trên | SEC-03 |
| B-06 | `server.js:144` | `GET /api/products?search=` nối chuỗi SQL trực tiếp; lỗi trả về **HTML** chứ không phải JSON | SEC-05 |
| B-07 | `server.js:161` | `GET /api/products/:id` không tồn tại → trả **200 `{}`** thay vì 404 | schema |
| B-08 | `server.js:163` | Sản phẩm có `id` chẵn bị ép `price` thành **string** → schema không nhất quán | schema |
| B-09 | `server.js:297` | `POST /api/checkout` không kiểm giỏ hàng, không kiểm tồn kho, không kiểm dấu của `total_amount` | FR-08 |
| B-10 | `server.js:344` | `GET /api/orders/:id` **không có** `authenticateToken` → IDOR, xem được đơn của người khác | SEC-02 |
| B-11 | `server.js:167`, `179`, `191` | `POST/PUT/DELETE /api/products` **không có** middleware xác thực nào | SEC-02/03 |
| B-12 | `server.js:9` | `SECRET_KEY` hardcode trong mã nguồn; JWT **không có** `exp` (`server.js:50`) | SEC-02 |

Khi viết báo cáo: mọi con số, mọi mã lỗi phải **truy ngược được** về output Newman trong `results/` hoặc lệnh `curl` tái hiện được. Không có bằng chứng thì không viết.

## 4. Quy trình bắt buộc cho MỖI API *(mục 6:82-86)*

Làm đúng thứ tự, **mỗi bước một commit riêng** *(mục 12:137)*:

1. **Generate** — đưa `sut/api_specification.md` cho AI và dẫn dắt **từng bước** (không prompt gộp kiểu "sinh hết test case"). Mục tiêu **≥ 35 case/API**, phủ đủ 4 trục: phân vùng miền, chuyển trạng thái, bảo mật SEC-01–07, kiểm schema.
   → lưu nguyên văn output AI vào `docs/api<N>/AI-Generated-Raw.md`
2. **Audit** — gán nhãn **VALID / INVALID / INCOMPLETE** cho từng case kèm lý do, sửa case sai.
   → `docs/api<N>/Audit.md`
3. **Extend** — thêm **≥ 5 case tự nghĩ** mà AI bỏ sót, giải thích **vì sao** AI sót (chất lượng prompt / giới hạn model / đặc thù API).
   → `docs/api<N>/Extended.md`
4. **Execute** — chạy bằng Newman, xuất báo cáo HTML + JSON thô.
5. **Bug report** — ghi vào `docs/Bug-Report.md` **và** mở GitHub Issue kèm ảnh chụp.

### Quy ước commit

- **Tiếng Anh, Conventional Commits**: `<type>(<scope>): <subject>` — type dùng `feat` / `fix` / `test` / `docs` / `chore` / `ci`.
- Scope theo API hoặc theo khâu: `api1`, `api2`, `api3`, `collection`, `ci`, `generator`.
- Mỗi bước trong pipeline mục 4 là **một commit riêng** *(mục 12:137)*, ví dụ:
  `test(api1): generate 38 AI test cases for POST /api/login`
- **Không** thêm trailer `Co-Authored-By`.

## 5. Ràng buộc kỹ thuật xuyên suốt

- **`X-Student-Id: 23127262` trên mọi request** — đặt bằng pre-request script ở **cấp collection**, kèm `console.log` để chụp màn hình Postman Console làm bằng chứng *(mục 11:131 — TA có kiểm)*.
- **Dùng càng nhiều tính năng Postman càng tốt** *(mục 6:90)* và **liệt kê ra trong báo cáo**: workspace, collection, folder, biến (global/collection/environment/local), environment, pre-request & test script, data-driven run bằng file CSV/JSON, Collection Runner, monitor, mock server, schema validation (`ajv`/`tv4`), visualizer.
- **CI/CD** *(mục 6:91)*: workflow GitHub Actions chạy Newman. Cần **2 commit mẫu**: một lượt chạy **pass hết**, một lượt chạy **fail đúng 1 case**. Kèm ảnh chụp + link, viết trong `docs/CI-CD-Report.md`.
- **Sơ đồ AI test generator phải tự vẽ** *(mục 11:133)* — không để AI sinh trực tiếp. Pseudocode thì được.

## 6. Nguyên tắc làm việc với AI *(mục 2:20-24)*

- **Không** prompt gộp. Dẫn AI đi từng bước theo đúng kỹ thuật đã học trên lớp.
- Mọi output AI **phải được review**; nộp raw output là không đạt.
- Ghi **toàn bộ** lượt tương tác vào `docs/AI-Audit-Report.md` (tên công cụ, ngày giờ, prompt nguyên văn, output) — trích tự động bằng `scripts/extract-prompt-log.py`.
- `docs/AI-Critique.md` phải đếm được **200–300 từ** *(mục 10:121)*.

## 7. Lệnh hay dùng

```bash
# Dựng lại SUT sạch (restart backend là DB tự drop + seed lại)
./scripts/reset-db.sh

# Chạy toàn bộ collection + xuất báo cáo
npm test

# Chạy data-driven một folder
npx newman run collections/EShop-API-Tests.postman_collection.json \
  -e environments/local.postman_environment.json \
  --folder "API1 - Login" -d data/login-cases.csv

# Trích nhật ký prompt
python3 scripts/extract-prompt-log.py

# Đếm tiến độ checklist
grep -c '^- \[x\]' CHECKLIST.md && grep -c '^- \[ \]' CHECKLIST.md
```

## 8. Điều tuyệt đối tránh

- Bịa số liệu, bịa lỗi, bịa kết quả chạy — *(mục 11)* TA có đối chiếu.
- Commit thư mục `sut/` (đã có trong `.gitignore`).
- Thiếu bất kỳ tài liệu nào ở mục 14:149 → **0 điểm toàn bài** *(mục 17:185)*.
- Nộp trễ — không được chấp nhận *(mục 17:184)*.
