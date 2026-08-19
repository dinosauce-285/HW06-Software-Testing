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
| 20 | **Biến động (dynamic variable) tự sinh** | Mỗi case trạng thái tự tạo tài khoản riêng bằng `Date.now()` + số ngẫu nhiên, nên chạy lại bao nhiêu lần cũng không đụng nhau | `freshUser()`, `userMoi()` |
| 21 | **Khẳng định bất đồng bộ lồng nhau** | Dựng tiền đề nhiều bước rồi mới khẳng định (tạo tài khoản → xoá tài khoản → gọi API bằng token cũ) | `TC-A2-E03`, `TC-A2-E04` |
| 22 | **Gửi request song song trong script** | Bắn nhiều `pm.sendRequest` không chờ nhau để tạo tranh chấp đồng thời | `TC-A1-E03`, `TC-A2-E01` |
| 23 | **Khẳng định trên hệ quả, không chỉ trên response** | Với endpoint ghi dữ liệu, oracle nằm ở bản ghi được tạo — đọc lại bằng `GET /api/orders/:id` rồi mới khẳng định | `docDon()` trong `tests/api2-checkout.cases.js` |
| 24 | **Data-driven run + file dữ liệu CSV** | Ma trận 25 ô của FR-10 chạy bằng **một** request lặp qua 25 dòng dữ liệu | `collections/EShop-API3-Transitions.postman_collection.json` + `data/api3-transitions.csv` |
| 25 | **`pm.iterationData`** | Đọc `tu_trang_thai`, `toi_trang_thai`, `ma_mong_doi` của từng dòng CSV để dựng tiền đề và chọn kỳ vọng | pre-request và test script của request `MATRIX` |
| 26 | **Tên request động theo dữ liệu** | Request hiện tên `{{case_id}}: {{tu_trang_thai}} → {{toi_trang_thai}}` nên báo cáo đọc được từng lượt lặp | cùng file |
| 27 | **Collection thứ ba tách riêng** | Ba collection cho ba mục đích: đầy đủ (bằng chứng bug), hồi quy (cổng CI), data-driven (ma trận trạng thái) | `collections/` |

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
| **Mock server** | Cân nhắc ở API 3 rồi **quyết định không dùng**. Mock server để giả lập một API *chưa tồn tại*. Ở đây SUT đã chạy thật và mọi trạng thái đơn hàng đều dựng được bằng chính API thật (xem `duong` trong bộ data-driven). Dựng mock chỉ để có thêm một dòng trong bảng tính năng thì là kê khai hình thức, không phải kiểm thử |
| **Monitor** | Cần workspace trên đám mây và SUT phải truy cập được từ Internet. SUT chạy `localhost` nên monitor sẽ không gọi tới được. Thay thế bằng lịch chạy trong GitHub Actions |
| **Visualizer** | Visualizer vẽ HTML **trong giao diện Postman**; Newman ở chế độ dòng lệnh không hiển thị được, mà toàn bộ bằng chứng của bài này lấy từ Newman. Bảng ma trận trạng thái đã được trình bày trong `docs/api3/Audit.md` — cùng thông tin, và **kiểm chứng lại được** |

**Ghi chú về tính trung thực:** ba tính năng trên đều **cố tình không dùng**, kèm lý do kỹ thuật cụ thể. Đề khuyến khích dùng nhiều tính năng, nhưng dùng một tính năng sai chỗ chỉ để điền vào bảng thì không phải kiểm thử.
