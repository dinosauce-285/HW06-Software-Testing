# AI Prompt Log - nhat ky tuong tac nguyen van

*(HW06 muc 9:113 - "include the following information for each interaction: Name of the AI tool / Date and time / Your prompt / The AI output")*

| Mục | Giá trị |
|---|---|
| **Cong cu AI** | Claude Opus 5 (`claude-opus-5`) qua Claude Code CLI |
| **Sinh vien** | Ly Quoc Thanh - 23127262 |
| **Bai tap** | HW06 - API Testing |
| **Tong so luot tuong tac** | **14** |
| **So phien lam viec** | 2 |
| **Mui gio** | UTC+7 (gio Viet Nam) |

**Nguon:** trich tu dong bang `scripts/extract-prompt-log.py` tu transcript
`~/.claude/projects/-home-qt-projects-hw06/*.jsonl`.

**Prompt giu nguyen van 100%**, khong sua, khong paraphrase - ke ca loi chinh ta va cau cut.
Output cua AI cat o 2500 ky tu moi luot cho gon; cho nao bi cat deu ghi ro. Ban day du nam
trong transcript goc va trong chinh cac artifact da nop.

Bang audit theo mau cua Khoa - co verdict va phan sinh vien sua - nam o `AI-Audit-Report.md`.

---

# Phien `4225331f` - 13 luot

## Luot 1 - 18/08/2026 16:19:32

**Prompt (nguyen van):**

```text
đọc qua @2026.HW06.API Testing_En.md và xem cách set up ban đầu của /home/qt/projects/hw05 và set up cho project này
```

**Cong cu AI da goi:** 36 lan - `Bash`, `Read`, `Write`, `AskUserQuestion`

**Output AI:**

```text
Cloned into the right place. Now let's read the API spec to see the actual endpoints for Pools A, B, C.

Now I have the full picture: SUT cloned, API spec and SEC-01–07 requirements read. Let me set up the directory structure, git repo, and scaffold files mirroring the HW05 pattern (adapted for API testing).

Backend is up. Let me verify the three candidate APIs with real curl calls before locking anything in.

Verified real bugs already: login leaks the plaintext password, and `PUT /api/admin/orders/:id/status` accepts a **user** token (SEC-03 role escalation). Setting up the scaffold now.

Before I write `CLAUDE.md`, two things are genuinely yours to decide. Context first:

**API selection** — the đề requires exactly 3 APIs, one from each pool, ≥35 test cases each, covering domain partitions + state transitions (FR-10) + security (SEC-01–07) + schema. From reading `sut/backend/server.js` I already confirmed which endpoints have the richest bug surface:

| Endpoint | Pool | What's actually there (verified by curl/code) |
|---|---|---|
| `POST /api/login` | A (FR-02) | leaks plaintext `password` in the response (SEC-01), lockout fires after **2** wrong tries not 3 (`server.js:54` adds +2), 180s lock checked *before* password compare |
| `POST /api/checkout` | B (FR-08) | no cart check, no stock check, accepts negative `total_amount`, always creates `pending` — feeds the state machine |
| `PUT /api/admin/orders/:id/status` | C (FR-18) | **accepts a plain user token → role escalation (SEC-03), confirmed 200 by curl**, and allows the illegal `canceled → delivered` transition (`server.js:552`) |

These three also chain naturally in Postman: login → get token → checkout creates an order → admin moves its state.
```

---

## Luot 2 - 18/08/2026 16:24:53

**Prompt (nguyen van):**

```text
oá luôn cái git của eshop cho nó khỏi hiện thay đổi trong source control
```

**Cong cu AI da goi:** 21 lan - `Bash`, `Write`, `Edit`

**Output AI:**

