import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  AiProvider,
  DifferentiatedLesson,
  LiveAiCopilotResponse,
  SolutionPost,
  StationTier,
} from '../types/education';
import { apiKeyManager, type ApiErrorCategory } from './apiKeyManager';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
export const DEFAULT_AGENT_PLATFORM_MODEL = 'gemini-2.5-flash';

export const FALLBACK_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

export const AGENT_PLATFORM_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3.1-pro-preview',
] as const;

export const AGENT_PLATFORM_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export type ModelFallbackEvent =
  | { type: 'switch'; label: string; from: string; to: string; reason: string }
  | { type: 'done'; label: string };

let fallbackListener: ((event: ModelFallbackEvent) => void) | null = null;

export const setModelFallbackListener = (
  listener: ((event: ModelFallbackEvent) => void) | null,
): void => {
  fallbackListener = listener;
};

const emitFallback = (event: ModelFallbackEvent): void => {
  if (fallbackListener) {
    fallbackListener(event);
  }
};

/**
 * Client factory duy nhất được phép khởi tạo GoogleGenAI SDK trong toàn bộ ứng dụng.
 */
export const createGoogleAiClient = (
  apiKey: string,
  provider: AiProvider,
): GoogleGenAI => {
  if (provider === 'agent-platform') {
    return new GoogleGenAI({ vertexai: true, apiKey });
  }
  return new GoogleGenAI({ apiKey });
};

export const getOrderedModels = (
  selectedModel?: string,
  provider: AiProvider = 'gemini',
): string[] => {
  const baseChain =
    provider === 'agent-platform'
      ? [...AGENT_PLATFORM_FALLBACK_MODELS]
      : [...FALLBACK_GEMINI_MODELS];

  const defaultModel =
    provider === 'agent-platform' ? DEFAULT_AGENT_PLATFORM_MODEL : DEFAULT_GEMINI_MODEL;

  const preferred = selectedModel?.trim() || defaultModel;
  const validPreferred =
    provider === 'agent-platform' &&
    !AGENT_PLATFORM_MODELS.includes(preferred as (typeof AGENT_PLATFORM_MODELS)[number])
      ? DEFAULT_AGENT_PLATFORM_MODEL
      : preferred;

  return [validPreferred, ...baseChain].filter(
    (model, index, arr) => Boolean(model) && arr.indexOf(model) === index,
  );
};

const extractStatusCode = (error: unknown): number | null => {
  if (error && typeof error === 'object') {
    const maybeStatus = (error as { status?: unknown; code?: unknown }).status;
    if (typeof maybeStatus === 'number') return maybeStatus;
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'number') return maybeCode;
  }
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const codeMatch = msg.match(/"code"\s*:\s*(\d{3})/);
  if (codeMatch) return parseInt(codeMatch[1], 10);
  return null;
};

/**
 * Phân loại lỗi chuẩn mục VII.3 của api.md:
 * Bắt buộc kiểm tra API_KEY_INVALID TRƯỚC mã 400.
 */
export const parseApiError = (error: unknown): ApiErrorCategory => {
  const status = extractStatusCode(error);
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('api key expired') ||
    lower.includes('invalid api key')
  ) {
    return 'INVALID_API_KEY';
  }

  if (status === 401 || lower.includes('unauthenticated')) {
    return 'INVALID_API_KEY';
  }

  if (
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    if (lower.includes('per minute') || lower.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    return 'QUOTA_EXCEEDED';
  }

  if (status === 403 || lower.includes('permission_denied')) {
    return 'PERMISSION_DENIED';
  }

  if (
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('not supported for generatecontent')
  ) {
    return 'NOT_FOUND';
  }

  if (
    (status !== null && status >= 500 && status < 600) ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('try again later') ||
    lower.includes('deadline_exceeded') ||
    lower.includes('bad gateway') ||
    lower.includes('internal')
  ) {
    return 'SERVER_ERROR';
  }

  if (status === 400 || lower.includes('invalid_argument')) {
    return 'INVALID_ARGUMENT';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('networkerror') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  ) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN';
};

