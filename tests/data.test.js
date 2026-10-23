import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePassage, safePageReference, createReview, validateReview, formatReview } from '../src/review-data.js';
import { createMailtoAdapter } from '../src/adapters.js';

const passage={passageId:'welcome.1',sourceText:'Welcome <friend>',translatedText:'Bienvenido <amigo>',sourceLocale:'en',targetLocale:'es-MX',revision:'r1'};
test('reference strips credentials, all query parameters and fragment; no inferred reference',()=>{
  assert.equal(safePageReference('https://person:secret@example.com/a?token=secret#private'),'https://example.com/a');
  for (const value of ['javascript:alert(1)','file:///private','//example.com/a','not a URL',null]) assert.equal(safePageReference(value),'');
  assert.equal(normalizePassage(passage).pageReference,'');
});
test('review requires stable identity, text, revision, languages and at least one note',()=>{
  const p=normalizePassage(passage);
  assert.ok(validateReview(p,'','').suggestion);
  assert.deepEqual(validateReview(p,'','Nuance'),{});
  for (const key of ['passageId','revision','sourceText','translatedText','sourceLocale','targetLocale']) assert.ok(validateReview(normalizePassage({...p,[key]:''}),'note','').configuration,key);
  assert.ok(validateReview(normalizePassage({...p,targetLocale:'bad_tag!'}),'note','').configuration);
  assert.ok(validateReview(p,'x'.repeat(8001),'').suggestion);
  assert.ok(validateReview(p,'','x'.repeat(8001)).comment);
  assert.ok(validateReview(normalizePassage({...p,sourceText:'x'.repeat(50001)}),'note','').configuration);
});
test('payload has only expected fields, immutable metadata, no timestamp or identity',()=>{
  const review=createReview({...passage,name:'private'},'  Hola  ','  Plain comment  ');
  assert.deepEqual(Object.keys(review),['schemaVersion','passage','suggestion','comment']);
  assert.equal(review.suggestion,'Hola'); assert.equal(review.comment,'Plain comment');
  assert.equal('name' in review.passage,false); assert.ok(Object.isFrozen(review)); assert.ok(Object.isFrozen(review.passage));
  assert.match(formatReview(review),/Welcome <friend>/);
  assert.match(formatReview(review),/Passage ID: welcome.1/);
});
test('mailto encodes subject/body and invokes only supplied draft launcher',()=>{
  let draft; const adapter=createMailtoAdapter({to:'review@example.org',openDraft:url=>{draft=url;},maxUrlLength:10000});
  assert.equal(draft,undefined);
  const review=createReview({...passage,passageId:'id\r\nBcc: nope'},'A & B? # hola','Comment + nuance');
  const result=adapter(review); const parsed=new URL(draft);
  assert.equal(parsed.protocol,'mailto:'); assert.equal(decodeURIComponent(parsed.pathname),'review@example.org');
  assert.equal(parsed.searchParams.get('subject').includes('\n'),false);
  assert.match(parsed.searchParams.get('body'),/A & B\? # hola/);
  assert.deepEqual([...parsed.searchParams.keys()],['subject','body']); assert.match(result.message,/choose whether to send/);
});
test('mailto rejects injection/configuration and too-long URLs before opening',()=>{
  for (const to of [undefined,'x@example.com?bcc=bad@example.com','x@example.com\nBcc: bad@example.com','a@example.com,b@example.com','a@example.com#x']) assert.throws(()=>createMailtoAdapter({to}),TypeError);
  let calls=0;
  const adapter=createMailtoAdapter({to:'review@example.org',maxUrlLength:10,openDraft:()=>calls++});
  assert.throws(()=>adapter(createReview(passage,'note','')),/too long/); assert.equal(calls,0);
});
