const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const mockUserDataPath = path.join(os.tmpdir(), 'bruno-test-user-data');
const mockWorkspacePath = path.join(os.tmpdir(), 'bruno-test-workspace');

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
  readCustomIcon,
  openIconsFolder,
  getIconsFolderPath
} = require('../../src/services/icons');

describe('icons service', () => {
  let iconsDir;
  let workspaceIconsDir;

  beforeEach(() => {
    iconsDir = path.join(mockUserDataPath, 'icons');
    workspaceIconsDir = path.join(mockWorkspacePath, 'icons');
    fs.rmSync(iconsDir, { recursive: true, force: true });
    fs.rmSync(mockWorkspacePath, { recursive: true, force: true });
    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(mockWorkspacePath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(iconsDir, { recursive: true, force: true });
    fs.rmSync(mockWorkspacePath, { recursive: true, force: true });
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
    it('lists svg icons grouped by pack folder from user icons', () => {
      const packDir = path.join(iconsDir, 'minha-marca');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'api-gateway.svg'), '<svg></svg>');
      fs.writeFileSync(path.join(packDir, 'payments.svg'), '<svg></svg>');

      const packs = listIconPacks();
      expect(packs).toEqual([
        {
          id: 'minha-marca',
          name: 'minha-marca',
          scope: 'user',
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
          scope: 'user',
          icons: [
            { name: 'logo', format: 'png' },
            { name: 'photo', format: 'jpg' }
          ]
        }
      ]);
    });

    it('lists workspace icon packs with workspace scope', () => {
      const packDir = path.join(workspaceIconsDir, 'repo-brand');
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'api.svg'), '<svg></svg>');

      const packs = listIconPacks(mockWorkspacePath);
      expect(packs).toEqual([
        {
          id: 'repo-brand',
          name: 'repo-brand',
          scope: 'workspace',
          icons: [
            { name: 'api', format: 'svg' }
          ]
        }
      ]);
    });

    it('prefers workspace packs over user packs with the same id', () => {
      const workspacePackDir = path.join(workspaceIconsDir, 'brand');
      const userPackDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(workspacePackDir, { recursive: true });
      fs.mkdirSync(userPackDir, { recursive: true });
      fs.writeFileSync(path.join(workspacePackDir, 'repo-logo.svg'), '<svg></svg>');
      fs.writeFileSync(path.join(userPackDir, 'local-logo.svg'), '<svg></svg>');

      const packs = listIconPacks(mockWorkspacePath);
      expect(packs).toEqual([
        {
          id: 'brand',
          name: 'brand',
          scope: 'workspace',
          icons: [
            { name: 'repo-logo', format: 'svg' }
          ]
        }
      ]);
    });
  });

  describe('readCustomIcon', () => {
    it('reads and sanitizes svg content from a user pack', () => {
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

    it('reads icons from workspace packs before user packs', () => {
      const workspacePackDir = path.join(workspaceIconsDir, 'brand');
      const userPackDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(workspacePackDir, { recursive: true });
      fs.mkdirSync(userPackDir, { recursive: true });
      fs.writeFileSync(path.join(workspacePackDir, 'logo.svg'), '<svg data-workspace="true"></svg>');
      fs.writeFileSync(path.join(userPackDir, 'logo.svg'), '<svg data-user="true"></svg>');

      const payload = readCustomIcon('brand', 'logo', 'svg', mockWorkspacePath);
      expect(payload.type).toBe('svg');
      expect(payload.content).toContain('data-workspace="true"');
      expect(payload.content).not.toContain('data-user="true"');
    });

    it('falls back to user packs when workspace pack is missing', () => {
      const userPackDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(userPackDir, { recursive: true });
      fs.writeFileSync(path.join(userPackDir, 'logo.svg'), '<svg data-user="true"></svg>');

      const payload = readCustomIcon('brand', 'logo', 'svg', mockWorkspacePath);
      expect(payload.type).toBe('svg');
      expect(payload.content).toContain('data-user="true"');
    });

    it('falls back to user packs when the workspace pack folder exists but lacks the icon', () => {
      const workspacePackDir = path.join(workspaceIconsDir, 'brand');
      const userPackDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(workspacePackDir, { recursive: true });
      fs.mkdirSync(userPackDir, { recursive: true });
      // workspace pack folder exists but only contains a different icon
      fs.writeFileSync(path.join(workspacePackDir, 'other.svg'), '<svg></svg>');
      fs.writeFileSync(path.join(userPackDir, 'logo.svg'), '<svg data-user="true"></svg>');

      const payload = readCustomIcon('brand', 'logo', 'svg', mockWorkspacePath);
      expect(payload.type).toBe('svg');
      expect(payload.content).toContain('data-user="true"');
    });

    it('resolves the icon even when the stored format does not match the file on disk', () => {
      const packDir = path.join(iconsDir, 'brand');
      fs.mkdirSync(packDir, { recursive: true });
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      fs.writeFileSync(path.join(packDir, 'logo.png'), pngBytes);

      // config defaults to svg, but the actual file is a png
      const payload = readCustomIcon('brand', 'logo', 'svg');
      expect(payload.type).toBe('image');
      expect(payload.mimeType).toBe('image/png');
    });
  });

  describe('openIconsFolder', () => {
    it('opens the workspace icons folder when workspacePath is provided', async () => {
      const openedPath = await openIconsFolder(mockWorkspacePath);
      expect(openedPath).toBe(workspaceIconsDir);
      expect(fs.existsSync(workspaceIconsDir)).toBe(true);
    });

    it('opens the user icons folder when workspacePath is omitted', async () => {
      const openedPath = await openIconsFolder();
      expect(openedPath).toBe(iconsDir);
      expect(fs.existsSync(iconsDir)).toBe(true);
    });
  });

  describe('getIconsFolderPath', () => {
    it('returns the workspace icons folder when workspacePath is provided', () => {
      const folderPath = getIconsFolderPath(mockWorkspacePath);
      expect(folderPath).toBe(workspaceIconsDir);
      expect(fs.existsSync(workspaceIconsDir)).toBe(true);
    });

    it('returns the user icons folder when workspacePath is omitted', () => {
      const folderPath = getIconsFolderPath();
      expect(folderPath).toBe(iconsDir);
    });
  });
});
