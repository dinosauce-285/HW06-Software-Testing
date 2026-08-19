/**
 * Kịch bản tái hiện lỗi của API 2 (POST /api/checkout), dùng bởi
 * scripts/capture-bug-evidence.js. Tách riêng cho dễ đọc.
 *
 * Lệnh ở đây phải TRÙNG với mục "Tái hiện" trong docs/Bug-Report.md.
 */

const RESET = "./scripts/reset-db.sh >/dev/null 2>&1";
const ADMIN =
  `AT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"admin@eshop.com","password":"Admin123!"}' | jq -r .token)`;
const USER =
  `T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)`;

module.exports = [
  {
    id: "BUG-A2-01",
    title: "Backend nhận thẳng total_amount của client, không tính lại từ giỏ (FR-08)",
    cmds: [
      `${RESET}; ${USER}
curl -s -X POST localhost:3000/api/cart -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"id":1,"name":"iPhone","price":100000,"quantity":2}' > /dev/null
printf 'gio hang        : '; curl -s localhost:3000/api/cart -H "Authorization: Bearer $T"; echo
echo   'khai voi server : total_amount = 1'
R=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"total_amount":1,"shipping_address":"123 Le Loi"}')
printf 'don tao ra      : '; curl -s localhost:3000/api/orders/$(echo $R | jq -r .orderId) | jq -c '{total_amount,status}'
echo   '(FR-08 doi don phai ghi 200000 do backend TU TINH tu gio)'
echo
R2=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"total_amount":-500000,"shipping_address":"x"}')
printf 'thu voi so am   : '; curl -s localhost:3000/api/orders/$(echo $R2 | jq -r .orderId) | jq -c '{total_amount}'`,
    ],
  },
  {
    id: "BUG-A2-02",
    title: "Giỏ hàng không bị xoá sau khi thanh toán (FR-08)",
    cmds: [
      `${USER}
printf 'gio hang SAU khi da thanh toan: '; curl -s localhost:3000/api/cart -H "Authorization: Bearer $T"; echo
echo '(FR-08: "Sau thanh toan thanh cong, gio hang duoc xoa" -> phai la [])'`,
    ],
  },
  {
    id: "BUG-A2-03",
    title: "Giỏ rỗng vẫn tạo được đơn hàng",
    cmds: [
      `${RESET}; ${USER}
printf 'gio hang: '; curl -s localhost:3000/api/cart -H "Authorization: Bearer $T"; echo
echo 'thanh toan luon khi gio dang rong:'
curl -s -w '\\n<- HTTP %{http_code}\\n' -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"total_amount":200000,"shipping_address":"x"}'`,
    ],
  },
  {
    id: "BUG-A2-04",
    title: "Không kiểm kiểu: chuỗi và null lọt vào cột số tiền",
    cmds: [
      `${RESET}; ${USER}
for v in '"abc"' 'null' '"200000"' 'true' '1e308'; do
  R=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d "{\\"total_amount\\":$v,\\"shipping_address\\":\\"x\\"}")
  printf 'gui %-10s -> luu ' "$v"
  curl -s localhost:3000/api/orders/$(echo $R | jq -r .orderId) | jq -c '.total_amount'
done
echo
echo '("200000" va true bi SQLite tu ep ve so nen khong hong;'
echo ' chi "abc" va null moi that su lot vao cot so tien)'`,
    ],
  },
  {
    id: "BUG-A2-05",
    title: "GET /api/orders/:id không xác thực — duyệt được toàn bộ đơn hàng",
    cmds: [
      `echo 'duyet tuan tu tu id 1, KHONG gui token nao:'
for i in 1 2 3 4 5; do printf '  /api/orders/%s -> ' "$i"; curl -s localhost:3000/api/orders/$i | jq -c '{user_id,total_amount,shipping_address}'; done`,
    ],
  },
  {
    id: "BUG-A2-06",
    title: "Thanh toán không bất biến — 5 request đồng thời tạo 5 đơn",
    cmds: [
      `${RESET}; ${USER}
curl -s -X POST localhost:3000/api/cart -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"id":1,"name":"iPhone","price":100000,"quantity":2}' > /dev/null
echo 'gio co DUNG MOT lan hang. Ban 5 request thanh toan DONG THOI:'
for i in 1 2 3 4 5; do curl -s -o /dev/null -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"total_amount":200000,"shipping_address":"123 Le Loi"}' & done; wait
printf 'so don da tao: '; curl -s localhost:3000/api/orders/my-orders -H "Authorization: Bearer $T" | jq 'length'
echo '(mong doi: 1)'`,
    ],
  },
  {
    id: "BUG-A2-07",
    title: "Token của tài khoản đã bị xoá vẫn đặt được hàng",
    cmds: [
      `${RESET}
curl -s -o /dev/null -X POST localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Ghost","email":"ghost@hw06.local","password":"Test1234!"}'
GT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"ghost@hw06.local","password":"Test1234!"}' | jq -r .token)
GID=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"ghost@hw06.local","password":"Test1234!"}' | jq -r .user.id)
${ADMIN}
curl -s -o /dev/null -X DELETE localhost:3000/api/admin/users/$GID -H "Authorization: Bearer $AT"
echo "da xoa tai khoan id=$GID. Gio dung TOKEN CU de dat hang:"
curl -s -w '\\n<- HTTP %{http_code}\\n' -X POST localhost:3000/api/checkout -H "Authorization: Bearer $GT" -H 'Content-Type: application/json' -d '{"total_amount":9999,"shipping_address":"nowhere"}'`,
    ],
  },
  {
    id: "BUG-A2-08",
    title: "Đơn hàng mồ côi — khoá ngoại không được đảm bảo",
    cmds: [
      `${ADMIN}
echo 'don hang tro toi nguoi dung khong con ton tai (user_name = null):'
curl -s localhost:3000/api/admin/orders -H "Authorization: Bearer $AT" | jq -c '.[] | select(.user_name==null)'`,
    ],
  },
  {
    id: "BUG-A2-09",
    title: "Tài khoản đang bị khoá vẫn đặt hàng được bằng token cũ",
    cmds: [
      `${RESET}
T=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)
echo 'da lay token. Gio co tinh sai mat khau cho toi khi tai khoan bi khoa:'
for i in 1 2; do curl -s -o /dev/null -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"SAI"}'; done
curl -s -o /dev/null -w '  dang nhap lai          -> HTTP %{http_code}\\n' -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"test@eshop.com","password":"Test1234!"}'
curl -s -o /dev/null -w '  dat hang bang token cu -> HTTP %{http_code}\\n' -X POST localhost:3000/api/checkout -H "Authorization: Bearer $T" -H 'Content-Type: application/json' -d '{"total_amount":1,"shipping_address":"x"}'`,
    ],
  },
];