```text
Only my own artifacts are dirty there (seeded DB, `node_modules`, log) — nothing of yours. Recording the upstream commit first, then dropping the `.git`.

`sut/` is now just plain files — VSCode will only show the hw06 repo. Now the directory scaffold.

Got the repo URL. Let me finish the scaffold, then wire the remote and push.

Locked in. Updating the README, then writing `CLAUDE.md`.

Let me verify by curl the bugs I listed in `CLAUDE.md` so none of them rest on code-reading alone.

All 12 confirmed by real execution. Now the Postman environment, scripts, and CI workflow.

Now committing and pushing to the repo you created.

Pushed. Last step of setup: reset the DB, since my curl probing left junk rows behind.

Setup xong. Đã đọc đề HW06, đối chiếu cách dựng của hw05, và dựng khung tương đương cho bài này.

**Về cái git của EShop:** đã xoá `sut/.git` — trước khi xoá tôi kiểm tra `git status` trong đó, chỉ có 3 thứ bẩn và đều do tôi tạo (DB đã seed, `node_modules/`, log), không có gì của bạn. Commit gốc `85af3ba` đã lưu lại trong [SUT-VERSION.txt](SUT-VERSION.txt) để báo cáo còn ghi được phiên bản SUT. `sut/` cũng nằm trong `.gitignore`, nên Source Control giờ chỉ hiện repo HW06.

**Đã push:** commit `151e154` lên `dinosauce-285/HW06-Software-Testing` (`main`).

Khung đã dựng:

| File | Vai trò |
|---|---|
| [CLAUDE.md](CLAUDE.md) | quy ước làm việc — biến cố định, 3 API, **12 lỗi đã kiểm chứng**, pipeline 5 bước/API, ràng buộc kỹ thuật |
| [CHECKLIST.md](CHECKLIST.md) | tiến độ, đánh dấu `[!]` cho thứ thiếu là 0 điểm toàn bài |
| [README.md](README.md) | bảng tự đánh giá + test summary (khung, điền dần) |
| [environments/local.postman_environment.json](environments/local.postman_environment.json) | 11 biến: `baseUrl`, `studentId`, token, orderId… |
| [scripts/reset-db.sh](scripts/reset-db.sh) | reset SUT — **cần thật**, vì bộ test làm khoá tài khoản và đẻ đơn hàng rác |
| [scripts/extract-prompt-log.py](scripts/extract-prompt-log.py) | trích prompt log cho AI Audit (mang từ hw05, đã sửa path) |
| [.github/workflows/api-tests.yml](.github/workflows/api-tests.yml) | CI tự clone SUT → seed → chạy Newman → upload report |

Newman 6.2.2 + `newman-reporter-htmlextra` đã cài cục bộ, `npm test` chạy được.

**Ba API đã chốt theo rec:** `POST /api/login` (A/FR-02) → `POST /api/checkout` (B/FR-08) → `PUT /api/admin/orders/:id/status` (C/FR-18).

Điều đáng giá nhất từ bước khảo sát: **12 lỗi tôi đã tái hiện bằng curl thật**, không phải đọc code suy ra — trong đó lo

[... cat bot, xem transcript goc ...]
```

---

## Luot 3 - 18/08/2026 16:31:04

**Prompt (nguyen van):**

```text
<ide_opened_file>The user opened the file /home/qt/projects/hw06/2026.HW06.API Testing_En.md in the IDE. This may or may not be related to the current task.</ide_opened_file>
```

**Cong cu AI da goi:** 4 lan - `Read`, `Edit`, `Bash`

**Output AI:**

```text
Amending in English conventional style. I'll also record the convention in `CLAUDE.md` so future commits follow it.

Amended và đã đồng bộ lên remote — commit giờ là `21ff2c7`, không còn trailer `Co-Authored-By`.

```
chore: scaffold HW06 API testing project

- pin SUT to eshop-sut@85af3ba (SUT-VERSION.txt), keep sut/ out of git
- select the three APIs under test: POST /api/login (pool A),
  POST /api/checkout (pool B), PUT /api/admin/orders/:id/status (pool C)
- record 12 SUT defects verified by curl in CLAUDE.md section 3
- add Postman environment, reset-db and prompt-log scripts
- add GitHub Actions workflow running Newman against a freshly built SUT
```

Vì commit cũ đã push rồi nên phải force-push (`--force-with-lease`) để ghi đè — repo chỉ có một commit và chỉ mình bạn làm nên không ảnh hưởng gì.

Tôi cũng ghi luôn quy ước vào [CLAUDE.md](CLAUDE.md#L61-L67) để các commit sau bám theo: tiếng Anh, Conventional Commits, scope theo `api1`/`api2`/`api3`/`collection`/`ci`/`generator`, mỗi bước pipeline một commit riêng (đề mục 12:137), và không kèm co-author.
```

---

## Luot 4 - 18/08/2026 16:32:10

**Prompt (nguyen van):**

```text
đề yêu cầu làm github action à ?, ngoài ra bạn tạo ra cả đống thư mục chưa xài tới, xoá bớt đi
```

**Cong cu AI da goi:** 7 lan - `Bash`, `Edit`

**Output AI:**

