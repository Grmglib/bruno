import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDrop, useDragLayer } from 'react-dnd';
import { Virtuoso } from 'react-virtuoso';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import SidebarRow from './SidebarRow';
import useCollapsedGroups from './CollectionGroup/useCollapsedGroups';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { assignCollectionToGroupAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { buildSidebarEntries, getSelectionInfo } from 'utils/collections/index';
import { flattenSidebarTree } from 'utils/collections/flattenSidebarTree';
import { buildSidebarTree, filterSidebarTree } from 'utils/workspaces/collectionGroups';
import { normalizePath } from 'utils/common/path';
import { CollectionItemDragPreview } from './Collection/CollectionItem/CollectionItemDragPreview';
import useBulkActionsMenu from 'hooks/useBulkActionsMenu';
import useDebounce from 'hooks/useDebounce';
import useSidebarAutoReveal from 'hooks/useSidebarAutoReveal';
import BulkActionsMenu from 'components/Sidebar/Collections/BulkActionsMenu';
import { selectCollections, selectCollectionSortOrder, selectSelectedSidebarUids } from 'src/selectors/collections';

const isEmptyQuery = (value) => typeof value === 'string' && value.trim() === '';

const EMPTY_GROUPS = [];

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  const [searchText, setSearchText] = useState('');
  const trimmedSearchText = searchText.trim();
  const debouncedSearchText = useDebounce(trimmedSearchText, 300, { shouldSkipDebounce: isEmptyQuery });
  const collections = useSelector(selectCollections);
  const collectionSortOrder = useSelector(selectCollectionSortOrder);
  const selectedSidebarUids = useSelector(selectSelectedSidebarUids);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const dispatch = useDispatch();
  const virtuosoRef = useRef(null);
  const scrollerRef = useRef(null);

  const { openBulkMenu, menuProps } = useBulkActionsMenu();

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');
  const collectionGroups = activeWorkspace?.collectionGroups || EMPTY_GROUPS;

  // Build the sidebar list in workspace.yml order (groups first). Each entry is either a fully
  // loaded collection or, for non-default workspaces, a "ghost" git-backed entry whose local
  // folder is missing (rendered via <GitRemoteCollectionRow /> so the user can click to clone it).
  const sidebarEntries = useMemo(
    () => buildSidebarEntries({ collections, workspaces, activeWorkspace, collectionSortOrder }),
    [activeWorkspace, collections, workspaces, collectionSortOrder]
  );

  // Collection groups (folders): entries bucketed by group, filtered by the search text.
  const sidebarTree = useMemo(
    () => filterSidebarTree(buildSidebarTree({ collectionGroups, sidebarEntries }), debouncedSearchText),
    [collectionGroups, sidebarEntries, debouncedSearchText]
  );

  const { collapsedGroupUids, setGroupCollapsed } = useCollapsedGroups(activeWorkspace?.uid, collectionGroups);

  // Flatten the tree into ordered rows. itemsByUid / collectionsByUid / groupsByUid resolve a row's live object.
  const { rows, itemsByUid, collectionsByUid, groupsByUid, rowIndexByItemUid, rowIndexByCollectionUid } = useMemo(
    () => flattenSidebarTree(sidebarEntries, { searchText: debouncedSearchText, sidebarTree, collapsedGroupUids }),
    [sidebarEntries, debouncedSearchText, sidebarTree, collapsedGroupUids]
  );

  // Everything a group header row needs, kept stable so unrelated rows don't re-render.
  const groupContext = useMemo(() => ({
    workspaceUid: activeWorkspace?.uid,
    workspaceCollections: activeWorkspace?.collections || [],
    collectionGroups,
    collapsedGroupUids,
    setGroupCollapsed,
    forceExpanded: Boolean(debouncedSearchText)
  }), [activeWorkspace?.uid, activeWorkspace?.collections, collectionGroups, collapsedGroupUids, setGroupCollapsed, debouncedSearchText]);

  // Ghost rows carry only path/name. GitRemoteCollectionRow needs the full entry (for `remote`).
  const ghostsByPath = useMemo(() => {
    const map = new Map();
    for (const entry of sidebarEntries) {
      if (entry.kind === 'ghost' && entry.entry?.path) map.set(entry.entry.path, entry.entry);
    }
    return map;
  }, [sidebarEntries]);

  // Multi-select drag context, computed once for the whole list and threaded to rows via SidebarRow.
  const selectionInfo = useMemo(
    () => (selectedSidebarUids.length > 1 ? getSelectionInfo({ collections, selectedUids: selectedSidebarUids }) : null),
    [collections, selectedSidebarUids]
  );

  // A collection can't be dragged together with folders/requests/apps from inside it.
  const hasMixedCollectionSelection = Boolean(
    selectionInfo?.hasCollection
    && (selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp)
  );

  // Whether a selected collection row can be dragged as part of the multi-selection.
  const isCollectionMultiDragDisabled = !!selectionInfo && (selectionInfo.hasExample || hasMixedCollectionSelection);

  // Whether a selected folder/request/app row can be dragged as part of the multi-selection.
  const isItemMultiDragDisabled = !!selectionInfo && (selectionInfo.hasExample || selectionInfo.hasCollection);

  const multiDragCollections = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasFolder || selectionInfo.hasRequest || selectionInfo.hasApp || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.filter((entry) => entry.type === 'collection').map((entry) => entry.collection);
  }, [selectionInfo]);

  const multiDragItems = useMemo(() => {
    if (!selectionInfo || selectionInfo.hasCollection || selectionInfo.hasExample) return null;
    return selectionInfo.effectiveSelection.map((entry) => ({ ...entry.item, sourceCollectionUid: entry.collectionUid }));
  }, [selectionInfo]);

  useSidebarAutoReveal({ rowIndexByItemUid, rowIndexByCollectionUid, sidebarEntries, virtuosoRef, scrollerRef });

  // Collections load their requests lazily (only when mounted). To make the search cover every
  // collection in the workspace - not just the ones the user has opened - mount any unmounted
  // collection as soon as the search is activated. The mountStatus guard keeps this idempotent.
  useEffect(() => {
    if (!showSearch) return;

    sidebarEntries.forEach((entry) => {
      if (entry.kind !== 'loaded') return;
      const collection = entry.collection;
      if (!collection?.pathname) return;
      if (collection.mountStatus === 'mounted' || collection.mountStatus === 'mounting') return;

      dispatch(
        mountCollection({
          collectionUid: collection.uid,
          collectionPathname: collection.pathname,
          brunoConfig: collection.brunoConfig,
          skipTabRestore: true
        })
      );
    });
  }, [showSearch, sidebarEntries, dispatch]);

  const findWorkspaceCollectionByPath = (collectionPath) => {
    if (!collectionPath || !activeWorkspace?.collections?.length) return null;
    return activeWorkspace.collections.find((c) => normalizePath(c.path) === normalizePath(collectionPath)) || null;
  };

  // Dragging a collection that lives in a group reveals a "drop here to remove from folder" target
  const isDraggingCollectionFromFolder = useDragLayer((monitor) => {
    if (!monitor.isDragging() || monitor.getItemType() !== 'collection') {
      return false;
    }

    const draggedItem = monitor.getItem();
    const workspaceCollection = findWorkspaceCollectionByPath(draggedItem?.pathname || draggedItem?.path);
    return Boolean(workspaceCollection?.group);
  });

  // Dropping on the list background moves a grouped collection back to the workspace root
  const [{ isOverRoot }, rootDrop] = useDrop({
    accept: ['collection'],
    canDrop: (draggedItem) => {
      const workspaceCollection = findWorkspaceCollectionByPath(draggedItem.pathname || draggedItem.path);
      return Boolean(workspaceCollection?.group);
    },
    drop: (draggedItem, monitor) => {
      if (monitor.didDrop()) {
        return;
      }
      const collectionPath = draggedItem.pathname || draggedItem.path;
      if (!collectionPath) {
        return;
      }
      dispatch(assignCollectionToGroupAction(activeWorkspace.uid, collectionPath, null, draggedItem.uid));
    },
    collect: (monitor) => ({
      isOverRoot: monitor.isOver({ shallow: true }) && monitor.canDrop()
    })
  });

  // Clear multi-selection only when clicking the bare scroller background.
  // The `contains` guard ignores events propagated from portaled menus/modals in <body>.
  // The `[data-sidebar-row]` check covers all row types and inline menus/modals rendered within a row.
  const handleContainerClick = (e) => {
    if (!e.currentTarget.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-row]')) return;
    dispatch(clearSidebarSelection());
  };

  if (!sidebarEntries.length) {
    return (
      <StyledWrapper>
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}
        {!isCreatingCollection && <CreateOrOpenCollection onCreateClick={onCreateClick} />}
      </StyledWrapper>
    );
  }

  const hasNoSearchResults = Boolean(debouncedSearchText) && rows.length === 0;

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={searchText} setSearchText={setSearchText} />
      )}

      {isCreatingCollection && (
        <InlineCollectionCreator
          onComplete={onDismissCreate}
          onCancel={onDismissCreate}
          onOpenAdvanced={onOpenAdvancedCreate}
        />
      )}

      <div
        ref={rootDrop}
        className={classnames('collections-list flex flex-col flex-1 overflow-hidden', {
          'drop-target-root': isOverRoot
        })}
        data-testid="collections-list-root-drop"
        onClick={handleContainerClick}
      >
        {isDraggingCollectionFromFolder && (
          <div className={classnames('root-drop-hint', { active: isOverRoot })}>
            Drop here to remove from folder
          </div>
        )}

        {hasNoSearchResults ? (
          <div className="px-3 py-2 text-xs text-muted">No collections match your search</div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            scrollerRef={(el) => { scrollerRef.current = el; }}
            data-testid="sidebar-collections-scroller"
            style={{ height: '100%' }}
            data={rows}
            computeItemKey={(_, row) => row.id}
            defaultItemHeight={26}
            increaseViewportBy={{ top: 400, bottom: 600 }}
            itemContent={(_, row) => (
              <SidebarRow
                row={row}
                searchText={debouncedSearchText}
                openBulkMenu={openBulkMenu}
                itemsByUid={itemsByUid}
                collectionsByUid={collectionsByUid}
                groupsByUid={groupsByUid}
                ghostsByPath={ghostsByPath}
                groupContext={groupContext}
                isCollectionMultiDragDisabled={isCollectionMultiDragDisabled}
                isItemMultiDragDisabled={isItemMultiDragDisabled}
                multiDragCollections={multiDragCollections}
                multiDragItems={multiDragItems}
              />
            )}
          />
        )}
      </div>
      <CollectionItemDragPreview />
      <BulkActionsMenu menuProps={menuProps} />
    </StyledWrapper>
  );
};

export default Collections;
