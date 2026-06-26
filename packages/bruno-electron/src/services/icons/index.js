const fs = require('node:fs');
const path = require('node:path');
const { app, shell } = require('electron');

const ICONS_DIR_NAME = 'icons';
const SUPPORTED_ICON_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg'];

const MIME_TYPES = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg'
};

const getIconsDirectory = () => {
  return path.join(app.getPath('userData'), ICONS_DIR_NAME);
};

const ensureIconsDirectory = () => {
  const iconsDir = getIconsDirectory();
  fs.mkdirSync(iconsDir, { recursive: true });
  return iconsDir;
};

const sanitizeSvg = (svgContent) => {
  if (typeof svgContent !== 'string') {
    return '';
  }

  let sanitized = svgContent
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '');

  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');

  return sanitized.trim();
};

const normalizeFormat = (format) => {
  if (!format || typeof format !== 'string') {
    return 'svg';
  }

  const normalized = format.toLowerCase();
  return SUPPORTED_ICON_EXTENSIONS.includes(normalized) ? normalized : 'svg';
};

const listIconFiles = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isFile()) {
        return false;
      }

      const extension = path.extname(entry.name).slice(1).toLowerCase();
      return SUPPORTED_ICON_EXTENSIONS.includes(extension);
    })
    .map((entry) => ({
      name: path.basename(entry.name, path.extname(entry.name)),
      format: path.extname(entry.name).slice(1).toLowerCase()
    }))
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      if (byName !== 0) {
        return byName;
      }

      return a.format.localeCompare(b.format);
    });
};

const listIconPacks = () => {
  const iconsDir = ensureIconsDirectory();

  if (!fs.existsSync(iconsDir)) {
    return [];
  }

  return fs.readdirSync(iconsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      icons: listIconFiles(path.join(iconsDir, entry.name))
    }))
    .filter((pack) => pack.icons.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const resolveIconPath = (packDir, iconName, format) => {
  const normalizedFormat = normalizeFormat(format);
  const iconPath = path.join(packDir, `${iconName}.${normalizedFormat}`);

  if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
    return { iconPath, format: normalizedFormat };
  }

  if (!format) {
    for (const extension of SUPPORTED_ICON_EXTENSIONS) {
      const fallbackPath = path.join(packDir, `${iconName}.${extension}`);
      if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
        return { iconPath: fallbackPath, format: extension };
      }
    }
  }

  return null;
};

const readCustomIcon = (packId, iconName, format) => {
  if (!packId || !iconName) {
    throw new Error('Pack id and icon name are required');
  }

  const iconsDir = ensureIconsDirectory();
  const packDir = path.join(iconsDir, packId);

  if (!fs.existsSync(packDir) || !fs.statSync(packDir).isDirectory()) {
    throw new Error(`Icon pack not found: ${packId}`);
  }

  const resolved = resolveIconPath(packDir, iconName, format);
  if (!resolved) {
    throw new Error(`Icon not found: ${packId}/${iconName}`);
  }

  const { iconPath, format: resolvedFormat } = resolved;

  if (resolvedFormat === 'svg') {
    const svgContent = fs.readFileSync(iconPath, 'utf8');
    return {
      type: 'svg',
      content: sanitizeSvg(svgContent)
    };
  }

  const buffer = fs.readFileSync(iconPath);
  const mimeType = MIME_TYPES[resolvedFormat];
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    type: 'image',
    mimeType,
    dataUrl
  };
};

const openIconsFolder = async () => {
  const iconsDir = ensureIconsDirectory();
  await shell.openPath(iconsDir);
  return iconsDir;
};

module.exports = {
  getIconsDirectory,
  ensureIconsDirectory,
  sanitizeSvg,
  listIconPacks,
  readCustomIcon,
  openIconsFolder,
  SUPPORTED_ICON_EXTENSIONS
};