export const getFriendlyErrorMessage = (
  error: unknown,
  provider: AiProvider,
): string => {
  const category = parseApiError(error);
  switch (category) {
    case 'INVALID_API_KEY':
      return 'API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại trong phần Cài đặt API Key.';
    case 'PERMISSION_DENIED':
      return provider === 'agent-platform'
        ? 'Google đã nhận API Key nhưng dự án chưa bật quyền Agent Platform API, billing hoặc quyền gọi model này.'
        : 'API Key không có quyền truy cập Gemini API. Vui lòng kiểm tra giới hạn key trong Google AI Studio.';
    case 'QUOTA_EXCEEDED':
    case 'RATE_LIMIT':
      return 'Đã hết hạn mức (quota) hoặc vượt giới hạn tốc độ gọi API. Vui lòng đợi ít phút hoặc thêm API Key dự phòng.';
    case 'SERVER_ERROR':
      return 'Máy chủ AI của Google đang tạm thời quá tải ở tất cả các model dự phòng. Thầy/cô vui lòng bấm thử lại sau vài giây nhé!';
    case 'NETWORK_ERROR':
      return 'Không thể kết nối mạng tới máy chủ AI. Vui lòng kiểm tra kết nối Internet của máy tính.';
    default:
      return 'Đã xảy ra lỗi khi xử lý phản hồi từ AI. Vui lòng thử lại.';
  }
};

const getFallbackReasonLabel = (category: ApiErrorCategory): string => {
  switch (category) {
    case 'SERVER_ERROR':
      return 'đang bận';
    case 'QUOTA_EXCEEDED':
      return 'đã hết lượt sử dụng';
    case 'RATE_LIMIT':
      return 'đang bị giới hạn tốc độ';
    case 'NOT_FOUND':
      return 'không khả dụng';
    case 'PERMISSION_DENIED':
      return 'không mở cho API key này';
    case 'INVALID_ARGUMENT':
      return 'không nhận cấu hình yêu cầu';
    default:
      return 'tạm gián đoạn';
  }
};

const isModelFallbackEligible = (
  category: ApiErrorCategory,
  provider: AiProvider,
): boolean => {
  if (
    category === 'SERVER_ERROR' ||
    category === 'NOT_FOUND' ||
    category === 'QUOTA_EXCEEDED' ||
    category === 'RATE_LIMIT' ||
    category === 'INVALID_ARGUMENT'
  ) {
    return true;
  }
  if (category === 'PERMISSION_DENIED' && provider === 'agent-platform') {
    return true;
  }
  return false;
};

export interface GenerationConfigOptions {
  provider: AiProvider;
  thinkingLevel?: ThinkingLevel;
  systemInstruction?: string;
  responseMimeType?: string;
  maxOutputTokens?: number;
}

export const getGeminiGenerationConfig = (
  model: string,
  options: GenerationConfigOptions,
): Record<string, unknown> => {
  const isGemini3 = model.startsWith('gemini-3') || model === 'gemini-flash-latest';
  const level = options.thinkingLevel ?? ThinkingLevel.MEDIUM;

  const config: Record<string, unknown> = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (options.maxOutputTokens) {
    config.maxOutputTokens = options.maxOutputTokens;
  }

  // Tuyệt đối không truyền temperature/topP/topK cho dòng gemini-3*
  if (!isGemini3) {
    config.temperature = 0.4;
    config.topP = 0.95;
    config.topK = 64;
  }

  // Chỉ truyền thinkingLevel cho Gemini API trên dòng 3.x
  if (options.provider === 'gemini' && isGemini3) {
    config.thinkingConfig = { thinkingLevel: level };
  }

  return config;
};

/**
 * Hàm wrapper tập trung duy nhất cho mọi yêu cầu generateContent trong toàn bộ ứng dụng.
 * Tự động fallback qua danh sách model và tự động xoay sang key dự phòng nếu hết quota.
 */
