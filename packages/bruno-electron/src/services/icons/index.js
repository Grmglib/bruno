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

const getWorkspaceIconsDirectory = (workspacePath) => {
  if (!workspacePath || typeof workspacePath !== 'string') {
    return null;
  }

  return path.join(workspacePath, ICONS_DIR_NAME);
};

const ensureIconsDirectory = () => {
  const iconsDir = getIconsDirectory();
  fs.mkdirSync(iconsDir, { recursive: true });
  return iconsDir;
};

const ensureWorkspaceIconsDirectory = (workspacePath) => {
  const iconsDir = getWorkspaceIconsDirectory(workspacePath);
  if (!iconsDir) {
    return null;
  }

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

const listPacksFromDirectory = (iconsDir, scope) => {
  if (!iconsDir || !fs.existsSync(iconsDir)) {
    return [];
  }

  return fs.readdirSync(iconsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      scope,
      icons: listIconFiles(path.join(iconsDir, entry.name))
    }))
    .filter((pack) => pack.icons.length > 0);
};

const mergeIconPacks = (workspacePacks, userPacks) => {
  const merged = new Map();

  for (const pack of workspacePacks) {
    merged.set(pack.id, pack);
  }

  for (const pack of userPacks) {
    if (!merged.has(pack.id)) {
      merged.set(pack.id, pack);
    }
  }

  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
};

const listIconPacks = (workspacePath) => {
  const workspaceIconsDir = getWorkspaceIconsDirectory(workspacePath);
  const workspacePacks = listPacksFromDirectory(workspaceIconsDir, 'workspace');

  const userIconsDir = ensureIconsDirectory();
  const userPacks = listPacksFromDirectory(userIconsDir, 'user');

  return mergeIconPacks(workspacePacks, userPacks);
};

const resolveIconPath = (packDir, iconName, format) => {
  const normalizedFormat = normalizeFormat(format);
  const iconPath = path.join(packDir, `${iconName}.${normalizedFormat}`);

  if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
    return { iconPath, format: normalizedFormat };
  }

  // The stored format may not match the file actually on disk (e.g. the config
  // defaulted to svg but the icon is a png). Always fall back to any supported
  // extension so the icon still resolves instead of disappearing.
  for (const extension of SUPPORTED_ICON_EXTENSIONS) {
    if (extension === normalizedFormat) {
      continue;
    }

    const fallbackPath = path.join(packDir, `${iconName}.${extension}`);
    if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
      return { iconPath: fallbackPath, format: extension };
    }
  }

  return null;
};

const getCandidateIconsDirectories = (workspacePath) => {
  const directories = [];

  const workspaceIconsDir = getWorkspaceIconsDirectory(workspacePath);
  if (workspaceIconsDir) {
    directories.push(workspaceIconsDir);
  }

  directories.push(ensureIconsDirectory());

  return directories;
};

const resolveCustomIcon = (packId, iconName, format, workspacePath) => {
  // Search the icon file across every candidate location (workspace first, then
  // the user icons folder). We look for the actual file rather than locking onto
  // the first pack folder that exists, so an icon present in one location is not
  // masked by an empty/partial pack folder in another.
  for (const iconsDir of getCandidateIconsDirectories(workspacePath)) {
    const packDir = path.join(iconsDir, packId);
    if (!fs.existsSync(packDir) || !fs.statSync(packDir).isDirectory()) {
      continue;
    }

    const resolved = resolveIconPath(packDir, iconName, format);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

const readCustomIcon = (packId, iconName, format, workspacePath) => {
  if (!packId || !iconName) {
    throw new Error('Pack id and icon name are required');
  }

  const resolved = resolveCustomIcon(packId, iconName, format, workspacePath);
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

const openIconsFolder = async (workspacePath) => {
  if (workspacePath) {
    const iconsDir = ensureWorkspaceIconsDirectory(workspacePath);
    await shell.openPath(iconsDir);
    return iconsDir;
  }

  const iconsDir = ensureIconsDirectory();
  await shell.openPath(iconsDir);
  return iconsDir;
};

const getIconsFolderPath = (workspacePath) => {
  if (workspacePath) {
    return ensureWorkspaceIconsDirectory(workspacePath);
  }

  return getIconsDirectory();
};

module.exports = {
  getIconsDirectory,
  getWorkspaceIconsDirectory,
  ensureIconsDirectory,
  ensureWorkspaceIconsDirectory,
  sanitizeSvg,
  listIconPacks,
  readCustomIcon,
  openIconsFolder,
  getIconsFolderPath,
  SUPPORTED_ICON_EXTENSIONS
};
