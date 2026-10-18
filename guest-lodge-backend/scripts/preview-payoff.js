'use strict';
// Local-only design server. No production route, Stripe, database or tracking.
const express = require('express');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../payoff-web');
const PUBLIC = path.resolve(__dirname, '../public');
function createPreview() {
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (!['GET','HEAD'].includes(req.method)) return res.status(405).send('Preview only. Nothing is submitted.');
    next();
  });
  app.get('/',(_req,res)=>res.redirect('/payoff'));
  app.get('/api/payoff/config',(_req,res)=>res.json({available:false,preview:true}));
  app.get(['/payoff','/payoff/'],(_req,res)=>res.sendFile(path.join(ROOT,'index.html')));
  app.get(['/payoff/order','/payoff/order/'],(_req,res)=>res.sendFile(path.join(ROOT,'order.html')));
  app.get('/marketel.svg',(_req,res)=>res.sendFile(path.join(PUBLIC,'marketel.svg')));
  app.get('/marketel-frontdesk-icon.png',(_req,res)=>res.sendFile(path.join(PUBLIC,'marketel-frontdesk-icon.png')));
  app.use('/frontdesk/assets/fonts',express.static(path.join(PUBLIC,'frontdesk/assets/fonts')));
  app.use('/payoff',express.static(ROOT,{index:false}));
  app.use((_req,res)=>res.status(404).send('Not available in the design preview.'));
  return app;
}
module.exports={createPreview};
if(require.main===module){const port=Number(process.env.PAYOFF_PREVIEW_PORT||4176);createPreview().listen(port,'127.0.0.1',()=>console.log('Payoff local preview: http://127.0.0.1:'+port+'/payoff'));}