export const generateContentWithModelFallback = async ({
  label,
  contents,
  provider: explicitProvider,
  selectedModel: explicitModel,
  thinkingLevel = ThinkingLevel.MEDIUM,
  systemInstruction,
  responseMimeType,
  maxOutputTokens = 8192,
}: {
  label: string;
  contents: string;
  provider?: AiProvider;
  selectedModel?: string;
  thinkingLevel?: ThinkingLevel;
  systemInstruction?: string;
  responseMimeType?: string;
  maxOutputTokens?: number;
}): Promise<{ text: string; usedModel: string }> => {
  const provider = explicitProvider ?? apiKeyManager.getProvider();
  const preferredModel = explicitModel ?? apiKeyManager.getSavedModel(provider);
  const models = getOrderedModels(preferredModel, provider);

  const triedKeys = new Set<string>();
  let lastError: unknown = null;

  try {
    while (true) {
      const activeKey = apiKeyManager.getActiveKey(provider);
      if (!activeKey || triedKeys.has(activeKey)) {
        break;
      }
      triedKeys.add(activeKey);

      const ai = createGoogleAiClient(activeKey, provider);
      let keyLevelCategory: ApiErrorCategory | null = null;

      for (let i = 0; i < models.length; i++) {
        const currentModel = models[i];
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: getGeminiGenerationConfig(currentModel, {
              provider,
              thinkingLevel,
              systemInstruction,
              responseMimeType,
              maxOutputTokens,
            }),
          });
          const text = response.text?.trim() ?? '';
          if (!text) {
            throw new Error('Empty response from model');
          }
          return { text, usedModel: currentModel };
        } catch (err) {
          lastError = err;
          const category = parseApiError(err);

          if (
            category === 'INVALID_API_KEY' ||
            category === 'QUOTA_EXCEEDED' ||
            category === 'RATE_LIMIT' ||
            category === 'PERMISSION_DENIED'
          ) {
            keyLevelCategory = category;
          }

          const canTryNextModel =
            i < models.length - 1 && isModelFallbackEligible(category, provider);

          if (canTryNextModel) {
            const nextModel = models[i + 1];
            emitFallback({
              type: 'switch',
              label,
              from: currentModel,
              to: nextModel,
              reason: getFallbackReasonLabel(category),
            });
            continue;
          }
          break;
        }
      }

      if (keyLevelCategory) {
        const rotation = apiKeyManager.markKeyError(activeKey, keyLevelCategory, provider);
        if (rotation.rotated && rotation.nextKey) {
          emitFallback({
            type: 'switch',
            label,
            from: 'API key hiện tại',
            to: 'API key dự phòng',
            reason: getFallbackReasonLabel(keyLevelCategory),
          });
          continue;
        }
      }
      break;
    }

    if (!apiKeyManager.getActiveKey(provider) && triedKeys.size === 0) {
      throw new Error('MISSING_API_KEY');
    }

    throw lastError ?? new Error('Không thể nhận phản hồi từ dịch vụ AI.');
  } finally {
    // BẮT BUỘC theo api.md: xóa cảnh báo vàng ngay khi kết thúc lượt gọi
    emitFallback({ type: 'done', label });
  }
};

export const validateApiKey = async (
  rawKey: string,
  provider: AiProvider,
  preferredModel?: string,
): Promise<{
  ok: boolean;
  workingModel?: string;
  errorType?: ApiErrorCategory;
  message: string;
}> => {
  const apiKey = rawKey.trim();
  const models = getOrderedModels(preferredModel, provider);
  const ai = createGoogleAiClient(apiKey, provider);
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: 'Trả lời đúng một từ: OK',
        config: getGeminiGenerationConfig(model, {
          provider,
          thinkingLevel: ThinkingLevel.LOW,
          maxOutputTokens: 64,
        }),
      });
      if (res.text) {
        return {
          ok: true,
          workingModel: model,
          message: `Kết nối thành công với model ${model}!`,
        };
      }
    } catch (err) {
      lastError = err;
      const category = parseApiError(err);
      if (category === 'INVALID_API_KEY' || category === 'NETWORK_ERROR') {
        return {
          ok: false,
          errorType: category,
          message: getFriendlyErrorMessage(err, provider),
        };
      }
    }
  }

  return {
    ok: false,
    errorType: parseApiError(lastError),
    message: getFriendlyErrorMessage(lastError, provider),
  };
};

