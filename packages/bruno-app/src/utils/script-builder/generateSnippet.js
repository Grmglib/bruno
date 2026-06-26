import { pathToJsAccess } from './parseJsonPaths';

const quoteJsString = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'`;

export const generateSnippet = ({
  scriptPhase,
  actionId,
  propertyPath,
  varName,
  headerName,
  queryParamName
}) => {
  if (scriptPhase === 'post-response') {
    const sourceExpression = pathToJsAccess('res.body', propertyPath);

    if (actionId === 'set-env-var') {
      return `bru.setEnvVar(${quoteJsString(varName)}, ${sourceExpression});`;
    }

    if (actionId === 'set-env-var-persist') {
      return `bru.setEnvVar(${quoteJsString(varName)}, ${sourceExpression}, { persist: true });`;
    }

    if (actionId === 'set-runtime-var') {
      return `bru.setVar(${quoteJsString(varName)}, ${sourceExpression});`;
    }
  }

  if (scriptPhase === 'pre-request') {
    const envExpression = `bru.getEnvVar(${quoteJsString(varName)})`;

    if (actionId === 'set-header-from-env') {
      return `req.setHeader(${quoteJsString(headerName)}, ${envExpression});`;
    }

    if (actionId === 'set-body-field-from-env') {
      const fieldExpression = pathToJsAccess('body', propertyPath);
      return [
        'const body = req.getBody() || {};',
        `${fieldExpression} = ${envExpression};`,
        'req.setBody(body);'
      ].join('\n');
    }

    if (actionId === 'set-query-param-from-env') {
      return [
        'const url = new URL(req.getUrl());',
        `url.searchParams.set(${quoteJsString(queryParamName)}, ${envExpression});`,
        'req.setUrl(url.toString());'
      ].join('\n');
    }
  }

  return '';
};

export const mergeScript = (currentScript, snippet, mode = 'replace') => {
  const current = (currentScript || '').trim();
  const nextSnippet = (snippet || '').trim();

  if (!nextSnippet) {
    return current;
  }

  if (!current) {
    return nextSnippet;
  }

  if (mode === 'append') {
    return `${current}\n\n${nextSnippet}`;
  }

  return nextSnippet;
};
