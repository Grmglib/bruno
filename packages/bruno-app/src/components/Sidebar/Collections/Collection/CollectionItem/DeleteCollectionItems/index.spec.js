import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import DeleteCollectionItems from './index';
import { deleteItem, closeTabs } from 'providers/ReduxStore/slices/collections/actions';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  deleteItem: jest.fn(),
  closeTabs: jest.fn((payload) => ({ type: 'closeTabs', payload }))
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  clearSidebarSelection: jest.fn(() => ({ type: 'clearSidebarSelection' }))
}));

jest.mock('react-hot-toast', () => ({
  error: jest.fn()
}));

// Mock StyledWrapper to prevent theme errors
jest.mock('./StyledWrapper', () => ({ children }) => <div>{children}</div>);

// Mock Modal to prevent theme errors and expose the confirm action
jest.mock('components/Modal', () => ({ children, title, handleConfirm }) => (
  <div>
    <div data-testid="modal-title">{title}</div>
    <div data-testid="modal-description">{children}</div>
    <button onClick={handleConfirm}>Delete</button>
  </div>
));

const buildRequestItem = (overrides = {}) => ({ type: 'http-request', request: {}, ...overrides });
const buildFolderItem = (overrides = {}) => ({ type: 'folder', items: [], ...overrides });

describe('DeleteCollectionItems', () => {
  let mockDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn((action) => {
      if (typeof action === 'function') {
        return action(mockDispatch);
      }
      return action;
    });
    useDispatch.mockReturnValue(mockDispatch);
  });

  it('renders nothing when there are no entries', () => {
    const { container } = render(<DeleteCollectionItems entries={[]} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('titles and describes a single-entry selection by its own name', () => {
    const entry = { uid: 'r1', collectionUid: 'coll-1', item: buildRequestItem({ uid: 'r1', name: 'Get Users' }) };
    render(<DeleteCollectionItems entries={[entry]} onClose={jest.fn()} />);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Request');
    expect(screen.getByText('Get Users')).toBeInTheDocument();
  });

  it('titles a mixed-type multi-selection generically and describes it by type counts', () => {
    const entries = [
      { uid: 'f1', collectionUid: 'coll-1', item: buildFolderItem({ uid: 'f1', name: 'Folder 1' }) },
      { uid: 'r1', collectionUid: 'coll-1', item: buildRequestItem({ uid: 'r1', name: 'Request 1' }) }
    ];
    render(<DeleteCollectionItems entries={entries} onClose={jest.fn()} />);

    expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Items');
    expect(screen.getByTestId('modal-description')).toHaveTextContent('Are you sure you want to delete 1 folder and 1 request?');
  });

  it('deletes every entry, closes the tabs of a deleted folder and its descendants, then clears selection and closes', async () => {
    const onClose = jest.fn();
    deleteItem.mockImplementation(() => Promise.resolve());

    const folderEntry = {
      uid: 'f1',
      collectionUid: 'coll-1',
      item: buildFolderItem({ uid: 'f1', name: 'Folder 1', items: [buildRequestItem({ uid: 'child-1' })] })
    };
    const requestEntry = { uid: 'r1', collectionUid: 'coll-1', item: buildRequestItem({ uid: 'r1', name: 'Request 1' }) };

    render(<DeleteCollectionItems entries={[folderEntry, requestEntry]} onClose={onClose} />);
    // Folders with requests default to "move requests to root"; pick "delete everything" here
    fireEvent.click(screen.getByLabelText(/Delete folder and all requests inside/));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(deleteItem).toHaveBeenCalledWith('f1', 'coll-1', { moveRequestsToRoot: false });
    expect(deleteItem).toHaveBeenCalledWith('r1', 'coll-1');
    expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['child-1', 'f1'] });
    expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['r1'] });
    expect(clearSidebarSelection).toHaveBeenCalled();
  });

  it('moves the requests of a deleted folder to the collection root by default and only closes the folder tab', async () => {
    const onClose = jest.fn();
    deleteItem.mockImplementation(() => Promise.resolve());

    const folderEntry = {
      uid: 'f1',
      collectionUid: 'coll-1',
      item: buildFolderItem({ uid: 'f1', name: 'Folder 1', items: [buildRequestItem({ uid: 'child-1' })] })
    };

    render(<DeleteCollectionItems entries={[folderEntry]} onClose={onClose} />);
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(deleteItem).toHaveBeenCalledWith('f1', 'coll-1', { moveRequestsToRoot: true });
    expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['f1'] });
    expect(closeTabs).not.toHaveBeenCalledWith({ tabUids: ['child-1', 'f1'] });
  });

  it('reports a failed deletion via toast but still deletes the rest and clears the selection', async () => {
    const onClose = jest.fn();
    const entry1 = { uid: 'r1', collectionUid: 'coll-1', item: buildRequestItem({ uid: 'r1', name: 'Request 1' }) };
    const entry2 = { uid: 'r2', collectionUid: 'coll-1', item: buildRequestItem({ uid: 'r2', name: 'Request 2' }) };

    deleteItem.mockImplementation((uid) => (uid === 'r1' ? Promise.reject(new Error('locked file')) : Promise.resolve()));

    render(<DeleteCollectionItems entries={[entry1, entry2]} onClose={onClose} />);
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    expect(toast.error).toHaveBeenCalledWith('locked file');
    expect(closeTabs).toHaveBeenCalledWith({ tabUids: ['r2'] });
    expect(closeTabs).not.toHaveBeenCalledWith({ tabUids: ['r1'] });
    expect(clearSidebarSelection).toHaveBeenCalled();
  });
});