```text
Hai câu trả lời:

**1. CI/CD là bắt buộc, GitHub Actions thì không.** Đề mục 6 dòng 91: *"Add your API test cases to a CI/CD pipeline for the SUT (**for example**, run Newman in GitHub Actions...)"* — GitHub Actions chỉ là ví dụ. Nhưng bản thân pipeline thì bắt buộc, và mục 14 dòng 153 liệt kê CI/CD report vào **nội dung phải nộp**, mà mục 17 dòng 185 nói thiếu tài liệu bắt buộc là 0 điểm toàn bài. Đề còn đòi 2 commit mẫu: một lượt pipeline pass hết, một lượt fail đúng 1 case.

Lưu ý: CI/CD **không có dòng nào trong thang điểm** (mục 15 chỉ có API1/2/3 = 30+30+30 và Agent Skill = 10). Nó là điều kiện cần chứ không cộng điểm. Vì repo đã ở GitHub nên Actions là lựa chọn rẻ nhất — giữ file workflow đó.

**2. Xoá thư mục rỗng.** Đúng, tôi dựng sẵn quá tay.

Giờ chỉ còn thư mục có nội dung thật. Nhưng `npm test` ghi vào `results/` — để chắc Newman tự tạo được thư mục đó (nếu không CI sẽ vỡ), tôi chạy thử một collection tối giản.

Newman tự tạo thư mục export — không cần placeholder. Dọn kết quả smoke test đi.

Now updating the two docs that described the deleted layout.

Xong, đã push (`68879c2`).

**Về GitHub Actions:** đề không bắt buộc *đúng* GitHub Actions — mục 6:91 ghi rõ *"for example, run Newman in GitHub Actions"*. Nhưng **CI/CD pipeline thì bắt buộc**, kèm CI/CD report + 2 commit mẫu (1 lượt pass hết, 1 lượt fail đúng 1 case), và mục 14:153 liệt kê nó vào danh sách phải nộp → thiếu là 0 điểm toàn bài (mục 17:185). Điều đáng nói: CI/CD **không có dòng nào trong thang điểm 100** — nó là điều kiện cần, không phải chỗ kiếm điểm, nên đừng đầu tư quá nhiều vào đó. Repo sẵn ở GitHub nên Actions là đường rẻ nhất, giữ nguyên file workflow.

**Về thư mục:** đã xoá 11 thư mục rỗng. Còn lại đúng những gì đang dùng thật:

```
environments/  .github/workflows/  scripts/  sut/
```

Tiện thể tôi chạy thử Newman trên một collection tối giản để kiểm tra một giả định trước khi xoá `results/` — Newman **tự tạo thư mục export**, nên placeholder là thừa thật. Toolchain cũng thông luôn: request tới SUT trả 200, xuất được cả HTML lẫn JSON.

`README.md` giờ có bảng ghi thư mục nào sẽ tạo ở bước nào, để lúc làm không phải đoán.
```

---

## Luot 5 - 18/08/2026 16:34:05

**Prompt (nguyen van):**

```text
oke giờ giải thích đề cần gì
```

**Output AI:**

```text
Đề dài nhưng bóc ra thì chỉ có **4 khối việc**. Tôi giải thích theo thứ tự điểm số, kèm số dòng để bạn tra lại.

## Bức tranh tổng: điểm nằm ở đâu

| Khối | Điểm | Thực chất là gì |
|---|---|---|
| API 1 — trọn pipeline | 30 | 5 bước: generate → audit → extend → execute → bug |
| API 2 — trọn pipeline | 30 | y hệt |
| API 3 — trọn pipeline | 30 | y hệt |
| Agent Skill (test generator) | 10 | sơ đồ tự vẽ + pseudocode (+ video khuyến khích) |

**90/100 điểm là một quy trình lặp lại 3 lần.** Làm xong 1 API là biết hết cách làm 2 cái còn lại. CI/CD, Postman features, AI Audit, AI Critique **không có dòng điểm nào** — nhưng thiếu là 0 điểm toàn bài (mục 17:185). Tức là chúng là *điều kiện cần*, đừng dồn công vào đó.

## Khối 1–3: pipeline 5 bước cho mỗi API (mục 6:82-86)

**Bước 1 — Generate (≥35 case/API).** Đưa `api_specification.md` cho AI, nhưng đề cấm rõ prompt gộp kiểu *"sinh hết test case từ spec"* (mục 6:82, và mục 2:20 nhắc lại). Phải dẫn AI **đi từng kỹ thuật như học trên lớp**. Mỗi test case phải rơi vào 1 trong 4 trục:

| Trục | Nghĩa là gì | Với 3 API của bạn thì nó là gì |
|---|---|---|
| **Domain partition** | chia miền giá trị mỗi tham số thành lớp hợp lệ / không hợp lệ rồi lấy đại diện + biên | login: email đúng/sai định dạng, rỗng, quá dài, unicode; password độ phức tạp<br>checkout: `total_amount` âm / 0 / thập phân / string / rất lớn; `shipping_address` rỗng |
| **State transition** | đơn hàng đi theo máy trạng thái FR-10: `pending → confirmed → shipping → delivered`, cộng luật huỷ | API 3 là chỗ chính: thử cả 25 cặp chuyển trạng thái, hợp lệ lẫn không<br>login: state **khoá tài khoản** (chưa khoá → khoá → hết khoá) |
| **Security SEC-01…07** | 7 yêu cầu bảo mật ghi ở `sut/README.md:278-284` | SQL injection, IDOR (đọc đơn người khác), leo thang quyền (user gọi API admin), password plaintext, JWT không hạn |
| **Schema validation** | response **đúng y** hình dạng spec mô tả | field thiếu/thừa, kiểu sai, status code sai |

**Bước 2 — Audit (mục 6:83).** Đây là chỗ ăn điểm mà nhiều người bỏ qua. Từng case AI sinh ra phải gán nhãn **VALID / INVALID / INCOMPLETE** kèm lý do, rồi sửa cái sai. AI hay bịa endpoint không tồn tại, bịa status code, hoặc viết expected result theo *lẽ ra phải thế* thay vì *SUT thật sự trả gì*.

**Bước 3 — Extend (mục 6:84).** Tự thêm **≥5 case AI bỏ sót**, và — phần này mới là điểm — **giải thích vì sao AI sót**: do prompt bạn viết thiếu, do giới hạn model, hay do đặc thù API. Đây là bằng chứng cho Bloom G9.3 (Analyse).



[... cat bot, xem transcript goc ...]
```

