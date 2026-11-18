import type { AiProvider } from '../types/education';

export const GOOGLE_AI_API_KEY_PATTERN = /^(?:AIzaSy|AIza|AQ)\S{12,}$/;

export const GEMINI_MODEL_STORAGE_KEY = 'gemini_model_id_v38';
export const LEGACY_GEMINI_MODEL_STORAGE_KEY = 'GEMINI_MODEL_ID';
export const AGENT_PLATFORM_MODEL_STORAGE_KEY = 'agent_platform_model_id_v1';

const PROVIDER_STORAGE_KEY = 'google_ai_provider';
const PROVIDER_SOURCE_KEY = 'google_ai_provider_selection_source';

const GEMINI_SINGLE_KEY = 'gemini_api_key';
const GEMINI_LIST_KEY = 'gemini_api_keys';
const AGENT_SINGLE_KEY = 'agent_platform_api_key';
const AGENT_LIST_KEY = 'agent_platform_api_keys';

export type ApiErrorCategory =
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMIT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'INVALID_ARGUMENT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface StoredKeyInfo {
  key: string;
  status: 'active' | 'cooldown' | 'error';
  cooldownUntil?: number;
  lastError?: string;
  source: 'user' | 'env';
}

interface ProviderKeyBucket {
  keys: StoredKeyInfo[];
  currentIndex: number;
}

export const isValidGoogleAiApiKey = (key: string): boolean => {
  if (!key) return false;
  return GOOGLE_AI_API_KEY_PATTERN.test(key.trim());
};

export const maskApiKey = (key: string): string => {
  const trimmed = key.trim();
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
};

const parseEnvKeys = (raw: string | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter((k) => isValidGoogleAiApiKey(k));
};

class ApiKeyManager {
  private envKeys: Record<AiProvider, StoredKeyInfo[]> = {
    gemini: [],
    'agent-platform': [],
  };

  constructor() {
    this.loadEnvKeys();
  }

  private loadEnvKeys(): void {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const geminiEnv = parseEnvKeys(metaEnv?.VITE_GEMINI_API_KEYS);
    const agentEnv = parseEnvKeys(metaEnv?.VITE_AGENT_PLATFORM_API_KEYS);

    this.envKeys = {
      gemini: geminiEnv.map((key) => ({ key, status: 'active', source: 'env' })),
      'agent-platform': agentEnv.map((key) => ({ key, status: 'active', source: 'env' })),
    };
  }

  public resetForTesting(): void {
    this.envKeys = { gemini: [], 'agent-platform': [] };
  }

