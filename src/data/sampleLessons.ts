import type { DifferentiatedLesson, Student } from '../types/education';

/**
 * Kịch bản mẫu trọng tâm trích xuất chính xác 100% từ văn bản Biện pháp 3.docx:
 * Bài 21: “So sánh các số thập phân” — Toán 5, bộ Kết nối tri thức với cuộc sống
 */
export const LESSON_21_DECIMAL_COMPARE: DifferentiatedLesson = {
  id: 'bai-21-so-sanh-so-thap-phan',
  lessonCode: 'Bài 21',
  title: 'So sánh các số thập phân',
  textbook: 'Toán 5 — Kết nối tri thức với cuộc sống',
  topic: 'Chủ đề 4: Số thập phân',
  objectives: [
    'Nắm được quy tắc so sánh hai số thập phân (so sánh phần nguyên trước, sau đó so sánh từng hàng phần thập phân từ trái sang phải).',
    'Biết so sánh và sắp xếp các số thập phân theo thứ tự từ bé đến lớn hoặc từ lớn đến bé.',
    'Vận dụng giải quyết tình huống thực tiễn (so sánh chiều dài các cây cầu nổi tiếng Việt Nam) và phát triển năng lực lập luận toán học.',
  ],
  centralQuestion:
    'Cầu Long Biên dài 2,29 km; Cầu An Đông dài 3,5 km; Cầu Cần Thơ dài 2,75 km. Cây cầu nào dài nhất?',
  contextStory:
    'Đất nước Việt Nam có nhiều cây cầu đẹp gắn liền với lịch sử và sự phát triển của các vùng miền. Quan sát thông tin chiều dài của ba cây cầu dưới đây, theo các em: Nếu muốn biết cây cầu nào dài nhất, chúng ta cần làm gì?',
  situationItems: [
    {
      id: 'cau-long-bien',
      title: 'Cầu Long Biên',
      location: 'Thủ đô Hà Nội',
      valueLabel: '2,29 km',
      numericValue: 2.29,
      unit: 'km',
      imageUrl: '/images/cau-long-bien.png',
      accentColor: 'amber',
    },
    {
      id: 'cau-an-dong',
      title: 'Cầu An Đông',
      location: 'Tỉnh Ninh Thuận',
      valueLabel: '3,5 km',
      numericValue: 3.5,
      unit: 'km',
      imageUrl: '/images/cau-an-dong.png',
      accentColor: 'sky',
    },
    {
      id: 'cau-can-tho',
      title: 'Cầu Cần Thơ',
      location: 'Vùng Tây Nam Bộ',
      valueLabel: '2,75 km',
      numericValue: 2.75,
      unit: 'km',
      imageUrl: '/images/cau-can-tho.png',
      accentColor: 'indigo',
    },
  ],
  stationTasks: {
    'khoi-hanh': {
      station: 'khoi-hanh',
      stationName: 'Trạm Khởi Hành',
      subtitle: 'Khám phá trực quan qua bảng tách phần nguyên & phần thập phân',
      corePrompt:
        'Em hãy quan sát chiều dài 3 cây cầu (2,29 km; 3,5 km; 2,75 km), điền phần nguyên của từng số vào bảng trực quan và cho biết cây cầu nào dài nhất.',
      progressiveHints: [
        'Gợi ý bước 1: Em hãy nhìn chữ số đứng TRƯỚC dấu phẩy của ba số 2,29; 3,5 và 2,75. Phần nguyên của mỗi số là bao nhiêu?',
        'Gợi ý bước 2: Khi phần nguyên của hai số thập phân khác nhau (số 3 và số 2), em có thể dựa ngay vào phần nguyên để so sánh độ lớn không?',
        'Gợi ý bước 3: Tiếp theo, với hai số có cùng phần nguyên là 2 (2,29 và 2,75), em hãy nhìn chữ số đầu tiên sau dấu phẩy (hàng phần mười) để xem cầu nào dài hơn nhé!',
      ],
      expectedProduct:
        'Xác định đúng phần nguyên của 3 số và nêu được cây cầu dài nhất nhờ so sánh phần nguyên.',
      teacherGuidance:
        'Dùng bảng tách hàng trực quan trên màn hình để dẫn dắt từng bước; tuyệt đối không nói ngay đáp án Cầu An Đông.',
      interactiveWidget: 'place-value-table',
    },
    'tang-toc': {
      station: 'tang-toc',
      stationName: 'Trạm Tăng Tốc',
      subtitle: 'Tự đề xuất cách so sánh & sắp xếp thứ tự ba cây cầu',
      corePrompt:
        'Nhóm hãy tự thảo luận đề xuất cách so sánh ba số 2,29; 3,5; 2,75 để tìm cây cầu dài nhất, sau đó sắp xếp cả 3 cây cầu theo thứ tự từ dài nhất đến ngắn nhất và giải thích vì sao.',
      progressiveHints: [
        'Gợi ý 1: Sau khi tìm được số có phần nguyên lớn nhất, hai số còn lại đều có phần nguyên bằng 2. Nhóm sẽ so sánh tiếp chữ số ở hàng nào?',
        'Gợi ý 2: Hãy viết rõ lời giải thích từng bước để chuẩn bị bảo vệ cách làm trước lớp nhé!',
      ],
      expectedProduct:
        'Giải thích rõ: 3,5 > 2,75 > 2,29 (so sánh phần nguyên trước, cùng phần nguyên thì so sánh hàng phần mười 7 > 2).',
      teacherGuidance:
        'Khuyến khích học sinh tự trình bày lập luận bằng lời và phản biện lẫn nhau trong nhóm.',
      interactiveWidget: 'symbol-compare',
    },
    'but-pha': {
      station: 'but-pha',
      stationName: 'Trạm Bứt Phá',
      subtitle: 'Kiểm chứng bằng nhiều cách khác nhau & Biểu diễn trên trục số',
      corePrompt:
        'Ngoài cách so sánh phần nguyên, nhóm hãy tìm thêm ít nhất 1 cách khác để kiểm chứng kết quả (ví dụ: đổi đơn vị đo hoặc đặt vị trí 3 số 2,29; 2,75; 3,5 lên trục số tương tác và giải thích vị trí của chúng).',
      progressiveHints: [
        'Gợi ý mở rộng 1: 1 km bằng bao nhiêu mét? Nếu đổi 2,29 km; 3,5 km và 2,75 km ra đơn vị mét (m) thì bài toán trở thành so sánh loại số quen thuộc nào?',
        'Gợi ý mở rộng 2: Trên tia số nằm ngang từ 2 đến 4, số nằm bên phải so với số nằm bên trái có quan hệ lớn hơn hay bé hơn?',
      ],
      expectedProduct:
        'Đưa ra được 2–3 phương án kiểm chứng (so sánh hàng số thập phân, đổi sang mét: 3500 m > 2750 m > 2290 m, biểu diễn đúng vị trí trên trục số).',
      teacherGuidance:
        'Mời nhóm đăng các cách giải khác nhau lên Bức tường Đa Cách Giải để dẫn dắt Bước 4 cho cả lớp.',
      interactiveWidget: 'number-line',
    },
  },
  coreRules: [
    {
      stepNumber: 1,
      title: 'So sánh phần nguyên trước',
      content:
        'Trong hai số thập phân có phần nguyên khác nhau, số thập phân nào có phần nguyên lớn hơn thì số đó lớn hơn.',
      example: '3,5 > 2,75 (vì phần nguyên 3 > 2)',
    },
    {
      stepNumber: 2,
      title: 'Phần nguyên bằng nhau → So sánh lần lượt từng hàng phần thập phân',
      content:
        'Nếu phần nguyên của hai số thập phân bằng nhau, ta so sánh chữ số ở hàng phần mười; nếu bằng nhau tiếp tục so sánh hàng phần trăm, hàng phần nghìn... từ trái sang phải.',
      example: '2,75 > 2,29 (phần nguyên cùng bằng 2; ở hàng phần mười có 7 > 2)',
    },
    {
      stepNumber: 3,
      title: 'Hai số thập phân bằng nhau',
      content:
        'Nếu phần nguyên và các chữ số ở từng hàng của phần thập phân đều bằng nhau thì hai số thập phân đó bằng nhau (viết thêm chữ số 0 vào bên phải phần thập phân không làm thay đổi giá trị).',
      example: '3,5 = 3,50 = 3,500',
    },
  ],
  initialBoardPosts: [
    {
      id: 'post-b21-1',
      authorName: 'Đại diện Trạm Khởi Hành & Tăng Tốc',
      station: 'tang-toc',
      methodTitle: 'Cách 1: So sánh phần nguyên rồi đến hàng phần mười',
      content:
        'Ta thấy 3,5 có phần nguyên là 3; còn 2,29 và 2,75 có phần nguyên là 2. Vì 3 > 2 nên 3,5 lớn nhất (Cầu An Đông dài nhất). So sánh tiếp 2,75 và 2,29 có hàng phần mười 7 > 2 nên 2,75 > 2,29.',
      stars: 6,
      isMisconception: false,
      teacherComment: 'Nhanh gọn, đi thẳng vào quy tắc trọng tâm của bài học!',
      createdAt: 'Hoạt động Khám phá',
    },
    {
      id: 'post-b21-2',
      authorName: 'Nhóm 1 — Trạm Bứt Phá',
      station: 'but-pha',
      methodTitle: 'Cách 2: Chuyển đổi đơn vị từ ki-lô-mét (km) sang mét (m)',
      content:
        'Đổi: 2,29 km = 2290 m; 3,5 km = 3500 m; 2,75 km = 2750 m. Vì 3500 m > 2750 m > 2290 m nên Cầu An Đông (3,5 km) dài nhất, tiếp đến là Cầu Cần Thơ (2,75 km) và Cầu Long Biên (2,29 km).',
      stars: 8,
      isMisconception: false,
      teacherComment: 'Liên hệ rất tốt với kiến thức đổi đơn vị đo độ dài và so sánh số tự nhiên!',
      createdAt: 'Hoạt động Khám phá',
    },
    {
      id: 'post-b21-3',
      authorName: 'Nhóm 2 — Trạm Bứt Phá',
      station: 'but-pha',
      methodTitle: 'Cách 3: Biểu diễn vị trí ba số trên trục số',
      content:
        'Trên tia số từ 2 km đến 4 km: điểm 2,29 và 2,75 nằm trong khoảng từ 2 đến 3; còn điểm 3,5 nằm ở chính giữa 3 và 4 (xa nhất về phía bên phải) nên 3,5 là số lớn nhất.',
      stars: 7,
      isMisconception: false,
      teacherComment: 'Cách biểu diễn trực quan tuyệt vời giúp nhìn thấy ngay độ lớn của các số!',
      createdAt: 'Hoạt động Khám phá',
    },
    {
      id: 'post-b21-misconception',
      authorName: 'Tình huống gợi mở thảo luận',
      station: 'khoi-hanh',
      methodTitle: '🤔 Thử tài phát hiện nhầm lẫn: 2,29 có lớn hơn 3,5 không?',
      content:
        'Có một bạn nhỏ suy nghĩ rằng: "Số 2,29 có tận 3 chữ số (và 29 > 5), còn số 3,5 chỉ có 2 chữ số nên 2,29 > 3,5". Theo các em, bạn ấy đã nhầm ở điểm nào?',
      stars: 5,
      isMisconception: true,
      teacherComment: 'Câu hỏi vàng giúp cả lớp khắc sâu: Không đếm số lượng chữ số như số tự nhiên!',
      createdAt: 'Câu hỏi thảo luận GV',
    },
  ],
  practiceQuestions: [
    {
      id: 'b21-kh-1',
      station: 'khoi-hanh',
      text: 'Điền dấu thích hợp vào chỗ chấm: 4,8 ... 3,95',
      type: 'multiple-choice',
      options: ['4,8 > 3,95', '4,8 < 3,95', '4,8 = 3,95', 'Không so sánh được'],
      correctAnswer: '4,8 > 3,95',
      explanation:
        'Hai số thập phân có phần nguyên khác nhau: phần nguyên của 4,8 là 4; phần nguyên của 3,95 là 3. Vì 4 > 3 nên 4,8 > 3,95 (không phụ thuộc số chữ số ở phần thập phân).',
      hint: 'Em hãy so sánh phần nguyên đứng trước dấu phẩy (4 và 3) trước nhé!',
      difficulty: 1,
    },
    {
      id: 'b21-kh-2',
      station: 'khoi-hanh',
      text: 'Trong các số thập phân: 1,85; 5,2; 3,14 — số nào lớn nhất?',
      type: 'multiple-choice',
      options: ['1,85', '5,2', '3,14', 'Ba số bằng nhau'],
      correctAnswer: '5,2',
      explanation:
        'So sánh phần nguyên của ba số: 1, 5 và 3. Vì 5 lớn nhất nên 5,2 là số thập phân lớn nhất.',
      hint: 'Nhìn vào phần nguyên của mỗi số: 1; 5; 3.',
      difficulty: 1,
    },
    {
      id: 'b21-kh-3',
      station: 'khoi-hanh',
      text: 'Hai số thập phân 6,4 và 6,40 có quan hệ như thế nào?',
      type: 'multiple-choice',
      options: ['6,4 < 6,40', '6,4 > 6,40', '6,4 = 6,40', '6,40 lớn gấp 10 lần 6,4'],
      correctAnswer: '6,4 = 6,40',
      explanation:
        'Khi viết thêm chữ số 0 vào bên phải phần thập phân của một số thập phân thì được một số thập phân bằng nó: 6,4 = 6,40.',
      hint: 'Phần nguyên đều là 6, hàng phần mười đều là 4, hàng phần trăm của 6,4 cũng chính là 0.',
      difficulty: 1,
    },
    {
      id: 'b21-tt-1',
      station: 'tang-toc',
      text: 'So sánh hai số thập phân có cùng phần nguyên: 2,29 và 2,75',
      type: 'multiple-choice',
      options: ['2,29 > 2,75', '2,29 < 2,75', '2,29 = 2,75', 'Chưa đủ dữ kiện'],
      correctAnswer: '2,29 < 2,75',
      explanation:
        'Hai số có cùng phần nguyên là 2. Ta so sánh chữ số ở hàng phần mười: 2 < 7 nên 2,29 < 2,75.',
      hint: 'Phần nguyên cùng bằng 2 rồi, em hãy so sánh chữ số ngay sau dấu phẩy (hàng phần mười).',
      difficulty: 2,
    },
    {
      id: 'b21-tt-2',
      station: 'tang-toc',
      text: 'Sắp xếp các số thập phân 7,38; 7,8; 7,309; 7,39 theo thứ tự từ BÉ đến LỚN:',
      type: 'multiple-choice',
      options: [
        '7,309 ; 7,38 ; 7,39 ; 7,8',
        '7,8 ; 7,38 ; 7,39 ; 7,309',
        '7,38 ; 7,39 ; 7,309 ; 7,8',
        '7,309 ; 7,39 ; 7,38 ; 7,8',
      ],
      correctAnswer: '7,309 ; 7,38 ; 7,39 ; 7,8',
      explanation:
        'Cả 4 số có cùng phần nguyên là 7. Xét hàng phần mười: 7,8 có chữ số 8 lớn nhất. Ba số còn lại cùng hàng phần mười là 3 → xét hàng phần trăm: 0 < 8 < 9 nên 7,309 < 7,38 < 7,39 < 7,8.',
      hint: 'Cả 4 số đều có phần nguyên là 7. Hãy viết 7,8 thành 7,800 để dễ nhìn từng hàng từ trái sang phải nhé!',
      difficulty: 2,
    },
    {
      id: 'b21-tt-3',
      station: 'tang-toc',
      text: 'Chữ số x thích hợp để 5,6x8 > 5,679 là:',
      type: 'multiple-choice',
      options: ['x = 6', 'x = 7', 'x = 8 hoặc x = 9', 'x = 5'],
      correctAnswer: 'x = 8 hoặc x = 9',
      explanation:
        'Phần nguyên đều là 5, hàng phần mười đều là 6. Ở hàng phần nghìn có 8 < 9 nên nếu x = 7 thì 5,678 < 5,679. Vậy hàng phần trăm x phải lớn hơn 7, tức là x = 8 hoặc x = 9.',
      hint: 'Hãy thử kiểm tra cẩn thận trường hợp x = 7 xem 5,678 có lớn hơn 5,679 không nhé!',
      difficulty: 2,
    },
    {
      id: 'b21-bp-1',
      station: 'but-pha',
      text: 'Tìm một độ dài cây cầu (viết dưới dạng số thập phân gọn nhất) nằm giữa Cầu Long Biên (2,29 km) và Cầu Cần Thơ (2,75 km), đồng thời lớn hơn 2,7 km:',
      type: 'multiple-choice',
      options: ['2,295 km', '2,68 km', '2,72 km', '2,755 km'],
      correctAnswer: '2,72 km',
      explanation:
        'Số cần tìm phải vừa lớn hơn 2,7 (tức 2,70) vừa bé hơn 2,75. Trong 4 phương án, chỉ có 2,72 thỏa mãn 2,70 < 2,72 < 2,75.',
      hint: 'Viết 2,7 thành 2,70 để tìm số nằm giữa 2,70 và 2,75 nhé!',
      difficulty: 3,
    },
    {
      id: 'b21-bp-2',
      station: 'but-pha',
      text: 'Trong giải chạy 60 m lớp 5A: Hùng chạy hết 9,42 giây; Minh hết 9,38 giây; Khoa hết 9,4 giây. Bạn nào chạy NHANH NHẤT (về đích đầu tiên)?',
      type: 'multiple-choice',
      options: ['Bạn Hùng (9,42 giây)', 'Bạn Minh (9,38 giây)', 'Bạn Khoa (9,4 giây)', 'Hùng và Khoa bằng nhau'],
      correctAnswer: 'Bạn Minh (9,38 giây)',
      explanation:
        'Cẩn thận bẫy thực tế! Trong thi chạy cùng quãng đường, ai hết ÍT thời gian hơn thì người đó chạy NHANH hơn. Ta có 9,38 < 9,40 < 9,42 nên bạn Minh (9,38 giây) về đích đầu tiên!',
      hint: 'Trong cuộc thi chạy, người về nhất là người có số giây lớn nhất hay bé nhất nhỉ?',
      difficulty: 3,
    },
    {
      id: 'b21-bp-3',
      station: 'but-pha',
      text: 'Có bao nhiêu số thập phân có HAI chữ số ở phần thập phân mà lớn hơn 2,5 và bé hơn 2,6?',
      type: 'multiple-choice',
      options: ['Không có số nào', '8 số', '9 số', '10 số'],
      correctAnswer: '9 số',
      explanation:
        'Viết 2,5 = 2,50 và 2,6 = 2,60. Các số có hai chữ số ở phần thập phân nằm giữa 2,50 và 2,60 là: 2,51; 2,52; 2,53; 2,54; 2,55; 2,56; 2,57; 2,58; 2,59 — có tất cả 9 số.',
      hint: 'Hãy đổi 2,5 thành 2,50 và 2,6 thành 2,60 rồi liệt kê thử nhé!',
      difficulty: 3,
    },
  ],
  passingScore: 75,
  isApprovedByTeacher: true,
};

