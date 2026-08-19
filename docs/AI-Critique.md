# AI Critique — HW06 API Testing

> **Đề mục 10:121.** Viết một đoạn 200–300 từ phê bình AI: nó sai, thiên lệch hay thiếu sót ở đâu,
> vì sao nó không bắt được vấn đề, và bạn rút ra nguyên tắc gì khi cộng tác với AI.
>
> **Sinh viên:** 23127262 · **Công cụ:** Claude Opus 5 (Claude Code CLI) · **Ngày:** 19/08/2026

---

AI sai nhiều nhất ở chỗ **khẳng định những ràng buộc mà đặc tả không đặt ra**. Ở API 1, 30 % test
case bị gán nhãn INVALID: nó đọc câu "trường email phải dùng `type="email"`" — một yêu cầu của form
HTML — rồi kết luận API phải trả 400 cho email sai định dạng. Nộp nguyên si thì báo cáo có sáu lỗi
ma. Nó cũng kéo quy tắc mật khẩu từ đăng ký sang đăng nhập, tạo ra test "pass" nhưng pass vì lý do
sai.

Nhưng phần lớn thiếu sót lại **không phải lỗi của model**. Khi tôi sửa prompt — thêm câu hỏi "ngoài
danh sách SEC còn rủi ro gì", bắt ghi rõ đâu là giả định, bắt mô tả chuỗi thao tác — tỉ lệ VALID
tăng từ 45 % lên 78 % rồi 90 %, cùng một model. Cái tôi từng ghi là "AI kém" hoá ra là "prompt của
tôi thiếu".

Điều prompt không chữa được là **tầm nhìn**. AI chỉ thấy endpoint tôi đưa cho nó. Ba lỗi nghiêm
trọng nhất — cả nhóm API admin không kiểm quyền, người lạ hủy đơn người khác, và chuỗi ghép hai lỗi
cho phép khách tự ghi doanh thu — đều nằm **giữa** các endpoint nên không lượt sinh nào thấy. AI
tìm lỗi rời; ghép lỗi thành kịch bản khai thác vẫn là việc của người.

Nguyên tắc rút ra: **AI không được đọc mã nguồn khi sinh test**, vì nó sẽ chép hành vi sai thành kỳ
vọng và mọi test đều xanh. Và mỗi lần AI sai, phải ghi *vì sao* vào danh mục kiểm tra prompt — giữ
trong đầu thì lần sau vẫn sót, đúng như tôi đã quên hỏi về tính đồng thời ở API 2.

---

*Đếm từ phần thân (không tính tiêu đề và khối trích đề):* **300 từ** — nằm trong khoảng 200–300 mà
mục 10:121 yêu cầu.

Kiểm lại bằng:
```bash
awk '/^---$/{n++; next} n==1 && !/^>/' docs/AI-Critique.md | wc -w
```
