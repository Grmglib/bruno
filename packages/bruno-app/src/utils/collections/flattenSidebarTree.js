import { isItemAFolder, isItemARequest, isCollectionItemCollapsed } from './index';
import { collectionSlug } from './collectionSlug';
import { sortByNameThenSequence } from 'utils/common/index';
import {
  doesRequestMatchSearchText,
  doesFolderHaveItemsMatchSearchText,
  doesCollectionHaveItemsMatchingSearchText
} from './search';

const groupCollectionItems = (collectionItems) => {
  const folders = [];
  const apps = [];
  const requests = [];

  const sortBySeq = (items) => [...items].sort((a, b) => a.seq - b.seq);

  for (const item of collectionItems) {
    if (!item || item.isTransient) continue;

    if (isItemAFolder(item)) {
      folders.push(item);
    } else if (item.type === 'app') {
      apps.push(item);
    } else if (isItemARequest(item)) {
      requests.push(item);
    }
  }

  return {
    folders: sortByNameThenSequence(folders),
    apps: sortBySeq(apps),
    requests: sortBySeq(requests)
  };
};

/**
 * Flattens the children of a collection or folder into sidebar rows.
 * Returns the number of visible children to determine whether an empty-state
 * CTA should be shown.
 */
const walkChildren = (
  collectionContext,
  { collectionItems = [], depth, parentName, ancestorPath = [] }
) => {
  const {
    collectionUid,
    collectionPathname,
    collectionId,
    hasSearch,
    searchText,
    appendRow,
    addItemToIndex
  } = collectionContext;

  // Scope row ids by the full ancestor uid chain so duplicated subtrees remain
  // distinct even when they share the same item uids.
  // JSON-encode the path to avoid delimiter collisions since uids are opaque strings.
  const ancestorKey = JSON.stringify(ancestorPath);

  let visibleChildCount = 0;

  const { folders, apps, requests } = groupCollectionItems(collectionItems);

  for (const folder of folders) {
    if (hasSearch && !doesFolderHaveItemsMatchSearchText(folder, searchText)) {
      continue;
    }

    visibleChildCount++;

    appendRow({
      id: `${collectionUid}:${ancestorKey}:${folder.uid}`,
      kind: 'folder',
      depth,
      collectionUid,
      collectionPathname,
      collectionId,
      parentName,
      itemUid: folder.uid,
      sortName: folder.name || null
    });

    addItemToIndex(folder.uid, folder);

    // Search reveals matching descendants regardless of the collapsed state.
    const isExpanded = hasSearch || !folder.collapsed;

    if (!isExpanded) continue;

    const childCount = walkChildren(collectionContext, {
      collectionItems: folder.items,
      depth: depth + 1,
      parentName: folder.name || null,
      ancestorPath: [...ancestorPath, folder.uid]
    });

    if (!hasSearch && childCount === 0) {
      appendRow({
        id: `${collectionUid}:${ancestorKey}:${folder.uid}:cta`,
        kind: 'empty-cta',
        depth: depth + 1,
        collectionUid,
        collectionPathname,
        collectionId,
        parentName: folder.name || null,
        itemUid: folder.uid,
        sortName: null
      });
    }
  }

  if (!hasSearch) {
    for (const app of apps) {
      visibleChildCount++;

      appendRow({
        id: `${collectionUid}:${ancestorKey}:${app.uid}`,
        kind: 'app',
        depth,
        collectionUid,
        collectionPathname,
        collectionId,
        parentName,
        itemUid: app.uid,
        sortName: app.name || null
      });

      addItemToIndex(app.uid, app);
    }
  }

  for (const request of requests) {
    if (hasSearch && !doesRequestMatchSearchText(request, searchText)) {
      continue;
    }

    visibleChildCount++;

    appendRow({
      id: `${collectionUid}:${ancestorKey}:${request.uid}`,
      kind: 'request',
      depth,
      collectionUid,
      collectionPathname,
      collectionId,
      parentName,
      itemUid: request.uid,
      sortName: request.name || null
    });

    addItemToIndex(request.uid, request);

    const hasExamples
      = request.type === 'http-request' && Array.isArray(request.examples);

    if (hasExamples && (hasSearch || !isCollectionItemCollapsed(request))) {
      request.examples.forEach((example, index) => {
        appendRow({
          id: `${collectionUid}:${ancestorKey}:${request.uid}:ex:${example.uid || index}`,
          kind: 'example',
          depth: depth + 1,
          collectionUid,
          collectionPathname,
          collectionId,
          parentName: request.name || null,
          itemUid: request.uid,
          sortName: example.name || null,
          exampleIndex: index,
          exampleUid: example.uid || null
        });
      });
    }
  }

  return visibleChildCount;
};

/**
 * Adds a collection and its visible children to the flat sidebar row list.
 */
