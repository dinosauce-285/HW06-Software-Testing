# Những cái bẫy đã vấp — và cách phát hiện

Toàn bộ mục trong tài liệu này là **lỗi thật đã mắc phải** trong HW06, không có mục nào là lý
thuyết. Chia làm hai phần: lỗi của **AI** và lỗi của **chính bộ test tôi viết**.

---

# Phần A — Lỗi của AI

## A1. Gán yêu cầu của tầng giao diện cho tầng API

**Triệu chứng:** một loạt test case đòi API trả 400 cho dữ liệu sai định dạng, nhưng API trả 401
và **không vi phạm gì cả**.

**Nguyên nhân:** đặc tả ghi *"Trường email phải dùng `type="email"` (có validate HTML5 format)"* —
đây là ràng buộc của **form HTML**, không phải của endpoint. AI đọc thành ràng buộc API.

**Thiệt hại nếu không phát hiện:** 6 bug ma trong báo cáo.

**Cách phát hiện:** với mỗi khẳng định, hỏi *"điều khoản nào nói API phải làm vậy?"* Nếu điều khoản
đó đang nói về giao diện thì không áp cho API được.

## A2. Kéo ràng buộc từ FR này sang FR khác

**Triệu chứng:** test case đòi endpoint **đăng nhập** từ chối mật khẩu dưới 8 ký tự.

**Nguyên nhân:** quy tắc "mật khẩu ≥ 8 ký tự" thuộc FR **đăng ký**. Endpoint đăng nhập chỉ so khớp
chuỗi — nó **không được phép** từ chối vì độ phức tạp, nếu không thì tài khoản cũ không vào được.

**Điểm nguy hiểm:** test này vẫn trả 401 nên **trông như pass**, nhưng pass **vì lý do sai** (sai
mật khẩu, không phải vì ngắn). Đây là oracle giả.

## A3. Viết test chuyển trạng thái mà quên trạng thái

**Triệu chứng:** cả 9 case nhóm chuyển trạng thái không ghi tiền đề, và không nói quan sát bộ đếm
bằng cách nào.

**Cách phát hiện:** chạy thử theo thứ tự. Nếu kết quả **đổi theo thứ tự chạy** thì có phụ thuộc
trạng thái ngầm — bộ test đó không dùng được trong CI.

## A4. Neo vào danh sách được cho sẵn

**Triệu chứng:** đưa AI danh sách SEC-01→07 thì nó duyệt đủ 7 mục, rất chuẩn — và **bỏ trắng** mọi
rủi ro không nằm trong 7 mục đó (tính sẵn sàng, đồng thời, vòng đời).

**Nguyên nhân:** AI coi danh sách được đưa là **toàn bộ không gian**, tối ưu *trong* nó thay vì hỏi
nó còn thiếu gì.

**Cách chữa:** luôn có lượt hỏi *"ngoài danh sách này còn gì?"* — xem `prompts.md` lượt 5b.

## A5. Kiểm thuộc tính, không nghĩ tiếp thành chuỗi khai thác

**Triệu chứng:** AI viết case *"user B không được đọc đơn của user A"* — đúng và đủ để phát hiện
lỗi. Nhưng nó dừng ở đó.

**Cái nó không làm:** hỏi *"nếu thuộc tính này vỡ thì khai thác được tới đâu?"* Khoảng cách giữa
*"B đọc được đơn của A"* và *"bất kỳ ai duyệt id 1..N là rút sạch dữ liệu khách hàng"* là khoảng
cách giữa một lỗi trung bình và một sự cố lộ dữ liệu.

## A6. Kiểm một phần tử khi ràng buộc nói "với mọi"

**Triệu chứng:** đặc tả nói *"**tất cả** các API Admin phải kiểm `role`"*. AI viết một case kiểm
đúng endpoint được giao.

**Cái đúng phải làm:** ràng buộc dạng "với mọi X" thì kiểm trên **tập X**. Khi kiểm cả họ thì phát
hiện **toàn bộ** nhóm admin đều thủng — một tài khoản khách chiếm được trọn quyền quản trị.

**Nguyên nhân gốc:** prompt chỉ đưa **một** endpoint. AI làm đúng trong phạm vi được giao.

## A7. Viết case không dựng nổi đầu vào

**Triệu chứng:** case *"token hết hạn → 401"*. Muốn có token hết hạn phải ký một token với `exp`
trong quá khứ, mà muốn ký thì phải biết khoá bí mật — thứ không có trong đặc tả. Hệ thống này còn
không phát hành token có `exp`.

**Nguyên nhân:** AI viết theo thói quen của danh mục bảo mật chung, không kiểm xem đầu vào có dựng
được không.

## A8. Trùng lặp

Hai case cùng đầu vào, cùng kỳ vọng, khác ID. Không thêm thông tin, vẫn tốn thời gian chạy và làm
phồng số liệu.

---

# Phần B — Lỗi của chính bộ test tôi viết

Phần này quan trọng không kém phần A. Test sai thì tệ hơn không có test, vì nó tạo cảm giác an toàn
giả.

## B1. Case làm bẩn trạng thái dùng chung

**Đã vấp hai lần.**

Lần 1: các case gửi mật khẩu sai vào tài khoản seed làm **khoá** tài khoản — khoá 180 giây, không
API nào gỡ được — nên mọi case sau nhận 403 thay vì 401.

Lần 2: một case của API 1 cố ý khoá tài khoản seed để kiểm liệt kê tài khoản, làm hỏng **toàn bộ**
folder của API 2 chạy sau nó.

**Cách sửa:** mỗi case tự tạo tài khoản riêng trong pre-request.

```js
const email = 'st-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '@test.local';
```

