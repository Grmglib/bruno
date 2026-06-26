import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import postmanTranslation from '../postman/postman-translations';
import { validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';

const normalizeVariables = (value) => {
  value = String(value ?? '');
  const regexVariable = /{{.*?}}/g;
  const variables = value.match(regexVariable) || [];
  each(variables, (variable) => {
    value = value.replace(variable, variable.replace('_.', '').replaceAll(' ', ''));
  });
  return value;
};

const sanitizeFolderName = (name) => {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) {
    return 'collection';
  }
  return trimmed.replace(/[^\p{L}\p{N}\-_\s]/gu, '_').replace(/\s+/g, '_').toLowerCase();
};

const buildModuleNameMap = (moduleSettings = []) => {
  const map = {};
  each(moduleSettings, (module) => {
    if (module?.id != null) {
      map[String(module.id)] = module.name || `Module_${module.id}`;
    }
  });
  return map;
};

const buildModuleVariablesMap = (moduleSettings = []) => {
  const map = {};
  each(moduleSettings, (module) => {
    if (module?.id != null && Array.isArray(module.moduleVariables)) {
      map[String(module.id)] = module.moduleVariables;
    }
  });
  return map;
};

const countApiRequests = (items = []) => {
  let count = 0;
  each(items, (item) => {
    if (item?.api) {
      count += 1;
    }
    if (Array.isArray(item?.items)) {
      count += countApiRequests(item.items);
    }
  });
  return count;
};

const jsonSchemaToExample = (schema) => {
  if (!schema || typeof schema !== 'object') {
    return '{}';
  }

  if (schema.example !== undefined) {
    return typeof schema.example === 'string' ? schema.example : JSON.stringify(schema.example, null, 2);
  }

  const properties = schema.properties || {};
  const orderedKeys = schema['x-apidog-orders'] || Object.keys(properties);
  const obj = {};

  each(orderedKeys, (key) => {
    const prop = properties[key];
    if (!prop) {
      return;
    }
    if (prop.type === 'string') {
      obj[key] = prop.example ?? '';
    } else if (prop.type === 'number' || prop.type === 'integer') {
      obj[key] = prop.example ?? 0;
    } else if (prop.type === 'boolean') {
      obj[key] = prop.example ?? false;
    } else if (prop.type === 'array') {
      obj[key] = prop.example ?? [];
    } else if (prop.type === 'object') {
      obj[key] = prop.example ?? {};
    }
  });

  return JSON.stringify(obj, null, 2);
};

const mapHeaders = (parameters = []) => {
  return (parameters || []).map((param) => ({
    uid: uuid(),
    name: param.name,
    value: normalizeVariables(param.example ?? param.value ?? ''),
    description: param.description || '',
    enabled: param.enable !== false
  }));
};

const mapParams = (parameters = [], type) => {
  return (parameters || []).map((param) => ({
    uid: uuid(),
    name: param.name,
    value: normalizeVariables(param.example ?? param.value ?? ''),
    description: param.description || '',
    type,
    enabled: param.enable !== false
  }));
};

const mapFormParameters = (parameters = []) => {
  return (parameters || []).map((param) => ({
    uid: uuid(),
    name: param.name,
    value: normalizeVariables(param.example ?? param.value ?? ''),
    description: param.description || '',
    enabled: param.enable !== false
  }));
};

const mapMultipartParameters = (parameters = []) => {
  return (parameters || []).map((param) => ({
    uid: uuid(),
    type: param.type === 'file' ? 'file' : 'text',
    name: param.name,
    value: normalizeVariables(param.example ?? param.value ?? ''),
    description: param.description || '',
    enabled: param.enable !== false
  }));
};

const processSecurityScheme = (securityScheme, requestObject) => {
  const configs = get(securityScheme, 'use.configs', {});
  const firstConfig = Object.values(configs)[0];

  if (!firstConfig) {
    requestObject.auth.mode = 'inherit';
    return;
  }

  const authConfigs = get(firstConfig, 'authConfigs', {});
  const apidogAuth = get(authConfigs, 'x-apidog', authConfigs);

  if (apidogAuth.token) {
    requestObject.auth.mode = 'bearer';
    requestObject.auth.bearer = {
      token: normalizeVariables(apidogAuth.token)
    };
    return;
  }

  if (apidogAuth.username || apidogAuth.password) {
    requestObject.auth.mode = 'basic';
    requestObject.auth.basic = {
      username: normalizeVariables(apidogAuth.username || ''),
      password: normalizeVariables(apidogAuth.password || '')
    };
    return;
  }

  if (apidogAuth.key && apidogAuth.value) {
    requestObject.auth.mode = 'apikey';
    requestObject.auth.apikey = {
      key: normalizeVariables(apidogAuth.key),
      value: normalizeVariables(apidogAuth.value),
      placement: apidogAuth.in === 'query' ? 'queryparams' : 'header'
    };
    return;
  }

  requestObject.auth.mode = 'inherit';
};

