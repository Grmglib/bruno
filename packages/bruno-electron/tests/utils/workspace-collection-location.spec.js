const path = require('path');
const {
  resolveFromWorkspaceConfig,
  resolveWorkspaceCollectionLocation
} = require('../../src/utils/workspace-collection-location');

describe('resolveFromWorkspaceConfig', () => {
  const workspacePath = '/home/user/my-workspace';

  test('uses collections/ when collections are registered under collections/', () => {
    const location = resolveFromWorkspaceConfig(workspacePath, {
      collections: [{ name: 'API', path: 'collections/api' }]
    });

    expect(location).toBe(path.join(path.normalize(workspacePath), 'collections'));
  });

  test('uses workspace root when collections live at root-level paths', () => {
    const location = resolveFromWorkspaceConfig(workspacePath, {
      collections: [{ name: 'API', path: 'Fandi/API' }],
      collectionGroups: [{ uid: 'g1', name: 'Fandi', path: 'Fandi' }]
    });

    expect(location).toBe(path.normalize(workspacePath));
  });

  test('uses workspace root when only root-level collection groups exist', () => {
    const location = resolveFromWorkspaceConfig(workspacePath, {
      collections: [],
      collectionGroups: [{ uid: 'g1', name: 'Bancos', path: 'Bancos' }]
    });

    expect(location).toBe(path.normalize(workspacePath));
  });

  test('uses collections/ for empty new workspaces', () => {
    const location = resolveFromWorkspaceConfig(workspacePath, {
      collections: [],
      collectionGroups: []
    });

    expect(location).toBe(path.join(path.normalize(workspacePath), 'collections'));
  });

  test('prefers collections/ when both root and collections/ paths exist', () => {
    const location = resolveFromWorkspaceConfig(workspacePath, {
      collections: [
        { name: 'Root', path: 'legacy/root' },
        { name: 'API', path: 'collections/api' }
      ]
    });

    expect(location).toBe(path.join(path.normalize(workspacePath), 'collections'));
  });
});

describe('resolveWorkspaceCollectionLocation', () => {
  const tmpDir = path.join(__dirname, '..', '..', '..', 'node_modules', '.cache', 'workspace-collection-location-test');
  const workspacePath = path.join(tmpDir, 'workspace');

  beforeEach(() => {
    require('fs').mkdirSync(path.join(workspacePath, 'collections'), { recursive: true });
    require('fs').writeFileSync(
      path.join(workspacePath, 'workspace.yml'),
      [
        'opencollection: 1.0.0',
        'info:',
        '  name: Test',
        '  type: workspace',
        'collectionGroups:',
        '  - uid: g1',
        '    name: Fandi',
        '    path: Fandi',
        'collections:',
        '  - name: API',
        '    path: Fandi/API'
      ].join('\n')
    );
  });

  afterEach(() => {
    require('fs').rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads workspace.yml and resolves root-level layouts', () => {
    expect(resolveWorkspaceCollectionLocation(workspacePath)).toBe(workspacePath);
  });
});
