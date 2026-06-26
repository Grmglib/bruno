import { describe, it, expect } from '@jest/globals';
import apidogToBruno from '../../src/apidog/apidog-to-bruno';
import apidogFixture from './fixtures/apidog-minimal.json';

describe('apidog-to-bruno', () => {
  it('should convert an Apidog project into module collections', () => {
    const result = apidogToBruno(apidogFixture);

    expect(result.containerFolder).toBe('sample_api_project');
    expect(result.collections).toHaveLength(1);
    expect(result.collections[0].name).toBe('Billing');
    expect(result.collections[0].items).toHaveLength(2);
  });

  it('should map Auth request with form body and post-response script', () => {
    const result = apidogToBruno(apidogFixture);
    const authRequest = result.collections[0].items[0];

    expect(authRequest.name).toBe('Auth');
    expect(authRequest.type).toBe('http-request');
    expect(authRequest.request.method).toBe('POST');
    expect(authRequest.request.url).toBe('{{baseUrl}}/vehicle/token');
    expect(authRequest.request.body.mode).toBe('formUrlEncoded');
    expect(authRequest.request.body.formUrlEncoded).toHaveLength(3);
    expect(authRequest.request.script.res).toContain('bru.setEnvVar');
    expect(authRequest.request.script.res).toContain('access_token');
  });

  it('should map Consulta loja request with bearer auth and json body', () => {
    const result = apidogToBruno(apidogFixture);
    const consultaRequest = result.collections[0].items[1];

    expect(consultaRequest.name).toBe('Consulta loja');
    expect(consultaRequest.request.auth.mode).toBe('bearer');
    expect(consultaRequest.request.auth.bearer.token).toBe('{{token}}');
    expect(consultaRequest.request.body.mode).toBe('json');
    expect(consultaRequest.request.body.json).toContain('17303092000181');
  });

  it('should import module-scoped environments with baseUrl', () => {
    const result = apidogToBruno(apidogFixture);
    const environments = result.collections[0].environments;

    expect(environments).toHaveLength(2);

    const devEnv = environments.find((env) => env.name === 'Amb. de Desenv.');
    expect(devEnv).toBeDefined();
    expect(devEnv.variables.find((v) => v.name === 'baseUrl')?.value).toBe('https://dev.example.com');
    expect(devEnv.variables.find((v) => v.name === 'token')).toBeDefined();

    const testEnv = environments.find((env) => env.name === 'Amb. de Teste');
    expect(testEnv.variables.find((v) => v.name === 'baseUrl')?.value).toBe('https://test.example.com');
  });

  it('should import module variables into collection root', () => {
    const result = apidogToBruno(apidogFixture);
    const rootVars = result.collections[0].root.request.vars.req;

    expect(rootVars.find((v) => v.name === 'clientId')).toBeDefined();
    expect(rootVars.find((v) => v.name === 'ClientSecret')).toBeDefined();
  });

  it('should map inherit auth without warnings', () => {
    const project = {
      ...apidogFixture,
      apiCollection: [
        {
          moduleId: 950585,
          items: [
            {
              name: 'Protected Request',
              api: {
                method: 'get',
                path: '/protected',
                parameters: { path: [], query: [], header: [] },
                auth: { type: 'inherit' }
              }
            }
          ]
        }
      ]
    };

    const result = apidogToBruno(project);
    expect(result.issues).toHaveLength(0);
    expect(result.collections[0].items[0].request.auth.mode).toBe('inherit');
  });

  it('should map securityscheme auth to bearer token', () => {
    const project = {
      ...apidogFixture,
      apiCollection: [
        {
          moduleId: 950585,
          items: [
            {
              name: 'Autenticação',
              api: {
                method: 'post',
                path: '/api/authentications',
                parameters: { path: [], query: [], header: [] },
                auth: { type: 'securityscheme' },
                securityScheme: {
                  use: {
                    configs: {
                      476355: {
                        authConfigs: {
                          'x-apidog': {
                            token: '{{bearerToken}}'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      ]
    };

    const result = apidogToBruno(project);
    expect(result.issues).toHaveLength(0);
    expect(result.collections[0].items[0].request.auth.mode).toBe('bearer');
    expect(result.collections[0].items[0].request.auth.bearer.token).toBe('{{bearerToken}}');
  });

  it('should map apikey auth', () => {
    const project = {
      ...apidogFixture,
      apiCollection: [
        {
          moduleId: 950585,
          items: [
            {
              name: 'Create doc from upload PDF',
              api: {
                method: 'post',
                path: '/docs/',
                parameters: { path: [], query: [], header: [] },
                auth: {
                  type: 'apikey',
                  apikey: {
                    in: 'header',
                    key: 'Authorization',
                    value: 'Bearer {{token}}'
                  }
                }
              }
            }
          ]
        }
      ]
    };

    const result = apidogToBruno(project);
    expect(result.issues).toHaveLength(0);
    expect(result.collections[0].items[0].request.auth.mode).toBe('apikey');
    expect(result.collections[0].items[0].request.auth.apikey).toMatchObject({
      key: 'Authorization',
      value: 'Bearer {{token}}',
      placement: 'header'
    });
  });

  it('should create folders with root metadata for folder.bru export', () => {
    const project = {
      ...apidogFixture,
      apiCollection: [
        {
          moduleId: 950585,
          items: [
            {
              name: 'Docs',
              items: [
                {
                  name: 'Upload',
                  api: {
                    method: 'post',
                    path: '/docs/',
                    parameters: { path: [], query: [], header: [] },
                    auth: { type: 'noauth' }
                  }
                }
              ]
            }
          ]
        }
      ]
    };

    const result = apidogToBruno(project);
    const folder = result.collections[0].items[0];
    expect(folder.type).toBe('folder');
    expect(folder.root.meta.name).toBe('Docs');
    expect(folder.items).toHaveLength(1);
  });
});
