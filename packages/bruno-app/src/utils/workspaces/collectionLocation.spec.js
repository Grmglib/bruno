import path from 'utils/common/path';
import { resolveWorkspaceCollectionLocation } from './collectionLocation';

describe('resolveWorkspaceCollectionLocation', () => {
  const workspacePathname = '/home/user/fandi-collections';

  test('uses collections/ when collections are stored under collections/', () => {
    const location = resolveWorkspaceCollectionLocation({
      pathname: workspacePathname,
      collections: [{ name: 'API', path: '/home/user/fandi-collections/collections/api' }]
    });

    expect(location).toBe(path.join(workspacePathname, 'collections'));
  });

  test('uses workspace root for root-level collections and groups', () => {
    const location = resolveWorkspaceCollectionLocation({
      pathname: workspacePathname,
      collections: [{ name: 'API', path: '/home/user/fandi-collections/Fandi/API' }],
      collectionGroups: [{ uid: 'g1', name: 'Fandi', path: 'Fandi' }]
    });

    expect(location).toBe(workspacePathname);
  });

  test('uses collections/ for empty new workspaces', () => {
    const location = resolveWorkspaceCollectionLocation({
      pathname: workspacePathname,
      collections: [],
      collectionGroups: []
    });

    expect(location).toBe(path.join(workspacePathname, 'collections'));
  });
});
