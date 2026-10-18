'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createPreview}=require('../scripts/preview-payoff');
test('sales content only references files that exist, and the product shot is a small JPEG',()=>{
 const root=path.resolve(__dirname,'../payoff-web');
 const context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),context);
 const content=context.window.PAYOFF_CONTENT;
 const images=[...Object.values(content.proof).flat(),content.productImage,content.founder&&{src:content.founder.image}].filter(Boolean);
 for(const image of images)assert.ok(fs.existsSync(path.join(root,'assets',path.basename(image.src))),image.src);
 assert.ok(fs.statSync(path.join(root,'assets/tool-result.jpg')).size<200000);
 assert.equal(content.addOns.length,0);
});
async function withServer(fn){const server=createPreview().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));try{await fn('http://127.0.0.1:'+server.address().port);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
test('Payoff design preview serves only its pages and local assets',async()=>withServer(async base=>{
 for(const route of ['/payoff','/payoff/','/payoff/order','/payoff/order/','/payoff/page.js','/payoff/style.css','/payoff/content.js','/marketel.svg','/frontdesk/assets/fonts/dm-sans-latin-400-normal.woff2']){
  const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
 }
 assert.equal((await fetch(base+'/claims')).status,404);
 assert.equal((await fetch(base+'/api/trace/checkout')).status,404);
 assert.equal((await fetch(base+'/payoff/../../server.js')).status,404);
}));
test('preview cannot submit information, execute payment or frame a remote checkout',async()=>withServer(async base=>{
 for(const route of ['/payoff/order','/api/inspect/checkout/sim','/api/payoff/checkout'])assert.equal((await fetch(base+route,{method:'POST',body:'example'})).status,405);
 const response=await fetch(base+'/payoff');
 const csp=response.headers.get('content-security-policy');
 for(const directive of ["connect-src 'self'","frame-src 'none'","form-action 'none'","frame-ancestors 'none'"])assert.ok(csp.includes(directive));
 const html=await response.text();assert.doesNotMatch(html,/preorder/i);assert.doesNotMatch(html,/truemoneysaver|70,000|Kati|Reg\. price|% off|media-slot|preview-note/);
}));
