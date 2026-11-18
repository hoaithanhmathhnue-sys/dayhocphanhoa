import { ThinkingLevel } from '@google/genai';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL,
  FALLBACK_GEMINI_MODELS,
  getGeminiGenerationConfig,
  getOrderedModels,
  parseApiError,
} from '../services/geminiService';

describe('geminiService Configuration & Error Parsing (api.md compliance)', () => {
  it('đặt mặc định gemini-3.8-flash và giữ đúng thứ tự chuỗi fallback chuẩn', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(FALLBACK_GEMINI_MODELS[0]).toBe('gemini-3.8-flash');
    expect(FALLBACK_GEMINI_MODELS[1]).toBe('gemini-3.7-flash');
    expect(FALLBACK_GEMINI_MODELS[2]).toBe('gemini-3.5-flash-lite');

    const ordered = getOrderedModels('gemini-3.6-flash', 'gemini');
    expect(ordered[0]).toBe('gemini-3.6-flash');
    expect(ordered[1]).toBe('gemini-3.8-flash');
    // Không trùng lặp gemini-3.6-flash
    expect(ordered.filter((m) => m === 'gemini-3.6-flash')).toHaveLength(1);
  });

  it('kiểm tra API_KEY_INVALID trước mã 400 và phân biệt đúng 503 quá tải với lỗi key', () => {
    const fakeInvalidKey400 = {
      status: 400,
      message: '{"error":{"code":400,"message":"API key not valid","reason":"API_KEY_INVALID"}}',
    };
    expect(parseApiError(fakeInvalidKey400)).toBe('INVALID_API_KEY');

    const fakeOverload503 = {
      status: 503,
      message: 'This model is currently experiencing high demand. UNAVAILABLE.',
    };
    expect(parseApiError(fakeOverload503)).toBe('SERVER_ERROR');

    const fakeQuota429 = {
      status: 429,
      message: 'Resource has been exhausted (e.g. check quota).',
    };
    expect(parseApiError(fakeQuota429)).toBe('QUOTA_EXCEEDED');
  });

  it('không truyền temperature/topP/topK cho dòng gemini-3* và gắn đúng thinkingLevel cho Gemini API', () => {
    const gemini3Cfg = getGeminiGenerationConfig('gemini-3.8-flash', {
      provider: 'gemini',
      thinkingLevel: ThinkingLevel.MEDIUM,
      responseMimeType: 'application/json',
    });

    expect(gemini3Cfg).not.toHaveProperty('temperature');
    expect(gemini3Cfg).not.toHaveProperty('topP');
    expect(gemini3Cfg).not.toHaveProperty('topK');
    expect(gemini3Cfg.thinkingConfig).toEqual({ thinkingLevel: ThinkingLevel.MEDIUM });

    // Agent Platform không truyền thinkingConfig
    const agentCfg = getGeminiGenerationConfig('gemini-3.8-flash', {
      provider: 'agent-platform',
      thinkingLevel: ThinkingLevel.MEDIUM,
    });
    expect(agentCfg).not.toHaveProperty('thinkingConfig');

    // Gemini 2.5 giữ sampling và không gắn thinkingLevel của 3.x
    const gemini25Cfg = getGeminiGenerationConfig('gemini-2.5-flash', {
      provider: 'agent-platform',
    });
    expect(gemini25Cfg.temperature).toBeDefined();
    expect(gemini25Cfg).not.toHaveProperty('thinkingConfig');
  });
});
