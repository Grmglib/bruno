import React, { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDrop, useDragLayer } from 'react-dnd';
import classnames from 'classnames';
import Collection from './Collection';
import CollectionGroup from './CollectionGroup';
import GitRemoteCollectionRow from './GitRemoteCollectionRow';
import StyledWrapper from './StyledWrapper';
import CreateOrOpenCollection from './CreateOrOpenCollection';
import CollectionSearch from './CollectionSearch/index';
import InlineCollectionCreator from './InlineCollectionCreator';
import { isScratchCollection } from 'utils/collections';
import {
  buildSidebarEntries,
  buildSidebarTree,
  filterSidebarTree
} from 'utils/workspaces/collectionGroups';
import { assignCollectionToGroupAction } from 'providers/ReduxStore/slices/workspaces/actions';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';
import { normalizePath } from 'utils/common/path';

const SEARCH_DEBOUNCE_MS = 250;

const Collections = ({ showSearch, isCreatingCollection, onCreateClick, onDismissCreate, onOpenAdvancedCreate }) => {
  // `inputValue` keeps the search box responsive on every keystroke, while `searchText` (debounced)
  // is what actually drives the expensive tree filtering, so typing no longer lags.
  const [inputValue, setInputValue] = React.useState('');
  const [searchText, setSearchText] = React.useState('');
  const dispatch = useDispatch();
  const { collections, collectionSortOrder } = useSelector((state) => state.collections);
  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);

  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid) || workspaces.find((w) => w.type === 'default');
  const isDefaultWorkspace = activeWorkspace?.type === 'default';

  const sidebarEntries = useMemo(() => {
    if (!activeWorkspace?.collections?.length) return [];

    const loadedCollections = collections.filter((c) => !isScratchCollection(c, workspaces));

    return buildSidebarEntries({
      workspaceCollections: activeWorkspace.collections,
      loadedCollections,
      isDefaultWorkspace,
      collectionSortOrder
    });
  }, [activeWorkspace, collections, workspaces, isDefaultWorkspace, collectionSortOrder]);

  const sidebarTree = useMemo(() => {
    const tree = buildSidebarTree({
      collectionGroups: activeWorkspace?.collectionGroups || [],
      sidebarEntries
    });
    return filterSidebarTree(tree, searchText);
  }, [activeWorkspace?.collectionGroups, sidebarEntries, searchText]);

  useEffect(() => {
    if (inputValue === searchText) return;
    const timer = setTimeout(() => setSearchText(inputValue), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [inputValue, searchText]);

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

  const isDraggingCollectionFromFolder = useDragLayer((monitor) => {
    if (!monitor.isDragging() || monitor.getItemType() !== 'collection') {
      return false;
    }

    const draggedItem = monitor.getItem();
    const collectionPath = draggedItem?.pathname || draggedItem?.path;
    if (!collectionPath || !activeWorkspace?.collections?.length) {
      return false;
    }

    const workspaceCollection = activeWorkspace.collections.find(
      (c) => normalizePath(c.path) === normalizePath(collectionPath)
    );
    return Boolean(workspaceCollection?.group);
  });

  const [{ isOverRoot }, rootDrop] = useDrop({
    accept: ['collection'],
    canDrop: (draggedItem) => {
      const collectionPath = draggedItem.pathname || draggedItem.path;
      if (!collectionPath || !activeWorkspace?.collections?.length) {
        return false;
      }
      const workspaceCollection = activeWorkspace.collections.find(
        (c) => normalizePath(c.path) === normalizePath(collectionPath)
      );
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

  const hasVisibleEntries = sidebarTree.some((node) => node.entries.length > 0);

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

  return (
    <StyledWrapper data-testid="collections">
      {showSearch && (
        <CollectionSearch searchText={inputValue} setSearchText={setInputValue} />
      )}

      <div
        ref={rootDrop}
        className={classnames('collections-list', {
          'drop-target-root': isOverRoot
        })}
        data-testid="collections-list-root-drop"
      >
        {isDraggingCollectionFromFolder && (
          <div className={classnames('root-drop-hint', { active: isOverRoot })}>
            Drop here to remove from folder
          </div>
        )}
        {isCreatingCollection && (
          <InlineCollectionCreator
            onComplete={onDismissCreate}
            onCancel={onDismissCreate}
            onOpenAdvanced={onOpenAdvancedCreate}
          />
        )}

        {!hasVisibleEntries && searchText ? (
          <div className="px-3 py-2 text-xs text-muted">No collections match your search</div>
        ) : (
          sidebarTree.map((node) => {
            if (node.type === 'group') {
              return (
                <CollectionGroup
                  key={node.group.uid}
                  group={node.group}
                  entries={node.entries}
                  workspaceUid={activeWorkspace.uid}
                  workspaceCollections={activeWorkspace.collections || []}
                  collectionGroups={activeWorkspace.collectionGroups || []}
                  searchText={searchText}
                  forceExpanded={node.forceExpanded}
                />
              );
            }

            return node.entries.map((entry) => {
              if (entry.kind === 'loaded') {
                return <Collection searchText={searchText} collection={entry.collection} key={entry.key} />;
              }
              return <GitRemoteCollectionRow entry={entry.entry} key={entry.key} />;
            });
          })
        )}
      </div>
    </StyledWrapper>
  );
};

export default Collections;