const cleanJsonText = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
};

const SYSTEM_PEDAGOGY_TOAN5 = `Bạn là Chuyên gia Sư phạm Tiểu học môn Toán lớp 5 (bộ sách Kết nối tri thức với cuộc sống), chuyên sâu về Dạy học phân hóa trên lớp học có 1 máy tính giáo viên và Màn hình tương tác/Tivi.
Nguyên tắc bắt buộc:
1. Ba trạm học tập mang tên tích cực (không gắn nhãn yếu/kém):
   - "khoi-hanh" (Trạm Khởi Hành - Cần hỗ trợ): câu hỏi trực quan, chia nhỏ từng bước, gợi ý dẫn dắt, tuyệt đối KHÔNG đưa sẵn đáp án cuối cùng trong phần gợi ý.
   - "tang-toc" (Trạm Tăng Tốc - Đạt yêu cầu): tự quan sát dữ kiện, khám phá quy tắc và giải thích cách làm.
   - "but-pha" (Trạm Bứt Phá - Năng lực tốt): tìm nhiều cách giải khác nhau, biểu diễn trục số/đổi đơn vị, bài toán mở thay đổi dữ kiện.
2. Cùng hướng tới MỘT yêu cầu cần đạt cốt lõi của bài học Toán lớp 5.
3. Ngôn ngữ trong sáng, gần gũi với học sinh lớp 5 Việt Nam; dùng dấu phẩy cho số thập phân (ví dụ: 2,29 km; 3,5 km).`;

/**
 * Tạo trọn bộ kịch bản dạy học phân hóa 3 Trạm mới bằng Gemini AI.
 * Áp dụng bước planning non-blocking (ThinkingLevel.LOW) + bước generation chính (ThinkingLevel.MEDIUM).
 */
