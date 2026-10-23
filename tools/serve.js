import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
export function makeServer() {
  return createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const route=pathname==='/' ? 'demo/index.html' : pathname.slice(1);
    // Serve only demo and component assets, never workspace/config files.
    if (req.method!=='GET' || !/^(demo|src)\/[a-zA-Z0-9_.-]+$/.test(route)) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const body=await readFile(path.join(root,route));
      res.writeHead(200,{'Content-Type':mime[path.extname(route)] || 'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}); res.end(body);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT || 4177);
  makeServer().listen(port,'127.0.0.1',()=>console.log(`Local demo: http://127.0.0.1:${port}/`));
}
