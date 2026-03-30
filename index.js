const fs = require('fs');
const path = require('path');
const skia = require('skia-canvas');

// -------------------------------------------------------------
// PURE NODE.JS SKIA-CANVAS OVERRIDE FOR FABRIC 5.x + AXIOS
// -------------------------------------------------------------

class MockDocument {}
global.Document = MockDocument;
global.HTMLDocument = MockDocument;

global.document = {
  documentElement: {
    style: {}
  },
  createElement: function (tag) {
    if (tag === 'canvas') {
      const canvas = new skia.Canvas(800, 600);
      
      const originalGetContext = canvas.getContext.bind(canvas);
      canvas.getContext = function(type, options) {
          const ctx = originalGetContext(type, options);
          if (ctx) {
            Object.defineProperty(ctx, 'canvas', {
              value: canvas,
              writable: true,
              configurable: true
            });
          }
          return ctx;
      };

      canvas.style = {};
      canvas.classList = { add: () => {}, remove: () => {} };
      canvas.setAttribute = () => {};
      canvas.removeAttribute = () => {};
      canvas.getAttribute = () => { return null; }; // Fix for Fabric text rendering
      return canvas;
    }
    return { style: {} };
  },
  getElementById: function () {
    return null;
  }
};

Object.setPrototypeOf(global.document, MockDocument.prototype);

global.window = {
  document: global.document,
  devicePixelRatio: 1,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Image: skia.Image,
  location: { href: 'http://localhost' }
};

const { fabric } = require('fabric');
fabric.document = global.document;
fabric.window = global.window;
fabric.isLikelyNode = true;

const { loadAssets } = require('./assetLoader');
const { hydrateLayers } = require('./hydration');

async function renderTemplate(template, options = {}) {
  if (!template || !template.canvas || !template.layers) {
    throw new Error('INVALID_JSON: Missing required fields canvas or layers');
  }
  
  const width = options.width || template.canvas.width;
  const height = options.height || template.canvas.height;
  const format = options.format || 'png';
  const bgColor = template.canvas.backgroundColor || '#FFFFFF';

  const assetMap = await loadAssets(template);

  const canvas = new fabric.StaticCanvas(null, {
    width,
    height,
    backgroundColor: bgColor
  });

  await hydrateLayers(canvas, template.layers, assetMap, template.canvas.dpi);

  const skiaCanvas = canvas.lowerCanvasEl;
  
  if (!skiaCanvas || !skiaCanvas.toBuffer) {
      throw new Error("Skia Canvas wrapper not successfully injected");
  }

  const buffer = await skiaCanvas.toBuffer(format, {
      quality: options.quality ? (options.quality / 100) : 0.9
  });

  if (options.outputPath) {
    fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
    fs.writeFileSync(options.outputPath, buffer);
  }

  if (options.returnBuffer !== false) {
    return buffer;
  }
  return options.outputPath;
}

async function renderFromFile(templatePath, options = {}) {
  const absolutePath = path.resolve(templatePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`FILE_NOT_FOUND: Cannot find template at ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  let template;
  try {
    template = JSON.parse(raw);
  } catch (e) {
    throw new Error('JSON_PARSE_ERROR: Invalid JSON structure in template');
  }

  return renderTemplate(template, options);
  const express = require("express");
const app = express();

app.use(express.json({ limit: "10mb" }));

// ✅ Test route
app.get("/", (req, res) => {
  res.send("Render Engine Running 🚀");
});
}

module.exports = { renderTemplate, renderFromFile };
app.post("/render", async (req, res) => {
  try {
    const template = req.body;

    const buffer = await renderTemplate(template, {
      format: "png",
      quality: 100
    });

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message
    });
  }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
