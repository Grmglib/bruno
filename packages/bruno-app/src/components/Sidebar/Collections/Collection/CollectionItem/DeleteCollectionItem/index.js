import React, { useMemo, useState } from 'react';
import Modal from 'components/Modal';
import { isItemAFolder } from 'utils/tabs';
import { useDispatch } from 'react-redux';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { recursivelyGetAllItemUids, flattenItems, isItemARequest } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { pluralizeWord } from 'utils/common';

const FOLDER_DELETE_MODE = {
  MOVE_TO_ROOT: 'move-to-root',
  DELETE_ALL: 'delete-all'
};

const DeleteCollectionItem = ({ onClose, item, collectionUid }) => {
  const dispatch = useDispatch();
  const isFolder = isItemAFolder(item);
  const [folderDeleteMode, setFolderDeleteMode] = useState(FOLDER_DELETE_MODE.MOVE_TO_ROOT);

  const requestsInFolder = useMemo(() => {
    if (!isFolder) {
      return [];
    }

    return flattenItems(item.items).filter((folderItem) => isItemARequest(folderItem));
  }, [isFolder, item.items]);

  const moveRequestsToRoot = folderDeleteMode === FOLDER_DELETE_MODE.MOVE_TO_ROOT;

  const closeTabsAfterDelete = () => {
    if (isFolder) {
      if (moveRequestsToRoot) {
        dispatch(
          closeTabs({
            tabUids: [item.uid]
          })
        );
        return;
      }

      const tabUids = [...recursivelyGetAllItemUids(item.items), item.uid];
      dispatch(
        closeTabs({
          tabUids: tabUids
        })
      );
      return;
    }

    dispatch(
      closeTabs({
        tabUids: [item.uid]
      })
    );
  };

  const onConfirm = () => {
    const deleteOptions = isFolder ? { moveRequestsToRoot } : {};

    dispatch(deleteItem(item.uid, collectionUid, deleteOptions))
      .then(() => {
        closeTabsAfterDelete();
        onClose();
      })
      .catch((error) => {
        console.error('Error deleting item', error);
        toast.error(error?.message || 'Error deleting item');
      });
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={`Delete ${isFolder ? 'Folder' : 'Request'}`}
        confirmText="Delete"
        confirmButtonColor="danger"
        handleConfirm={onConfirm}
        handleCancel={onClose}
      >
        <p className="modal-description">
          Are you sure you want to delete <span className="font-medium">{item.name}</span>?
        </p>

        {isFolder && requestsInFolder.length > 0 && (
          <>
            <p className="folder-summary">
              This folder contains <span className="font-medium">{requestsInFolder.length}</span>{' '}
              {pluralizeWord('request', requestsInFolder.length)}.
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
                    Permanently delete the folder and every request it contains.
                  </div>
                </div>
              </label>
            </div>

            {folderDeleteMode === FOLDER_DELETE_MODE.DELETE_ALL && (
              <p className="warning-text">
                This action cannot be undone. All requests inside this folder will be permanently deleted.
              </p>
            )}
          </>
        )}
      </Modal>
    </StyledWrapper>
  );
};

export default DeleteCollectionItem;
