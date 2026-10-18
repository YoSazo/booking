'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createHash}=require('node:crypto');
const {createPreview}=require('../scripts/preview-payoff');
test('owner-confirmed testimonials are unique and byte-preserved; biography matches its transcript',()=>{
 const root=path.resolve(__dirname,'../payoff-web');
 const context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),context);
 const content=context.window.PAYOFF_CONTENT;
 const slots=Object.values(content.proof).flat();
 const images=slots.filter(Boolean);
 assert.equal(slots.length,15);assert.equal(images.length,14);
 assert.equal(new Set(images.map(image=>image.src)).size,14);
 const hashes={
  'testimony-alexis-hannah.png':'de7e871d8f4d13428c2b9fb721e568c946d8d5f308e65bebee38d9af9d813da2',
  'email-to-lauren.png':'d9d3e66233eb945e7c9f6bb63f75f978a2c188fc85a46e930999b0322fa40d26',
  'testimony-barbara.png':'3c8667be9e8dcd035ff72769ff57d9c98c18ef8391442372ea301084579a4305',
  'testimony-nicole.png':'72ddea3b06db36cbb470f4a1034bc121cc513f26361effbb9710bbdf66baa66c',
  'testimony-heather.png':'058723fc21cbf53fc4a29eb69f318a6ad2c17d6bbd7823205b0b90e55e03371d',
  'testimony-brittany.png':'fa4b61c3598421002d223ede478816f0e23f99a2b4e7a712d096b9b47492dace',
  'testimony-lindsay.png':'e8c695348ca80c06de2d8cf66d7e108886c657684f7d3d2ebf13fd3be8438a5b',
  'testimony-amanda.png':'9438cc9ae4e3355b36e5fbc41c67065c05368d10a47be0a48ebfeb7211b93341',
  'testimony-tara.png':'b5f87514a9b9f3d568bc7e03425289a13762c662b7dceb34641c318da8e59421',
  'testimony-megan.png':'78c78e1d5ee0e282ea9a18a0937183f0bea9274c8614710d1e5b0a111863ee94',
  'testimony-rachel.png':'7b9dcf6d5d6a43c2c2342c33c69543713718176a7bdf8e60c46ef6fe2b62f6d1',
  'testimony-dana.png':'5c1d00e86395b96c2e3f8d7c6bfeba0709f9720626496132eedbcb62e60af7fd',
  'testimony-melissa.png':'507b2cb8d1824f3b7716b7f41a48e71d8d24086442e65371a67751581bcae618',
  'testimony-sandy.png':'f89dd24a4061ac4ed678ddcc59e4193fea9af3b5eb085492afe35f14b788564f',
 };
 for(const image of images){
  const name=path.basename(image.src);
  const hash=createHash('sha256').update(fs.readFileSync(path.join(root,'assets',name))).digest('hex');
  assert.equal(hash,hashes[name],name);
 }
 const transcript=fs.readFileSync(path.join(root,'BIO-TRANSCRIPT.md'),'utf8');
 for(const paragraph of content.founder.paragraphs)assert.ok(transcript.includes(paragraph));
});
test('sales content only references files that exist, and the product shot is a small JPEG',()=>{
 const root=path.resolve(__dirname,'../payoff-web');
 const context={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),context);
 const content=context.window.PAYOFF_CONTENT;
 const images=[...Object.values(content.proof).flat(),content.productImage,content.founder&&{src:content.founder.image}].filter(Boolean);
 for(const image of images)assert.ok(fs.existsSync(path.join(root,'assets',path.basename(image.src))),image.src);
 assert.ok(fs.statSync(path.join(root,'assets/tool-result.jpg')).size<200000);
 assert.equal(JSON.stringify(content.addOns.map(addon=>[addon.id,addon.priceCents])),JSON.stringify([['cashflow',2200],['reset',900]]));
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
