import { createServer } from 'https';
import { parse } from 'url';
import next from 'next';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Allow external connections
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Self-signed certificate for development
// You can generate your own with: 
// openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365
const httpsOptions = {
  key: readFileSync(join(__dirname, 'localhost-key.pem')),
  cert: readFileSync(join(__dirname, 'localhost-cert.pem')),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on https://localhost:${port}`);
      console.log(`> Network: https://<your-local-ip>:${port}`);
    });
});
