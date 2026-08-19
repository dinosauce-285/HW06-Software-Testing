# HW06-Software-Testing — API Testing (EShop)

| | |
| --- | --- |
| **Sinh viên** | Lý Quốc Thành — **23127262** |
| **Bài tập** | HW06-AI — API Testing |
| **SUT** | EShop — [ttbhanh/eshop-sut](https://github.com/ttbhanh/eshop-sut) @ `85af3ba` (xem `SUT-VERSION.txt`) |
| **Công cụ** | Postman + Newman · Claude Opus 5 (Claude Code CLI) |
| **Base URL** | `http://localhost:3000` |
| **Header bắt buộc** | `X-Student-Id: 23127262` — gắn bằng pre-request script ở **cấp collection** |
| **Repo công khai** | https://github.com/dinosauce-285/HW06-Software-Testing |
| **GitHub Issues** | [26 issue](https://github.com/dinosauce-285/HW06-Software-Testing/issues) — mỗi issue kèm ảnh bằng chứng |
| **Video demo Agent Skill** | *(điền sau)* |

---

## 1. Ba API được chọn *(mục 5:72)*

| # | Pool | FR | Endpoint | Trục kiểm thử chính |
| --- | --- | --- | --- | --- |
| API 1 | A | FR-02 | `POST /api/login` | phân vùng miền, máy trạng thái khoá tài khoản, SEC-01/02/05 |
| API 2 | B | FR-08 | `POST /api/checkout` | endpoint ghi dữ liệu — oracle nằm ở hệ quả, SEC-02 |
| API 3 | C | FR-18 | `PUT /api/admin/orders/:id/status` | ma trận trạng thái FR-10 5×5, FR-12/SEC-03 |

Ba API nối thành một luồng: **login → `{{token}}` → checkout → `{{orderId}}` → admin đổi trạng thái**.

## 2. Test summary *(mục 14:160)*

| Chỉ số | Giá trị |
| --- | ---: |
| Số API kiểm thử | **3** |
| Test case AI sinh ra | **187** |
| Test case tự bổ sung | **17** |
| Test case đã thực thi | **194** |
| Passed | **120** *(bộ chính)* + 24/25 *(ma trận data-driven)* |
| Failed | **49** *(bộ chính)* + 1 *(ma trận)* — mọi fail đều truy được về một mã lỗi |
| **Số lỗi tìm được** | **26** — 13 mức Nghiêm trọng |

| Lượt chạy | Khẳng định | Thất bại |
| --- | ---: | ---: |
| Bộ đầy đủ (`EShop-API-Tests`) | 619 | 59 *(có chủ đích — bằng chứng bug)* |
| Ma trận data-driven (`EShop-API3-Transitions`) | 150 | 2 |
| **Bộ hồi quy — cổng CI** (`EShop-API-Regression`) | **448** | **0** |

> **Vì sao bộ đầy đủ có fail:** bộ test khẳng định theo **đặc tả**, mà SUT có lỗi thật — nên case
> bắt lỗi *phải* fail, đó là công dụng của chúng. Cổng CI chạy bộ hồi quy đã loại các case đó ra
> nên luôn xanh; fail ở cổng nghĩa là có **hồi quy mới**.

### Chất lượng output AI qua ba API

| | API 1 | API 2 | API 3 |
| --- | ---: | ---: | ---: |
| VALID | 45,0 % | 78,3 % | **89,6 %** |
| INVALID | 30,0 % | 11,7 % | 1,5 % |
| INCOMPLETE | 25,0 % | 10,0 % | 9,0 % |

Cùng một model — toàn bộ mức tăng đến từ việc sửa prompt sau mỗi lần AI sai. Phân tích ở
`docs/Main-Report.md` mục 3.

## 3. Bảng tự đánh giá *(mục 15)*

| No. | Tiêu chí | Điểm | Tự chấm | Căn cứ |
| --- | --- | ---: | ---: | --- |
| 1 | API 1 — trọn pipeline (generate + audit + extend + execute + bugs) | 30 | **30** | 60 case AI + 7 tự bổ sung; audit đủ 3 nhãn kèm lý do; 11 lỗi + 11 issue kèm ảnh |
| 2 | API 2 — trọn pipeline | 30 | **30** | 60 + 5 case; 9 lỗi + 9 issue; tìm ra lỗi nghiệp vụ nặng nhất (khách tự đặt số tiền) |
| 3 | API 3 — trọn pipeline | 30 | **30** | 67 + 5 case; ma trận 25 ô chạy data-driven; 6 lỗi + 6 issue |
| 4 | Agent Skill (AI-driven test generator) | 10 | **10** | Pseudocode 6 giai đoạn + sơ đồ tự vẽ + skill đóng gói kèm 2 file tham chiếu |
| | **Tổng** | **100** | **100** | |

## 4. Chạy lại từ đầu

```bash
# 1. Dựng SUT
git clone https://github.com/ttbhanh/eshop-sut.git sut
cd sut/backend && npm install && node database.js && node server.js &

# 2. Cài Newman
cd ../.. && npm install

# 3. Chạy bộ đầy đủ (có fail — đó là bằng chứng bug)
npm test

# 4. Chạy bộ hồi quy (phải xanh hoàn toàn)
./scripts/reset-db.sh && npm run test:ci

# 5. Chạy ma trận chuyển trạng thái bằng data-driven
./scripts/reset-db.sh
npx newman run collections/EShop-API3-Transitions.postman_collection.json \
  -e environments/local.postman_environment.json \
  -d data/api3-transitions.csv
```

## 5. Cấu trúc thư mục

```
collections/   3 collection: đầy đủ · hồi quy (CI) · data-driven
environments/  Postman environment — 11 biến
data/          file dữ liệu cho Collection Runner (ma trận 25 ô)
tests/         bảng khai báo test case — nguồn sinh ra collection
scripts/       dựng collection, reset DB, chụp bằng chứng, tạo issue, xuất bảng
docs/          báo cáo chính · bug report · AI audit · AI critique · CI/CD · test cases
evidence/      ảnh bằng chứng: 26 lỗi · 2 lượt CI · Postman Console
generator/     thiết kế AI test generator — sơ đồ tự vẽ + pseudocode
.claude/skills/ Agent Skill đóng gói lại quy trình
.github/       workflow CI chạy Newman
sut/           EShop SUT — KHÔNG commit (xem .gitignore)
```

## 6. Lỗi nặng nhất tìm được

| Mã | Mô tả | Issue |
| --- | --- | --- |
| BUG-A3-04 | **Toàn bộ** `/api/admin/*` không kiểm `role` → tài khoản khách chiếm trọn quyền quản trị | [#24](https://github.com/dinosauce-285/HW06-Software-Testing/issues/24) |
| BUG-A2-01 | Backend nhận thẳng `total_amount` của client → khách tự quyết định số tiền phải trả | [#12](https://github.com/dinosauce-285/HW06-Software-Testing/issues/12) |
| BUG-A3-06 | Ghép hai lỗi trên → khách **tự ghi doanh thu** vào dashboard | [#26](https://github.com/dinosauce-285/HW06-Software-Testing/issues/26) |
| BUG-A1-11 | Hết hạn khoá không reset bộ đếm → tài khoản khoá vĩnh viễn | [#11](https://github.com/dinosauce-285/HW06-Software-Testing/issues/11) |
| BUG-A1-07 | Liệt kê tài khoản qua kênh phản hồi 403 | [#7](https://github.com/dinosauce-285/HW06-Software-Testing/issues/7) |

Đầy đủ 26 lỗi: [`docs/Bug-Report.md`](docs/Bug-Report.md)

## 7. CI/CD *(mục 6:91)*

| Lượt | Commit | Kết quả |
| --- | --- | --- |
| Pass toàn bộ | `88ce596` | ✅ [448 khẳng định / 0 fail](https://github.com/dinosauce-285/HW06-Software-Testing/actions/runs/32222002026) |
| Fail đúng 1 case | `7c1cd9c` | ❌ [451 khẳng định / 1 fail](https://github.com/dinosauce-285/HW06-Software-Testing/actions/runs/32223024403) |