const flattenCollection = ({
  collection,
  hasSearch,
  searchText,
  appendRow,
  addItemToIndex,
  addCollectionToIndex
}) => {
  // When the collection name itself matches the search, treat the whole collection as a result:
  // keep it visible and show all of its items unfiltered (instead of only the matching ones).
  const collectionNameMatchesSearch = hasSearch
    && (collection.name || '').toLowerCase().includes(searchText.trim().toLowerCase());

  if (
    hasSearch
    && !collectionNameMatchesSearch
    && !doesCollectionHaveItemsMatchingSearchText(collection, searchText)
  ) {
    return;
  }

  // Children are filtered only when the match came from inside the collection.
  const childHasSearch = hasSearch && !collectionNameMatchesSearch;

  // Used for readable test selectors. collectionUid remains the unique identity.
  const collectionId = collectionSlug(collection.name);

  appendRow({
    id: `col:${collection.uid}`,
    kind: 'collection',
    depth: 0,
    collectionUid: collection.uid,
    collectionPathname: collection.pathname || null,
    collectionId,
    parentName: null,
    itemUid: null,
    sortName: collection.name || null
  });

  addCollectionToIndex(collection.uid, collection);

  // Search reveals matching descendants regardless of the collapsed state.
  const isExpanded = hasSearch || !collection.collapsed;

  if (!isExpanded) return;

  const collectionContext = {
    collectionUid: collection.uid,
    collectionPathname: collection.pathname || null,
    collectionId,
    hasSearch: childHasSearch,
    searchText: childHasSearch ? searchText : '',
    appendRow,
    addItemToIndex
  };

  const visibleChildCount = walkChildren(collectionContext, {
    collectionItems: collection.items,
    depth: 1,
    parentName: null
  });

  // Append the collection-root empty-state CTA row.
  if (
    !childHasSearch
    && visibleChildCount === 0
    && collection.mountStatus === 'mounted'
    && !collection.isLoading
  ) {
    appendRow({
      id: `${collection.uid}:root:cta`,
      kind: 'empty-cta',
      depth: 1,
      collectionUid: collection.uid,
      collectionPathname: collection.pathname || null,
      collectionId,
      parentName: null,
      itemUid: null,
      sortName: null
    });
  }
};

/**
 * convert sidebar entries into a flat, ordered array of layout rows.
 * each row carry only structural data.
 *
 * @param {Array} sidebarEntries
 * @param {{
 *   searchText?: string,
 *   sidebarTree?: Array,
 *   collapsedGroupUids?: Set<string>
 * }} options
 *   sidebarTree: optional grouped layout (see buildSidebarTree). When provided it drives the row
 *   order instead of sidebarEntries: each group becomes a group header row followed by its
 *   member collections, unless the group is collapsed (search always expands groups).
 * @returns {{
 *   rows: Array<Object>,
 *   itemsByUid: Map,
 *   collectionsByUid: Map,
 *   groupsByUid: Map
 * }}
 */
export const flattenSidebarTree = (sidebarEntries = [], options = {}) => {
  const { searchText = '', sidebarTree = null, collapsedGroupUids = new Set() } = options;
  const hasSearch = Boolean(searchText.trim());

  const rows = [];
  const groupsByUid = new Map();
  const itemsByUid = new Map();
  const collectionsByUid = new Map();
  const rowIndexByItemUid = new Map();
  const rowIndexByCollectionUid = new Map();

  // Rows that belong to a collection group carry the group uid so they can be indented.
  let currentGroupUid = null;

  const appendRow = (row) => {
    if (currentGroupUid) row = { ...row, groupUid: currentGroupUid };
    const index = rows.push(row) - 1;

    if (row.kind === 'collection' && row.collectionUid) {
      rowIndexByCollectionUid.set(row.collectionUid, index);
    } else if (row.kind === 'example' && row.exampleUid) {
      rowIndexByItemUid.set(row.exampleUid, index);
    } else if (row.itemUid && ['folder', 'app', 'request'].includes(row.kind)) {
      rowIndexByItemUid.set(row.itemUid, index);
    }
  };
  const addItemToIndex = (uid, item) => itemsByUid.set(uid, item);
  const addCollectionToIndex = (uid, collection) =>
    collectionsByUid.set(uid, collection);

  const flattenEntry = (entry) => {
    if (!entry) return;

    // A ghost represents a missing Git-backed collection and is never expanded.
    if (entry.kind === 'ghost') {
      const ghost = entry.entry || {};

      appendRow({
        id: `ghost:${ghost.path}`,
        kind: 'ghost',
        depth: 0,
        collectionUid: null,
        collectionPathname: ghost.path || null,
        itemUid: null,
        sortName: ghost.name || null
      });

      return;
    }

    if (!entry.collection) return;

    flattenCollection({
      collection: entry.collection,
      hasSearch,
      searchText,
      appendRow,
      addItemToIndex,
      addCollectionToIndex
    });
  };

  if (sidebarTree) {
    for (const node of sidebarTree) {
      if (node.type !== 'group') {
        node.entries.forEach(flattenEntry);
        continue;
      }

      const { group } = node;
      groupsByUid.set(group.uid, group);

      currentGroupUid = null;
      appendRow({
        id: `group:${group.uid}`,
        kind: 'group',
        depth: 0,
        groupUid: group.uid,
        entryCount: node.entries.length,
        collectionUid: null,
        collectionPathname: null,
        itemUid: null,
        sortName: group.name || null
      });

      // Search always reveals matching collections inside collapsed groups.
      const isGroupExpanded = Boolean(node.forceExpanded) || hasSearch || !collapsedGroupUids.has(group.uid);
      if (!isGroupExpanded) continue;

      currentGroupUid = group.uid;
      if (node.entries.length === 0) {
        appendRow({
          id: `group:${group.uid}:empty`,
          kind: 'group-empty',
          depth: 1,
          collectionUid: null,
          collectionPathname: null,
          itemUid: null,
          sortName: null
        });
      } else {
        node.entries.forEach(flattenEntry);
      }
      currentGroupUid = null;
    }
  } else {
    sidebarEntries.forEach(flattenEntry);
  }

  return {
    rows,
    itemsByUid,
    collectionsByUid,
    groupsByUid,
    rowIndexByItemUid,
    rowIndexByCollectionUid
  };
};
