# Test Summary — HW06 API Testing

> Sinh tự động bằng `node scripts/export-testcases.js`. Cột kết quả lấy từ
> `results/raw/conformance.json` — output thô của lượt chạy Newman gần nhất, không gõ tay.
> Bảng test case đầy đủ: `docs/Test-Cases.csv` (mở bằng Excel).

## 1. Tổng kết theo API

| API | Endpoint | Pool | FR | AI sinh | Tự bổ sung | Đã chạy | Pass | Fail | Số lỗi |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| API1 | `POST /api/login` | A | FR-02 | 58 | 7 | 66 | 50 | 16 | 11 |
| API2 | `POST /api/checkout` | B | FR-08 | 51 | 5 | 57 | 37 | 20 | 9 |
| API3 | `PUT /api/admin/orders/:id/status` | C | FR-18 | 40 | 5 | 46 | 33 | 13 | 9 |
| **Tổng** | | | | **149** | **17** | **169** | **120** | **49** | **26** |

## 2. Độ phủ theo trục kiểm thử

| Trục | API1 | API2 | API3 | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Chuẩn bị | 1 | 1 | 1 | **3** |
| Phân vùng miền | 23 | 22 | 11 | **56** |
| Giá trị biên | 6 | 7 | 10 | **23** |
| Chuyển trạng thái | 9 | 6 | 0 | **15** |
| Bảo mật | 12 | 11 | 11 | **34** |
| Schema & HTTP | 8 | 5 | 8 | **21** |
| Tự bổ sung | 7 | 5 | 5 | **17** |

## 3. Chỉ số theo yêu cầu mục 14:160

| Chỉ số | Giá trị |
| --- | --- |
| Số API kiểm thử | 3 |
| Test case AI sinh ra | 149 |
| Test case tự bổ sung | 17 |
| Test case đã thực thi | 169 |
| Passed | 120 |
| Failed | 49 |
| Số lỗi tìm được | 26 |

## 4. Lượt chạy Newman gần nhất

| | |
| --- | --- |
| Request | 480 |
| Khẳng định | 619 |
| Khẳng định thất bại | 59 |

> **Vì sao có khẳng định thất bại:** bộ test khẳng định theo **đặc tả**, mà SUT có lỗi thật.
> Mỗi khẳng định thất bại đều truy được về một mã lỗi ở cột "Mã lỗi". Bộ hồi quy dùng cho CI
> (`EShop-API-Regression`) đã loại các case này ra nên luôn xanh.
