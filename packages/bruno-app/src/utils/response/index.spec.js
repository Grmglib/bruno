import {
  estimateLineCountFromText,
  estimateResponseLineCount,
  getResponsePerformanceProfile
} from './index';

describe('response performance helpers', () => {
  it('estimates line count from long text payloads', () => {
    const text = 'line\n'.repeat(20000);

    expect(estimateLineCountFromText(text)).toBeGreaterThanOrEqual(20000);
  });

  it('detects simplified mode for line-heavy textual responses', () => {
    const data = 'line\n'.repeat(18000);
    const profile = getResponsePerformanceProfile({
      data,
      dataBuffer: Buffer.from(data).toString('base64'),
      responseSize: Buffer.byteLength(data),
      isTextual: true
    });

    expect(profile.shouldUseSimplifiedView).toBe(true);
    expect(profile.shouldWarnBeforeRender).toBe(false);
    expect(profile.estimatedLineCount).toBeGreaterThanOrEqual(18000);
  });

  it('warns before rendering very large line-heavy responses', () => {
    const data = 'line\n'.repeat(32000);
    const profile = getResponsePerformanceProfile({
      data,
      dataBuffer: Buffer.from(data).toString('base64'),
      responseSize: Buffer.byteLength(data),
      isTextual: true
    });

    expect(profile.shouldUseSimplifiedView).toBe(true);
    expect(profile.shouldWarnBeforeRender).toBe(true);
  });

  it('falls back to base64 sampling when the response is already parsed', () => {
    const raw = 'a\n'.repeat(16000);
    const estimatedLines = estimateResponseLineCount({
      data: { ok: true },
      dataBuffer: Buffer.from(raw).toString('base64')
    });

    expect(estimatedLines).toBeGreaterThanOrEqual(16000);
  });
});