const processAuth = (auth, securityScheme, requestObject, issues, requestPath) => {
  const authType = get(auth, 'type', '');

  if (authType === 'inherit') {
    requestObject.auth.mode = 'inherit';
    return;
  }

  if (authType === 'securityscheme' || authType === 'securityScheme') {
    processSecurityScheme(securityScheme, requestObject);
    return;
  }

  if (!authType || authType === 'noauth') {
    requestObject.auth.mode = 'none';
    return;
  }

  if (authType === 'bearer') {
    requestObject.auth.mode = 'bearer';
    requestObject.auth.bearer = {
      token: normalizeVariables(get(auth, 'bearer.token', ''))
    };
    return;
  }

  if (authType === 'basic') {
    requestObject.auth.mode = 'basic';
    requestObject.auth.basic = {
      username: normalizeVariables(get(auth, 'basic.username', '')),
      password: normalizeVariables(get(auth, 'basic.password', ''))
    };
    return;
  }

  if (authType === 'apikey') {
    const apikey = get(auth, 'apikey', {});
    requestObject.auth.mode = 'apikey';
    requestObject.auth.apikey = {
      key: normalizeVariables(apikey.key || ''),
      value: normalizeVariables(apikey.value || ''),
      placement: apikey.in === 'query' ? 'queryparams' : 'header'
    };
    return;
  }

  issues.push({
    path: requestPath,
    severity: 'warning',
    message: `Unsupported auth type "${authType}" — auth was not imported`
  });
  requestObject.auth.mode = 'none';
};

const processRequestBody = (requestBody, requestObject) => {
  if (!requestBody || !requestBody.type) {
    return;
  }

  const contentType = (requestBody.type || '').split(';')[0].trim();

  if (contentType === 'application/json') {
    requestObject.body.mode = 'json';
    const example = get(requestBody, 'examples[0].value');
    if (example) {
      requestObject.body.json = normalizeVariables(example);
    } else {
      requestObject.body.json = jsonSchemaToExample(requestBody.jsonSchema);
    }
    return;
  }

  if (contentType === 'application/x-www-form-urlencoded') {
    requestObject.body.mode = 'formUrlEncoded';
    requestObject.body.formUrlEncoded = mapFormParameters(requestBody.parameters);
    return;
  }

  if (contentType === 'multipart/form-data') {
    requestObject.body.mode = 'multipartForm';
    requestObject.body.multipartForm = mapMultipartParameters(requestBody.parameters);
    return;
  }

  if (contentType === 'text/plain') {
    requestObject.body.mode = 'text';
    requestObject.body.text = normalizeVariables(get(requestBody, 'examples[0].value', ''));
    return;
  }

  if (contentType === 'text/xml' || contentType === 'application/xml') {
    requestObject.body.mode = 'xml';
    requestObject.body.xml = normalizeVariables(get(requestBody, 'examples[0].value', ''));
  }
};

const extractScripts = (preProcessors = [], postProcessors = []) => {
  const scripts = { req: '', res: '' };

  each(preProcessors, (processor) => {
    if (processor?.type !== 'customScript' || processor.enable === false) {
      return;
    }

    const script = postmanTranslation(processor.data || '');
    scripts.req = scripts.req ? `${scripts.req}\n${script}` : script;
  });

  each(postProcessors, (processor) => {
    if (processor?.type !== 'customScript' || processor.enable === false) {
      return;
    }

    const script = postmanTranslation(processor.data || '');
    scripts.res = scripts.res ? `${scripts.res}\n${script}` : script;
  });

  if (scripts.req || scripts.res) {
    return scripts;
  }

  return null;
};

const buildRequestUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `{{baseUrl}}${normalizedPath}`;
};

const transformApidogRequest = (item, issues) => {
  const api = item.api;
  const requestPath = item.name || api.path;

  const brunoRequestItem = {
    uid: uuid(),
    name: item.name || api.operationId || api.path || 'Untitled Request',
    type: 'http-request',
    request: {
      url: buildRequestUrl(api.path || ''),
      method: (api.method || 'get').toUpperCase(),
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null,
        awsv4: null,
        apikey: null,
        oauth1: null,
        oauth2: null
      },
      headers: [],
      params: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: [],
        sparql: null,
        file: null,
        graphql: null
      },
      script: {
        req: '',
        res: ''
      },
      vars: {
        req: [],
        res: []
      },
      assertions: [],
      tests: ''
    }
  };

  const parameters = api.parameters || {};
  brunoRequestItem.request.headers = mapHeaders(parameters.header);
  brunoRequestItem.request.params = [
    ...mapParams(parameters.query, 'query'),
    ...mapParams(parameters.path, 'path')
  ];

  processAuth(api.auth, api.securityScheme, brunoRequestItem.request, issues, requestPath);
  processRequestBody(api.requestBody, brunoRequestItem.request);

  const scripts = extractScripts(api.preProcessors || [], api.postProcessors || []);
  if (scripts) {
    brunoRequestItem.request.script.req = scripts.req;
    brunoRequestItem.request.script.res = scripts.res;
  }

  if (api.description) {
    brunoRequestItem.request.docs = api.description;
  }

  return brunoRequestItem;
};