---

## Luot 6 - 18/08/2026 16:38:16

**Prompt (nguyen van):**

```text
ta chọn cái api nào để tôi nhắn nhóm không chọn trùng
```

**Output AI:**

```text
Ba API đã chốt — nhắn nhóm cái này:

```
Mình chốt 3 API cho HW06 nhé, ai trùng thì báo mình đổi:

- Pool A (FR-02 Login & khoá tài khoản):  POST /api/login
- Pool B (FR-08 Đặt hàng):                POST /api/checkout
- Pool C (FR-18 Quản lý đơn - admin):     PUT  /api/admin/orders/:id/status
```

Nếu có đứa trùng, thứ tự ưu tiên đổi tôi gợi ý (vẫn giữ đủ 4 trục kiểm thử, không phải viết lại nhiều):

| Nếu trùng | Đổi sang | Vì sao vẫn ổn |
|---|---|---|
| Pool A `POST /api/login` | `POST /api/register` (FR-01) | phân vùng miền dày ngang ngửa (name/email/password), vẫn chạm SEC-01 vì password lưu plaintext |
| Pool B `POST /api/checkout` | `PUT /api/orders/:id/cancel` (FR-10) | được luôn state transition + IDOR, nhưng ít tham số nên phân vùng miền mỏng hơn |
| Pool C `PUT /api/admin/orders/:id/status` | `POST /api/admin/coupons` (FR-17) | CRUD coupon có nhiều field để phân vùng (`type`, `discount_value`, `expired_at`), vẫn dính SEC-03 |

Chốt được rồi thì báo tôi, nếu phải đổi thì tôi sửa lại `CLAUDE.md` mục 2–3 và `CHECKLIST.md` phần 1–3 cho khớp. Không đổi thì bắt đầu API 1 luôn.
```

---

## Luot 7 - 18/08/2026 16:39:02

**Prompt (nguyen van):**

```text
oke chốt, làm đi
```

**Cong cu AI da goi:** 21 lan - `Bash`, `Write`, `Read`, `Edit`

**Output AI:**

```text
Chốt. Bắt đầu API 1 — `POST /api/login`.

Một điểm phương pháp trước khi generate: bước 1 phải sinh **thuần từ spec**, không được dùng kiến thức tôi đã đọc từ `server.js`. Nếu tôi trộn 12 lỗi đã biết vào output "AI sinh" thì bước audit thành vô nghĩa và bước extend thành giả. Sinh từ spec → expected result theo spec → đối chiếu hành vi thật → chênh nhau chỗ nào chính là bug. Đó mới đúng quy trình đề mô tả.

Đọc phần đặc tả FR-02 trước.

Spec cho tôi đúng cái cần: bộ đếm tăng **đúng 1**, khoá sau **≥3 lần**, khoá **30 giây**, thông báo lỗi **không được lộ nguyên nhân**. Giờ sinh test case thuần từ spec, chia 7 bước theo từng kỹ thuật.

60 test case, 7 lượt prompt. Commit bước 1 trước khi sang audit.

Bước 2 — audit. Trước khi gán nhãn, tôi phải biết SUT **thật sự** làm gì ở những chỗ đặc tả bỏ trống, nếu không thì nhãn chỉ là suy đoán.

TC-021 trả 403 chứ không phải 401 — vì các case trước đó (TC-017, TC-018) đã làm khoá tài khoản. Đây là phát hiện audit quan trọng: **bộ test AI sinh có phụ thuộc trạng thái ngầm**. Đo tiếp máy trạng thái và bảo mật.

Chính xác: bộ đếm nhảy **0 → 2 → 4**, khoá sau **2** lần sai (đặc tả: 3), và thông báo khoá **nói thẳng lý do**. Đo tiếp thời lượng khoá và nhóm bảo mật.

Đủ dữ liệu để audit. Kiểm hai chỗ cuối trước khi gán nhãn.

Bước 3 — extend. Tôi có vài giả thuyết về chỗ AI bỏ sót, nhưng phải kiểm chứng trước. Hai cái cần đo: hành vi **sau khi hết hạn khoá** (mất 3 phút) và **tranh chấp đồng thời**.

Trong lúc chờ, tôi dựng phần hạ tầng cho bước 4. Viết tay ~180 request JSON cho 3 API là không thực tế, nên tôi làm **bộ sinh collection** từ bảng test case khai báo — cách này cũng chính là bước đệm cho deliverable Agent Skill (10 điểm).

Giả thuyết đúng, mà còn tệ hơn tôi nghĩ: sau khi hết 180 giây, bộ đếm **vẫn giữ nguyên ở 4** — chỉ cần sai thêm **một** lần là bị khoá lại ngay. Kiểm nốt tranh chấp đồng thời.
```

