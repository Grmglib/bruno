import stringifyCollection from './stringifyCollection';
import parseCollection from './parseCollection';

const emptyCollectionRoot = {
  meta: null,
  request: null,
  docs: null
} as any;

describe('collection icon — parse/stringify round-trip', () => {
  it('round-trips a lucide icon in extensions.bruno.icon', () => {
    const brunoConfig = {
      name: 'My API',
      type: 'collection',
      icon: {
        source: 'lucide',
        name: 'folder-open'
      }
    };

    const yml = stringifyCollection(emptyCollectionRoot, brunoConfig);
    expect(yml).toContain('icon:');
    expect(yml).toContain('source: lucide');
    expect(yml).toContain('name: folder-open');

    const { brunoConfig: reparsed } = parseCollection(yml);
    expect(reparsed.icon).toEqual({
      source: 'lucide',
      name: 'folder-open'
    });
  });

  it('round-trips a custom icon pack in extensions.bruno.icon', () => {
    const brunoConfig = {
      name: 'Branded API',
      type: 'collection',
      icon: {
        source: 'custom',
        pack: 'minha-marca',
        name: 'api-gateway'
      }
    };

    const yml = stringifyCollection(emptyCollectionRoot, brunoConfig);
    expect(yml).toContain('source: custom');
    expect(yml).toContain('pack: minha-marca');
    expect(yml).toContain('name: api-gateway');

    const { brunoConfig: reparsed } = parseCollection(yml);
    expect(reparsed.icon).toEqual({
      source: 'custom',
      pack: 'minha-marca',
      name: 'api-gateway'
    });
  });

  it('round-trips a custom png icon format in extensions.bruno.icon', () => {
    const brunoConfig = {
      name: 'Branded API',
      type: 'collection',
      icon: {
        source: 'custom',
        pack: 'minha-marca',
        name: 'logo',
        format: 'png'
      }
    };

    const yml = stringifyCollection(emptyCollectionRoot, brunoConfig);
    expect(yml).toContain('format: png');

    const { brunoConfig: reparsed } = parseCollection(yml);
    expect(reparsed.icon).toEqual({
      source: 'custom',
      pack: 'minha-marca',
      name: 'logo',
      format: 'png'
    });
  });

  it('omits icon from yaml when not configured', () => {
    const brunoConfig = {
      name: 'Plain Collection',
      type: 'collection'
    };

    const yml = stringifyCollection(emptyCollectionRoot, brunoConfig);
    expect(yml).not.toContain('icon:');

    const { brunoConfig: reparsed } = parseCollection(yml);
    expect(reparsed.icon).toBeUndefined();
  });
});
