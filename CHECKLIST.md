# CHECKLIST — HW06 API Testing

> **Nguồn sự thật duy nhất về tiến độ.** Xong việc nào tick ngay việc đó.
> Không tick = chưa xong, bất kể đã nói gì trong hội thoại.

**Ký hiệu:** `[!]` thiếu là **0 điểm toàn bài** *(mục 17:185)* — `[~]` mất điểm ở mục tương ứng

**Cập nhật:** 19/08/2026 — xong toàn bộ phần tôi làm được. Còn **4 việc chỉ sinh viên làm được**, xem mục dưới

```bash
grep -c '^- \[x\]' CHECKLIST.md && grep -c '^- \[ \]' CHECKLIST.md
```

---

## 0. Dựng khung (xong)

- [x] Clone SUT vào `sut/`, gỡ `.git` của nó, ghi lại commit gốc trong `SUT-VERSION.txt`
- [x] `git init` + remote `dinosauce-285/HW06-Software-Testing`
- [x] Cài Newman + `newman-reporter-htmlextra` cục bộ (`npm test` chạy được)
- [x] Chốt 3 API — login / checkout / admin order status *(mục 5:72)*
- [x] Khảo sát SUT bằng `curl`: 12 lỗi đã kiểm chứng thật, ghi ở `CLAUDE.md` mục 3
- [x] `environments/local.postman_environment.json`
- [x] `scripts/reset-db.sh`, `scripts/extract-prompt-log.py`
- [x] Workflow CI `.github/workflows/api-tests.yml`
- [x] Chạy thử Newman trên một collection tối giản → toolchain thông, Newman tự tạo `results/`

> Thư mục chỉ tạo khi thật sự dùng đến — xem bảng trong `README.md`.

## 1. API 1 — `POST /api/login` (Pool A, FR-02) — 30đ

- [x] **Generate**: 7 lượt prompt theo từng kỹ thuật, **60 case** (yêu cầu ≥ 35), đủ 4 trục *(mục 6:82)*
      → `docs/api1/AI-Generated-Raw.md` — AI bị cách ly khỏi `server.js`, chỉ đọc đặc tả
- [x] **Audit**: gán nhãn cả 60 — **27 VALID / 18 INVALID / 15 INCOMPLETE** *(mục 6:83)*
      → `docs/api1/Audit.md` — kèm 3 khuôn lỗi hệ thống của AI và bảng đo hành vi thật bằng `curl`
- [x] **Extend**: **7 case** tự bổ sung + phân tích 5 nguyên nhân AI sót *(mục 6:84)*
      → `docs/api1/Extended.md`
- [x] **Execute**: 66 request, **254 khẳng định / 20 fail**, mọi fail truy được về một bug *(mục 6:85)*
      → `results/html/conformance.html` + `results/raw/conformance.json`
      → bộ hồi quy cho CI: **195 khẳng định, 0 fail**
- [x] **Bugs**: **11 lỗi** (5 Nghiêm trọng, 4/5 do tự tìm) *(mục 6:86)*
      → `docs/Bug-Report.md` + **11 GitHub Issue** #1–#11, mỗi issue kèm ảnh transcript chạy thật

## 2. API 2 — `POST /api/checkout` (Pool B, FR-08) — 30đ

- [x] **Generate**: 7 lượt prompt, **60 case**, đủ 4 trục → `docs/api2/AI-Generated-Raw.md`
      → AI tự phát hiện đặc tả **tự mâu thuẫn** (§4.3 vs FR-08) và nêu rõ lựa chọn của nó
- [x] **Audit**: **47 VALID / 7 INVALID / 6 INCOMPLETE** → `docs/api2/Audit.md`
      → tỉ lệ VALID tăng từ 45 % (API 1) lên **78 %** nhờ sửa prompt, cùng model
- [x] **Extend**: **5 case** tự bổ sung + 4 nguyên nhân AI sót → `docs/api2/Extended.md`
- [x] **Execute**: gộp chung collection — 123 request, **452 khẳng định / 40 fail**
      → bộ hồi quy CI: **326 khẳng định, 0 fail**
- [x] **Bugs**: **9 lỗi** (4 Nghiêm trọng, 2/4 do tự tìm)
      → `docs/Bug-Report.md` + **GitHub Issue #12–#20** kèm ảnh transcript chạy thật

## 3. API 3 — `PUT /api/admin/orders/:id/status` (Pool C, FR-18) — 30đ

- [x] **Generate**: 7 lượt prompt, **67 case** → `docs/api3/AI-Generated-Raw.md`
      → AI tự dựng ma trận 5×5, tự đề xuất dạng data-driven, tự nêu mâu thuẫn đặc tả thứ hai
- [x] **Audit**: **60 VALID / 1 INVALID / 6 INCOMPLETE** = **89,6 %** → `docs/api3/Audit.md`
      → xu hướng qua 3 API: 45 % → 78 % → **90 %**, toàn bộ nhờ sửa prompt