export const generateDifferentiatedLessonAI = async (params: {
  lessonCode: string;
  title: string;
  objectivesInput: string;
  contextIdea: string;
}): Promise<DifferentiatedLesson> => {
  let contentMap = '';
  try {
    const planRes = await generateContentWithModelFallback({
      label: 'planning-lesson',
      thinkingLevel: ThinkingLevel.LOW,
      maxOutputTokens: 2048,
      systemInstruction: SYSTEM_PEDAGOGY_TOAN5,
      contents: `Lập dàn ý ngắn gọn (tối đa 150 từ) cho tiết dạy học phân hóa Toán 5: ${params.lessonCode} - ${params.title}. Yêu cầu cần đạt: ${params.objectivesInput}. Ý tưởng tình huống: ${params.contextIdea || 'Tình huống thực tiễn Việt Nam gần gũi học sinh lớp 5'}.`,
    });
    contentMap = planRes.text;
  } catch (planErr) {
    console.warn('[Gemini] Tạm bỏ qua bước lập bản đồ nội dung để ưu tiên bước chính:', planErr);
    contentMap = '';
  }

  const prompt = `Hãy thiết kế trọn bộ kịch bản dạy học phân hóa trên lớp môn Toán lớp 5 (Kết nối tri thức) ở định dạng JSON thuần túy (không thêm văn bản ngoài JSON).
Thông tin đầu vào:
- Bài học: "${params.lessonCode}: ${params.title}"
- Yêu cầu cần đạt: "${params.objectivesInput}"
- Ý tưởng tình huống thực tế: "${params.contextIdea || 'Chọn tình huống thực tế sinh động tại Việt Nam có 3 đại lượng số học để học sinh khám phá'}"
${contentMap ? `- Dàn ý định hướng: ${contentMap}` : ''}

Cấu trúc JSON bắt buộc khớp chính xác schema sau:
{
  "lessonCode": "${params.lessonCode}",
  "title": "${params.title}",
  "topic": "Chủ đề Toán 5",
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", "Mục tiêu 3"],
  "centralQuestion": "Câu hỏi lớn trung tâm chiếu trên Tivi cho cả lớp",
  "contextStory": "Lời dẫn tình huống thực tế ngắn gọn, hấp dẫn học sinh lớp 5",
  "situationItems": [
    {
      "id": "item-1",
      "title": "Tên đối tượng 1",
      "location": "Địa điểm/Mô tả ngắn",
      "valueLabel": "Ví dụ: 2,29 km",
      "numericValue": 2.29,
      "unit": "km",
      "accentColor": "teal"
    },
    {
      "id": "item-2",
      "title": "Tên đối tượng 2",
      "location": "Địa điểm/Mô tả ngắn",
      "valueLabel": "Ví dụ: 3,5 km",
      "numericValue": 3.5,
      "unit": "km",
      "accentColor": "amber"
    },
    {
      "id": "item-3",
      "title": "Tên đối tượng 3",
      "location": "Địa điểm/Mô tả ngắn",
      "valueLabel": "Ví dụ: 2,75 km",
      "numericValue": 2.75,
      "unit": "km",
      "accentColor": "indigo"
    }
  ],
  "stationTasks": {
    "khoi-hanh": {
      "station": "khoi-hanh",
      "stationName": "Trạm Khởi Hành",
      "subtitle": "Hướng dẫn trực quan từng bước",
      "corePrompt": "Nhiệm vụ vừa sức cho nhóm cần hỗ trợ",
      "progressiveHints": [
        "Gợi ý bước 1 (câu hỏi dẫn dắt, KHÔNG lộ đáp án)",
        "Gợi ý bước 2 (câu hỏi dẫn dắt tiếp theo, KHÔNG lộ đáp án)",
        "Gợi ý bước 3 (giúp HS tự chốt kết quả)"
      ],
      "expectedProduct": "Sản phẩm mong đợi của nhóm",
      "teacherGuidance": "Lưu ý cho GV khi hỗ trợ nhóm này"
    },
    "tang-toc": {
      "station": "tang-toc",
      "stationName": "Trạm Tăng Tốc",
      "subtitle": "Tự khám phá và giải thích quy tắc",
      "corePrompt": "Nhiệm vụ cho nhóm đạt yêu cầu",
      "progressiveHints": ["Gợi ý mở 1", "Gợi ý mở 2"],
      "expectedProduct": "Sản phẩm mong đợi",
      "teacherGuidance": "Lưu ý cho GV"
    },
    "but-pha": {
      "station": "but-pha",
      "stationName": "Trạm Bứt Phá",
      "subtitle": "Đa cách giải & Mở rộng thực tiễn",
      "corePrompt": "Nhiệm vụ thử thách tư duy cho nhóm năng lực tốt",
      "progressiveHints": ["Gợi ý hướng tiếp cận khác 1", "Gợi ý kiểm chứng 2"],
      "expectedProduct": "Sản phẩm mong đợi",
      "teacherGuidance": "Lưu ý cho GV"
    }
  },
  "coreRules": [
    { "stepNumber": 1, "title": "Bước 1", "content": "Nội dung quy tắc 1", "example": "Ví dụ minh họa" },
    { "stepNumber": 2, "title": "Bước 2", "content": "Nội dung quy tắc 2", "example": "Ví dụ minh họa" }
  ],
  "initialBoardPosts": [
    {
      "id": "post-1",
      "authorName": "Nhóm đại diện Trạm Tăng Tốc",
      "station": "tang-toc",
      "methodTitle": "Cách 1: ...",
      "content": "Trình bày cách giải thứ nhất",
      "stars": 3,
      "isMisconception": false
    },
    {
      "id": "post-2",
      "authorName": "Nhóm đại diện Trạm Bứt Phá",
      "station": "but-pha",
      "methodTitle": "Cách 2: ...",
      "content": "Trình bày cách giải thứ hai sáng tạo",
      "stars": 4,
      "isMisconception": false
    },
    {
      "id": "post-3",
      "authorName": "Tình huống thảo luận lỗi sai",
      "station": "khoi-hanh",
      "methodTitle": "Phát hiện nhầm lẫn thường gặp",
      "content": "Mô tả 1 nhầm lẫn phổ biến của HS lớp 5 để cả lớp cùng phân tích và sửa sai",
      "stars": 2,
      "isMisconception": true
    }
  ],
  "practiceQuestions": [
    {
      "id": "q-1",
      "station": "khoi-hanh",
      "text": "Câu hỏi trắc nghiệm mức độ cơ bản cho Trạm Khởi Hành",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án A",
      "explanation": "Giải thích chi tiết, dễ hiểu vì sao chọn đáp án đó",
      "hint": "Gợi ý nhẹ không lộ đáp án",
      "difficulty": 1
    },
    {
      "id": "q-2",
      "station": "khoi-hanh",
      "text": "Câu hỏi thứ 2 cho Trạm Khởi Hành",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án B",
      "explanation": "Giải thích chi tiết",
      "hint": "Gợi ý nhẹ",
      "difficulty": 1
    },
    {
      "id": "q-3",
      "station": "tang-toc",
      "text": "Câu hỏi vận dụng chuẩn cho Trạm Tăng Tốc",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án C",
      "explanation": "Giải thích chi tiết",
      "hint": "Gợi ý nhẹ",
      "difficulty": 2
    },
    {
      "id": "q-4",
      "station": "tang-toc",
      "text": "Câu hỏi thứ 2 cho Trạm Tăng Tốc",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án A",
      "explanation": "Giải thích chi tiết",
      "hint": "Gợi ý nhẹ",
      "difficulty": 2
    },
    {
      "id": "q-5",
      "station": "but-pha",
      "text": "Câu hỏi vận dụng cao / mở rộng thực tế cho Trạm Bứt Phá",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án D",
      "explanation": "Giải thích chi tiết",
      "hint": "Gợi ý nhẹ",
      "difficulty": 3
    },
    {
      "id": "q-6",
      "station": "but-pha",
      "text": "Câu hỏi thứ 2 cho Trạm Bứt Phá",
      "type": "multiple-choice",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": "Đáp án B",
      "explanation": "Giải thích chi tiết",
      "hint": "Gợi ý nhẹ",
      "difficulty": 3
    }
  ]
}`;

  const result = await generateContentWithModelFallback({
    label: 'generate-lesson',
    thinkingLevel: ThinkingLevel.MEDIUM,
    maxOutputTokens: 16384,
    responseMimeType: 'application/json',
    systemInstruction: SYSTEM_PEDAGOGY_TOAN5,
    contents: prompt,
  });

  const parsed = JSON.parse(cleanJsonText(result.text)) as Partial<DifferentiatedLesson>;

  const ensureStation = (
    tier: StationTier,
    fallbackName: string,
    widget: 'place-value-table' | 'symbol-compare' | 'number-line' | 'general',
  ) => {
    const rawTask = parsed.stationTasks?.[tier];
    return {
      station: tier,
      stationName: rawTask?.stationName || fallbackName,
      subtitle: rawTask?.subtitle || 'Nhiệm vụ học tập phân hóa',
      corePrompt: rawTask?.corePrompt || 'Quan sát tình huống và thực hiện yêu cầu của trạm.',
      progressiveHints:
        Array.isArray(rawTask?.progressiveHints) && rawTask.progressiveHints.length > 0
          ? rawTask.progressiveHints
          : ['Em hãy xác định các số liệu đã cho trong đề bài nhé!'],
      expectedProduct: rawTask?.expectedProduct || 'Trình bày kết quả trên bảng nhóm.',
      teacherGuidance: rawTask?.teacherGuidance || 'Quan sát và khích lệ học sinh.',
      interactiveWidget: widget,
    };
  };

  return {
    id: `ai-lesson-${Date.now()}`,
    lessonCode: parsed.lessonCode || params.lessonCode,
    title: parsed.title || params.title,
    textbook: 'Toán 5 — Kết nối tri thức với cuộc sống',
    topic: parsed.topic || 'Toán lớp 5',
    objectives:
      Array.isArray(parsed.objectives) && parsed.objectives.length > 0
        ? parsed.objectives
        : [params.objectivesInput],
    centralQuestion:
      parsed.centralQuestion || 'Em hãy khám phá và giải quyết tình huống toán học sau!',
    contextStory: parsed.contextStory || params.contextIdea,
    situationItems: Array.isArray(parsed.situationItems) ? parsed.situationItems : [],
    stationTasks: {
      'khoi-hanh': ensureStation('khoi-hanh', 'Trạm Khởi Hành', 'general'),
      'tang-toc': ensureStation('tang-toc', 'Trạm Tăng Tốc', 'general'),
      'but-pha': ensureStation('but-pha', 'Trạm Bứt Phá', 'general'),
    },
    coreRules: Array.isArray(parsed.coreRules) ? parsed.coreRules : [],
    initialBoardPosts: Array.isArray(parsed.initialBoardPosts)
      ? parsed.initialBoardPosts.map((p, idx) => ({
          id: p.id || `ai-post-${idx}`,
          authorName: p.authorName || 'Nhóm học sinh',
          station: p.station || 'tang-toc',
          methodTitle: p.methodTitle || 'Cách giải đề xuất',
          content: p.content || '',
          stars: typeof p.stars === 'number' ? p.stars : 2,
          isMisconception: Boolean(p.isMisconception),
          createdAt: 'Vừa tạo bởi AI',
        }))
      : [],
    practiceQuestions: Array.isArray(parsed.practiceQuestions) ? parsed.practiceQuestions : [],
    passingScore: 75,
    isApprovedByTeacher: false, // BẮT BUỘC GV duyệt trước khi phát nhiệm vụ!
  };
};

