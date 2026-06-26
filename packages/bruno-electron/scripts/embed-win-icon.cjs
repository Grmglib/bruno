const path = require('path');
const fs = require('fs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const { productFilename } = context.packager.appInfo;
  const exePath = path.join(context.appOutDir, `${productFilename}.exe`);
  const iconPath = path.join(__dirname, '..', 'resources', 'icons', 'win', 'icon.ico');

  if (!fs.existsSync(exePath)) {
    console.warn(`[afterPack] Executable not found: ${exePath}`);
    return;
  }

  if (!fs.existsSync(iconPath)) {
    console.warn(`[afterPack] Icon not found: ${iconPath}`);
    return;
  }

  try {
    const { rcedit } = await import('rcedit');
    await rcedit(exePath, { icon: iconPath });
    console.log(`[afterPack] Embedded icon into ${exePath}`);
  } catch (error) {
    console.warn(`[afterPack] Failed to embed Windows icon: ${error.message}`);
  }
};