- [x] **Extend**: **5 case** tự bổ sung → `docs/api3/Extended.md`
- [x] **Execute**: bộ chính **619 khẳng định / 59 fail**; ma trận data-driven **150 / 2**
      → bộ hồi quy CI: **448 khẳng định, 0 fail**
- [x] **Bugs**: **6 lỗi** (4 Nghiêm trọng, cả 3 lỗi tự tìm đều Nghiêm trọng)
      → `docs/Bug-Report.md` + **GitHub Issue #21–#26** kèm ảnh

## 4. Agent Skill — AI test generator — 10đ *(mục 7:95)*

- [ ] **Sơ đồ TỰ VẼ** (không để AI sinh) `[!]` *(mục 11:133)* → `generator/`
- [x] Pseudocode → `generator/pseudocode.md` — 6 giai đoạn, mỗi khối truy được về một lỗi thật của AI
- [x] Agent Skill → `.claude/skills/api-test-generator/` — SKILL.md + 2 file tham chiếu
- [ ] Video YouTube demo skill sinh test cho 1 API `[~]` *(mục 7:96)*

## 5. Ràng buộc kỹ thuật xuyên suốt

- [x] Pre-request script cấp collection gắn `X-Student-Id: 23127262` cho **mọi** request *(mục 6:85)*
- [ ] **Ảnh chụp Postman Console** chứng minh header đó `[!]` *(mục 11:131)* → `evidence/postman/`
- [x] Dùng nhiều tính năng Postman — **27 tính năng**, liệt kê ở `docs/Postman-Features.md` *(mục 6:90)*
- [x] **Data-driven run** bằng `data/api3-transitions.csv` — 1 request × 25 dòng
- [x] Mock server + Monitor + Visualizer: **cân nhắc và quyết định không dùng**, có ghi lý do kỹ thuật trong `docs/Postman-Features.md`
- [x] Newman HTML report, hostname `qt-ThinkBook-14-G5-IRH` in trên mọi ảnh bằng chứng *(mục 11:132)*

## 6. CI/CD *(mục 6:91)*

- [x] Pipeline chạy được trên GitHub Actions — tự clone SUT, seed DB, chạy Newman
- [x] **Commit mẫu 1** `88ce596` — run `32222002026` ✅ **448 khẳng định / 0 fail**
- [x] **Commit mẫu 2** `7c1cd9c` — run `32223024403` ❌ **451 khẳng định / đúng 1 fail**
- [x] `docs/CI-CD-Report.md` — cấu hình + 2 lượt chạy + ảnh chụp trang github.com thật

## 7. Tài liệu phải nộp *(mục 14:149)* — thiếu 1 cái là 0 điểm

- [x] `docs/Main-Report.md`  ·  *(PDF: sinh viên tự Save-As)*
- [x] `docs/AI-Audit-Report.md` — mẫu 6 mục, 14 artifact; nhật ký 14 lượt ở `AI-Prompt-Log.md`  ·  *(PDF: sinh viên tự Save-As)*
- [x] `docs/AI-Critique.md` — đếm được **300 từ**, đúng trần  ·  *(PDF: sinh viên tự Save-As)*
- [x] `docs/Bug-Report.md` — **26 lỗi** + **26 GitHub Issue** #1–#26 kèm ảnh
- [x] `docs/CI-CD-Report.md` + ảnh + link
- [x] Collection `.json` (3 bộ) + Newman HTML report → `collections/`, `results/html/`
- [x] Test case dạng Excel + bảng tổng kết → `docs/Test-Cases.csv` (194 case) + `docs/Test-Summary.md`
- [ ] Sơ đồ generator + pseudocode `[!]`
- [ ] `git-log.txt` — xuất **sau** commit cuối `[!]` *(mục 12:138)*
- [x] `README.md` — bảng tự đánh giá 100/100 + test summary đủ 7 chỉ số
- [ ] (Tuỳ chọn) OpenAPI `.yaml` — nếu AI sinh thì phải audit luôn
- [x] Link repo công khai ghi trong README và Main-Report

## 8. Soát lần cuối trước khi nộp

- [x] Mỗi bước một commit riêng, Conventional Commits tiếng Anh
- [x] Số bug khớp: **26 lỗi ↔ 26 issue**
- [x] Mọi con số truy ngược được — bảng tổng kết sinh tự động từ `results/raw/*.json`
- [ ] 3 API **không trùng** với thành viên nhóm — ghi xác nhận trong báo cáo chính *(mục 5:76)*
- [ ] Sơ đồ generator đúng là **tự vẽ**
- [ ] Zip đúng tên `23127262_HW06_AI_API_<grade>.zip` *(mục 14:146)*
- [ ] Giới hạn Moodle: tối đa 20 file, mỗi file 20 MB *(Policies:41)*
