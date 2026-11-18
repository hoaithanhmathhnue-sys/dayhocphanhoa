# MathDiff 5 AI — Điều phối Dạy học Phân hóa Toán 5 Implementation Plan

> **REQUIRED:** Follow TDD for every task. No production code without failing test first.

**Goal:** Xây dựng Web App "MathDiff 5 AI" hỗ trợ giáo viên tổ chức hoạt động dạy học phân hóa môn Toán lớp 5 (Kết nối tri thức) trên lớp học với 1 máy tính GV + Màn hình tương tác/Tivi, tích hợp Gemini API / Agent Platform API và nạp sẵn kịch bản Bài 21 "So sánh các số thập phân".
**Stack:** React 19 + TypeScript + Vite 6 + Tailwind CSS + Lucide React + `@google/genai` + Vitest (Vercel Ready)
**Passing score target:** 75% cho trạm luyện tập phân hóa

---

## Danh sách các hạng mục triển khai

- [x] **Task 1: Khởi tạo cấu trúc dự án chuẩn GitHub & Vercel**
  - Files: `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `.gitignore`, `index.html`, `src/index.css`
  - Tài nguyên hình ảnh trích từ `Biện pháp 3.docx`:
    - `public/images/cau-long-bien.png`
    - `public/images/cau-an-dong.png`
    - `public/images/cau-can-tho.png`

- [x] **Task 2 (TDD): Quản lý API Key & Phân tách Provider (`Gemini API` / `Agent Platform API`)**
  - Test file: `src/__tests__/apiKeyManager.test.ts`
  - Impl file: `src/services/apiKeyManager.ts`
  - Yêu cầu chuẩn `api.md`:
    - Chấp nhận cả `AIzaSy...` / `AIza...` và `AQ...`
    - Tách biệt hoàn toàn `gemini_api_key` và `agent_platform_api_key`
    - Di trú `localStorage` sang `gemini_model_id_v38`, xóa `GEMINI_MODEL_ID`
    - Cooldown khi `QUOTA_EXCEEDED` / `RATE_LIMIT`, không đánh dấu invalid khi `503`

- [x] **Task 3 (TDD): Dịch vụ Gemini AI & Cơ chế Fallback tự động**
  - Test file: `src/__tests__/geminiConfig.test.ts`
  - Impl file: `src/services/geminiService.ts`
  - Yêu cầu chuẩn `api.md`:
    - Model mặc định `gemini-3.8-flash` + chuỗi fallback chuẩn
    - `createGoogleAiClient` duy nhất, không dùng chữ "Vertex AI Express"
    - `ThinkingLevel.MEDIUM` cho tạo kịch bản bài học, `ThinkingLevel.LOW` cho câu hỏi ứng biến nhanh & `validateApiKey`
    - Không truyền `temperature`/`topP`/`topK` cho `gemini-3*`
    - Phân loại lỗi `parseApiError` kiểm tra `API_KEY_INVALID` trước `400`
    - Sự kiện `fallbackNotice` tự xóa khi hoàn tất (`done`)

- [x] **Task 4 (TDD): Mô hình Dữ liệu Phân hóa 3 Trạm, Chấm điểm XP & Bài 21 Mẫu**
  - Test file: `src/__tests__/differentiatedLesson.test.ts`
  - Impl files: `src/types/education.ts`, `src/utils/scoring.ts`, `src/data/sampleLessons.ts`
  - Nội dung chuẩn SGK Toán 5 Kết nối tri thức:
    - Bài 21: *So sánh các số thập phân* (Cầu Long Biên 2,29 km; Cầu An Đông 3,5 km; Cầu Cần Thơ 2,75 km)
    - Bài 19: *Làm tròn số thập phân* & Bài 22: *Cộng hai số thập phân*
    - 3 Trạm không gắn nhãn cố định: 🌱 Trạm Khởi Hành, 🚀 Trạm Tăng Tốc, 🌟 Trạm Bứt Phá

- [x] **Task 5: Xây dựng Hệ thống Giao diện Tương tác tối ưu Màn hình Tivi / Bảng tương tác**
  - `src/components/Header.tsx`: Chọn bài học, bật/tắt Chế độ Tivi chữ lớn, mở Cài đặt API Key
  - `src/components/ApiKeyModal.tsx`: Chọn Gemini API / Agent Platform API, chọn model, kiểm tra key trực tiếp
  - `src/components/VisitCounter.tsx`: Đếm lượt truy cập server-side (`counterapi.dev`) + cá nhân
  - `src/components/tabs/ClassStationTab.tsx` *(ClassDojo)*: Quản lý 24 HS lớp 5A, đổi trạm linh hoạt 1-click, thưởng huy hiệu, vòng quay gọi HS theo trạm lên bảng
  - `src/components/tabs/AiLessonStudioTab.tsx` *(Classroom + Gemini)*: Tạo kịch bản phân hóa 3 trạm bằng AI + bước GV thẩm định/chỉnh sửa trước khi phát
  - `src/components/tabs/LiveActivityTab.tsx` *(Nearpod + Quizizz)*: Trình chiếu tình huống 3 cây cầu, đồng hồ thảo luận, 3 cột nhiệm vụ phân hóa (Bảng tách phần nguyên/thập phân, Gợi ý từng bước không lộ đáp án, Trục số tương tác kéo/chạm) + Live Dashboard theo dõi tiến độ nhóm/HS real-time
  - `src/components/tabs/SolutionBoardTab.tsx` *(Padlet)*: Bức tường đa cách giải (so sánh phần nguyên, đổi ra mét, trục số, phân tích lỗi sai mẫu) + bình chọn sao + AI gợi ý câu hỏi khai thác sâu
  - `src/components/tabs/AdaptivePracticeTab.tsx` *(AI Live Co-pilot + Quiz 3 Trạm)*: Nút AI ứng biến nóng theo diễn biến lớp học + Hộp chuẩn hóa quy tắc + Bài tập tương tác 3 mức độ có giải thích chi tiết (`explanation`)

- [x] **Task 6: Kiểm thử toàn diện & Sẵn sàng Deploy Vercel**
  - Chạy `npm test` (100% pass)
  - Chạy `npx tsc --noEmit` (exit 0)
  - Chạy `npm run build` (exit 0)
  - Tạo `README.md` hướng dẫn đẩy lên GitHub và deploy Vercel