  public initializeModelMigration(defaultGeminiModel = 'gemini-3.8-flash'): string {
    try {
      localStorage.removeItem(LEGACY_GEMINI_MODEL_STORAGE_KEY);
      const saved = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
      localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, defaultGeminiModel);
      return defaultGeminiModel;
    } catch {
      return defaultGeminiModel;
    }
  }

  public getSavedModel(provider: AiProvider): string {
    try {
      if (provider === 'agent-platform') {
        return localStorage.getItem(AGENT_PLATFORM_MODEL_STORAGE_KEY)?.trim() || 'gemini-2.5-flash';
      }
      return this.initializeModelMigration('gemini-3.8-flash');
    } catch {
      return provider === 'agent-platform' ? 'gemini-2.5-flash' : 'gemini-3.8-flash';
    }
  }

  public setSavedModel(model: string, provider: AiProvider): void {
    try {
      if (provider === 'agent-platform') {
        localStorage.setItem(AGENT_PLATFORM_MODEL_STORAGE_KEY, model.trim());
      } else {
        localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model.trim());
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  public getProvider(): AiProvider {
    try {
      const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
      const source = localStorage.getItem(PROVIDER_SOURCE_KEY);
      if (saved === 'agent-platform' && source === 'manual') {
        return 'agent-platform';
      }
      if (saved && saved !== 'gemini' && saved !== 'agent-platform') {
        // Nếu app cũ từng lưu giá trị lạ (ví dụ 'vertex'), đưa về 'gemini' mặc định
        localStorage.setItem(PROVIDER_STORAGE_KEY, 'gemini');
      }
      return 'gemini';
    } catch {
      return 'gemini';
    }
  }

  public setProvider(provider: AiProvider): void {
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
      localStorage.setItem(PROVIDER_SOURCE_KEY, 'manual');
    } catch {
      // Ignore storage errors
    }
  }

  private getStorageKeys(provider: AiProvider): { single: string; list: string } {
    return provider === 'agent-platform'
      ? { single: AGENT_SINGLE_KEY, list: AGENT_LIST_KEY }
      : { single: GEMINI_SINGLE_KEY, list: GEMINI_LIST_KEY };
  }

  private loadUserBucket(provider: AiProvider): ProviderKeyBucket {
    const { single, list } = this.getStorageKeys(provider);
    const envSet = new Set(this.envKeys[provider].map((k) => k.key));

    try {
      const raw = localStorage.getItem(list);
      let parsed: ProviderKeyBucket = { keys: [], currentIndex: 0 };
      if (raw) {
        const obj = JSON.parse(raw) as Partial<ProviderKeyBucket>;
        if (Array.isArray(obj.keys)) {
          parsed = {
            keys: obj.keys
              .filter((item) => item && typeof item.key === 'string' && !envSet.has(item.key))
              .map((item) => ({
                key: item.key.trim(),
                status: item.status || 'active',
                cooldownUntil: item.cooldownUntil,
                lastError: item.lastError,
                source: 'user' as const,
              })),
            currentIndex: typeof obj.currentIndex === 'number' ? obj.currentIndex : 0,
          };
        }
      }

      const preferredSingle = localStorage.getItem(single)?.trim();
      if (
        preferredSingle &&
        isValidGoogleAiApiKey(preferredSingle) &&
        !envSet.has(preferredSingle) &&
        !parsed.keys.some((k) => k.key === preferredSingle)
      ) {
        parsed.keys.unshift({ key: preferredSingle, status: 'active', source: 'user' });
        parsed.currentIndex = 0;
      }

      return parsed;
    } catch {
      return { keys: [], currentIndex: 0 };
    }
  }

  private saveUserBucket(provider: AiProvider, bucket: ProviderKeyBucket): void {
    const { single, list } = this.getStorageKeys(provider);
    const userOnly = bucket.keys.filter((k) => k.source === 'user');
    try {
      localStorage.setItem(
        list,
        JSON.stringify({
          keys: userOnly,
          currentIndex: Math.min(bucket.currentIndex, Math.max(0, userOnly.length - 1)),
        }),
      );
      const current = userOnly[bucket.currentIndex] || userOnly[0];
      if (current) {
        localStorage.setItem(single, current.key);
      } else {
        localStorage.removeItem(single);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private refreshCooldowns(items: StoredKeyInfo[]): void {
    const now = Date.now();
    for (const item of items) {
      if (item.status === 'cooldown' && item.cooldownUntil && now >= item.cooldownUntil) {
        item.status = 'active';
        item.cooldownUntil = undefined;
      }
    }
  }

  public getUserKeys(provider: AiProvider): StoredKeyInfo[] {
    const bucket = this.loadUserBucket(provider);
    this.refreshCooldowns(bucket.keys);
    return bucket.keys;
  }

  public getEnvKeyCount(provider: AiProvider): number {
    return this.envKeys[provider].length;
  }

  public useKey(rawKey: string, provider: AiProvider): boolean {
    const trimmed = rawKey.trim();
    if (!isValidGoogleAiApiKey(trimmed)) return false;

    const bucket = this.loadUserBucket(provider);
    const existingIdx = bucket.keys.findIndex((k) => k.key === trimmed);
    if (existingIdx >= 0) {
      bucket.keys[existingIdx].status = 'active';
      bucket.keys[existingIdx].cooldownUntil = undefined;
      bucket.keys[existingIdx].lastError = undefined;
      bucket.currentIndex = existingIdx;
    } else {
      bucket.keys.unshift({
        key: trimmed,
        status: 'active',
        source: 'user',
      });
      bucket.currentIndex = 0;
    }
    this.saveUserBucket(provider, bucket);
    return true;
  }

  public removeUserKey(rawKey: string, provider: AiProvider): void {
    const bucket = this.loadUserBucket(provider);
    bucket.keys = bucket.keys.filter((k) => k.key !== rawKey.trim());
    bucket.currentIndex = 0;
    this.saveUserBucket(provider, bucket);
  }

  public getActiveKey(provider: AiProvider): string | null {
    const bucket = this.loadUserBucket(provider);
    this.refreshCooldowns(bucket.keys);
    this.refreshCooldowns(this.envKeys[provider]);

    if (bucket.keys.length > 0) {
      for (let offset = 0; offset < bucket.keys.length; offset++) {
        const idx = (bucket.currentIndex + offset) % bucket.keys.length;
        const candidate = bucket.keys[idx];
        if (candidate.status === 'active') {
          if (idx !== bucket.currentIndex) {
            bucket.currentIndex = idx;
            this.saveUserBucket(provider, bucket);
          }
          return candidate.key;
        }
      }
    }

    for (const envCandidate of this.envKeys[provider]) {
      if (envCandidate.status === 'active') {
        return envCandidate.key;
      }
    }

    return null;
  }

  public hasAnyConfiguredKey(provider?: AiProvider): boolean {
    const activeProvider = provider || this.getProvider();
    return Boolean(this.getActiveKey(activeProvider));
  }

  public markKeyError(
    key: string,
    errorType: ApiErrorCategory,
    provider: AiProvider,
  ): { rotated: boolean; nextKey: string | null } {
    // 503 / lỗi máy chủ tạm thời KHÔNG PHẢI lỗi của API Key -> giữ nguyên active
    if (
      errorType === 'SERVER_ERROR' ||
      errorType === 'NOT_FOUND' ||
      errorType === 'INVALID_ARGUMENT' ||
      errorType === 'NETWORK_ERROR' ||
      errorType === 'UNKNOWN'
    ) {
      return { rotated: false, nextKey: this.getActiveKey(provider) };
    }

    const now = Date.now();
    const bucket = this.loadUserBucket(provider);
    const applyStatus = (target: StoredKeyInfo) => {
      target.lastError = errorType;
      if (errorType === 'QUOTA_EXCEEDED') {
        target.status = 'cooldown';
        target.cooldownUntil = now + 10 * 60 * 1000; // 10 phút
      } else if (errorType === 'RATE_LIMIT') {
        target.status = 'cooldown';
        target.cooldownUntil = now + 60 * 1000; // 60 giây
      } else if (errorType === 'INVALID_API_KEY' || errorType === 'PERMISSION_DENIED') {
        target.status = 'error';
      }
    };

    const userTarget = bucket.keys.find((k) => k.key === key);
    if (userTarget) {
      applyStatus(userTarget);
      if (bucket.keys.length > 1) {
        bucket.currentIndex = (bucket.currentIndex + 1) % bucket.keys.length;
      }
      this.saveUserBucket(provider, bucket);
    } else {
      const envTarget = this.envKeys[provider].find((k) => k.key === key);
      if (envTarget) {
        applyStatus(envTarget);
      }
    }

    const nextKey = this.getActiveKey(provider);
    return { rotated: nextKey !== null && nextKey !== key, nextKey };
  }

  public resetAllKeys(provider: AiProvider): void {
    const bucket = this.loadUserBucket(provider);
    for (const k of bucket.keys) {
      k.status = 'active';
      k.cooldownUntil = undefined;
      k.lastError = undefined;
    }
    this.saveUserBucket(provider, bucket);
    for (const k of this.envKeys[provider]) {
      k.status = 'active';
      k.cooldownUntil = undefined;
      k.lastError = undefined;
    }
  }
}

export const apiKeyManager = new ApiKeyManager();
