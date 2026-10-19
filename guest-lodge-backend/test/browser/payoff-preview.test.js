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
test('local composition has eight offers, fourteen images and reference-style rating without empty slots',async()=>world(async({page,errors})=>{
 assert.deepEqual(await page.locator('[data-section]').evaluateAll(els=>els.map(el=>el.dataset.section)),['hero','problem','example','mechanism','proof','founder','included','faq']);
 assert.equal(await page.locator('a.cta').count(),8);
 for(const [group,count]of Object.entries({early:2,problem:2,example:4,main:6}))assert.equal(await page.locator('[data-proof="'+group+'"] > *').count(),count);
 assert.equal(await page.locator('.proof-image').count(),14);
 assert.ok(await page.locator('.proof-image img').evaluateAll(imgs=>imgs.every(img=>img.src.endsWith('.webp')&&img.width>0&&img.height>0)));
 assert.equal(await page.locator('.proof-image > figcaption,.preview-note,.portrait-caption').count(),0);
 assert.equal(await page.locator('.rating-stars').innerText(),'★★★★★');
 assert.equal(await page.locator('.rating-label strong').innerText(),'Join 10,000+ people');
 assert.match(await page.locator('.rating-label').innerText(),/using Marketel Payoff to turn their balances into a clear plan for paying off debt\./);
 assert.equal(await page.locator('.rating-stars').evaluate(el=>getComputedStyle(el).fontSize),'56px');
 assert.equal(await page.locator('.proof-slot,.owner-placeholder,.policy-slot').count(),0);
 assert.doesNotMatch(await page.locator('body').innerText(),/your testimonial|refund-policy slot|customer feedback will appear/i);
 assert.equal(await page.locator('.proof-image img').evaluateAll(imgs=>new Set(imgs.map(img=>img.src)).size),14);
 assert.equal(await page.locator('.media-slot,.media-placeholders').count(),0);
 assert.equal(await page.locator('iframe').count(),0);
 assert.deepEqual(errors,[]);
}));
test('local composition keeps the full extracted biography and all supplied images',async()=>world(async({page,base,errors})=>{
 assert.equal(await page.locator('#founder-content h2').innerText(),'Meet Lauren, A Mom Who Gets It');
 assert.equal(await page.locator('[data-owner-slot="founder-story"]').count(),0);
 const paragraphs=await page.locator('.founder-story > p').allTextContents();
 assert.equal(paragraphs.length,8);
 assert.equal(paragraphs[0],'I’m a mom who knows what it feels like to stare at numbers and feel completely overwhelmed.');
 assert.equal(paragraphs[7],'I’d be honored to help you too.');
 assert.deepEqual(paragraphs,await page.evaluate(()=>window.PAYOFF_CONTENT.founder.paragraphs));
 const assets=page.locator('img[src^="/payoff/assets/"]');
 assert.equal(await assets.count(),19);
 await assets.evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
 assert.ok(await assets.evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)));
 await page.goto(base+'/payoff/order');
 assert.equal(await page.locator('img.proof[src*="/comment-"]').count(),4);
 assert.equal(await page.locator('.preview-note').count(),0);
 assert.deepEqual(errors,[]);
}));
test('the order starts at $33 with both extras unchecked; local preview cannot submit payments or store contact information',async()=>world(async({page,base,requests,errors})=>{
 await page.locator('a.cta').first().click();await page.waitForURL(base+'/payoff/order');
 assert.equal(await page.locator('#preorder-consent').count(),0);
 assert.equal(await page.locator('.bump').count(),2);
 assert.equal(await page.locator('#cashflow').isChecked(),false);assert.equal(await page.locator('#reset').isChecked(),false);
 assert.equal(await page.locator('#order-total').innerText(),'$33.00');
 await page.locator('#cashflow').check();assert.equal(await page.locator('#order-total').innerText(),'$55.00');
 await page.locator('#cashflow').uncheck();
 await page.locator('#email').fill('preview@example.test');await page.locator('#email').press('Enter');
 await page.waitForTimeout(160);assert.equal(page.url(),base+'/payoff/order');assert.ok(await page.locator('#buy-button').isDisabled());
 assert.equal(await page.locator('#checkout-status').innerText(),'Payments are disabled in the local preview.');
 assert.equal(requests.filter(r=>r.method()!=='GET').length,0);
 assert.equal(requests.filter(r=>!r.url().startsWith(base)).length,0);
 assert.ok(await page.evaluate(()=>!JSON.stringify({...localStorage,...sessionStorage}).includes('preview@example.test')));assert.deepEqual(errors,[]);
}));
test('Back restores the sales page; FAQ and repeated offers remain usable',async()=>world(async({page,base})=>{
 const faq=page.locator('.faq details').first();await faq.locator('summary').click();assert.ok(await faq.getAttribute('open')!==null);
 await page.locator('[data-placement="faq"] a.cta').click();await page.waitForURL(base+'/payoff/order');
 await page.goBack();await page.waitForURL(base+'/payoff');await page.locator('a.cta').first().waitFor();
 assert.equal(await page.locator('a.cta').count(),8);
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
test('the quiz previews locally with ?v=quiz, with no outside requests',async()=>world(async({page,base,errors,requests})=>{
 await page.goto(base+'/payoff?v=quiz');
 await page.locator('.caption').waitFor();
 await page.locator('.choice',{hasText:'1'}).first().click();
 await page.locator('.choice',{hasText:'Mostly the minimums'}).click();
 await page.locator('.choice',{hasText:'Something always comes up'}).click();
 await page.locator('.go',{hasText:'Show me with my cards'}).click();
 assert.equal(await page.locator('#balance-0').count(),1);
 assert.equal(requests.filter(r=>!r.url().startsWith(base)).length,0);
 assert.equal(requests.filter(r=>r.method()!=='GET').length,0);
 assert.deepEqual(errors,[]);
}));
