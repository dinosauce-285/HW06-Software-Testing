# Test Summary — HW06 API Testing

> Sinh tự động bằng `node scripts/export-testcases.js`. Cột kết quả lấy từ
> `results/raw/conformance.json` — output thô của lượt chạy Newman gần nhất, không gõ tay.
> Bảng test case đầy đủ: `docs/Test-Cases.csv` (mở bằng Excel).

## 1. Tổng kết theo API

| API | Endpoint | Pool | FR | AI sinh | Tự bổ sung | Đã chạy | Pass | Fail | Số lỗi |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| API1 | `POST /api/login` | A | FR-02 | 58 | 7 | 66 | 50 | 16 | 11 |
| API2 | `POST /api/checkout` | B | FR-08 | 51 | 5 | 57 | 37 | 20 | 9 |
| **Tổng** | | | | **109** | **12** | **123** | **87** | **36** | **20** |

## 2. Độ phủ theo trục kiểm thử

| Trục | API1 | API2 | Tổng |
| --- | ---: | ---: | ---: |
| Chuẩn bị | 1 | 1 | **2** |
| Phân vùng miền | 23 | 22 | **45** |
| Giá trị biên | 6 | 7 | **13** |
| Chuyển trạng thái | 9 | 6 | **15** |
| Bảo mật | 12 | 11 | **23** |
| Schema & HTTP | 8 | 5 | **13** |
| Tự bổ sung | 7 | 5 | **12** |

## 3. Chỉ số theo yêu cầu mục 14:160

| Chỉ số | Giá trị |
| --- | --- |
| Số API kiểm thử | 2 |
| Test case AI sinh ra | 109 |
| Test case tự bổ sung | 12 |
| Test case đã thực thi | 123 |
| Passed | 87 |
| Failed | 36 |
| Số lỗi tìm được | 20 |

## 4. Lượt chạy Newman gần nhất

| | |
| --- | --- |
| Request | 363 |
| Khẳng định | 452 |
| Khẳng định thất bại | 40 |

> **Vì sao có khẳng định thất bại:** bộ test khẳng định theo **đặc tả**, mà SUT có lỗi thật.
> Mỗi khẳng định thất bại đều truy được về một mã lỗi ở cột "Mã lỗi". Bộ hồi quy dùng cho CI
> (`EShop-API-Regression`) đã loại các case này ra nên luôn xanh.
