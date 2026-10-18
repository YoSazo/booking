'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const {createPreview}=require('../../scripts/preview-payoff');
async function world(fn,{width=390,reducedMotion='no-preference',config=null}={}){
 const server=createPreview().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<760,hasTouch:width<760,reducedMotion});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r));
  if(config)await page.route('**/payoff/content.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.resolve(__dirname,'../../payoff-web/content.js'),'utf8')+'\n'+config}));
  await page.goto(base+'/payoff');await page.locator('.offer-slot .cta').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  await fn({page,base,errors,requests});
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('composition shows the real tool and no empty slots, rating or borrowed proof',async()=>world(async({page,errors})=>{
 assert.deepEqual(await page.locator('[data-section]').evaluateAll(els=>els.map(el=>el.dataset.section)),['hero','problem','example','mechanism','included','faq']);
 assert.equal(await page.locator('a.cta').count(),6);
 assert.equal(await page.locator('.proof-image,.rating-stars,.rating-slot,.preorder-notice,.owner-placeholder,.proof-slot,.policy-slot,.preview-note').count(),0);
 assert.doesNotMatch(await page.locator('body').innerText(),/preorder|10,000|Lauren|Kati|not yet available|in development/i);
 const shots=page.locator('img.product-shot');
 assert.equal(await shots.count(),3);
 await shots.evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
 assert.ok(await shots.evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
 assert.equal(await page.locator('iframe').count(),0);
 assert.deepEqual(errors,[]);
}));
test('the order is Payoff alone at $33; local preview cannot submit payments or store contact information',async()=>world(async({page,base,requests,errors})=>{
 await page.locator('a.cta').first().click();await page.waitForURL(base+'/payoff/order');
 assert.equal(await page.locator('.order-bump,#preorder-consent').count(),0);
 assert.equal(await page.locator('#order-total').innerText(),'$33.00');
 await page.locator('#email').fill('preview@example.test');await page.locator('#email').press('Enter');
 await page.waitForTimeout(160);assert.equal(page.url(),base+'/payoff/order');assert.ok(await page.locator('.disabled-payment').isDisabled());
 assert.equal(requests.filter(r=>r.method()!=='GET').length,0);
 assert.equal(requests.filter(r=>!r.url().startsWith(base)).length,0);
 assert.ok(await page.evaluate(()=>!JSON.stringify({...localStorage,...sessionStorage}).includes('preview@example.test')));assert.deepEqual(errors,[]);
}));
test('Back restores the sales page; FAQ and repeated offers remain usable',async()=>world(async({page,base})=>{
 const faq=page.locator('.faq details').first();await faq.locator('summary').click();assert.ok(await faq.getAttribute('open')!==null);
 await page.locator('[data-placement="faq"] a.cta').click();await page.waitForURL(base+'/payoff/order');
 await page.goBack();await page.waitForURL(base+'/payoff');await page.locator('a.cta').first().waitFor();
 assert.equal(await page.locator('a.cta').count(),6);
 await page.locator('a.cta').first().click();await page.waitForURL(base+'/payoff/order');
}));
test('owner text is text-only; missing or external proof assets are omitted',async()=>world(async({page,errors})=>{
 assert.equal(await page.locator('#injected').count(),0);
 assert.match(await page.locator('#founder-content').innerText(),/<img id="injected"/);
 await page.waitForFunction(()=>document.querySelectorAll('[data-proof="early"] > *').length===0);
 assert.equal(await page.locator('[data-proof="early"] .owner-placeholder').count(),0);
 assert.equal(await page.locator('img[src^="https:"]').count(),0);assert.deepEqual(errors,[]);
},{config:'window.PAYOFF_CONTENT.founder={heading:"About us",paragraphs:[\'<img id="injected" src=x onerror=alert(1)>\']};window.PAYOFF_CONTENT.proof.early=[{src:"https://example.test/external.jpg",alt:"external"},{src:"/payoff/assets/missing.jpg",alt:"missing"}];'}));
for(const width of [320,390,430,1280])test('no horizontal overflow and accessible first CTA at '+width+'px',async()=>world(async({page,base,errors})=>{
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const first=page.locator('a.cta').first();await first.scrollIntoViewIfNeeded();
 assert.ok(await first.evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
 if(process.env.PAYOFF_SHOTS){
  fs.mkdirSync(process.env.PAYOFF_SHOTS,{recursive:true});
  await page.locator('img[src^="/payoff/assets/"]').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  await page.waitForFunction(()=>scrollY===0);
  await page.screenshot({path:path.join(process.env.PAYOFF_SHOTS,'sales-'+width+'.png'),fullPage:true});
  await page.screenshot({path:path.join(process.env.PAYOFF_SHOTS,'hero-'+width+'.png')});
 }
 await first.click();await page.waitForURL(base+'/payoff/order');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(process.env.PAYOFF_SHOTS){await page.locator('img[src^="/payoff/assets/"]').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));await page.screenshot({path:path.join(process.env.PAYOFF_SHOTS,'order-'+width+'.png'),fullPage:true});}
 assert.deepEqual(errors,[]);
},{width,reducedMotion:width===320?'reduce':'no-preference'}));
