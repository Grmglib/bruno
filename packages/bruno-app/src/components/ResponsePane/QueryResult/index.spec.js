import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import QueryResult from './index';

jest.mock('providers/Theme/index', () => ({
  useTheme: () => ({
    displayedTheme: 'light'
  })
}));

jest.mock('./QueryResultPreview', () => (props) => (
  <div
    data-testid="query-result-preview"
    data-use-simplified={props.useSimplifiedView ? 'true' : 'false'}
  >
    {props.formattedData}
  </div>
));

jest.mock('../LargeResponseWarning', () => ({ estimatedLineCount, onRevealResponse }) => (
  <div>
    <div>Large Response Warning</div>
    <div>Estimated lines: {estimatedLineCount}</div>
    <button type="button" onClick={onRevealResponse}>View raw</button>
  </div>
));

const theme = {
  font: {
    size: {
      sm: '0.875rem'
    }
  },
  colors: {
    text: {
      yellow: '#facc15',
      muted: '#6b7280',
      danger: '#ef4444'
    }
  },
  border: {
    border2: '#d1d5db',
    radius: {
      sm: '4px'
    }
  },
  background: {
    base: '#ffffff'
  }
};

const renderComponent = (props = {}) => render(
  <ThemeProvider theme={theme}>
    <QueryResult
      item={{
        uid: 'req-1',
        response: {},
        requestSent: { url: 'https://example.com' }
      }}
      collection={{ uid: 'col-1' }}
      data={'line\n'.repeat(31000)}
      dataBuffer={Buffer.from('line\n'.repeat(31000)).toString('base64')}
      headers={{ 'content-type': 'text/plain' }}
      selectedFormat="raw"
      selectedTab="editor"
      {...props}
    />
  </ThemeProvider>
);

describe('QueryResult performance mode', () => {
  it('shows a warning and switches to simplified preview for line-heavy responses', () => {
    renderComponent();

    expect(screen.getByText('Large Response Warning')).toBeInTheDocument();
    expect(screen.getByText(/Estimated lines:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View raw' }));

    expect(screen.getByText(/Performance mode enabled for this response/i)).toBeInTheDocument();
    expect(screen.getByTestId('query-result-preview')).toHaveAttribute('data-use-simplified', 'true');
  });

  it('allows opting back into full rendering from performance mode', () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'View raw' }));
    fireEvent.click(screen.getByTestId('response-full-render-btn'));

    expect(screen.getByText(/Full rendering was re-enabled/i)).toBeInTheDocument();
    expect(screen.getByTestId('query-result-preview')).toHaveAttribute('data-use-simplified', 'false');
  });

  it('keeps the regular preview path for smaller responses', () => {
    renderComponent({
      data: 'small response',
      dataBuffer: Buffer.from('small response').toString('base64')
    });

    expect(screen.queryByText('Large Response Warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('query-result-preview')).toHaveAttribute('data-use-simplified', 'false');
  });
});