export const LESSON_19_ROUNDING_DECIMALS: DifferentiatedLesson = {
  id: 'bai-19-lam-tron-so-thap-phan',
  lessonCode: 'Bài 19',
  title: 'Làm tròn số thập phân',
  textbook: 'Toán 5 — Kết nối tri thức với cuộc sống',
  topic: 'Chủ đề 4: Số thập phân',
  objectives: [
    'Làm tròn được một số thập phân đến số tự nhiên gần nhất hoặc đến hàng phần mười, hàng phần trăm.',
    'Vận dụng làm tròn số thập phân để ước lượng nhanh kết quả trong các tình huống thực tế.',
  ],
  centralQuestion:
    'Ba quả bưởi cân nặng lần lượt 1,24 kg; 1,5 kg và 1,78 kg. Nếu làm tròn đến số tự nhiên gần nhất thì mỗi quả nặng khoảng mấy ki-lô-gam?',
  contextStory:
    'Trong buổi hội chợ nông sản của trường Tiểu học, các bạn học sinh lớp 5A giúp bác nông dân ghi phiếu cân nặng ước lượng của các quả bưởi da xanh để dễ tính nhẩm.',
  situationItems: [
    {
      id: 'buoi-1',
      title: 'Quả bưởi thứ nhất',
      location: 'Gian hàng Tổ 1',
      valueLabel: '1,24 kg',
      numericValue: 1.24,
      unit: 'kg',
      accentColor: 'teal',
    },
    {
      id: 'buoi-2',
      title: 'Quả bưởi thứ hai',
      location: 'Gian hàng Tổ 2',
      valueLabel: '1,5 kg',
      numericValue: 1.5,
      unit: 'kg',
      accentColor: 'amber',
    },
    {
      id: 'buoi-3',
      title: 'Quả bưởi thứ ba',
      location: 'Gian hàng Tổ 3',
      valueLabel: '1,78 kg',
      numericValue: 1.78,
      unit: 'kg',
      accentColor: 'indigo',
    },
  ],
  stationTasks: {
    'khoi-hanh': {
      station: 'khoi-hanh',
      stationName: 'Trạm Khởi Hành',
      subtitle: 'Quan sát chữ số hàng phần mười để quyết định làm tròn lên hay giữ nguyên',
      corePrompt:
        'Em hãy tìm chữ số ở hàng phần mười của mỗi số 1,24; 1,5; 1,78 rồi làm tròn đến số tự nhiên gần nhất.',
      progressiveHints: [
        'Gợi ý 1: Khi làm tròn đến số tự nhiên gần nhất, ta nhìn vào chữ số ở hàng phần mười (ngay sau dấu phẩy).',
        'Gợi ý 2: Nếu chữ số hàng phần mười bé hơn 5 (0; 1; 2; 3; 4) thì giữ nguyên phần nguyên; nếu từ 5 trở lên (5; 6; 7; 8; 9) thì cộng thêm 1 vào phần nguyên.',
      ],
      expectedProduct: 'Làm tròn đúng: 1,24 → 1; 1,5 → 2; 1,78 → 2.',
      teacherGuidance: 'Tô màu chữ số hàng phần mười để học sinh không nhìn nhầm sang hàng phần trăm.',
      interactiveWidget: 'place-value-table',
    },
    'tang-toc': {
      station: 'tang-toc',
      stationName: 'Trạm Tăng Tốc',
      subtitle: 'Làm tròn đến số tự nhiên gần nhất và đến hàng phần mười',
      corePrompt:
        'Nhóm hãy làm tròn hai số 1,24 và 1,78 vừa đến số tự nhiên gần nhất, vừa đến hàng phần mười, rồi nêu quy tắc chung.',
      progressiveHints: [
        'Gợi ý: Muốn làm tròn đến hàng nào thì ta đối chiếu chữ số ngay bên phải hàng đó với số 5.',
      ],
      expectedProduct: 'Làm tròn đến hàng phần mười: 1,24 → 1,2; 1,78 → 1,8.',
      teacherGuidance: 'Yêu cầu học sinh đối chiếu sự khác nhau giữa làm tròn đến hàng đơn vị và hàng phần mười.',
      interactiveWidget: 'general',
    },
    'but-pha': {
      station: 'but-pha',
      stationName: 'Trạm Bứt Phá',
      subtitle: 'Truy tìm khoảng giá trị ban đầu từ số đã làm tròn',
      corePrompt:
        'Một quả dưa hấu có cân nặng (viết đến hàng phần mười) sau khi làm tròn đến số tự nhiên gần nhất thì được 3 kg. Đố nhóm tìm được tất cả các cân nặng có thể của quả dưa hấu đó!',
      progressiveHints: [
        'Gợi ý 1: Có thể là số lớn hơn 2 nhưng làm tròn lên 3, hoặc số lớn hơn 3 nhưng làm tròn xuống 3 không?',
      ],
      expectedProduct: 'Tìm được dãy: 2,5; 2,6; 2,7; 2,8; 2,9; 3,0; 3,1; 3,2; 3,3; 3,4 (kg).',
      teacherGuidance: 'Khuyến khích học sinh biểu diễn đoạn từ 2,5 đến 3,4 trên tia số.',
      interactiveWidget: 'number-line',
    },
  },
  coreRules: [
    {
      stepNumber: 1,
      title: 'Làm tròn đến số tự nhiên gần nhất',
      content: 'So sánh chữ số hàng phần mười với 5: bé hơn 5 thì giữ nguyên phần nguyên; lớn hơn hoặc bằng 5 thì tăng phần nguyên thêm 1 đơn vị rồi bỏ phần thập phân.',
      example: '1,24 → 1 (vì 2 < 5); 1,78 → 2 (vì 7 ≥ 5)',
    },
    {
      stepNumber: 2,
      title: 'Làm tròn đến hàng phần mười (hoặc phần trăm)',
      content: 'So sánh chữ số ngay bên phải hàng cần làm tròn với 5 để quyết định giữ nguyên hay cộng thêm 1 vào chữ số ở hàng làm tròn.',
      example: '1,78 làm tròn đến hàng phần mười được 1,8 (vì 8 ≥ 5)',
    },
  ],
  initialBoardPosts: [
    {
      id: 'post-b19-1',
      authorName: 'Đại diện Trạm Tăng Tốc',
      station: 'tang-toc',
      methodTitle: 'Mẹo nhớ nhanh "Mốc số 5"',
      content: 'Cứ xác định hàng cần giữ lại, khoanh tròn chữ số đứng ngay bên phải nó: dưới 5 giữ nguyên, từ 5 trở lên cộng 1!',
      stars: 5,
      createdAt: 'Hoạt động Khám phá',
    },
  ],
  practiceQuestions: [
    {
      id: 'b19-1',
      station: 'khoi-hanh',
      text: 'Làm tròn số 4,3 đến số tự nhiên gần nhất ta được:',
      type: 'multiple-choice',
      options: ['4', '5', '4,5', '3'],
      correctAnswer: '4',
      explanation: 'Chữ số hàng phần mười là 3 < 5 nên ta giữ nguyên phần nguyên là 4.',
      hint: 'Chữ số hàng phần mười là 3, bé hơn 5.',
      difficulty: 1,
    },
    {
      id: 'b19-2',
      station: 'tang-toc',
      text: 'Làm tròn số 12,468 đến hàng phần mười ta được:',
      type: 'multiple-choice',
      options: ['12,4', '12,5', '12,47', '12'],
      correctAnswer: '12,5',
      explanation: 'Hàng cần làm tròn là hàng phần mười (chữ số 4). Chữ số ngay bên phải là hàng phần trăm bằng 6 ≥ 5 nên làm tròn lên thành 12,5.',
      hint: 'Nhìn chữ số hàng phần trăm đứng ngay sau chữ số 4.',
      difficulty: 2,
    },
    {
      id: 'b19-3',
      station: 'but-pha',
      text: 'Số thập phân bé nhất có một chữ số ở phần thập phân mà khi làm tròn đến số tự nhiên gần nhất được 8 là:',
      type: 'multiple-choice',
      options: ['8,1', '7,9', '7,5', '7,4'],
      correctAnswer: '7,5',
      explanation: 'Với một chữ số ở phần thập phân, các số làm tròn thành 8 gồm 7,5; 7,6; ...; 8,4. Số bé nhất trong đó là 7,5.',
      hint: '7,4 làm tròn thành 7 mất rồi, vậy bắt đầu từ số nào sẽ làm tròn lên 8?',
      difficulty: 3,
    },
  ],
  passingScore: 75,
  isApprovedByTeacher: true,
};

