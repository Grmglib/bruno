const https = require('node:https');
const { applyHttp2Transport } = require('./http2');

class HttpsProxyAgent extends https.Agent {}

describe('applyHttp2Transport', () => {
  it('leaves HTTP/1.1 requests alone', () => {
    const config = { httpVersion: 1, httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
    applyHttp2Transport(config);
    expect(config.http2Options).toBeUndefined();
  });

  it('copies TLS options from the direct agent', () => {
    const config = {
      httpVersion: 2,
      httpsAgent: new https.Agent({ rejectUnauthorized: false, minVersion: 'TLSv1.2' })
    };
    applyHttp2Transport(config);
    expect(config.http2Options.rejectUnauthorized).toBe(false);
    expect(config.http2Options.minVersion).toBe('TLSv1.2');
  });

  it('refuses a proxy agent', () => {
    const config = { httpVersion: 2, httpsAgent: new HttpsProxyAgent() };
    expect(() => applyHttp2Transport(config)).toThrow(/proxies/);
  });
});
