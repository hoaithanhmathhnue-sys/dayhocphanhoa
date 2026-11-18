import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import type { AiProvider } from '../types/education';
import {
  apiKeyManager,
  isValidGoogleAiApiKey,
  maskApiKey,
  type StoredKeyInfo,
} from '../services/apiKeyManager';
import {
  AGENT_PLATFORM_MODELS,
  DEFAULT_AGENT_PLATFORM_MODEL,
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODELS,
  validateApiKey,
} from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (provider: AiProvider, model: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_GEMINI_MODEL);
  const [keyInput, setKeyInput] = useState<string>('');
  const [savedKeys, setSavedKeys] = useState<StoredKeyInfo[]>([]);
  const [envKeyCount, setEnvKeyCount] = useState<number>(0);
  const [validationMsg, setValidationMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const syncProviderState = (targetProvider: AiProvider) => {
    const model = apiKeyManager.getSavedModel(targetProvider);
    const validList: readonly string[] =
      targetProvider === 'agent-platform'
        ? AGENT_PLATFORM_MODELS
        : FALLBACK_GEMINI_MODELS;
    const normalizedModel = validList.includes(model)
      ? model
      : targetProvider === 'agent-platform'
        ? DEFAULT_AGENT_PLATFORM_MODEL
        : DEFAULT_GEMINI_MODEL;

    setSelectedModel(normalizedModel);
    setSavedKeys(apiKeyManager.getUserKeys(targetProvider));
    setEnvKeyCount(apiKeyManager.getEnvKeyCount(targetProvider));
    setKeyInput('');
    setValidationMsg(null);
  };

  useEffect(() => {
    if (isOpen) {
      const currentProvider = apiKeyManager.getProvider();
      setProvider(currentProvider);
      syncProviderState(currentProvider);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitchProvider = (nextProvider: AiProvider) => {
    setProvider(nextProvider);
    syncProviderState(nextProvider);
  };

  const handleAddKey = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      setValidationMsg({
        type: 'error',
        text: 'Vui lòng nhập API Key (bắt đầu bằng AIzaSy... hoặc AQ...).',
      });
      return;
    }
    if (!isValidGoogleAiApiKey(trimmed)) {
      setValidationMsg({
        type: 'error',
        text: 'Định dạng key chưa đúng. Key hợp lệ bắt đầu bằng AIzaSy... hoặc AQ... và không chứa khoảng trắng.',
      });
      return;
    }
    apiKeyManager.useKey(trimmed, provider);
    setSavedKeys(apiKeyManager.getUserKeys(provider));
    setKeyInput('');
    setValidationMsg({
      type: 'success',
      text: 'Đã thêm API Key vào danh sách an toàn trên trình duyệt!',
    });
  };

  const handleTestKey = async () => {
    const candidate = keyInput.trim() || apiKeyManager.getActiveKey(provider) || '';
    if (!candidate) {
      setValidationMsg({
        type: 'error',
        text: 'Vui lòng nhập hoặc thêm ít nhất một API Key để kiểm tra kết nối.',
      });
      return;
    }
    if (!isValidGoogleAiApiKey(candidate)) {
      setValidationMsg({
        type: 'error',
        text: 'Định dạng API Key không hợp lệ (cần bắt đầu bằng AIzaSy... hoặc AQ...).',
      });
      return;
    }

    setIsTesting(true);
    setValidationMsg({
      type: 'info',
      text: 'Đang gửi yêu cầu kiểm tra kết nối tới Google AI...',
    });

    const result = await validateApiKey(candidate, provider, selectedModel);
    setIsTesting(false);

    if (result.ok) {
      if (keyInput.trim()) {
        apiKeyManager.useKey(keyInput.trim(), provider);
        setSavedKeys(apiKeyManager.getUserKeys(provider));
        setKeyInput('');
      }
      if (result.workingModel && result.workingModel !== selectedModel) {
        setSelectedModel(result.workingModel);
      }
      setValidationMsg({
        type: 'success',
        text: result.message,
      });
    } else {
      setValidationMsg({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handleSaveConfig = () => {
    if (keyInput.trim()) {
      if (!isValidGoogleAiApiKey(keyInput.trim())) {
        setValidationMsg({
          type: 'error',
          text: 'Key đang nhập dở chưa đúng định dạng (cần bắt đầu bằng AIzaSy... hoặc AQ...).',
        });
        return;
      }
      apiKeyManager.useKey(keyInput.trim(), provider);
    }

    apiKeyManager.setProvider(provider);
    apiKeyManager.setSavedModel(selectedModel, provider);
    onSaved(provider, selectedModel);
    onClose();
  };

  const availableModels =
    provider === 'agent-platform'
      ? AGENT_PLATFORM_MODELS
      : FALLBACK_GEMINI_MODELS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-modal-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-2xl animate-fade-slide">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="api-modal-title" className="text-lg font-bold">
                Cấu hình Kết nối Trí tuệ Nhân tạo (AI)
              </h2>
              <p className="text-xs text-teal-100">
                Hỗ trợ chuẩn Gemini API & Agent Platform API • Tự động chống quá tải 503
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ cài đặt"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] space-y-5 overflow-y-auto p-6">
          {/* Bước 1: Chọn dịch vụ thủ công */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-800">
              1. Chọn dịch vụ AI sử dụng (tách biệt vùng lưu trữ key)
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => handleSwitchProvider('gemini')}
                className={`flex flex-col items-start rounded-xl border-2 p-3.5 text-left transition ${
                  provider === 'gemini'
                    ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold text-slate-900">
                  ✨ Gemini API (Khuyên dùng)
                </span>
                <span className="mt-1 text-xs text-slate-600">
                  Google AI Studio • Mặc định <code>gemini-3.8-flash</code> tốc độ cao
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchProvider('agent-platform')}
                className={`flex flex-col items-start rounded-xl border-2 p-3.5 text-left transition ${
                  provider === 'agent-platform'
                    ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-bold text-slate-900">
                  ☁️ Agent Platform API
                </span>
                <span className="mt-1 text-xs text-slate-600">
                  Google Cloud Endpoint • Mặc định <code>gemini-2.5-flash</code>
                </span>
              </button>
            </div>
          </div>

          {/* Bước 2: Nhập API Key */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="api-key-input" className="text-sm font-bold text-slate-800">
                2. Nhập API Key ({provider === 'gemini' ? 'Gemini API' : 'Agent Platform API'})
              </label>
              <a
                href={
                  provider === 'gemini'
                    ? 'https://aistudio.google.com/apikey'
                    : 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/api-keys'
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
              >
                Lấy API Key tại đây <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Nhập key AIzaSy... hoặc AQ..."
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddKey}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900"
              >
                <Plus className="h-4 w-4" /> Thêm
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Hỗ trợ cả chuẩn key <code>AIzaSy...</code> và chuẩn mới <code>AQ...</code>. Có thể thêm nhiều key để tự động xoay vòng khi hết hạn mức.
            </p>

            {/* Danh sách key đã lưu */}
            {(savedKeys.length > 0 || envKeyCount > 0) && (
              <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Danh sách key khả dụng ({savedKeys.length + envKeyCount})</span>
                  {savedKeys.some((k) => k.status !== 'active') && (
                    <button
                      type="button"
                      onClick={() => {
                        apiKeyManager.resetAllKeys(provider);
                        setSavedKeys(apiKeyManager.getUserKeys(provider));
                      }}
                      className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" /> Kích hoạt lại tất cả
                    </button>
                  )}
                </div>

                {envKeyCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="flex items-center gap-1.5 font-medium">
                      <ShieldCheck className="h-4 w-4" /> Đã nạp {envKeyCount} key hệ thống từ biến môi trường
                    </span>
                    <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 font-semibold">
                      Sẵn sàng
                    </span>
                  </div>
                )}

                {savedKeys.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-slate-800">
                        {maskApiKey(item.key)}
                      </code>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          item.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'cooldown'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status === 'active'
                          ? 'Đang hoạt động'
                          : item.status === 'cooldown'
                            ? 'Tạm nghỉ (Quota)'
                            : 'Lỗi xác thực'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          apiKeyManager.useKey(item.key, provider);
                          setSavedKeys(apiKeyManager.getUserKeys(provider));
                        }}
                        className="rounded-md px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Ưu tiên dùng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          apiKeyManager.removeUserKey(item.key, provider);
                          setSavedKeys(apiKeyManager.getUserKeys(provider));
                        }}
                        aria-label="Xóa key"
                        className="rounded-md p-1 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bước 3: Chọn Model */}
          <div>
            <label htmlFor="model-select" className="mb-1.5 block text-sm font-bold text-slate-800">
              3. Chọn Model ưu tiên (tự động chuyển model dự phòng nếu quá tải)
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-600 focus:outline-none"
            >
              {availableModels.map((m, idx) => (
                <option key={m} value={m}>
                  {m} {idx === 0 ? '— Khuyên dùng mặc định' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Thông báo kết quả kiểm tra */}
          {validationMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
                validationMsg.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : validationMsg.type === 'error'
                    ? 'border-rose-300 bg-rose-50 text-rose-900'
                    : 'border-sky-300 bg-sky-50 text-sky-900'
              }`}
            >
              {validationMsg.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : validationMsg.type === 'error' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              ) : (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-sky-600" />
              )}
              <span>{validationMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Kiểm tra Key
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/70"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="min-h-[44px] rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