export const LESSON_22_ADDING_DECIMALS: DifferentiatedLesson = {
  id: 'bai-22-phep-cong-so-thap-phan',
  lessonCode: 'Bài 22',
  title: 'Phép cộng hai số thập phân',
  textbook: 'Toán 5 — Kết nối tri thức với cuộc sống',
  topic: 'Chủ đề 5: Các phép tính với số thập phân',
  objectives: [
    'Thực hiện được phép cộng hai số thập phân (đặt tính thẳng cột các hàng và dấu phẩy).',
    'Vận dụng giải các bài toán thực tế có liên quan đến phép cộng số thập phân.',
  ],
  centralQuestion:
    'Đoạn đường từ nhà Mai đến hiệu sách dài 1,35 km, từ hiệu sách đến trường dài 0,8 km. Hỏi quãng đường Mai đi từ nhà qua hiệu sách đến trường dài bao nhiêu ki-lô-mét?',
  contextStory:
    'Sáng thứ Hai, bạn Mai đạp xe từ nhà ghé qua hiệu sách mua vở mới rồi mới tới trường. Cả lớp hãy giúp Mai tính tổng quãng đường bạn ấy đã đi nhé!',
  situationItems: [
    {
      id: 'doan-1',
      title: 'Nhà Mai → Hiệu sách',
      location: 'Chặng thứ nhất',
      valueLabel: '1,35 km',
      numericValue: 1.35,
      unit: 'km',
      accentColor: 'teal',
    },
    {
      id: 'doan-2',
      title: 'Hiệu sách → Trường học',
      location: 'Chặng thứ hai',
      valueLabel: '0,8 km',
      numericValue: 0.8,
      unit: 'km',
      accentColor: 'amber',
    },
    {
      id: 'doan-tong',
      title: 'Tổng quãng đường cần tìm',
      location: '1,35 km + 0,8 km = ?',
      valueLabel: '? km',
      numericValue: 2.15,
      unit: 'km',
      accentColor: 'indigo',
    },
  ],
  stationTasks: {
    'khoi-hanh': {
      station: 'khoi-hanh',
      stationName: 'Trạm Khởi Hành',
      subtitle: 'Đặt tính thẳng hàng dấu phẩy và thêm chữ số 0 cho đủ hàng',
      corePrompt:
        'Em hãy viết 0,8 thành số có hai chữ số ở phần thập phân (0,80), sau đó đặt tính thẳng cột với 1,35 để tìm kết quả.',
      progressiveHints: [
        'Gợi ý 1: Hai dấu phẩy của 1,35 và 0,80 phải đặt thẳng cột với nhau.',
        'Gợi ý 2: Cộng như cộng hai số tự nhiên từ phải sang trái rồi viết dấu phẩy ở tổng thẳng cột với các dấu phẩy trên.',
      ],
      expectedProduct: 'Đặt tính đúng và tính được 1,35 + 0,80 = 2,15 (km).',
      teacherGuidance: 'Lưu ý học sinh tránh lỗi đặt chữ số 8 thẳng cột với chữ số 5.',
      interactiveWidget: 'place-value-table',
    },
    'tang-toc': {
      station: 'tang-toc',
      stationName: 'Trạm Tăng Tốc',
      subtitle: 'Khám phá quy tắc đặt tính cộng hai số thập phân bất kỳ',
      corePrompt:
        'Nhóm tự thực hiện phép cộng 1,35 + 0,8 và rút ra 3 bước đặt tính rồi tính hai số thập phân.',
      progressiveHints: [
        'Gợi ý: Tại sao chữ số 8 của 0,8 phải đặt dưới chữ số 3 của 1,35 mà không đặt dưới chữ số 5?',
      ],
      expectedProduct: 'Nêu đủ 3 bước quy tắc và giải thích đúng bản chất cộng các đơn vị cùng hàng.',
      teacherGuidance: 'Khuyến khích học sinh chỉ ra lỗi sai nếu đặt lệch dấu phẩy.',
      interactiveWidget: 'general',
    },
    'but-pha': {
      station: 'but-pha',
      stationName: 'Trạm Bứt Phá',
      subtitle: 'Tính bằng cách thuận tiện & Giải bài toán nhiều bước',
      corePrompt:
        'Kiểm tra lại kết quả bằng cách đổi sang đơn vị mét, đồng thời tính nhanh biểu thức: 1,35 + 2,4 + 2,65 + 1,6 bằng cách thuận tiện nhất!',
      progressiveHints: [
        'Gợi ý: Hãy ghép cặp hai số thập phân có phần thập phân cộng lại tròn 1 đơn vị!',
      ],
      expectedProduct: '(1,35 + 2,65) + (2,4 + 1,6) = 4 + 4 = 8.',
      teacherGuidance: 'Khai thác tính chất giao hoán và kết hợp của phép cộng số thập phân.',
      interactiveWidget: 'general',
    },
  },
  coreRules: [
    {
      stepNumber: 1,
      title: 'Đặt tính thẳng hàng',
      content: 'Viết số hạng này dưới số hạng kia sao cho các chữ số ở cùng một hàng và dấu phẩy đặt thẳng cột với nhau.',
      example: 'Chữ số 8 (hàng phần mười) đặt thẳng dưới chữ số 3 (hàng phần mười).',
    },
    {
      stepNumber: 2,
      title: 'Cộng như số tự nhiên & Đặt dấu phẩy thẳng cột',
      content: 'Cộng như cộng các số tự nhiên từ phải sang trái, sau đó viết dấu phẩy ở tổng thẳng cột với các dấu phẩy của các số hạng.',
      example: '1,35 + 0,8 = 2,15',
    },
  ],
  initialBoardPosts: [
    {
      id: 'post-b22-mis',
      authorName: 'Tình huống bắt bệnh lỗi sai',
      station: 'khoi-hanh',
      methodTitle: '⚠️ Cẩn thận lỗi đặt lệch cột: 1,35 + 0,8 = 1,43 (!?)',
      content: 'Nếu đặt chữ số 8 thẳng dưới chữ số 5 (hàng phần trăm) sẽ ra 1,43 — sai vì cộng nhầm hàng phần mười với hàng phần trăm!',
      stars: 6,
      isMisconception: true,
      createdAt: 'Thảo luận cả lớp',
    },
  ],
  practiceQuestions: [
    {
      id: 'b22-1',
      station: 'khoi-hanh',
      text: 'Kết quả của phép tính 2,4 + 1,5 là:',
      type: 'multiple-choice',
      options: ['3,9', '3,09', '2,55', '4,9'],
      correctAnswer: '3,9',
      explanation: 'Đặt tính thẳng cột: 4 phần mười + 5 phần mười = 9 phần mười; 2 + 1 = 3. Kết quả là 3,9.',
      hint: 'Đặt dấu phẩy thẳng cột rồi cộng từng hàng.',
      difficulty: 1,
    },
    {
      id: 'b22-2',
      station: 'tang-toc',
      text: 'Tính tổng: 4,28 + 3,9 = ?',
      type: 'multiple-choice',
      options: ['4,67', '8,18', '7,18', '8,08'],
      correctAnswer: '8,18',
      explanation: 'Viết 3,9 = 3,90. Ta có 4,28 + 3,90 = 8,18 (nhớ 1 từ hàng phần mười sang phần nguyên).',
      hint: 'Viết 3,9 thành 3,90 để không đặt lệch cột nhé!',
      difficulty: 2,
    },
    {
      id: 'b22-3',
      station: 'but-pha',
      text: 'Tính bằng cách thuận tiện nhất: 3,27 + 4,5 + 6,73 + 5,5 = ?',
      type: 'multiple-choice',
      options: ['19', '20', '21', '19,5'],
      correctAnswer: '20',
      explanation: 'Nhóm (3,27 + 6,73) + (4,5 + 5,5) = 10 + 10 = 20.',
      hint: 'Ghép 3,27 với 6,73 và 4,5 với 5,5.',
      difficulty: 3,
    },
  ],
  passingScore: 75,
  isApprovedByTeacher: true,
};

