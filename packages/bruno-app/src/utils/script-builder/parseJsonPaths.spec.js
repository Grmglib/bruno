import { collectJsonPaths, parseJsonSample, pathToJsAccess } from './parseJsonPaths';

describe('parseJsonSample', () => {
  it('parses a flat JSON object and collects leaf paths', () => {
    const sample = JSON.stringify({
      access_token: 'token-value',
      Expiration: '2026-06-27T13:31:31-03:00'
    });

    const result = parseJsonSample(sample);

    expect(result.error).toBeNull();
    expect(result.paths).toEqual([
      { path: 'access_token', valueType: 'string', sampleValue: 'token-value' },
      { path: 'Expiration', valueType: 'string', sampleValue: '2026-06-27T13:31:31-03:00' }
    ]);
  });

  it('collects nested and array paths', () => {
    const sample = JSON.stringify({
      data: {
        token: 'abc'
      },
      items: [{ id: 1 }]
    });

    const result = parseJsonSample(sample);

    expect(result.paths).toEqual([
      { path: 'data.token', valueType: 'string', sampleValue: 'abc' },
      { path: 'items.0.id', valueType: 'number', sampleValue: 1 }
    ]);
  });

  it('returns an error for invalid JSON', () => {
    const result = parseJsonSample('{ invalid');

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.paths).toEqual([]);
  });
});

describe('pathToJsAccess', () => {
  it('builds dot notation for simple paths', () => {
    expect(pathToJsAccess('res.body', 'access_token')).toBe('res.body.access_token');
  });

  it('builds bracket notation for numeric and special segments', () => {
    expect(pathToJsAccess('res.body', 'items.0.id')).toBe('res.body.items[0].id');
    expect(pathToJsAccess('res.body', 'my-key')).toBe('res.body[\'my-key\']');
  });
});

describe('collectJsonPaths', () => {
  it('returns an empty list for primitives without prefix', () => {
    expect(collectJsonPaths('value')).toEqual([]);
  });
});