const buildFolderRoot = (folderName) => ({
  meta: {
    name: folderName
  },
  request: {
    auth: {
      mode: 'inherit'
    },
    headers: [],
    script: {},
    vars: {
      req: [],
      res: []
    }
  }
});

const parseApidogItems = (items = [], issues = []) => {
  const result = [];

  each(items, (item) => {
    if (!item) {
      return;
    }

    if (item.api) {
      result.push(transformApidogRequest(item, issues));
      return;
    }

    if (Array.isArray(item.items) && item.items.length > 0) {
      const folderItems = parseApidogItems(item.items, issues);
      if (folderItems.length > 0) {
        const folderName = item.name || 'Untitled Folder';
        result.push({
          uid: uuid(),
          name: folderName,
          type: 'folder',
          items: folderItems,
          root: buildFolderRoot(folderName)
        });
      }
    }
  });

  return result;
};

const buildEnvironmentsForModule = (environments = [], moduleId) => {
  const moduleKey = String(moduleId);

  return (environments || []).map((env, index) => {
    const variables = [];

    const baseUrl = get(env, `baseUrls.${moduleKey}`) || env.baseUrl || '';
    if (baseUrl) {
      variables.push({
        uid: uuid(),
        name: 'baseUrl',
        value: baseUrl,
        type: 'text',
        enabled: true,
        secret: false
      });
    }

    each(env.variables || [], (variable) => {
      variables.push({
        uid: uuid(),
        name: variable.name,
        value: String(variable.value ?? variable.initialValue ?? ''),
        type: 'text',
        enabled: true,
        secret: variable.securityType === 'secret'
      });
    });

    return {
      uid: uuid(),
      name: env.name || `Environment ${index + 1}`,
      variables
    };
  });
};

const buildCollectionRoot = (moduleVariables = []) => {
  const reqVars = (moduleVariables || []).map((variable) => ({
    uid: uuid(),
    name: variable.name,
    value: String(variable.value ?? variable.initialValue ?? ''),
    enabled: true
  }));

  return {
    meta: {
      name: ''
    },
    request: {
      auth: {
        mode: 'none'
      },
      headers: [],
      script: {},
      vars: {
        req: reqVars,
        res: []
      }
    }
  };
};

const parseApidogModule = (apiCollectionEntry, moduleNameMap, moduleVariablesMap, environments, issues) => {
  const moduleId = String(apiCollectionEntry.moduleId);
  const items = parseApidogItems(apiCollectionEntry.items || [], issues);

  if (items.length === 0) {
    return null;
  }

  const moduleName = moduleNameMap[moduleId] || `Module_${moduleId}`;

  return {
    name: moduleName,
    uid: uuid(),
    version: '1',
    items,
    environments: buildEnvironmentsForModule(environments, moduleId),
    root: buildCollectionRoot(moduleVariablesMap[moduleId])
  };
};

export const apidogToBruno = (apidogProject) => {
  try {
    if (typeof apidogProject !== 'object' || apidogProject === null) {
      apidogProject = jsyaml.load(apidogProject, { schema: jsyaml.JSON_SCHEMA });
    }

    if (!apidogProject?.apidogProject || apidogProject?.$schema?.app !== 'apidog') {
      throw new Error('Invalid Apidog project format');
    }

    const issues = [];
    const moduleNameMap = buildModuleNameMap(apidogProject.moduleSettings || []);
    const moduleVariablesMap = buildModuleVariablesMap(apidogProject.moduleSettings || []);
    const environments = apidogProject.environments || [];
    const containerFolder = sanitizeFolderName(apidogProject.info?.name || 'apidog-project');

    const collections = [];

    each(apidogProject.apiCollection || [], (apiCollectionEntry) => {
      if (countApiRequests(apiCollectionEntry.items || []) === 0) {
        return;
      }

      const collection = parseApidogModule(
        apiCollectionEntry,
        moduleNameMap,
        moduleVariablesMap,
        environments,
        issues
      );

      if (collection) {
        collections.push(collection);
      }
    });

    if (collections.length === 0) {
      throw new Error('No HTTP requests found in Apidog project');
    }

    const validatedCollections = collections.map((collection) => {
      const transformedCollection = transformItemsInCollection(collection);
      const hydratedCollection = hydrateSeqInCollection(transformedCollection);
      return validateSchema(hydratedCollection);
    });

    return {
      containerFolder,
      collections: validatedCollections,
      issues
    };
  } catch (err) {
    console.error(err);
    throw new Error(`Import collection failed: ${err.message}`);
  }
};

export default apidogToBruno;