export const SAMPLE_LESSONS: DifferentiatedLesson[] = [
  LESSON_21_DECIMAL_COMPARE,
  LESSON_19_ROUNDING_DECIMALS,
  LESSON_22_ADDING_DECIMALS,
];

export const INITIAL_STUDENTS_5A: Student[] = [
  // Trạm Khởi Hành (7 HS)
  { id: 'hs-01', name: 'Nguyễn Minh An', avatar: '🐼', groupTable: 'Tổ 1', station: 'khoi-hanh', status: 'working', stars: 6, xp: 80, badges: ['effort'], hintsUsed: 1, completedExercises: 2 },
  { id: 'hs-02', name: 'Trần Bảo Châu', avatar: '🐰', groupTable: 'Tổ 1', station: 'khoi-hanh', status: 'need-hint', stars: 5, xp: 65, badges: [], hintsUsed: 2, completedExercises: 1 },
  { id: 'hs-03', name: 'Lê Hoàng Dũng', avatar: '🐻', groupTable: 'Tổ 2', station: 'khoi-hanh', status: 'struggling', stars: 4, xp: 50, badges: ['effort'], hintsUsed: 2, completedExercises: 1 },
  { id: 'hs-04', name: 'Phạm Ngọc Hân', avatar: '🐱', groupTable: 'Tổ 2', station: 'khoi-hanh', status: 'working', stars: 6, xp: 75, badges: ['teamwork'], hintsUsed: 1, completedExercises: 2 },
  { id: 'hs-05', name: 'Vũ Tuấn Kiệt', avatar: '🐶', groupTable: 'Tổ 3', station: 'khoi-hanh', status: 'completed', stars: 8, xp: 95, badges: ['effort'], hintsUsed: 1, completedExercises: 3 },
  { id: 'hs-06', name: 'Đặng Phương Linh', avatar: '🐨', groupTable: 'Tổ 4', station: 'khoi-hanh', status: 'working', stars: 5, xp: 70, badges: [], hintsUsed: 1, completedExercises: 2 },

  // Trạm Tăng Tốc (11 HS)
  { id: 'hs-07', name: 'Hoàng Gia Bảo', avatar: '🦊', groupTable: 'Tổ 1', station: 'tang-toc', status: 'completed', stars: 9, xp: 120, badges: ['explain'], hintsUsed: 0, completedExercises: 3 },
  { id: 'hs-08', name: 'Bùi Khánh Chi', avatar: '🐹', groupTable: 'Tổ 1', station: 'tang-toc', status: 'working', stars: 8, xp: 105, badges: ['teamwork'], hintsUsed: 0, completedExercises: 2 },
  { id: 'hs-09', name: 'Đỗ Minh Đức', avatar: '🐯', groupTable: 'Tổ 1', station: 'tang-toc', status: 'working', stars: 7, xp: 95, badges: [], hintsUsed: 1, completedExercises: 2 },
  { id: 'hs-10', name: 'Ngô Thanh Hà', avatar: '🐸', groupTable: 'Tổ 2', station: 'tang-toc', status: 'completed', stars: 10, xp: 130, badges: ['explain', 'teamwork'], hintsUsed: 0, completedExercises: 4 },
  { id: 'hs-11', name: 'Dương Quốc Hưng', avatar: '🦁', groupTable: 'Tổ 2', station: 'tang-toc', status: 'need-hint', stars: 7, xp: 90, badges: [], hintsUsed: 1, completedExercises: 2 },
  { id: 'hs-12', name: 'Lý Mai Hương', avatar: '🦄', groupTable: 'Tổ 3', station: 'tang-toc', status: 'completed', stars: 9, xp: 115, badges: ['teamwork'], hintsUsed: 0, completedExercises: 3 },
  { id: 'hs-13', name: 'Trịnh Nam Khánh', avatar: '🐵', groupTable: 'Tổ 3', station: 'tang-toc', status: 'working', stars: 8, xp: 100, badges: [], hintsUsed: 0, completedExercises: 2 },
  { id: 'hs-14', name: 'Đinh Thảo My', avatar: '🐥', groupTable: 'Tổ 3', station: 'tang-toc', status: 'completed', stars: 9, xp: 125, badges: ['explain'], hintsUsed: 0, completedExercises: 3 },
  { id: 'hs-15', name: 'Phan Hải Nam', avatar: '🐧', groupTable: 'Tổ 4', station: 'tang-toc', status: 'working', stars: 7, xp: 95, badges: [], hintsUsed: 0, completedExercises: 2 },
  { id: 'hs-16', name: 'Võ Bảo Ngọc', avatar: '🦋', groupTable: 'Tổ 4', station: 'tang-toc', status: 'completed', stars: 10, xp: 135, badges: ['sharp'], hintsUsed: 0, completedExercises: 4 },

  // Trạm Bứt Phá (6 HS)
  { id: 'hs-17', name: 'Nguyễn Minh Khôi', avatar: '🦅', groupTable: 'Tổ 1', station: 'but-pha', status: 'completed', stars: 14, xp: 180, badges: ['creative', 'explain'], hintsUsed: 0, completedExercises: 5 },
  { id: 'hs-18', name: 'Trần Tuệ Lâm', avatar: '🦉', groupTable: 'Tổ 2', station: 'but-pha', status: 'completed', stars: 15, xp: 195, badges: ['creative', 'sharp'], hintsUsed: 0, completedExercises: 5 },
  { id: 'hs-19', name: 'Lê Đăng Khoa', avatar: '🐬', groupTable: 'Tổ 2', station: 'but-pha', status: 'working', stars: 12, xp: 155, badges: ['creative'], hintsUsed: 0, completedExercises: 4 },
  { id: 'hs-20', name: 'Phạm Hà Phương', avatar: '🦢', groupTable: 'Tổ 3', station: 'but-pha', status: 'completed', stars: 13, xp: 170, badges: ['sharp', 'teamwork'], hintsUsed: 0, completedExercises: 5 },
  { id: 'hs-21', name: 'Hoàng Thiên Phúc', avatar: '🦖', groupTable: 'Tổ 4', station: 'but-pha', status: 'completed', stars: 14, xp: 175, badges: ['creative'], hintsUsed: 0, completedExercises: 5 },
  { id: 'hs-22', name: 'Vũ Quỳnh Anh', avatar: '🐿️', groupTable: 'Tổ 4', station: 'but-pha', status: 'working', stars: 11, xp: 145, badges: ['explain'], hintsUsed: 0, completedExercises: 4 },
];
