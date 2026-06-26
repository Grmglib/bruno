import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CollectionIcon, { DEFAULT_COLLECTION_ICON } from 'components/CollectionIcon';

jest.mock('lucide-react/dynamicIconImports', () => ({
  box: () => Promise.resolve({ default: ({ size, className }) => <svg data-testid="lucide-box" className={className} width={size} height={size} /> }),
  folder: () => Promise.resolve({ default: ({ size, className }) => <svg data-testid="lucide-folder" className={className} width={size} height={size} /> })
}));

jest.mock('utils/icons', () => ({
  readCustomIcon: jest.fn()
}));

const { readCustomIcon } = require('utils/icons');

describe('CollectionIcon', () => {
  beforeEach(() => {
    readCustomIcon.mockReset();
  });

  it('renders the default lucide icon when no icon is configured', async () => {
    render(<CollectionIcon />);
    expect(await screen.findByTestId('lucide-box')).toBeInTheDocument();
    expect(DEFAULT_COLLECTION_ICON).toBe('box');
  });

  it('renders a configured lucide icon', async () => {
    render(<CollectionIcon icon={{ source: 'lucide', name: 'folder' }} />);
    expect(await screen.findByTestId('lucide-folder')).toBeInTheDocument();
  });

  it('renders a custom svg icon from a pack', async () => {
    readCustomIcon.mockResolvedValue({
      type: 'svg',
      content: '<svg data-testid="custom-svg"></svg>'
    });

    render(<CollectionIcon icon={{ source: 'custom', pack: 'brand', name: 'logo' }} />);
    expect(await screen.findByTestId('custom-svg')).toBeInTheDocument();
    expect(readCustomIcon).toHaveBeenCalledWith('brand', 'logo', 'svg');
  });

  it('renders a custom raster icon from a pack', async () => {
    readCustomIcon.mockResolvedValue({
      type: 'image',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,abc'
    });

    const { container } = render(
      <CollectionIcon icon={{ source: 'custom', pack: 'brand', name: 'logo', format: 'png' }} />
    );

    await waitFor(() => {
      const image = container.querySelector('.custom-collection-image');
      expect(image).toBeTruthy();
      expect(image.getAttribute('src')).toBe('data:image/png;base64,abc');
    });

    expect(readCustomIcon).toHaveBeenCalledWith('brand', 'logo', 'png');
  });
});
