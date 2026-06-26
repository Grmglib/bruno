const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const mockUserDataPath = path.join(os.tmpdir(), 'bruno-test-user-data');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => mockUserDataPath)
  },
  shell: {
    openPath: jest.fn()
  }
}));

const {
  sanitizeSvg,
  listIconPacks,
  readCustomIcon
} = require('../../src/services/icons');

describe('icons service', () => {
  let iconsDir;

  beforeEach(() => {
    iconsDir = path.join(mockUserDataPath, 'icons');
    fs.rmSync(iconsDir, { recursive: true, force: true });
    fs.mkdirSync(iconsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(iconsDir, { recursive: true, force: true });
  });

  describe('sanitizeSvg', () => {
    it('removes script tags and event handler attributes', () => {
      const dirty = '<svg onclick="alert(1)"><script>alert(1)</script><path d="M0 0"/></svg>';
      const clean = sanitizeSvg(dirty);
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('<path');
    });
  });

  describe('listIconPacks', () => {
    it('lists svg icons grouped by pack folder', () => {
      const packDir = path.join(iconsDir, 'minha-marca');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'api-gateway.svg'), '<svg></svg>');
      fs.writeFileSync(path.join(packDir, 'payments.svg'), '<svg></svg>');

      const packs = listIconPacks();
      expect(packs).toEqual([
        {
          id: 'minha-marca',
          name: 'minha-marca',
          icons: [
            { name: 'api-gateway', format: 'svg' },
            { name: 'payments', format: 'svg' }
          ]
        }
      ]);
    });

    it('lists png and jpg icons with format metadata', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      fs.writeFileSync(path.join(packDir, 'photo.jpg'), Buffer.from([0xff, 0xd8, 0xff]));

      const packs = listIconPacks();
      expect(packs).toEqual([
        {
          id: 'brand',
          name: 'brand',
          icons: [
            { name: 'logo', format: 'png' },
            { name: 'photo', format: 'jpg' }
          ]
        }
      ]);
    });
  });

  describe('readCustomIcon', () => {
    it('reads and sanitizes svg content from a pack', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(
        path.join(packDir, 'logo.svg'),
        '<svg onload="x()"><path d="M0 0"/></svg>'
      );

      const payload = readCustomIcon('brand', 'logo', 'svg');
      expect(payload.type).toBe('svg');
      expect(payload.content).not.toContain('onload');
      expect(payload.content).toContain('<path');
    });

    it('reads png icons as a data url payload', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      fs.writeFileSync(path.join(packDir, 'logo.png'), pngBytes);

      const payload = readCustomIcon('brand', 'logo', 'png');
      expect(payload.type).toBe('image');
      expect(payload.mimeType).toBe('image/png');
      expect(payload.dataUrl).toBe(`data:image/png;base64,${pngBytes.toString('base64')}`);
    });

    it('falls back to available extensions when format is omitted', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const payload = readCustomIcon('brand', 'logo');
      expect(payload.type).toBe('image');
      expect(payload.mimeType).toBe('image/png');
    });

    it('throws when icon is missing', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });

      expect(() => readCustomIcon('brand', 'missing')).toThrow('Icon not found');
    });
  });
});