---

## Luot 8 - 19/08/2026 11:06:31

**Prompt (nguyen van):**

```text
Continue from where you left off.
```

**Output AI:**

```text
No response requested.
```

---

## Luot 9 - 19/08/2026 11:06:34

**Prompt (nguyen van):**

```text
continue
```

**Cong cu AI da goi:** 65 lan - `Bash`, `Write`, `Edit`, `Read`, `ToolSearch`

**Output AI:**

```text
Race condition xác nhận: 5 lần sai **đồng thời** chỉ làm bộ đếm lên 4 thay vì 10 — mất cập nhật do đọc-sửa-ghi. Kiểm nốt kênh liệt kê tài khoản.

Xác nhận đủ. Bốn phát hiện mới, đều đo được. Viết bước 3.

Giờ thêm 7 case này vào bảng test và sinh collection.

Hai folder chưa có nhãn, và quan trọng hơn — `setup` đang bị xếp cuối, trong khi nó phải chạy **đầu tiên** để lấy `adminToken`. Sửa thứ tự.

Bước 4 — Execute. Chạy bộ đầy đủ trên DB sạch.

Cả 7 case tự bổ sung đều bắt đúng lỗi. Xem bảng tổng kết và toàn bộ danh sách fail.

173 request, 252 khẳng định, 43 fail. Nhưng có **2 test-script lỗi** — đó là bug trong test của tôi, không phải của SUT. Truy ra.

Nguyên nhân đúng là cái tôi vừa phê bình AI ở bước audit — và tôi mắc lại y hệt: các case gửi mật khẩu sai vào **tài khoản seed dùng chung** làm nó bị khoá, nên mọi case phía sau nhận 403. Sửa bằng cách cho mỗi case một tài khoản riêng.

0 lỗi script. 22 khẳng định fail — kiểm xem có còn cái nào ngoài danh sách lỗi đã biết không.

Thủ phạm là TC-049 (đo thời gian) — nó bắn 10 lần sai vào tài khoản seed. Nhưng khoá xảy ra ở lần thứ 2, nên phép đo cũng hỏng luôn. Sửa: dùng **10 tài khoản khác nhau, mỗi cái đúng 1 lần thử**.

Bộ test sạch: 254 khẳng định, 20 fail, **mọi fail đều truy được về một bug cụ thể**. Giờ kiểm bộ hồi quy dùng cho CI phải xanh hoàn toàn.

Bộ hồi quy: **195 khẳng định, 0 fail**. Cập nhật lệnh npm rồi commit bước 4.

Bước 5 — bug report. Tổng hợp từ kết quả chạy thật.

11 bug. Số hiệu đang hụt mất `BUG-A1-04` do lúc lập kế hoạch — đánh số lại cho liền mạch rồi chạy lại để báo cáo khớp.

Kiểm lại các lệnh tái hiện trong báo cáo — chúng phải chạy được thật.

Giờ mở GitHub Issues. Đề yêu cầu mỗi issue kèm ảnh chụp, nên tôi chụp bằng chứng thật trước.

Trong lúc chờ, viết script mở issue.

Script tạo issue sẽ **đọc thẳng từ `Bug-Report.md`** thay vì chép lại nội dung — một nguồn sự thật, không sợ lệch.

Parse đúng cả 11, nhãn và phân loại nguồn phát hiện chuẩn. Ảnh còn "THIẾU" vì script chụp đang chạy.

Vẫn đang chạy (đang ở `sleep 185` của BUG-A1-11). Commit phần báo cáo trong lúc chờ.

Script trích prompt log chạy được (10 lượt / 2 phiên). Sẽ chạy lại lần cuối trước khi nộp.

Chạy lâu bất thường (>10 phút, đáng lẽ ~4). Xem nó đang kẹt ở đâu.

Chỉ mới 2,5 phút — tôi nhìn nhầm. Nó đang ở `sleep 185` của case cuối, còn khoảng 1 phút nữa rồi render ảnh.

Trong lúc chờ, ghi lại danh sách tính năng Postman đã dùng — đề bắt buộc phải liệt kê *(mục 6:90)*.

Transcript chạy xong cả 11 nhưng bản P

[... cat bot, xem transcript goc ...]
```

