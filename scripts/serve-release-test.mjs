/** Local smoke-test server using the real production range-aware media Worker. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import worker from '../worker/index.mjs';

const root=process.cwd();
const port=Number(process.env.PORT||8765);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4','.wav':'audio/wav','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const assets={async fetch(request){
  try{
    const pathname=decodeURIComponent(new URL(request.url).pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep)||pathname.split('/').includes('.git'))return new Response('Forbidden',{status:403});
    const info=await fs.stat(file);
    if(!info.isFile())return new Response(null,{status:301,headers:{location:pathname+'/'}});
    const headers={'content-type':types[path.extname(file)]||'application/octet-stream','content-length':String(info.size),'cache-control':'no-store'};
    return new Response(request.method==='HEAD'?null:await fs.readFile(file),{headers});
  }catch(error){return new Response(error.code==='ENOENT'?'Not found':'Bad request',{status:error.code==='ENOENT'?404:400})}
}};
const server=http.createServer(async(incoming,outgoing)=>{
  try{
    const request=new Request(`http://127.0.0.1:${port}${incoming.url}`,{method:incoming.method,headers:incoming.headers});
    const response=await worker.fetch(request,{ASSETS:assets});
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));
    if(response.body&&incoming.method!=='HEAD')await pipeline(Readable.fromWeb(response.body),outgoing);
    else outgoing.end();
  }catch(error){if(!outgoing.headersSent)outgoing.writeHead(500);outgoing.end();if(error.code!=='ERR_STREAM_PREMATURE_CLOSE')console.error(error)}
});
server.listen(port,'127.0.0.1',()=>console.log(`Release test server: http://127.0.0.1:${port} (production media Worker)`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
