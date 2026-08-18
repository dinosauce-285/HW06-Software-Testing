#!/usr/bin/env bash
# Dua SUT ve trang thai sach truoc moi luot chay Newman.
#
# VI SAO CAN: bo test cua HW06 co ghi du lieu that - POST /api/checkout tao don
# hang moi (server.js:297), PUT /api/admin/orders/:id/status doi trang thai don
# (server.js:525), va cac case sai mat khau lam tang login_attempts den muc KHOA
# TAI KHOAN 180 giay (server.js:54, moi lan sai cong 2). Chay lai lan hai ma
# khong reset thi API 1 fail hang loat vi tai khoan dang bi khoa.
#
# CO CHE: sut/backend/database.js goi initDatabase() ngay khi duoc import, ma ham
# nay mo dau bang cac lenh DROP TABLE. Nghia la CHI CAN KHOI DONG LAI BACKEND
# la toan bo DB bi xoa va seed lai tu dau.
#
# Dung: ./scripts/reset-db.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="${ROOT}/sut/backend/server-run.log"

if [ ! -d "${ROOT}/sut/backend" ]; then
  echo "Khong thay sut/backend - clone SUT truoc:" >&2
  echo "  git clone https://github.com/ttbhanh/eshop-sut.git sut" >&2
  exit 1
fi

echo "[1/3] Dung backend dang chay..."
pkill -f '^node server\.js$' 2>/dev/null || true
sleep 1

echo "[2/3] Khoi dong lai backend (thao tac nay tu drop va seed lai DB)..."
cd "${ROOT}/sut/backend"
nohup node server.js > "$LOG" 2>&1 &
cd "$ROOT"

for _ in $(seq 1 30); do
  if curl -sf -o /dev/null http://localhost:3000/api/products; then break; fi
  sleep 0.5
done

if ! curl -sf -o /dev/null http://localhost:3000/api/products; then
  echo "Backend khong len duoc - xem $LOG" >&2
  exit 1
fi

echo "[3/3] Kiem chung trang thai sach:"
echo "  - San pham: $(curl -s http://localhost:3000/api/products | grep -o '"id"' | wc -l)"
echo "  - Dang nhap thu user seed: $(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"test@eshop.com","password":"Test1234!"}')"
echo "Da reset xong."