---

## Luot 10 - 19/08/2026 11:29:42

**Prompt (nguyen van):**

```text
oke tiếp
```

**Cong cu AI da goi:** 49 lan - `Bash`, `Write`, `Edit`, `Read`

**Output AI:**

```text
API 2 — `POST /api/checkout`. Đọc đặc tả FR-07/08/10 trước, vẫn giữ nguyên tắc cách ly khỏi mã nguồn.

Đặc tả FR-08 có một câu rất nặng ký: *"Backend phải tự tính lại tổng tiền; **không chấp nhận** `total_amount` do client gửi lên"*. Sinh test case quanh trục đó.

Bước 2 — audit. Đo hành vi thật của checkout trước.

Kết quả nặng: đơn lưu **`total_amount: 1`** trong khi giỏ 200.000 — backend nhận thẳng số client gửi, vi phạm trắng FR-08. Giỏ cũng không bị xoá, giỏ rỗng vẫn tạo được đơn. Đo tiếp nhóm bảo mật.

Đo xong. Kết quả cho phép audit chắc tay. Viết bước 2.

Bước 3 — extend. Kiểm chứng các giả thuyết về chỗ AI bỏ sót trước khi viết.

Năm phát hiện mới, đều xác nhận thật. Viết bước 3.

Bước 4 — dựng bảng test case cho API 2 và chạy. API này dùng thêm **data-driven run bằng CSV** như đã hẹn.

Builder chưa hỗ trợ trường `headers` cho từng case. Bổ sung rồi sinh lại.

Nguyên nhân gốc: `SETUP-A2` nhận 403 vì `TC-A1-E02` của API 1 **cố tình khoá tài khoản seed dùng chung**, và API 2 chạy sau. Rò rỉ trạng thái xuyên API. Sửa tại nguồn — cho case đó dùng tài khoản riêng.

6 case đánh dấu là bắt lỗi nhưng lại pass — nhãn của tôi quá rộng. Lý do đáng chú ý: SQLite có **type affinity**, chuỗi trông giống số như `"200000"` bị ép về số, chỉ `"abc"` và `null` mới thực sự làm hỏng cột. Sửa lại nhãn cho đúng.

Bộ hồi quy 326 khẳng định xanh hoàn toàn. Lấy số liệu cuối để viết bug report.

Bộ test khớp hoàn toàn: 452 khẳng định, 40 fail, mỗi fail truy được về một lỗi, không lỗi nào đánh dấu nhầm. Viết bug report cho API 2.

20 lỗi. Kiểm các lệnh tái hiện mới trước khi chụp bằng chứng.

Khớp đúng như báo cáo. Giờ chụp bằng chứng cho 9 lỗi của API 2.

Cú pháp OK nhưng khối API 2 **không được chèn** — chuỗi thay thế không khớp. Kiểm lại.

Đúng là chưa chèn. Dùng cách chắc chắn hơn: tách phần API 2 ra file riêng rồi nối vào mảng.

Trong lúc chờ (case BUG-A1-11 chờ 185 giây), cập nhật danh sách tính năng Postman — API 2 đã dùng thêm vài thứ.

Chờ script chụp xong (nó chạy lại cả 20 case, trong đó có case chờ 185 giây).

Trong lúc chờ, chuẩn bị bảng test case dạng Excel — cũng là tài liệu bắt buộc *(mục 14:154)*.

Đủ 20 ảnh. Kiểm một ảnh của API 2 rồi push và mở issue.

Bằng chứng rõ ràng: giỏ 200.000 → đơn ghi 1 đồng, và số âm cũng lọt. Push rồi mở 9 issue cho API 2.

Hai lỗi: nhãn `api1` bị gán cứng, và script sẽ tạo trùng 11 issue của API 1. Sửa cả hai.

**API 2 xong trọn pipeline (30/30).** Tổng cộng giờ có **20 lỗi**, 20 GitHub Issue.

| Bước | API 1 | API 2 |
|---|---

[... cat bot, xem transcript goc ...]
```

---

## Luot 11 - 19/08/2026 12:40:02

**Prompt (nguyen van):**

```text
oke tiếp
```

**Cong cu AI da goi:** 43 lan - `Bash`, `Write`, `Edit`, `Read`

**Output AI:**

