const http = require('node:http');
const https = require('node:https');

// Fields https.Agent keeps that http2.connect actually honors.
// keepAlive and caCertificatesCount are agent-only and must not be forwarded.
const TLS_KEYS = ['ca', 'cert', 'key', 'pfx', 'passphrase', 'rejectUnauthorized', 'secureContext', 'minVersion'];

function agentUsesProxy(agent) {
  if (!agent) return false;
  let proto = Object.getPrototypeOf(agent);
  while (proto) {
    const name = proto.constructor && proto.constructor.name;
    if (name && /proxy|socks/i.test(name)) return true;
    if (proto === https.Agent.prototype || proto === http.Agent.prototype) return false;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// Axios HTTP/2 ignores http(s).Agent. Copy TLS options onto http2Options and
// refuse a proxy agent — the adapter connects on its own and would skip it.
function applyHttp2Transport(config) {
  if (!config || Number(config.httpVersion) !== 2) return;

  const agent = config.httpsAgent || config.httpAgent;
  if (agentUsesProxy(agent)) {
    throw new Error('HTTP/2 does not support proxies. Use HTTP/1.1 for this collection, or turn the proxy off.');
  }

  const opts = (agent && agent.options) || {};
  const http2Options = { ...(config.http2Options || {}) };
  for (const key of TLS_KEYS) {
    if (opts[key] !== undefined) http2Options[key] = opts[key];
  }
  config.http2Options = http2Options;
}

module.exports = {
  applyHttp2Transport,
  agentUsesProxy
};