/**
 * Nút "AI Ứng Biến Nóng" ngay trong tiết dạy (Bước 5 của Biện pháp 3)
 */
export const generateLiveCopilotPromptAI = async (params: {
  lessonTitle: string;
  centralQuestion: string;
  scenarioType: 'misconception' | 'fast-finisher' | 'real-world';
  customSituationText: string;
}): Promise<LiveAiCopilotResponse> => {
  const prompt = `Trong tiết dạy Toán lớp 5 bài "${params.lessonTitle}" (Tình huống gốc: "${params.centralQuestion}"), giáo viên đang gặp diễn biến thực tế trên lớp như sau:
"${params.customSituationText}"

Loại hỗ trợ cần thiết: ${
    params.scenarioType === 'misconception'
      ? 'Học sinh đang gặp khó khăn/nhầm lẫn -> Hãy tạo câu hỏi gợi mở dẫn dắt để học sinh TỰ PHÁT HIỆN và sửa sai, tuyệt đối KHÔNG giải hộ hay đưa sẵn đáp án.'
      : params.scenarioType === 'fast-finisher'
        ? 'Nhóm học sinh năng lực tốt đã hoàn thành sớm -> Hãy tạo thử thách mở rộng ("Nếu thay đổi dữ kiện...", "Tìm số ở giữa...", hoặc tìm cách giải khác).'
        : 'Tạo một tình huống vận dụng thực tiễn gần gũi với học sinh lớp 5 để củng cố cuối bài.'
  }

Trả về đúng định dạng JSON sau:
{
  "title": "Tiêu đề ngắn gọn chiếu lên Tivi",
  "promptForStudents": "Câu hỏi / thử thách trực tiếp dành cho học sinh (rõ ràng, sinh động, chữ to dễ đọc)",
  "stepByStepHints": [
    "Gợi ý dẫn dắt 1 (không lộ đáp án)",
    "Gợi ý dẫn dắt 2 (không lộ đáp án)"
  ],
  "teacherNote": "Gợi ý cách giáo viên điều phối trên lớp trong 1-2 phút",
  "targetStation": "${
    params.scenarioType === 'misconception'
      ? 'khoi-hanh'
      : params.scenarioType === 'fast-finisher'
        ? 'but-pha'
        : 'all'
  }"
}`;

  const res = await generateContentWithModelFallback({
    label: 'live-copilot',
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 2048,
    responseMimeType: 'application/json',
    systemInstruction: SYSTEM_PEDAGOGY_TOAN5,
    contents: prompt,
  });

  const parsed = JSON.parse(cleanJsonText(res.text)) as Partial<LiveAiCopilotResponse>;

  return {
    id: `copilot-${Date.now()}`,
    scenarioType: params.scenarioType,
    title: parsed.title || 'Câu hỏi điều chỉnh linh hoạt',
    promptForStudents: parsed.promptForStudents || '',
    stepByStepHints: Array.isArray(parsed.stepByStepHints) ? parsed.stepByStepHints : [],
    teacherNote: parsed.teacherNote || 'Giáo viên mời đại diện học sinh nêu suy nghĩ trước khi chốt.',
    targetStation: parsed.targetStation || 'all',
    approved: false,
  };
};

