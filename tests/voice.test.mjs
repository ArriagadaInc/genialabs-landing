import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSession, SYSTEM_INSTRUCTION } from '../netlify/functions/voice-session.mjs';
import { encodePCM16, decodePCM16 } from '../public/assets/js/voice-audio.mjs';
const env = { VOICE_ENABLED:'true', GEMINI_API_KEY:'test-private-key' };
const request = (body = {consent:true}, origin = 'https://genialabs.cl') => new Request('https://genialabs.cl/.netlify/functions/voice-session',{ method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body) });
test('availability exposes no credentials and disabled mode makes no provider call',async()=>{
 const result = await handleSession(new Request('https://genialabs.cl/api'),{env});
 assert.deepEqual(await result.json(),{enabled:true,maxSeconds:180,storageAvailable:false,consentVersion:'2026-10-09-text-v1'});
 assert.equal(result.headers.get('cache-control'),'no-store');
 assert.equal((await handleSession(request(),{env:{},fetchImpl:()=>assert.fail('called')})).status,503);
});
test('rejects foreign origins, missing consent and oversized payloads before provisioning',async()=>{
 const opts={env,fetchImpl:()=>assert.fail('called')};
 assert.equal((await handleSession(request({},'https://evil.example'),opts)).status,403);
 assert.equal((await handleSession(request({consent:false}),opts)).status,400);
 assert.equal((await handleSession(request({consent:true,padding:'x'.repeat(300)}),opts)).status,413);
});
test('issues single-use token with locked instructions and bounded lifetime',async()=>{
 const now=Date.parse('2026-10-09T12:00:00Z');
 const result=await handleSession(request(),{env,now:()=>now,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/auth_tokens');
  assert.equal(options.headers['x-goog-api-key'],env.GEMINI_API_KEY);
  const body=JSON.parse(options.body);
  assert.equal(body.uses,1);
  assert.equal(Date.parse(body.expireTime)-now,180000);
  assert.equal(Date.parse(body.newSessionExpireTime)-now,60000);
  assert.equal(body.liveConnectConstraints.config.systemInstruction.parts[0].text,SYSTEM_INSTRUCTION);
  assert.deepEqual(body.liveConnectConstraints.config.responseModalities,['AUDIO']);
  assert.equal(body.liveConnectConstraints.model,'models/gemini-3.8-live');
  return Response.json({name:'auth_tokens/test'});
 }});
 const data=await result.json(); assert.equal(data.token,'auth_tokens/test');
 assert.ok(!JSON.stringify(data).includes(env.GEMINI_API_KEY));
});
test('provider failures are sanitized and invalid tokens never reach client',async()=>{
 for(const fetchImpl of [async()=>new Response('secret',{status:500}),async()=>{throw Error('secret')},async()=>Response.json({name:'bad'})]){
  const result=await handleSession(request(),{env,fetchImpl}); assert.equal(result.status,503); assert.ok(!(await result.text()).includes('secret'));
 }
 assert.equal((await handleSession(request(),{env,fetchImpl:async()=>new Response('',{status:429})})).status,429);
});
test('PCM conversion clips and uses little endian signed 16-bit samples',()=>{
 const bytes=encodePCM16(new Float32Array([-2,-1,0,0.5,1,2]));
 const view=new DataView(bytes.buffer); assert.equal(view.getInt16(0,true),-32768); assert.equal(view.getInt16(8,true),32767);
 const result=decodePCM16(bytes); assert.equal(result[0],-1); assert.ok(Math.abs(result[3]-.5)<.0001); assert.ok(result[5]<=1);
});
