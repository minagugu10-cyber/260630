import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
const serverModule = await import(serverPath);
export default serverModule.default?.default || serverModule.default || serverModule;