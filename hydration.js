const { fabric } = require('fabric');

/**
 * Iterates through the JSON layers and instantiates the proper
 * fabric.js objects in Node.js memory. Includes Z-Index sorting.
 */
function hydrateLayers(canvas, layers, assetMap, dpi = 72) {
  // We'll collect instantiated objects here before adding to canvas
  const objects = [];

  for (const layer of layers) {
    if (layer.visible === false) continue;

    let obj = null;
    const props = { ...layer.properties };

    switch (layer.type) {
      case 'rect':
        obj = new fabric.Rect(props);
        break;

      case 'circle':
        obj = new fabric.Circle(props);
        break;

      case 'text':
        obj = new fabric.Text(props.text || '', props);
        break;

      case 'itext':
        obj = new fabric.IText(props.text || '', props);
        break;

      case 'image':
        if (props.srcId && assetMap[props.srcId]) {
          const imgBuffer = assetMap[props.srcId];
          const base64Str = `data:image/png;base64,${imgBuffer.toString('base64')}`;
          
          // Since fabric.Image.fromURL is async and requires a callback,
          // for a purely synchronous rendering pipeline loop in Node, we handle it sequentially:
          // * Note: To keep hydration sync without blocking, the system should ideally handle 
          // loading inside a Promise wrapping fromURL, but for this step we will load it
          // manually using Node DOM buffers if using JSDOM, or base64.
          
          // Synchronous fallback using JSDOM Image element manually
          obj = new Promise((resolve) => {
            fabric.Image.fromURL(base64Str, (img) => {
              img.set(props);
              img.customZIndex = layer.zIndex || 0;
              resolve(img);
            });
          });
        }
        break;

      case 'path':
        if (props.path) {
          obj = new fabric.Path(props.path, props);
        }
        break;

      default:
        console.warn(`[WARN] Unsupported layer type: ${layer.type}`);
    }

    if (obj) {
      if (obj instanceof Promise) {
          objects.push(obj);
      } else {
        obj.customZIndex = layer.zIndex || 0;
        objects.push(Promise.resolve(obj));
      }
    }
  }

  return Promise.all(objects).then(resolvedObjects => {
      // Sort by Z-Index mapping back-to-front
      resolvedObjects.sort((a, b) => (a.customZIndex || 0) - (b.customZIndex || 0));
      
      for(const obj of resolvedObjects) {
          canvas.add(obj);
      }
      
      canvas.renderAll();
  });
}

module.exports = { hydrateLayers };
