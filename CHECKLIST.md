# CHECKLIST — HW06 API Testing

> **Nguồn sự thật duy nhất về tiến độ.** Xong việc nào tick ngay việc đó.
> Không tick = chưa xong, bất kể đã nói gì trong hội thoại.

**Ký hiệu:** `[!]` thiếu là **0 điểm toàn bài** *(mục 17:185)* — `[~]` mất điểm ở mục tương ứng

**Cập nhật:** 18/08/2026 — mới dựng khung, chưa làm test case nào

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

- [ ] **Generate**: dẫn AI từng bước, ≥ 35 case, đủ 4 trục *(mục 6:82)* → `docs/api1/AI-Generated-Raw.md`
- [ ] **Audit**: gán nhãn VALID/INVALID/INCOMPLETE kèm lý do *(mục 6:83)* → `docs/api1/Audit.md`
- [ ] **Extend**: ≥ 5 case tự nghĩ + giải thích vì sao AI sót *(mục 6:84)* → `docs/api1/Extended.md`
- [ ] **Execute**: dựng folder trong collection, chạy Newman, xuất HTML *(mục 6:85)*
- [ ] **Bugs**: ghi vào `docs/Bug-Report.md` + mở GitHub Issue kèm ảnh *(mục 6:86)*

## 2. API 2 — `POST /api/checkout` (Pool B, FR-08) — 30đ

- [ ] Generate → `docs/api2/AI-Generated-Raw.md`
- [ ] Audit → `docs/api2/Audit.md`
- [ ] Extend → `docs/api2/Extended.md`
- [ ] Execute
- [ ] Bugs + Issue

## 3. API 3 — `PUT /api/admin/orders/:id/status` (Pool C, FR-18) — 30đ

- [ ] Generate → `docs/api3/AI-Generated-Raw.md`
- [ ] Audit → `docs/api3/Audit.md`
- [ ] Extend → `docs/api3/Extended.md`
- [ ] Execute
- [ ] Bugs + Issue

## 4. Agent Skill — AI test generator — 10đ *(mục 7:95)*

- [ ] **Sơ đồ TỰ VẼ** (không để AI sinh) `[!]` *(mục 11:133)* → `generator/`
- [ ] Pseudocode → `generator/pseudocode.md` hoặc `.py`
- [ ] Cài thành Agent Skill trong `.claude/skills/`
- [ ] Video YouTube demo skill sinh test cho 1 API `[~]` *(mục 7:96)*

## 5. Ràng buộc kỹ thuật xuyên suốt

- [ ] Pre-request script cấp collection gắn `X-Student-Id: 23127262` cho **mọi** request `[!]` *(mục 6:85)*
- [ ] **Ảnh chụp Postman Console** chứng minh header đó `[!]` *(mục 11:131)* → `evidence/postman/`
- [ ] Dùng nhiều tính năng Postman + **liệt kê trong báo cáo** *(mục 6:90)*
- [ ] Data-driven run bằng file dữ liệu (`data/*.csv`) qua Collection Runner
- [ ] Mock server + Monitor (nếu làm được)
- [ ] Newman HTML report, hostname khớp deployment `[!]` *(mục 11:132)*

## 6. CI/CD *(mục 6:91)*

- [ ] Pipeline chạy được trên GitHub Actions
- [ ] **Commit mẫu 1**: pipeline **pass toàn bộ** + ảnh + link
- [ ] **Commit mẫu 2**: pipeline **fail đúng 1 case** + ảnh + link
- [ ] `docs/CI-CD-Report.md` mô tả cấu hình + 2 lượt chạy

## 7. Tài liệu phải nộp *(mục 14:149)* — thiếu 1 cái là 0 điểm

- [ ] `docs/Main-Report.md` (+ PDF) `[!]`
- [ ] `docs/AI-Audit-Report.md` (+ PDF) — tên tool, ngày giờ, prompt nguyên văn, output `[!]` *(mục 9:113)*
- [ ] `docs/AI-Critique.md` (+ PDF) — đếm được **200–300 từ** `[!]` *(mục 10:121)*
- [ ] `docs/Bug-Report.md` + ảnh Issue trên GitHub `[!]`
- [ ] `docs/CI-CD-Report.md` + ảnh + link `[!]`
- [ ] Collection `.json` + Newman HTML report `[!]`
- [ ] Test case dạng Excel + bảng tổng kết `[!]`
- [ ] Sơ đồ generator + pseudocode `[!]`
- [ ] `git-log.txt` — xuất **sau** commit cuối `[!]` *(mục 12:138)*
- [ ] `README.md` có bảng tự đánh giá + test summary đủ 7 chỉ số `[!]` *(mục 14:160)*
- [ ] (Tuỳ chọn) OpenAPI `.yaml` — nếu AI sinh thì phải audit luôn
- [ ] Link repo công khai trong bài nộp `[!]`

## 8. Soát lần cuối trước khi nộp

- [ ] Mỗi bước một commit riêng, thông điệp rõ ràng *(mục 12:137)*
- [ ] Số bug trong Markdown **khớp** số GitHub Issue
- [ ] Mọi con số trong báo cáo truy ngược được về `results/` hoặc lệnh `curl`
- [ ] 3 API **không trùng** với thành viên nhóm — ghi xác nhận trong báo cáo chính *(mục 5:76)*
- [ ] Sơ đồ generator đúng là **tự vẽ**
- [ ] Zip đúng tên `23127262_HW06_AI_API_<grade>.zip` *(mục 14:146)*
- [ ] Giới hạn Moodle: tối đa 20 file, mỗi file 20 MB *(Policies:41)*
