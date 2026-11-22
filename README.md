# MathDiff 5 AI — Điều Phối Dạy Học Phân Hóa Toán 5 (Kết Nối Tri Thức)

Ứng dụng Web hỗ trợ giáo viên thực hiện **Biện pháp 3: Vận dụng trí tuệ nhân tạo hỗ trợ tổ chức hoạt động dạy học phân hóa trên lớp** (Môn Toán lớp 5 — Bộ sách *Kết nối tri thức với cuộc sống*), được thiết kế tối ưu cho lớp học có **1 Máy tính Giáo viên + Màn hình tương tác / Tivi thông minh**.

---

## 🌟 Tính năng nổi bật (Hợp nhất 5 nền tảng vào 1 quy trình 5 Bước)

1. **Bước 1 — Quản lý Lớp & Phân Trạm Linh Hoạt *(Cảm hứng ClassDojo)***:
   - Chia lớp vào 3 Trạm mang tên tích cực tránh mặc cảm: 🌱 **Trạm Khởi Hành**, 🚀 **Trạm Tăng Tốc**, 🌟 **Trạm Bứt Phá**.
   - Điều chuyển Trạm linh hoạt 1-click ngay trong tiết học, thưởng Huy hiệu nỗ lực và gọi ngẫu nhiên đại diện từng Trạm lên Màn hình Tivi.
2. **Bước 2 — Xưởng AI Thiết kế & Bàn Thẩm định Giáo viên *(Classroom + Gemini)***:
   - Tích hợp `gemini-3.8-flash` (kèm cơ chế tự động fallback chống lỗi quá tải `503`) và hỗ trợ cả **Gemini API** lẫn **Agent Platform API**.
   - Có bước **Giáo viên kiểm duyệt & chỉnh sửa** trước khi chiếu nhiệm vụ lên màn hình lớp.
3. **Bước 3 — Sân khấu Tình huống, Học cụ Cảm ứng & Live Dashboard *(Nearpod + Quizizz)***:
   - Nạp sẵn kịch bản **Bài 21: So sánh các số thập phân** cùng hình ảnh thực tế 3 cây cầu (*Cầu Long Biên 2,29 km; Cầu An Đông 3,5 km; Cầu Cần Thơ 2,75 km*).
   - Tích hợp học cụ cảm ứng theo từng Trạm: **Bảng tách hàng số thập phân**, **Sắp xếp thứ tự**, **Trục số tương tác**, **Hộp gợi ý mở khóa từng bước (không lộ đáp án)** và **Live Dashboard** theo dõi tiến độ real-time.
4. **Bước 4 — Bức Tường Đa Cách Giải *(Padlet)***:
   - Ghi nhận các hướng giải khác nhau (so sánh phần nguyên, đổi sang mét, trục số, phân tích nhầm lẫn thường gặp) và nhờ AI gợi ý câu hỏi thảo luận sâu.
5. **Bước 5 — Trợ lý "AI Ứng Biến Nóng" & Đấu trường Luyện tập 3 Trạm**:
   - 1-Click tạo câu hỏi gỡ rối lỗi sai hoặc thử thách *"Nếu thay đổi dữ kiện..."* cho học sinh hoàn thành sớm; làm bài trắc nghiệm phân hóa trực tiếp trên bảng Tivi có giải thích chi tiết.

---

## 📮 Giao bài online (phân quyền Giáo viên / Học sinh)

Ngoài phần dạy trên lớp (không cần đăng nhập), ứng dụng có thêm chức năng **giao bài tập về nhà**:

- **Giáo viên** (`#/giao-bai`) đăng nhập Google → tạo lớp (mã lớp 6 kí tự) → thêm học sinh, ứng dụng tự cấp **mã PIN 6 số** và in phiếu đăng nhập → giao bài trắc nghiệm **theo trạm** (nạp sẵn từ bài học, tự soạn hoặc nhờ AI tạo rồi duyệt) kèm câu tự luận → xem bảng điểm, chấm tự luận, nhận xét, cho làm lại, xuất CSV.
- **Học sinh** (`#/hoc-sinh`) đăng nhập bằng mã lớp + số thứ tự + PIN, chỉ thấy bộ câu của trạm mình, nộp một lần, xem đáp án và lời giải thích sau khi nộp, xem nhận xét của giáo viên.
- Dữ liệu lưu trên **Firebase (Authentication + Firestore, gói Spark miễn phí)**; phân quyền bằng [`firestore.rules`](firestore.rules) (vai trò không lưu trong dữ liệu nên không tự nâng quyền được; đáp án tách riêng, HS chỉ đọc sau khi nộp).
- Cài đặt: xem **[HUONG_DAN_FIREBASE.md](HUONG_DAN_FIREBASE.md)**. Kiểm thử luật bảo mật: `npm run test:rules` (cần Java 11+).

---

## 🚀 Hướng dẫn Đưa lên GitHub & Deploy qua Vercel.com

### 1. Chạy thử trên máy cá nhân
```bash
npm install
npm run dev
```

### 2. Đẩy mã nguồn lên GitHub
```bash
git init
git add .
git commit -m "feat: khoi tao web app MathDiff 5 AI day hoc phan hoa Toan 5"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/<ten-repo>.git
git push -u origin main
```

### 3. Deploy lên Vercel (1 phút)
1. Truy cập [vercel.com](https://vercel.com) → bấm **Add New...** → **Project**.
2. Chọn kho lưu trữ (Repository) vừa tạo trên GitHub → bấm **Import**.
3. Framework Preset sẽ tự động nhận diện là **Vite** (`Build Command: npm run build`, `Output Directory: dist`).
4. *(Tuỳ chọn)* Mở mục **Environment Variables** nếu muốn cài sẵn key hệ thống:
   - `VITE_GEMINI_API_KEYS`: nhập 1 hoặc nhiều key cách nhau bởi dấu phẩy (hoặc bỏ trống để giáo viên tự nhập trực tiếp qua nút **Cấu hình API Key** trên giao diện web).
5. Bấm **Deploy** và sử dụng đường link chính thức ngay trên lớp học!