**Cách phát hiện:** chạy bộ test hai lần liên tiếp không reset DB. Kết quả khác nhau nghĩa là có
phụ thuộc trạng thái.

## B2. Pre-request script bị chờ tuần tự

**Triệu chứng:** case kiểm tranh chấp đồng thời **pass**, trong khi `curl` chứng minh lỗi có thật.

**Nguyên nhân:** Postman **chờ** mọi callback của pre-request xong mới gửi request chính. Đặt request
đối thủ ở pre-request thì hai lệnh chạy **tuần tự** — test pass vì lý do sai.

**Cách sửa:** bắn cả hai request **trong cùng một test script**, không chờ nhau.

```js
['confirmed', 'canceled'].forEach(s => pm.sendRequest({...}, (e, r) => {
  ma[s] = r && r.code;
  if (++xong === 2) pm.test('...', () => pm.expect(ma.confirmed === 200 && ma.canceled === 200).to.be.false);
}));
```

## B3. Khẳng định trên trạng thái toàn cục

**Triệu chứng:** case SQLi khẳng định *"không đơn nào trong hệ thống có trạng thái `delivered`"* —
fail, nhưng **không phải vì injection**. Các case khác cũng tạo ra đơn `delivered` một cách hợp lệ.

**Nguyên tắc:** chỉ được khẳng định trên **chính đối tượng đang thử**, hoặc so sánh **trước/sau**.

## B4. Đánh dấu "case bắt lỗi" cho case không bắt được gì

**Triệu chứng:** 6 case đánh dấu `knownBug` nhưng lại **pass**.

Hai nguyên nhân khác nhau:

1. **SQLite type affinity** — chuỗi trông giống số (`"200000"`) và boolean được tự động ép về số
   khi ghi vào cột kiểu số. Chỉ `"abc"` và `null` mới thật sự làm hỏng dữ liệu. 5 case còn lại
   không có gì để bắt.
2. **Giá trị trùng nhau** — case gửi `total_amount` đúng bằng tổng giỏ hàng, nên dù backend lấy
   nhầm nguồn thì kết quả vẫn đúng. Không phân biệt được.

**Cách phát hiện:** sau mỗi lượt chạy, đối chiếu tự động:

```js
const chuaFail = Object.keys(map).filter(id => !fail.has(id));
console.log('knownBug nhưng KHÔNG fail:', chuaFail);
```

## B5. Oracle không phân biệt được nguyên nhân

**Triệu chứng:** case *"token user thường chuyển đơn sang `delivered` phải bị chặn"*.

**Vấn đề:** đơn mới ở `pending`, mà `pending → delivered` vốn đã là chuyển đổi không hợp lệ. SUT
trả 400 vì **máy trạng thái**, chưa kịp đụng tới `role`. Test "thất bại đúng như mong đợi" nhưng
**vì lý do hoàn toàn khác** — tạo cảm giác đã kiểm phân quyền trong khi chưa kiểm gì cả.

**Cách sửa:** đưa đơn về `shipping` trước, để chuyển đổi hợp lệ về mặt trạng thái. Lúc đó nếu vẫn
200 thì **chắc chắn** do thiếu kiểm `role`.

**Cách phát hiện, tổng quát:** với mỗi case, hỏi *"nếu bỏ đi cái lỗi tôi đang định bắt, case này có
còn thất bại không?"* Nếu còn → oracle không phân biệt được.

## B6. Ghép chuỗi shell với dữ liệu có ký tự đặc biệt

**Triệu chứng:** tiêu đề issue bị nuốt mất một đoạn.

**Nguyên nhân:** tiêu đề chứa dấu backtick, ghép vào chuỗi shell thì backtick bị hiểu là lệnh.

```js
// SAI
execSync(`gh issue create --title ${JSON.stringify(title)}`);
// ĐÚNG — không qua shell
execFileSync("gh", ["issue", "create", "--title", title]);
```

## B7. Đếm hai lần cùng một khuyết tật

**Triệu chứng:** `Content-Type: text/plain → 500` xảy ra ở **cả ba** endpoint. Nếu ghi thành ba lỗi
thì số lỗi bị thổi lên gấp ba.

**Nguyên tắc:** đếm theo **nguyên nhân gốc**, không theo số chỗ quan sát được. Ở đây nguyên nhân là
middleware mặc định của framework, áp cho toàn ứng dụng → **một** lỗi.

Tương tự: 13 case cùng thất bại vì một dòng mã → **một** lỗi, không phải 13.

## B8. Bảng tổng kết bỏ sót case chạy ở nơi khác

**Triệu chứng:** bảng tổng kết ghi API 3 có **0** case chuyển trạng thái, trong khi nó có 25.

**Nguyên nhân:** 25 ô chạy ở collection data-driven riêng, không nằm trong bảng khai báo chính. Bộ
xuất chỉ đọc bảng khai báo.

**Nguyên tắc:** mọi con số trong báo cáo phải sinh **tự động từ output thô**, và bộ sinh phải đọc
**tất cả** các nguồn.

---

# Danh mục soát nhanh trước khi nộp

- [ ] Chạy bộ test **hai lần liên tiếp** không reset DB — kết quả có giống nhau không? (B1)
- [ ] Mọi case `knownBug` có **thật sự fail** không? (B4)
- [ ] Mọi case fail có truy được về **một mã lỗi** không? Có case nào fail ngoài dự kiến không?
- [ ] Số lỗi trong Markdown có **khớp** số GitHub Issue không?
- [ ] Mọi con số trong báo cáo có rút ra được từ `results/raw/*.json` bằng lệnh không?
- [ ] Có lỗi nào bị **đếm hai lần** ở hai API khác nhau không? (B7)
- [ ] Với mỗi case bắt lỗi: *"bỏ lỗi đó đi thì case còn fail không?"* (B5)
