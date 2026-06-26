import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';

jest.mock('react-hot-toast', () => ({
  error: jest.fn()
}));

jest.mock('hooks/usePostmanPackagePrompt', () => () => ({
  postmanPackagePrompt: null,
  clearPostmanPackagePrompt: jest.fn(),
  handleImportResolved: jest.fn()
}));

jest.mock('hooks/useKeybinding', () => jest.fn());

jest.mock('components/Sidebar/SidebarSection', () => ({ children, actions }) => (
  <section>
    <div>{actions}</div>
    <div>{children}</div>
  </section>
));

jest.mock('components/Sidebar/Collections', () => () => <div>Collections panel</div>);
jest.mock('components/Sidebar/Sections/GitSection', () => ({ embedded }) => (
  <div>{embedded ? 'Git panel embedded' : 'Git panel'}</div>
));

jest.mock('components/Sidebar/ImportCollection', () => () => null);
jest.mock('components/Sidebar/ImportCollectionLocation', () => () => null);
jest.mock('components/Sidebar/BulkImportCollectionLocation', () => () => null);
jest.mock('components/Sidebar/CloneGitRespository', () => () => null);
jest.mock('components/Sidebar/Collections/RemoveCollectionsModal/index', () => () => null);
jest.mock('components/Sidebar/CreateCollection', () => () => null);
jest.mock('components/Sidebar/PostmanPackageReport', () => () => null);
jest.mock('components/WelcomeModal', () => () => null);
jest.mock('components/Sidebar/Collections/NewCollectionGroupModal', () => () => null);
jest.mock('ui/MenuDropdown', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/ActionIcon', () => ({ children, onClick, label }) => (
  <button onClick={onClick} aria-label={label}>{children}</button>
));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  importCollection: jest.fn(),
  openCollection: jest.fn(() => async () => {}),
  importCollectionFromZip: jest.fn(),
  newHttpRequest: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/index', () => ({
  sortCollections: jest.fn(() => ({ type: 'collections/sort' }))
}));

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: jest.fn(() => async () => {}),
  setIsCreatingCollection: jest.fn((value) => ({ type: 'app/setIsCreatingCollection', payload: value })),
  toggleSidebarSearch: jest.fn(() => ({ type: 'app/toggleSidebarSearch' }))
}));

jest.mock('utils/terminal', () => ({
  openDevtoolsAndSwitchToTerminal: jest.fn()
}));

import CollectionsSection from './index';

const theme = {
  sidebar: {
    color: '#fff',
    collection: {
      item: {
        hoverBg: '#374151'
      }
    }
  }
};

const makeStore = () => configureStore({
  reducer: {
    app: (state = {
      showSidebarSearch: false,
      preferences: { onboarding: { hasSeenWelcomeModal: true } },
      isCreatingCollection: false
    }) => state,
    workspaces: (state = {
      activeWorkspaceUid: 'ws-1',
      workspaces: [{
        uid: 'ws-1',
        pathname: '/tmp/workspace',
        collections: [],
        scratchCollectionUid: 'scratch-1'
      }]
    }) => state,
    collections: (state = {
      collections: [],
      collectionSortOrder: 'default'
    }) => state
  }
});

describe('CollectionsSection tabs', () => {
  it('switches between Collections and Git tabs', () => {
    render(
      <Provider store={makeStore()}>
        <ThemeProvider theme={theme}>
          <CollectionsSection />
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Collections panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sidebar-tab-git'));
    expect(screen.getByText('Git panel embedded')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sidebar-tab-collections'));
    expect(screen.getByText('Collections panel')).toBeInTheDocument();
  });
});
