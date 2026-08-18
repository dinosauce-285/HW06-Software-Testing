# HW06-Software-Testing — API Testing (EShop SUT)

| | |
| --- | --- |
| **Sinh viên** | 23127262 |
| **Bài tập** | HW06-AI — API Testing |
| **SUT** | EShop — https://github.com/ttbhanh/eshop-sut @ `85af3ba` (xem `SUT-VERSION.txt`) |
| **Công cụ** | Postman + Newman |
| **Base URL** | `http://localhost:3000` |
| **Header bắt buộc** | `X-Student-Id: 23127262` (pre-request script ở cấp collection) |

---

## 1. Ba API được chọn (mục 5 của đề)

| # | Pool | FR | Endpoint | Vì sao chọn |
| --- | --- | --- | --- | --- |
| API 1 | A | FR-02 Đăng nhập & khoá tài khoản | `POST /api/login` | Phân vùng miền dày (email/password), có state khoá tài khoản, chạm SEC-01/SEC-02/SEC-05 |
| API 2 | B | FR-08 Đặt hàng | `POST /api/checkout` | Phân vùng miền trên `total_amount`/`shipping_address`, sinh đơn `pending` làm đầu vào cho API 3 |
| API 3 | C | FR-18 Quản lý đơn (admin) | `PUT /api/admin/orders/:id/status` | Máy trạng thái FR-10 đầy đủ + leo thang quyền SEC-03 |

Ba API nối thành một luồng: **login → lấy token → checkout tạo đơn → admin chuyển trạng thái đơn đó**, nên collection dùng chung biến `{{token}}` / `{{orderId}}`.

> Cam kết không trùng với thành viên trong nhóm — xem `docs/Main-Report.md`.

## 2. Test summary (mục 14 của đề)

| Chỉ số | Số lượng |
| --- | --- |
| Số API kiểm thử | 3 |
| Test case AI sinh ra | *(điền sau)* |
| Test case tự bổ sung | *(điền sau)* |
| Test case đã chạy | *(điền sau)* |
| Passed | *(điền sau)* |
| Failed | *(điền sau)* |
| Bug tìm được | *(điền sau)* |

## 3. Bảng tự đánh giá (mục 15 của đề)

| No. | Tiêu chí | Điểm | Tự chấm | Căn cứ |
| --- | --- | --- | --- | --- |
| 1 | API 1 — trọn pipeline (generate + audit + extend + execute + bugs) | 30 | | |
| 2 | API 2 — trọn pipeline | 30 | | |
| 3 | API 3 — trọn pipeline | 30 | | |
| 4 | Agent Skill (AI-driven test generator) | 10 | | |
| | **Tổng** | **100** | | |

## 4. Cấu trúc thư mục

Hiện tại repo chỉ có những gì đã dùng thật:

```
environments/     Postman environment (.json)
scripts/          reset-db.sh, extract-prompt-log.py
.github/workflows CI/CD chạy Newman
sut/              EShop SUT (KHÔNG commit — xem .gitignore)
```

Các thư mục dưới đây **tạo khi nào cần đến**, không dựng sẵn:

| Thư mục | Tạo ở bước nào |
| --- | --- |
| `collections/` | khi dựng collection Postman đầu tiên |
| `data/` | khi làm data-driven run (Collection Runner + file CSV) |
| `results/` | Newman **tự tạo** khi export báo cáo (`npm test`) |
| `docs/` | khi viết báo cáo / audit / bug report |
| `evidence/` | khi có ảnh chụp màn hình đầu tiên |
| `generator/` | khi thiết kế AI test generator |
| `.claude/skills/` | khi đóng gói Agent Skill |

## 5. Chạy lại toàn bộ

```bash
# 1. Dựng SUT
git clone https://github.com/ttbhanh/eshop-sut.git sut
cd sut/backend && npm install && node database.js && node server.js &

# 2. Chạy test
cd ../.. && npm install && npm test
```

## 6. Liên kết

- Repo công khai: https://github.com/dinosauce-285/HW06-Software-Testing
- GitHub Issues (bug report): https://github.com/dinosauce-285/HW06-Software-Testing/issues
- Video demo Agent Skill: *(điền sau)*