```text
API 3 — `PUT /api/admin/orders/:id/status`. Đọc đặc tả FR-12 và FR-18 trước.

Đặc tả FR-12 nói rất rõ: **mọi** `/api/admin/*` phải kiểm cả token lẫn `role = 'admin'`. Cộng với ma trận 5×5 của FR-10 — đây đúng là chỗ cho data-driven. Sinh test case.

Bước 2 — audit. Đo hành vi thật, quan trọng nhất là ma trận 25 ô và chuyện kiểm `role`.

Ma trận thật khớp sơ đồ FR-10 **trừ đúng một ô**: `canceled → delivered` trả 200. Giờ kiểm trục quan trọng nhất — FR-12/SEC-03.

Xác nhận lỗi nặng nhất: **token user thường trả 200 và đơn thật sự đổi trạng thái** — vi phạm thẳng FR-12/SEC-03. Đo nốt vài điểm còn lại.

Xác nhận: **user thường tự lái trọn vòng đời đơn của mình `pending → confirmed → shipping → delivered`**. Kiểm kỹ hơn ca đồng thời — cần biết cả hai request trả gì.

Bước 3 — extend. Kiểm chứng các giả thuyết về chỗ AI bỏ sót ở API này.

Ba phát hiện nặng. Kiểm thêm một hướng: FR-12 nói **"tất cả"** `/api/admin/*` phải kiểm `role` — AI chỉ kiểm đúng endpoint được giao.

Toàn bộ `/api/admin/*` không kiểm `role` — user thường **chiếm trọn quyền admin**. Kiểm xem coupon 99% vừa tạo có dùng được thật không.

Xác nhận trọn chuỗi. Kiểm nốt một giả thuyết: ghép BUG-A2-01 với BUG-A3-01 thì user ghi được **số doanh thu tùy ý** vào dashboard.

Chuỗi hoàn chỉnh: một tài khoản user thường ghi được **bất kỳ số doanh thu nào** vào dashboard, kể cả kéo về 0 bằng số âm. Viết bước 3.

Bước 4 — bảng test case cho API 3, dùng **data-driven bằng CSV** cho ma trận 25 ô như đã hẹn.

Giờ dựng collection data-driven riêng cho ma trận 25 ô.

Chạy thử bộ data-driven trên 25 dòng CSV.

Data-driven chạy chuẩn: **150 khẳng định, đúng 2 fail — cả hai đều ở ô M24** (`canceled → delivered`). 24/25 ô còn lại khớp sơ đồ FR-10. Giờ chạy bộ chính có cả API 3.

Hai chỗ cần sửa, cả hai đều là lỗi thiết kế test của tôi:

619 khẳng định, 59 fail, tất cả truy được về lỗi đã biết. Kiểm bộ hồi quy rồi commit.

Bước 5 — bug report cho API 3.

26 lỗi. Chụp bằng chứng cho 6 lỗi API 3.

Trong lúc chờ (~4 phút), cập nhật danh sách tính năng Postman và checklist.

Trong lúc chờ, làm phần Agent Skill *(mục 7, 10 điểm)* — bắt đầu bằng pseudocode và thiết kế.

Sơ đồ thì **tôi không được vẽ** — mục 11:133 nói rõ nó phải tự vẽ, không được AI sinh. Tôi soạn bản đặc tả nội dung để bạn vẽ.

Bằng chứng rất rõ. Push và mở 6 issue cuối.

Bảng tổng kết có hai chỗ sai: API 3 hiện **0 case chuyển trạng thái** (vì 25 ô nằm ở collection data-driven riêng), và cột "số lỗi" đếm cả lỗi của API khác. Sửa bộ xuất.

Bảng tổng kết

[... cat bot, xem transcript goc ...]
```

---

## Luot 12 - 19/08/2026 13:11:00

**Prompt (nguyen van):**

```text
oke bạn làm được gì
```

**Cong cu AI da goi:** 2 lan - `Bash`

**Output AI:**

```text
Không có pandoc nhưng có Chromium — xuất PDF được. Đây là bảng phân chia:

## Tôi làm được — và sẽ làm luôn

| Việc | Ghi chú |
|---|---|
| **Agent Skill** trong `.claude/skills/` | Đóng gói pipeline 7 bước thành skill dùng lại được |
| **CI/CD**: chạy pipeline + **2 commit mẫu** (1 lượt xanh, 1 lượt fail đúng 1 case) | Repo public nên tôi chụp được trang Actions thật bằng trình duyệt |
| `docs/CI-CD-Report.md` | Cấu hình + 2 lượt chạy + link + ảnh |
| `docs/Main-Report.md` | Báo cáo chính, tổng hợp cả 3 API |
| `docs/AI-Audit-Report.md` | Trích tự động bằng `extract-prompt-log.py` (đã chạy thử được) |
| `docs/AI-Critique.md` | 200–300 từ, tôi đếm chính xác |
| `README.md` | Bảng tự đánh giá + 7 chỉ số test summary |
| `git-log.txt` | Xuất sau commit cuối cùng |
| **Xuất PDF** cả 3 tài liệu bắt buộc | Bằng Chromium |
| OpenAPI `.yaml` (tuỳ chọn) | Có thời gian thì làm, kèm audit như đề yêu cầu |
| Soát cuối: đối chiếu mọi con số về `results/` | 26 bug ↔ 26 issue, v.v. |

## Chỉ bạn làm được — 4 việc

| Việc | Vì sao tôi không làm được |
|---|---|
| **Sơ đồ generator** `[!]` | Mục 11:133 **cấm** AI sinh, TA có kiểm. Đã có [DIAGRAM-SPEC.md](generator/DIAGRAM-SPEC.md) mô tả đủ 6 khối để bạn vẽ |
| **Ảnh chụp Postman Console** `[!]` | Mục 11:131 đòi ảnh từ **app Postman**. Script gắn header đã xong và có `console.log` sẵn — bạn chỉ cần import collection, chạy, chụp tab Console |
| **Video YouTube** demo skill | Cần giọng và màn hình của bạn |
| **Chốt self-assessed grade** + xác nhận không trùng API với nhóm | Quyết định của bạn |

Ba việc đầu đều nằm trong nhóm **chống gian lận** của đề — đó chính là lý do chúng phải do bạn làm.

Một lưu ý về thứ tự: `git-log.txt` phải xuất **sau commit cuối**, nên tôi để cuối cùng. Và CI/CD cần push lên GitHub rồi chờ Actions chạy thật, nên tôi làm nó trước để có thời gian chờ.

Bắt đầu bằng CI/CD ngay, được chứ?
```

---

## Luot 13 - 19/08/2026 13:17:05

**Prompt (nguyen van):**

```text
oke làm luôn
```

**Cong cu AI da goi:** 31 lan - `Bash`, `Write`, `Read`

**Output AI:**

```text
Pipeline đã chạy và **xanh** sẵn rồi. Kiểm log để chắc nó thật sự chạy đủ bộ hồi quy.

Lượt xanh đã có: commit `88ce596`, **448 khẳng định / 0 fail**. Giờ tạo commit mẫu thứ hai — fail **đúng 1 case**. Chọn case có đúng một khẳng định.

`TC-A2-033` (giỏ rỗng vẫn tạo được đơn) — đúng 1 khẳng định fail. Trước hết chụp lượt xanh.

Ảnh chuẩn: trang Actions thật, **Success**, commit `88ce596`, 26 Issues hiện luôn trên thanh. Giờ tạo commit mẫu fail.

Đúng **1 khẳng định fail, 1 test case**. Push để CI chạy thật.

Trong lúc chờ, đóng gói Agent Skill.

Hai lượt mẫu đã có đúng như đề đòi. Trả case về khu cách ly để `main` xanh lại.

Giờ viết CI/CD report.

CI/CD xong. Hoàn thiện Agent Skill với hai file tham chiếu.

Giờ AI Critique — đề đòi đếm được **200–300 từ**.

317 từ — vượt trần. Cắt xuống và sửa lại con số tôi ghi sai trong file.

300 từ — đúng trần. Giờ AI Audit Report và Main Report.

Script còn ghi HW05. Sửa lại cho đúng bài.
```

---

# Phien `eecbbfbc` - 1 luot

## Luot 14 - 18/08/2026 16:19:32

**Prompt (nguyen van):**

```text
đọc qua @2026.HW06.API Testing_En.md và xem cách set up ban đầu của /home/qt/projects/hw05 và set up cho project này
```

**Cong cu AI da goi:** 36 lan - `Bash`, `Read`, `Write`, `AskUserQuestion`

**Output AI:**

```text
Cloned into the right place. Now let's read the API spec to see the actual endpoints for Pools A, B, C.

Now I have the full picture: SUT cloned, API spec and SEC-01–07 requirements read. Let me set up the directory structure, git repo, and scaffold files mirroring the HW05 pattern (adapted for API testing).

Backend is up. Let me verify the three candidate APIs with real curl calls before locking anything in.

Verified real bugs already: login leaks the plaintext password, and `PUT /api/admin/orders/:id/status` accepts a **user** token (SEC-03 role escalation). Setting up the scaffold now.

Before I write `CLAUDE.md`, two things are genuinely yours to decide. Context first:

**API selection** — the đề requires exactly 3 APIs, one from each pool, ≥35 test cases each, covering domain partitions + state transitions (FR-10) + security (SEC-01–07) + schema. From reading `sut/backend/server.js` I already confirmed which endpoints have the richest bug surface:

| Endpoint | Pool | What's actually there (verified by curl/code) |
|---|---|---|
| `POST /api/login` | A (FR-02) | leaks plaintext `password` in the response (SEC-01), lockout fires after **2** wrong tries not 3 (`server.js:54` adds +2), 180s lock checked *before* password compare |
| `POST /api/checkout` | B (FR-08) | no cart check, no stock check, accepts negative `total_amount`, always creates `pending` — feeds the state machine |
| `PUT /api/admin/orders/:id/status` | C (FR-18) | **accepts a plain user token → role escalation (SEC-03), confirmed 200 by curl**, and allows the illegal `canceled → delivered` transition (`server.js:552`) |

These three also chain naturally in Postman: login → get token → checkout creates an order → admin moves its state.
```

---
