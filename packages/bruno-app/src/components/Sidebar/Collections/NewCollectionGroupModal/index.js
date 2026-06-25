import React, { useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Modal from 'components/Modal';
import { createCollectionGroupAction } from 'providers/ReduxStore/slices/workspaces/actions';

const NewCollectionGroupModal = ({ workspaceUid, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef();
  const [name, setName] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setIsSaving(true);
    dispatch(createCollectionGroupAction(workspaceUid, trimmed))
      .then(() => onClose())
      .catch(() => {})
      .finally(() => setIsSaving(false));
  };

  return (
    <Modal
      size="md"
      title="New folder"
      confirmText="Create"
      confirmDisabled={isSaving || !name.trim()}
      handleConfirm={handleCreate}
      handleCancel={onClose}
    >
      <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="collection-group-name" className="block font-medium">
            Name
          </label>
          <input
            id="collection-group-name"
            ref={inputRef}
            type="text"
            name="name"
            className="block textbox mt-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Backend APIs"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="new-collection-group-name-input"
          />
        </div>
      </form>
    </Modal>
  );
};

export default NewCollectionGroupModal;
