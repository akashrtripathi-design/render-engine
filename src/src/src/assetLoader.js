const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { FontLibrary } = require('skia-canvas');

/**
 * Downloads distant files into local memory buffers to bypass 
 * fabric.js DOM limitations in Node environments.
 */
async function loadAssets(template) {
  const assetMap = {};
  
  // 1. Register fonts synchronously before the canvas requires them
  if (template.assets && template.assets.fonts) {
    for (const font of template.assets.fonts) {
      if (font.path && fs.existsSync(font.path)) {
        // Skia-canvas font loading
        FontLibrary.use(font.family, [font.path]);
      } else {
        console.warn(`[WARN] Font file not found at path: ${font.path}`);
      }
    }
  }

  // 2. Fetch all images asynchronously into buffers
  if (template.assets && template.assets.images) {
    const fetchPromises = template.assets.images.map(async (img) => {
      try {
        if (img.url) {
          const response = await axios.get(img.url, { responseType: 'arraybuffer' });
          assetMap[img.id] = Buffer.from(response.data, 'binary');
        } else if (img.path) {
          assetMap[img.id] = fs.readFileSync(path.resolve(img.path));
        }
      } catch (err) {
        console.error(`[ERROR] Failed to load image asset ${img.id}:`, err.message);
      }
    });

    await Promise.all(fetchPromises);
  }

  return assetMap;
}

module.exports = { loadAssets };
