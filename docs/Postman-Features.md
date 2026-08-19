# Các tính năng Postman / Newman đã sử dụng

> **Đề mục 6:90.** *"Vận dụng càng nhiều tính năng Postman càng tốt … và **liệt kê ra trong báo
> cáo** những tính năng đã dùng."*
>
> Bảng dưới chỉ ghi những tính năng **thật sự có trong bộ test**, kèm chỗ chứng minh. Tính năng nào
> chưa dùng thì ghi thẳng ở mục 3 kèm lý do — không kê khai khống.

## 1. Đã dùng

| # | Tính năng | Dùng vào việc gì | Chứng minh |
| --- | --- | --- | --- |
| 1 | **Collection** | Gom toàn bộ test API vào một đơn vị chạy được | `collections/EShop-API-Tests.postman_collection.json` |
| 2 | **Folder (thư mục lồng)** | Chia theo API rồi chia tiếp theo **trục kiểm thử**: phân vùng miền / biên / trạng thái / bảo mật / schema / tự bổ sung. Cho phép chạy riêng từng trục bằng `--folder` | 7 folder trong collection |
| 3 | **Environment** | Tách cấu hình khỏi test: `baseUrl`, tài khoản, `studentId` | `environments/local.postman_environment.json` (11 biến) |
| 4 | **Biến môi trường (environment variable)** | Truyền `adminToken` từ request Setup sang các case cần quyền admin | `pm.environment.set('adminToken', …)` trong `SETUP-01` |
| 5 | **Biến cấp collection** | `baseUrl` mặc định, để collection chạy được cả khi thiếu environment | mục `variable` trong collection |
| 6 | **Biến cục bộ (local variable)** | `freshEmail`, `sec01Pass`, `dsTimingEmail` — chỉ sống trong một case, không rò sang case khác | `pm.variables.set(...)` trong pre-request |
| 7 | **Pre-request script cấp collection** | Gắn `X-Student-Id: 23127262` vào **mọi** request. Đặt ở cấp collection nên không case nào có thể quên *(mục 6:85)* | `event.prerequest` của collection |
| 8 | **`console.log` + Postman Console** | In `X-Student-Id` kèm method và đường dẫn của từng request, làm bằng chứng chụp màn hình *(mục 11:131)* | `evidence/postman/` |
| 9 | **Test script cấp collection** | Khẳng định chung cho mọi response: dưới 2 giây, không phải 5xx | `event.test` của collection |
| 10 | **Test script cấp request** | 254 khẳng định riêng cho từng case | `tests/api1-login.cases.js` |
| 11 | **`pm.sendRequest`** | Dựng tiền đề nhiều bước (tạo tài khoản, sai N lần liên tiếp) và **quan sát trạng thái** sau request chính bằng cách gọi `GET /api/admin/users` | các hàm `freshUser`, `failLogins`, `assertCounter` |
| 12 | **Kiểm tra JSON Schema** (`pm.response.to.have.jsonSchema`) | Biến SEC-01 thành ràng buộc schema qua mệnh đề `not.required: ["password"]` | `TC-A1-052` |
| 13 | **Chuỗi request (request chaining)** | login → `{{token}}` → checkout → `{{orderId}}` → admin đổi trạng thái | folder Setup + biến môi trường |
| 14 | **Newman CLI** | Chạy không cần giao diện, dùng được trong CI | `npm test` |
| 15 | **Reporter `htmlextra`** | Báo cáo HTML có thể lật xem từng khẳng định | `results/html/conformance.html` |
| 16 | **Reporter `json`** | Output máy đọc được, dùng để đối chiếu mọi con số trong báo cáo | `results/raw/conformance.json` |
| 17 | **Chạy theo folder** (`--folder`) | Chạy riêng một trục khi đang gỡ lỗi | `npx newman run … --folder "3. Chuyển trạng thái"` |
| 18 | **Hai collection từ một nguồn** | Bộ đầy đủ (bằng chứng bug, có fail) và bộ hồi quy (cổng CI, luôn xanh) | `scripts/build-collection.js` |
| 19 | **Newman trong GitHub Actions** | Cổng CI tự dựng SUT rồi chạy bộ hồi quy *(mục 6:91)* | `.github/workflows/api-tests.yml` |

## 2. Ghi chú về cách dựng collection

Collection **không** được viết tay mà **sinh ra** từ bảng khai báo `tests/*.cases.js` bằng
`scripts/build-collection.js`.

Lý do: ba API × ~60 case là gần 180 request. Viết tay JSON thì không soát được, và mỗi lần đổi một
khẳng định dùng chung (ví dụ thêm kiểm `Content-Type` cho mọi response) phải sửa 180 chỗ. Khai báo
tập trung thì sửa một chỗ rồi sinh lại. File JSON sinh ra vẫn là collection Postman v2.1 hợp lệ,
import thẳng vào Postman GUI được.

## 3. Chưa dùng — và vì sao

| Tính năng | Lý do |
| --- | --- |
| **Data-driven run** (Collection Runner + file CSV/JSON) | *Dự kiến làm ở API 2* — `POST /api/checkout` có `total_amount` và `shipping_address` hợp với việc lặp qua bảng dữ liệu. Ở API 1 các case khác nhau cả về **tiền đề** lẫn **khẳng định**, nhồi vào một file CSV sẽ phải viết logic rẽ nhánh trong test script — rối hơn là tách case |
| **Mock server** | *Dự kiến làm ở API 3* — dùng để dựng response mẫu cho các trạng thái đơn hàng mà SUT thật khó đưa vào |
| **Monitor** | Cần workspace trên đám mây và SUT phải truy cập được từ Internet. SUT chạy `localhost` nên monitor sẽ không gọi tới được. Thay thế bằng lịch chạy trong GitHub Actions |
| **Visualizer** | Cân nhắc cho bảng tổng kết trạng thái ở API 3 |

> Bảng này sẽ được cập nhật khi làm xong API 2 và API 3.
