import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ScriptBuilder from './index';

const theme = {
  bg: '#1e1e1e',
  text: '#ffffff',
  border: { radius: { sm: '4px', md: '6px' } },
  colors: {
    accent: '#6366f1',
    text: { muted: '#9ca3af', danger: '#ef4444' },
    bg: { danger: '#ef4444' }
  },
  input: {
    border: '#374151',
    bg: '#111827',
    focusBorder: '#6366f1'
  },
  font: { monospace: 'monospace' }
};

const sampleJson = JSON.stringify({
  access_token: 'token-value',
  Expiration: '2026-06-27T13:31:31-03:00'
}, null, 2);

const renderScriptBuilder = (props = {}) => {
  const onApply = jest.fn();
  const mergedProps = {
    scriptType: 'post-response',
    currentScript: '',
    onApply,
    ...props
  };

  render(
    <ThemeProvider theme={theme}>
      <ScriptBuilder {...mergedProps} />
    </ThemeProvider>
  );

  return { onApply };
};

const openBuilder = () => {
  fireEvent.click(screen.getByTestId('script-builder-trigger'));
};

describe('ScriptBuilder', () => {
  it('generates bru.setEnvVar snippet from access_token sample JSON', () => {
    const { onApply } = renderScriptBuilder();

    openBuilder();
    fireEvent.change(screen.getByTestId('script-builder-json'), { target: { value: sampleJson } });
    fireEvent.change(screen.getByTestId('script-builder-property'), { target: { value: 'access_token' } });
    fireEvent.change(screen.getByTestId('script-builder-var-name'), { target: { value: 'my_access_token' } });
    fireEvent.click(screen.getByTestId('script-builder-generate'));

    expect(screen.getByTestId('script-builder-preview')).toHaveTextContent(
      'bru.setEnvVar(\'my_access_token\', res.body.access_token);'
    );

    fireEvent.click(screen.getByTestId('script-builder-apply'));

    expect(onApply).toHaveBeenCalledWith('bru.setEnvVar(\'my_access_token\', res.body.access_token);');
  });

  it('appends generated snippet when existing script is present', () => {
    const { onApply } = renderScriptBuilder({ currentScript: 'console.log("existing");' });

    openBuilder();
    fireEvent.change(screen.getByTestId('script-builder-json'), { target: { value: sampleJson } });
    fireEvent.change(screen.getByTestId('script-builder-property'), { target: { value: 'access_token' } });
    fireEvent.change(screen.getByTestId('script-builder-var-name'), { target: { value: 'access_token' } });
    fireEvent.click(screen.getByTestId('script-builder-generate'));
    fireEvent.click(screen.getByTestId('script-builder-apply'));

    expect(onApply).toHaveBeenCalledWith([
      'console.log("existing");',
      '',
      'bru.setEnvVar(\'access_token\', res.body.access_token);'
    ].join('\n'));
  });
});
