import { buildSidebarEntries, buildSidebarTree, filterSidebarTree, reorderCollectionGroups } from './collectionGroups';

describe('collectionGroups utils', () => {
  const workspaceCollections = [
    { name: 'API', path: '/ws/collections/api', group: 'g1' },
    { name: 'Root', path: '/ws/collections/root' },
    { name: 'Frontend', path: '/ws/collections/frontend', group: 'g2' }
  ];

  const loadedCollections = [
    { uid: 'c1', name: 'API', pathname: '/ws/collections/api' },
    { uid: 'c2', name: 'Root', pathname: '/ws/collections/root' },
    { uid: 'c3', name: 'Frontend', pathname: '/ws/collections/frontend' }
  ];

  const collectionGroups = [
    { uid: 'g1', name: 'Backend' },
    { uid: 'g2', name: 'Frontend Group' }
  ];

  test('buildSidebarTree groups entries by group uid', () => {
    const entries = buildSidebarEntries({ workspaceCollections, loadedCollections });
    const tree = buildSidebarTree({ collectionGroups, sidebarEntries: entries });

    expect(tree).toHaveLength(3);
    expect(tree[0].type).toBe('group');
    expect(tree[0].entries).toHaveLength(1);
    expect(tree[0].entries[0].collection.name).toBe('API');
    expect(tree[2].type).toBe('root');
    expect(tree[2].entries).toHaveLength(1);
    expect(tree[2].entries[0].collection.name).toBe('Root');
  });

  test('buildSidebarTree puts entries with invalid group in root', () => {
    const entries = buildSidebarEntries({
      workspaceCollections: [{ name: 'Orphan', path: '/ws/collections/orphan', group: 'missing' }],
      loadedCollections: [{ uid: 'c4', name: 'Orphan', pathname: '/ws/collections/orphan' }]
    });
    const tree = buildSidebarTree({ collectionGroups, sidebarEntries: entries });

    const rootNode = tree.find((node) => node.type === 'root');
    expect(rootNode).toBeTruthy();
    expect(rootNode.entries).toHaveLength(1);
    expect(rootNode.entries[0].collection.name).toBe('Orphan');
  });

  test('filterSidebarTree keeps matching entries and expands groups', () => {
    const entries = buildSidebarEntries({ workspaceCollections, loadedCollections });
    const tree = buildSidebarTree({ collectionGroups, sidebarEntries: entries });
    const filtered = filterSidebarTree(tree, 'api');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('group');
    expect(filtered[0].forceExpanded).toBe(true);
    expect(filtered[0].entries).toHaveLength(1);
  });

  test('reorderCollectionGroups moves the dragged group before the target group', () => {
    const reordered = reorderCollectionGroups(collectionGroups, 'g2', 'g1');

    expect(reordered.map((group) => group.uid)).toEqual(['g2', 'g1']);
  });

  test('reorderCollectionGroups returns the original order for invalid input', () => {
    const reordered = reorderCollectionGroups(collectionGroups, 'missing', 'g1');

    expect(reordered.map((group) => group.uid)).toEqual(['g1', 'g2']);
  });
});
