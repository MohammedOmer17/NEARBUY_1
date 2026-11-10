const zlib = require('node:zlib');

/**
 * High-performance, zero-dependency streaming compression middleware
 * Uses Node.js native zlib to compress responses >= 1KB when client supports gzip.
 */
function compressionMiddleware(thresholdBytes = 1024) {
  return (req, res, next) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = function (body) {
      const jsonString = JSON.stringify(body);
      const byteLength = Buffer.byteLength(jsonString, 'utf8');

      if (byteLength < thresholdBytes) {
        return originalJson(body);
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');

      zlib.gzip(Buffer.from(jsonString, 'utf8'), (err, compressed) => {
        if (err) {
          res.removeHeader('Content-Encoding');
          return originalSend(jsonString);
        }
        res.setHeader('Content-Length', compressed.length);
        originalSend(compressed);
      });
    };

    res.send = function (data) {
      if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
        return originalSend(data);
      }

      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      if (buf.length < thresholdBytes || res.getHeader('Content-Encoding')) {
        return originalSend(data);
      }

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');

      zlib.gzip(buf, (err, compressed) => {
        if (err) {
          res.removeHeader('Content-Encoding');
          return originalSend(data);
        }
        res.setHeader('Content-Length', compressed.length);
        originalSend(compressed);
      });
    };

    next();
  };
}

module.exports = compressionMiddleware;
