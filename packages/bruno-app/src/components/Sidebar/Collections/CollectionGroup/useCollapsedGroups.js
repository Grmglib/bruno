import { useCallback, useEffect, useState } from 'react';

// Same key the group header used before the sidebar was virtualized, so previously
// collapsed groups stay collapsed.
const getCollapsedStorageKey = (workspaceUid, groupUid) => {
  return `bruno:collection-group-collapsed:${workspaceUid}:${groupUid}`;
};

const readCollapsedGroupUids = (workspaceUid, groups) => {
  const collapsed = new Set();
  if (!workspaceUid) return collapsed;

  for (const group of groups || []) {
    try {
      if (localStorage.getItem(getCollapsedStorageKey(workspaceUid, group.uid)) === 'true') {
        collapsed.add(group.uid);
      }
    } catch (_) {}
  }

  return collapsed;
};

/**
 * Tracks which collection groups are collapsed in the sidebar.
 * The state is owned by the list (not by each header) because it decides which rows get rendered.
 */
const useCollapsedGroups = (workspaceUid, groups) => {
  const [collapsedGroupUids, setCollapsedGroupUids] = useState(() => readCollapsedGroupUids(workspaceUid, groups));

  // Re-read when the workspace changes or groups are added/removed.
  const groupKey = (groups || []).map((group) => group.uid).join('|');
  useEffect(() => {
    setCollapsedGroupUids(readCollapsedGroupUids(workspaceUid, groups));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceUid, groupKey]);

  const setGroupCollapsed = useCallback((groupUid, collapsed) => {
    setCollapsedGroupUids((prev) => {
      if (prev.has(groupUid) === collapsed) return prev;
      const next = new Set(prev);
      if (collapsed) next.add(groupUid);
      else next.delete(groupUid);
      return next;
    });

    try {
      localStorage.setItem(getCollapsedStorageKey(workspaceUid, groupUid), String(collapsed));
    } catch (_) {}
  }, [workspaceUid]);

  return { collapsedGroupUids, setGroupCollapsed };
};

export default useCollapsedGroups;
