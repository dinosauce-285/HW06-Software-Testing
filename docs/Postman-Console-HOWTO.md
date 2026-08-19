# Chụp ảnh Postman Console — 5 bước

> **Đề mục 11:131 (chống gian lận):** *"The `X-Student-Id: {StudentID}` header, evidenced by a
> console screenshot from your pre-request script."* TA có kiểm mục này.
>
> Việc này phải làm trên **giao diện Postman**, nên không tự động hoá được. Postman đã được cài sẵn
> tại `~/apps/Postman/Postman` (cũng có trong menu ứng dụng).

## Chuẩn bị

Backend phải đang chạy:

```bash
cd ~/projects/hw06 && ./scripts/reset-db.sh
```

## Các bước

1. **Mở Postman** — tìm "Postman" trong menu ứng dụng, hoặc chạy `~/apps/Postman/Postman`.
   Lần đầu nó hỏi đăng nhập → bấm **"Continue without an account"** ở cuối màn hình.

2. **Import collection + environment** — bấm **Import** (góc trên trái), kéo thả hai file:
   - `~/projects/hw06/collections/EShop-API-Tests.postman_collection.json`
   - `~/projects/hw06/environments/local.postman_environment.json`

3. **Chọn environment** — góc trên phải, đổi từ *No Environment* sang
   **"EShop Local — HW06 (23127262)"**. Bước này bắt buộc, thiếu nó thì `{{baseUrl}}` không phân giải được.

4. **Mở Console rồi chạy một request** —
   - Mở Console: menu **View ▸ Show Postman Console** (hoặc `Ctrl+Alt+C`)
   - Trong cây collection, mở `API1 — POST /api/login` ▸ `0. Setup — nạp token dùng chung`
     ▸ `SETUP-01 — Lấy token admin`, bấm **Send**

5. **Chụp màn hình** — trong Console sẽ hiện dòng:

   ```
   [X-Student-Id] 23127262  ->  POST /api/login
   ```

   Chụp sao cho khung hình thấy được **cả dòng đó lẫn cửa sổ Postman**. Lưu vào
   `~/projects/hw06/evidence/postman/postman-console.png`.

> **Mẹo:** muốn ảnh dày dặn hơn thì bấm **Run collection** (nút ▶ ở cấp collection) rồi chạy cả
> folder — Console sẽ in ra một loạt dòng `[X-Student-Id]` cho từng request, nhìn thuyết phục hơn
> một dòng đơn lẻ.

## Đã có sẵn hai ảnh bổ trợ

Hai ảnh này tôi đã dựng, **không thay thế** ảnh Postman Console mà bổ sung cho nó:

| Ảnh | Chứng minh điều gì |
| --- | --- |
| `evidence/postman/newman-console.png` | Cùng dòng `console.log` đó, in ra khi chạy thật bằng Newman |
| `evidence/postman/coverage.png` | Soát **624 request** trong cả 3 collection — **0 chỗ thiếu** header |

Ảnh thứ hai mạnh hơn ảnh chụp Console ở một điểm: request trong bộ test đến từ **hai nguồn** —
khai báo trong collection (được pre-request cấp collection phủ) và `pm.sendRequest` gọi trong
script (**không** đi qua pre-request, phải tự gắn header). Ảnh chụp Console chỉ chứng minh được
nhóm thứ nhất.
