'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {validate}=require('../wedges/registry');
const claims=require('../wedges/claims');

test('compact checkout reviews use only a bounded, exact excerpt of an existing review',()=>{
  assert.doesNotThrow(()=>validate(structuredClone(claims)));
  for(const excerpt of ['', 'A claim we never made.', 'x'.repeat(81), 42]){
    const manifest=structuredClone(claims);
    manifest.landing.reviews[0].checkoutQuote=excerpt;
    assert.throws(()=>validate(manifest),/checkoutQuote must be an exact source excerpt/);
  }
  const manifest=structuredClone(claims);
  delete manifest.landing.reviews[0].checkoutQuote;
  assert.doesNotThrow(()=>validate(manifest),'other wedges need not provide a checkout excerpt');
});
