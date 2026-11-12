import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { deleteItem, closeTabs, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection, deleteResponseExample } from 'providers/ReduxStore/slices/collections';
import { recursivelyGetAllItemUids, isItemAFolder, isItemARequest, flattenItems } from 'utils/collections/index';
import { pluralizeWord } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const FOLDER_DELETE_MODE = {
  MOVE_TO_ROOT: 'move-to-root',
  DELETE_ALL: 'delete-all'
};

const DeleteCollectionItems = ({ entries, onClose }) => {
  const dispatch = useDispatch();
  const [folderDeleteMode, setFolderDeleteMode] = useState(FOLDER_DELETE_MODE.MOVE_TO_ROOT);

  if (!entries.length) {
    return null;
  }

  let folderCount = 0;
  let requestCount = 0;
  let appCount = 0;
  let exampleCount = 0;

  let requestsInFoldersCount = 0;

  for (const entry of entries) {
    if (entry.type === 'example') exampleCount++;
    else if (isItemAFolder(entry.item)) {
      folderCount++;
      requestsInFoldersCount += flattenItems(entry.item.items || []).filter((child) => isItemARequest(child)).length;
    }
    else if (isItemARequest(entry.item)) requestCount++;
    else if (entry.item.type === 'app') appCount++;
  }

  const folderDescription = folderCount > 0 ? `${folderCount} ${pluralizeWord('folder', folderCount)}` : null;
  const requestDescription = requestCount > 0 ? `${requestCount} ${pluralizeWord('request', requestCount)}` : null;
  const appDescription = appCount > 0 ? `${appCount} ${pluralizeWord('app', appCount)}` : null;
  const exampleDescription = exampleCount > 0 ? `${exampleCount} ${pluralizeWord('example', exampleCount)}` : null;

  const types = [folderDescription, requestDescription, appDescription, exampleDescription].filter(Boolean);
  const description = entries.length === 1 ? (
    <span className="font-medium">{entries[0].type === 'example' ? entries[0].example.name : entries[0].item.name}</span>
  ) : (
    types.length > 2
      ? `${types.slice(0, -1).join(', ')} and ${types[types.length - 1]}`
      : types.join(' and ')
  );

  const getTitle = () => {
    if (types.length > 1) {
      return 'Delete Items';
    } else if (folderCount > 0) {
      return `Delete ${pluralizeWord('Folder', folderCount)}`;
    } else if (appCount > 0) {
      return `Delete ${pluralizeWord('App', appCount)}`;
    } else if (exampleCount > 0) {
      return `Delete ${pluralizeWord('Example', exampleCount)}`;
    }
    return `Delete ${pluralizeWord('Request', requestCount)}`;
  };

  const title = getTitle();

  // Folders that contain requests let the user choose what happens to those requests
  const showFolderOptions = folderCount > 0 && requestsInFoldersCount > 0;
  const moveRequestsToRoot = showFolderOptions && folderDeleteMode === FOLDER_DELETE_MODE.MOVE_TO_ROOT;

  const onConfirm = async () => {
    const parentItemsToSave = new Map(); // itemUid -> collectionUid

    for (const entry of entries) {
      try {
        if (entry.type === 'example') {
          dispatch(deleteResponseExample({ itemUid: entry.item.uid, collectionUid: entry.collectionUid, exampleUid: entry.uid }));
          dispatch(closeTabs({ tabUids: [entry.uid] }));
          parentItemsToSave.set(entry.item.uid, entry.collectionUid);
          continue;
        }

        const isFolder = isItemAFolder(entry.item);
        if (isFolder && showFolderOptions) {
          await dispatch(deleteItem(entry.uid, entry.collectionUid, { moveRequestsToRoot }));
        } else {
          await dispatch(deleteItem(entry.uid, entry.collectionUid));
        }
        // When requests are moved to the collection root, only the folder tab itself is closed
        const tabUids = isFolder && !moveRequestsToRoot
          ? [...recursivelyGetAllItemUids(entry.item.items), entry.uid]
          : [entry.uid];
        dispatch(closeTabs({ tabUids }));
      } catch (error) {
        console.error(`Error deleting item ${entry.uid}`, error);
        toast.error(error?.message || `Error deleting ${entry.item?.name || 'item'}`);
      }
    }

    for (const [itemUid, collectionUid] of parentItemsToSave) {
      try {
        await dispatch(saveRequest(itemUid, collectionUid, true));
      } catch (error) {
        console.error(`Error saving request ${itemUid} after deleting examples`, error);
      }
    }

    dispatch(clearSidebarSelection());
    onClose();
  };

  return (
    <Modal
      size="md"
      title={title}
      confirmText="Delete"
      confirmButtonColor="danger"
      handleConfirm={onConfirm}
      handleCancel={onClose}
      dataTestId="delete-collection-item-modal"
    >
      <p>Are you sure you want to delete {description}?</p>

      {showFolderOptions && (
        <StyledWrapper>
          <p className="folder-summary">
            {folderCount === 1 ? 'This folder contains' : 'These folders contain'}{' '}
            <span className="font-medium">{requestsInFoldersCount}</span>{' '}
            {pluralizeWord('request', requestsInFoldersCount)}.
          </p>

          <div className="removal-options">
            <label className={`removal-option ${folderDeleteMode === FOLDER_DELETE_MODE.MOVE_TO_ROOT ? 'selected' : ''}`}>
              <input
                type="radio"
                name="folderDeleteMode"
                value={FOLDER_DELETE_MODE.MOVE_TO_ROOT}
                checked={folderDeleteMode === FOLDER_DELETE_MODE.MOVE_TO_ROOT}
                onChange={() => setFolderDeleteMode(FOLDER_DELETE_MODE.MOVE_TO_ROOT)}
              />
              <div>
                <div className="removal-option-title">Move requests to collection root</div>
                <div className="removal-option-description">
                  Keep all requests and remove only the folder structure.
                </div>
              </div>
            </label>

            <label className={`removal-option ${folderDeleteMode === FOLDER_DELETE_MODE.DELETE_ALL ? 'selected' : ''}`}>
              <input
                type="radio"
                name="folderDeleteMode"
                value={FOLDER_DELETE_MODE.DELETE_ALL}
                checked={folderDeleteMode === FOLDER_DELETE_MODE.DELETE_ALL}
                onChange={() => setFolderDeleteMode(FOLDER_DELETE_MODE.DELETE_ALL)}
              />
              <div>
                <div className="removal-option-title">Delete folder and all requests inside</div>
                <div className="removal-option-description">
                  Permanently delete the {folderCount === 1 ? 'folder' : 'folders'} and every request {folderCount === 1 ? 'it contains' : 'they contain'}.
                </div>
              </div>
            </label>
          </div>

          {folderDeleteMode === FOLDER_DELETE_MODE.DELETE_ALL && (
            <p className="warning-text">
              This action cannot be undone. All requests inside {folderCount === 1 ? 'this folder' : 'these folders'} will be permanently deleted.
            </p>
          )}
        </StyledWrapper>
      )}
    </Modal>
  );
};

export default DeleteCollectionItems;
