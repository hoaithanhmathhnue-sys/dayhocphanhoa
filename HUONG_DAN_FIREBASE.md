# Hướng dẫn kết nối Firebase cho chức năng "Giao bài online"

Phần **dạy học trên lớp (5 bước)** chạy không cần Firebase. Chỉ chức năng **Giao bài online** (giáo viên giao bài về nhà, học sinh làm bài bằng mã lớp và mã PIN) mới cần làm các bước dưới đây. Làm một lần, khoảng 20 phút. Cách cài này dùng gói **Spark miễn phí** và chạy được lâu dài (cả năm học), không bị khoá sau 30 ngày.

## Bước 1. Tạo dự án Firebase

1. Vào <https://console.firebase.google.com>, đăng nhập bằng tài khoản Google của nhà trường hoặc của thầy/cô.
2. Bấm **Create a project** (Tạo dự án), đặt tên, ví dụ `mathdiff5-truong-abc`. Có thể tắt Google Analytics.
3. Giữ gói **Spark (miễn phí)**. Chức năng này **không dùng Firebase Storage**, nên không cần nâng lên gói Blaze.

## Bước 2. Bật đăng nhập

Vào **Build → Authentication → Get started → Sign-in method**, bật **hai** phương thức:

- **Google**: dành cho giáo viên. Chọn email hỗ trợ rồi bấm Save.
- **Email/Password**: dành cho tài khoản học sinh do ứng dụng tự tạo. Chỉ bật dòng đầu "Email/Password", **không** bật "Email link".

Sau đó vào tab **Settings → Authorized domains → Add domain**, thêm tên miền của ứng dụng:

- `dayhocphanhoatoan5.vercel.app`
- Nếu có tên miền khác, thêm cả tên miền đó.

## Bước 3. Tạo Firestore ở chế độ production

1. Vào **Build → Firestore Database → Create database**.
2. Chọn vị trí `asia-southeast1 (Singapore)`. Vị trí **không đổi được** sau khi tạo.
3. Chọn **Start in production mode** (không chọn test mode, vì test mode tự khoá sau 30 ngày).
4. Mở tab **Rules**, xoá hết nội dung có sẵn, dán toàn bộ nội dung tệp [`firestore.rules`](firestore.rules) trong mã nguồn, rồi bấm **Publish**.

Luật này không có hạn dùng. Nó bảo đảm:

- học sinh không tự nâng quyền thành giáo viên;
- học sinh không đọc được đáp án trước khi nộp và chỉ nộp được một lần;
- học sinh không xem được bài của bạn và không sửa được điểm;
- mỗi giáo viên chỉ thấy lớp và bài của mình.

Ứng dụng chỉ dùng truy vấn dạng "bằng", nên **không cần tạo chỉ mục (index)**.

## Bước 4. Lấy cấu hình web

1. Vào **Project settings** (biểu tượng bánh răng) → mục **Your apps** → bấm biểu tượng `</>` (Web) → đặt tên ứng dụng → **Register app**. Không cần bật Hosting.
2. Firebase hiện một đoạn `firebaseConfig`. Ghi lại các giá trị `apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`, `storageBucket`.

Các giá trị này là cấu hình công khai của ứng dụng web, không phải mật khẩu. Dữ liệu được bảo vệ bằng luật Firestore ở Bước 3.

## Bước 5. Khai báo trên Vercel

1. Vào <https://vercel.com>, mở dự án của ứng dụng → **Settings → Environment Variables**.
2. Thêm các biến sau, mỗi biến một dòng, áp dụng cho môi trường **Production**:

| Tên biến | Giá trị lấy từ |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |

3. Vào tab **Deployments**, bấm ⋯ ở bản mới nhất → **Redeploy**. Biến môi trường chỉ có hiệu lực sau khi triển khai lại.

## Bước 6. Kiểm tra

1. Mở ứng dụng → bấm **Giao bài online** → **Đăng nhập bằng Google**.
2. Tạo lớp thử, thêm 1–2 học sinh thử, in phiếu PIN.
3. Mở cửa sổ ẩn danh, vào `https://dayhocphanhoatoan5.vercel.app/#/hoc-sinh`, đăng nhập bằng phiếu vừa in, làm bài, nộp bài.
4. Quay lại trang giáo viên, xem kết quả, chấm thử câu tự luận.

## Cách dùng hằng ngày

- **Giáo viên**: nút **Giao bài online** trên thanh tiêu đề, hoặc vào thẳng `.../#/giao-bai`.
- **Học sinh**: vào `.../#/hoc-sinh`, nhập mã lớp, số thứ tự và mã PIN 6 số trên phiếu.
- **Mã PIN chỉ hiện một lần** khi tạo (hệ thống không lưu PIN). Nếu học sinh quên, bấm **Cấp lại PIN**: học sinh nhận phiếu mới, PIN cũ không dùng được nữa.
- **Mỗi học sinh nhận bộ câu trắc nghiệm của trạm mình**. Đổi trạm ở thẻ "Lớp học & PIN". Câu tự luận dùng chung cả lớp.
- **Nộp một lần.** Muốn cho học sinh làm lại, giáo viên bấm **Cho làm lại** ở bài của em đó.
- **Lưu trữ**: cuối mỗi đợt, bấm **Xuất bảng điểm (CSV)** để lưu kết quả về máy. Tệp CSV mở được bằng Excel.

## Giới hạn của gói miễn phí

Theo quy định của Firebase tại thời điểm viết, cần kiểm tra lại trên trang Firebase khi dùng:

- Firestore khoảng 50.000 lượt đọc và 20.000 lượt ghi mỗi ngày, lưu trữ 1 GB. Như vậy đủ cho vài lớp làm bài hằng ngày.
- Firebase giới hạn **số tài khoản tạo mới trong một giờ từ cùng một địa chỉ mạng**. Nếu tạo nhiều lớp liền nhau mà gặp thông báo "tạm giới hạn", hãy chờ khoảng 1 giờ rồi thêm tiếp. Những học sinh đã tạo xong vẫn được giữ.

## Dành cho người phát triển

- Chạy thử trên máy với bộ giả lập: cài Java 11+, chạy `npx firebase emulators:start --only firestore,auth --project demo-mathdiff5`. Tạo tệp `.env.emulator.local` có `VITE_USE_EMULATORS=1` và các biến `VITE_FIREBASE_*` giả, rồi chạy `npx vite --mode emulator`.
- Kiểm thử luật bảo mật: `npm run test:rules` (15 tình huống trong `tests-rules/`).
- Nếu đường dẫn thư mục có dấu tiếng Việt, Java không đọc được tệp luật. Khi đó, chạy bộ giả lập ở một thư mục không dấu (chép `firebase.json` và `firestore.rules` sang), rồi chạy test với biến `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
