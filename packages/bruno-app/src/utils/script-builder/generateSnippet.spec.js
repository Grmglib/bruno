import { generateSnippet, mergeScript } from './generateSnippet';

describe('generateSnippet', () => {
  it('generates bru.setEnvVar for post-response access_token extraction', () => {
    const snippet = generateSnippet({
      scriptPhase: 'post-response',
      actionId: 'set-env-var',
      propertyPath: 'access_token',
      varName: 'my_access_token'
    });

    expect(snippet).toBe('bru.setEnvVar(\'my_access_token\', res.body.access_token);');
  });

  it('generates persistent env var snippet', () => {
    const snippet = generateSnippet({
      scriptPhase: 'post-response',
      actionId: 'set-env-var-persist',
      propertyPath: 'access_token',
      varName: 'access_token'
    });

    expect(snippet).toBe('bru.setEnvVar(\'access_token\', res.body.access_token, { persist: true });');
  });

  it('generates pre-request header snippet from env var', () => {
    const snippet = generateSnippet({
      scriptPhase: 'pre-request',
      actionId: 'set-header-from-env',
      propertyPath: 'access_token',
      varName: 'access_token',
      headerName: 'Authorization'
    });

    expect(snippet).toBe('req.setHeader(\'Authorization\', bru.getEnvVar(\'access_token\'));');
  });

  it('generates pre-request body field snippet', () => {
    const snippet = generateSnippet({
      scriptPhase: 'pre-request',
      actionId: 'set-body-field-from-env',
      propertyPath: 'data.token',
      varName: 'token'
    });

    expect(snippet).toBe([
      'const body = req.getBody() || {};',
      'body.data.token = bru.getEnvVar(\'token\');',
      'req.setBody(body);'
    ].join('\n'));
  });
});

describe('mergeScript', () => {
  it('replaces empty script with generated snippet', () => {
    expect(mergeScript('', 'bru.setVar(\'a\', 1);')).toBe('bru.setVar(\'a\', 1);');
  });

  it('appends snippet to existing script', () => {
    expect(mergeScript('existing();', 'bru.setVar(\'a\', 1);', 'append')).toBe('existing();\n\nbru.setVar(\'a\', 1);');
  });

  it('replaces existing script when mode is replace', () => {
    expect(mergeScript('existing();', 'bru.setVar(\'a\', 1);', 'replace')).toBe('bru.setVar(\'a\', 1);');
  });
});
