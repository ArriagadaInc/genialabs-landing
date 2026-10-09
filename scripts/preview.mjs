import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSession } from '../netlify/functions/voice-session.mjs';
import { handleLog } from '../netlify/functions/voice-log.mjs';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.xml':'application/xml' };
const security = {};
for (const line of fs.readFileSync(path.join(root,'_headers'),'utf8').split(/\r?\n/).slice(1)) {
 if (!line.trim()) break;
 const split=line.indexOf(':'); if(split>0) security[line.slice(0,split).trim()]=line.slice(split+1).trim();
}
http.createServer(async (req,res)=>{
 try {
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(['/.netlify/functions/voice-session','/.netlify/functions/voice-log'].includes(pathname)) {
  const chunks=[]; let size=0;
  for await(const chunk of req) { size+=chunk.length; if(size>(pathname.endsWith('voice-log')?45000:256)){res.writeHead(413);res.end();return;} chunks.push(chunk); }
  const method=req.method;
  const request=new Request('http://127.0.0.1:4173'+pathname,{method,headers:req.headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks)}:{})});
  const handler=pathname.endsWith('voice-log')?handleLog:handleSession;
  const response=await handler(request,{env:{...process.env,NETLIFY_DEV:'true',DEPLOY_PRIME_URL:`http://127.0.0.1:${process.env.PORT || 4173}`}});
  res.writeHead(response.status,{...security,...Object.fromEntries(response.headers)});res.end(await response.text());return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let file=path.resolve(root,'.'+pathname); const relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);res.end();return;}
 if(pathname.endsWith('/'))file=path.join(file,'index.html');else if(!path.extname(file))file+='.html';
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{...security,'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end('Invalid request');}
}).listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173'));
