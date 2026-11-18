import { beforeEach, describe, expect, it } from 'vitest';
import {
  apiKeyManager,
  GEMINI_MODEL_STORAGE_KEY,
  isValidGoogleAiApiKey,
  LEGACY_GEMINI_MODEL_STORAGE_KEY,
} from '../services/apiKeyManager';

describe('apiKeyManager & Google AI Key Validation (api.md compliance)', () => {
  beforeEach(() => {
    localStorage.clear();
    apiKeyManager.resetForTesting();
  });

  it('chấp nhận cả key AIzaSy cũ và key AQ mới, từ chối key sai định dạng', () => {
    expect(isValidGoogleAiApiKey('AIzaSyD1234567890abcdefghijk')).toBe(true);
    expect(isValidGoogleAiApiKey('AQ.Ab8RN6L1234567890abcdefgh')).toBe(true);
    expect(isValidGoogleAiApiKey('AQ_new_format_key_1234567890')).toBe(true);
    expect(isValidGoogleAiApiKey('')).toBe(false);
    expect(isValidGoogleAiApiKey('AIzaSy short')).toBe(false);
    expect(isValidGoogleAiApiKey('sk-openai-123456789012345678')).toBe(false);
  });

  it('lưu tách biệt hoàn toàn key của Gemini API và Agent Platform API', () => {
    const geminiKey = 'AQ.GeminiEndpointKey1234567890';
    const agentKey = 'AQ.AgentPlatformKey9876543210';

    apiKeyManager.setProvider('gemini');
    apiKeyManager.useKey(geminiKey, 'gemini');

    apiKeyManager.setProvider('agent-platform');
    apiKeyManager.useKey(agentKey, 'agent-platform');

    expect(apiKeyManager.getActiveKey('gemini')).toBe(geminiKey);
    expect(apiKeyManager.getActiveKey('agent-platform')).toBe(agentKey);
    expect(apiKeyManager.getProvider()).toBe('agent-platform');
  });

  it('tự động di trú localStorage model cũ sang gemini_model_id_v38 với mặc định gemini-3.8-flash', () => {
    localStorage.setItem(LEGACY_GEMINI_MODEL_STORAGE_KEY, 'gemini-2.5-flash');
    const model = apiKeyManager.initializeModelMigration();

    expect(localStorage.getItem(LEGACY_GEMINI_MODEL_STORAGE_KEY)).toBeNull();
    expect(model).toBe('gemini-3.8-flash');
    expect(localStorage.getItem(GEMINI_MODEL_STORAGE_KEY)).toBe('gemini-3.8-flash');
  });

  it('chỉ cooldown key khi gặp QUOTA_EXCEEDED/RATE_LIMIT và không khóa key khi gặp 503 MODEL_OVERLOADED', () => {
    const key1 = 'AIzaSyFirstKey123456789012345';
    const key2 = 'AIzaSySecondKey12345678901234';

    apiKeyManager.useKey(key2, 'gemini');
    apiKeyManager.useKey(key1, 'gemini');
    expect(apiKeyManager.getActiveKey('gemini')).toBe(key1);

    // 503 overload không được làm hỏng key đang dùng
    apiKeyManager.markKeyError(key1, 'SERVER_ERROR', 'gemini');
    expect(apiKeyManager.getActiveKey('gemini')).toBe(key1);

    // 429 quota -> cooldown key1 và xoay sang key2, nhưng không đánh dấu invalid vĩnh viễn
    apiKeyManager.markKeyError(key1, 'QUOTA_EXCEEDED', 'gemini');
    expect(apiKeyManager.getActiveKey('gemini')).toBe(key2);
  });
});
