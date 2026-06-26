import { normalizePath } from 'utils/common/path';

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const getSidebarEntryName = (entry) => {
  if (entry.kind === 'loaded') {
    return entry.collection?.name || '';
  }

  return entry.entry?.name || entry.entry?.path || '';
};

const sortEntries = (entries, collectionSortOrder) => {
  if (collectionSortOrder === 'alphabetical') {
    return [...entries].sort((a, b) => collator.compare(getSidebarEntryName(a), getSidebarEntryName(b)));
  }

  if (collectionSortOrder === 'reverseAlphabetical') {
    return [...entries].sort((a, b) => -collator.compare(getSidebarEntryName(a), getSidebarEntryName(b)));
  }

  return entries;
};

const getEntryGroupUid = (entry) => {
  if (entry.kind === 'loaded') {
    const workspaceEntry = entry.workspaceCollection;
    return workspaceEntry?.group || null;
  }

  return entry.entry?.group || null;
};

export const buildSidebarEntries = ({
  workspaceCollections = [],
  loadedCollections = [],
  isDefaultWorkspace = false,
  collectionSortOrder = 'default'
}) => {
  const loadedByPath = new Map();
  for (const collection of loadedCollections) {
    if (collection.pathname) {
      loadedByPath.set(normalizePath(collection.pathname), collection);
    }
  }

  const entries = [];
  for (const wc of workspaceCollections) {
    if (!wc.path) continue;
    const loaded = loadedByPath.get(normalizePath(wc.path));
    if (loaded) {
      entries.push({ kind: 'loaded', collection: loaded, workspaceCollection: wc, key: loaded.uid });
    } else if (wc.remote && !isDefaultWorkspace) {
      entries.push({ kind: 'ghost', entry: wc, workspaceCollection: wc, key: `ghost:${wc.path}` });
    }
  }

  return sortEntries(entries, collectionSortOrder);
};

export const buildSidebarTree = ({
  collectionGroups = [],
  sidebarEntries = []
}) => {
  const validGroupUids = new Set((collectionGroups || []).map((g) => g.uid));
  const grouped = new Map();
  const rootEntries = [];

  for (const group of collectionGroups || []) {
    grouped.set(group.uid, []);
  }

  for (const entry of sidebarEntries) {
    const groupUid = getEntryGroupUid(entry);
    if (groupUid && validGroupUids.has(groupUid)) {
      grouped.get(groupUid).push(entry);
    } else {
      rootEntries.push(entry);
    }
  }

  const tree = [];

  for (const group of collectionGroups || []) {
    tree.push({
      type: 'group',
      group,
      entries: grouped.get(group.uid) || []
    });
  }

  if (rootEntries.length > 0) {
    tree.push({
      type: 'root',
      entries: rootEntries
    });
  }

  return tree;
};

export const reorderCollectionGroups = (collectionGroups = [], draggedGroupUid, targetGroupUid) => {
  if (!draggedGroupUid || !targetGroupUid || draggedGroupUid === targetGroupUid) {
    return [...collectionGroups];
  }

  const reordered = [...collectionGroups];
  const draggedIndex = reordered.findIndex((group) => group.uid === draggedGroupUid);
  const targetIndex = reordered.findIndex((group) => group.uid === targetGroupUid);

  if (draggedIndex < 0 || targetIndex < 0) {
    return [...collectionGroups];
  }

  const [draggedGroup] = reordered.splice(draggedIndex, 1);
  reordered.splice(targetIndex, 0, draggedGroup);

  return reordered;
};

export const filterSidebarTree = (tree, searchText) => {
  const query = (searchText || '').trim().toLowerCase();
  if (!query) {
    return tree;
  }

  return tree
    .map((node) => {
      if (node.type === 'group') {
        const filteredEntries = node.entries.filter((entry) =>
          getSidebarEntryName(entry).toLowerCase().includes(query)
        );
        if (filteredEntries.length === 0) {
          return null;
        }
        return { ...node, entries: filteredEntries, forceExpanded: true };
      }

      const filteredEntries = node.entries.filter((entry) =>
        getSidebarEntryName(entry).toLowerCase().includes(query)
      );
      if (filteredEntries.length === 0) {
        return null;
      }
      return { ...node, entries: filteredEntries };
    })
    .filter(Boolean);
};