/**
 * AI hỗ trợ Bước 4: Đọc các cách giải của học sinh trên Bức tường Padlet và gợi ý câu hỏi thảo luận sâu
 */
export const generateBoardDiscussionProbesAI = async (params: {
  lessonTitle: string;
  posts: SolutionPost[];
}): Promise<string[]> => {
  const summary = params.posts
    .map((p, i) => `${i + 1}. [${p.methodTitle}]: ${p.content}`)
    .join('\n');

  const prompt = `Dưới đây là các cách giải và ý kiến của học sinh lớp 5 trên Bức tường Đa Cách Giải trong bài "${params.lessonTitle}":
${summary}

Hãy đóng vai trợ lý sư phạm gợi ý cho Giáo viên đúng 3 câu hỏi thảo luận ngắn gọn, sắc sảo để hỏi cả lớp nhằm:
1) Giúp học sinh đối chiếu ưu điểm/hạn chế giữa các cách làm;
2) Giúp học sinh nhận diện và tránh lỗi nhầm lẫn;
3) Khái quát hóa thành quy tắc bài học.
Trả về JSON dạng mảng 3 chuỗi: ["Câu hỏi 1...", "Câu hỏi 2...", "Câu hỏi 3..."]`;

  const res = await generateContentWithModelFallback({
    label: 'board-discussion',
    thinkingLevel: ThinkingLevel.LOW,
    maxOutputTokens: 1536,
    responseMimeType: 'application/json',
    systemInstruction: SYSTEM_PEDAGOGY_TOAN5,
    contents: prompt,
  });

  const parsed = JSON.parse(cleanJsonText(res.text));
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

/**
 * Giao bài online: AI tạo câu trắc nghiệm cho một trạm. Kết quả CHỈ là đề xuất — giáo viên phải duyệt/sửa trước khi giao.
 */
export const generateStationQuestionsAI = async (params: {
  lessonTitle: string;
  objectives: string[];
  stationName: string;
  stationFocus: string;
  count: number;
}): Promise<{ text: string; options: string[]; correct: string; explanation: string }[]> => {
  const prompt = `Soạn ${params.count} câu hỏi trắc nghiệm (4 phương án, đúng 1 đáp án) để học sinh lớp 5 tự làm ở nhà, bài "${params.lessonTitle}" (Toán 5 — Kết nối tri thức với cuộc sống).
Yêu cầu cần đạt: ${params.objectives.join('; ') || '(theo bài học)'}.
Mức độ dành cho ${params.stationName}: ${params.stationFocus}.
Quy tắc bắt buộc:
- Chỉ dùng kiến thức trong chương trình lớp 5 đến bài này; số thập phân viết bằng dấu phẩy (ví dụ 2,75).
- Tự kiểm tra lại phép tính; đáp án đúng phải trùng nguyên văn với một phương án.
- Lời giải thích ngắn gọn, dễ hiểu với học sinh lớp 5.
Trả về JSON là một mảng: [{"text": "...", "options": ["...","...","...","..."], "correct": "...", "explanation": "..."}]`;

  const res = await generateContentWithModelFallback({
    label: 'online-station-questions',
    thinkingLevel: ThinkingLevel.MEDIUM,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    systemInstruction: SYSTEM_PEDAGOGY_TOAN5,
    contents: prompt,
  });

  const parsed = JSON.parse(cleanJsonText(res.text));
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((q: Record<string, unknown>) => ({
      text: String(q.text ?? '').trim(),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [],
      correct: String(q.correct ?? '').trim(),
      explanation: String(q.explanation ?? '').trim(),
    }))
    .filter((q) => q.text && q.options.length >= 2 && q.options.includes(q.correct));
};
