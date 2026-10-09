import test from 'node:test';
import assert from 'node:assert/strict';
import { handleLog } from '../netlify/functions/voice-log.mjs';
import { handleSession, createSetup } from '../netlify/functions/voice-session.mjs';
import { signLog, verifyLog, CONSENT_VERSION } from '../netlify/lib/voice-store.mjs';
import { ConversationLog } from '../public/assets/js/voice-log.mjs';
const env = { VOICE_ENABLED:'true', GEMINI_API_KEY:'test-key', SUPABASE_URL:'https://edpmbaanwldrwhbiowyv.supabase.co', SUPABASE_SECRET_KEY:'test-server-secret' };
const id = '11111111-1111-4111-8111-111111111111';
const time = 1791547200000;
const request = (body, origin='https://genialabs.cl') => new Request('https://genialabs.cl/api',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
const payload = () => ({token:signLog(id,env,time),revision:1,final:true,durationSeconds:10,turns:[{role:'user',text:'Tengo una oficina contable'},{role:'assistant',text:'¿Qué tarea te quita tiempo?'}]});
test('signed logging capability expires, cannot be modified and is isolated by key',()=>{
 const token=signLog(id,env,time);
 assert.equal(verifyLog(token,env,time).id,id);
 assert.equal(verifyLog(token,env,time+600001),null);
 assert.equal(verifyLog(token+'x',env,time),null);
 assert.equal(verifyLog(token,{...env,GEMINI_API_KEY:'other'},time),null);
});
test('logging is opt-in and records both roles only when consent version matches',async()=>{
 assert.ok(!createSetup('gemini-3.8-live').inputAudioTranscription);
 assert.deepEqual(createSetup('gemini-3.8-live',true).inputAudioTranscription,{});
 const bad = await handleSession(request({consent:true,saveTranscript:true,consentVersion:'old'}),{env,fetchImpl:()=>assert.fail('called')});
 assert.equal(bad.status,400);
 const calls=[];
 const result=await handleSession(request({consent:true,saveTranscript:true,consentVersion:CONSENT_VERSION}),{env,now:()=>time,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return Response.json(url.includes('auth_tokens')?{name:'auth_tokens/test'}:[{id}]);
 }});
 const body=await result.json();assert.equal(result.status,200);assert.ok(body.log.token);
 assert.equal(calls.length,2);assert.ok(calls[1].url.startsWith(env.SUPABASE_URL));
 assert.ok(!JSON.stringify(body).includes(env.SUPABASE_SECRET_KEY));
});
test('invalid signatures, origins and payloads never reach storage; no public read',async()=>{
 const options={env,now:()=>time,fetchImpl:()=>assert.fail('called')};
 assert.equal((await handleLog(new Request('https://genialabs.cl/api'),options)).status,405);
 assert.equal((await handleLog(request(payload(),'https://evil.example'),options)).status,403);
 assert.equal((await handleLog(request({...payload(),token:'bad'}),options)).status,401);
 assert.equal((await handleLog(request({...payload(),turns:[{role:'system',text:'attack'}]}),options)).status,400);
 assert.equal((await handleLog(request({...payload(),turns:[{role:'user',text:'x'.repeat(6001)}]}),options)).status,400);
 assert.equal((await handleLog(request({...payload(),durationSeconds:999}),options)).status,400);
});
test('updates only its own row with monotonic revision and never overwrites a finalized record',async()=>{
 const result=await handleLog(request(payload()),{env,now:()=>time,fetchImpl:async(url,options)=>{
  assert.ok(url.includes(`id=eq.${id}&revision=lt.1&status=neq.ended`));assert.equal(options.method,'PATCH');
  assert.equal(options.headers.apikey,env.SUPABASE_SECRET_KEY);
  const data=JSON.parse(options.body);assert.equal(data.status,'ended');assert.equal(data.summary_kind,'extract');
  assert.equal(data.transcript.length,2);assert.ok(!data.summary.includes('¿Qué tarea'));
  return Response.json([{id}]);
 }});
 assert.deepEqual(await result.json(),{saved:true});
 const stale=await handleLog(request(payload()),{env,now:()=>time,fetchImpl:async()=>Response.json([])});
 assert.deepEqual(await stale.json(),{saved:false});
});
test('storage failures are sanitized rather than claiming success',async()=>{
 for(const fetchImpl of [async()=>new Response('private-key',{status:403}),async()=>{throw Error('private-key')}]){
  const response=await handleLog(request(payload()),{env,now:()=>time,fetchImpl});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private-key'));
 }
});
test('client keeps both speakers, checkpoints before end and finalizes only once',async()=>{
 const saved=[];const statuses=[];
 const log=new ConversationLog('signed',{clock:()=>time,report:text=>statuses.push(text),send:async(url,options)=>{saved.push(JSON.parse(options.body));assert.equal(options.keepalive,true);return Response.json({saved:true});}});
 log.append('user','Tengo una ');log.append('user','oficina');log.append('assistant','Te ayudo.');log.newTurn();
 await log.save();log.append('user','Gracias');await log.save(true);await log.save(true);
 assert.equal(saved.length,2);assert.equal(saved[0].turns[0].text,'Tengo una oficina');
 assert.equal(saved[0].turns.length,2);assert.equal(saved[1].turns.length,3);assert.equal(saved[1].revision,2);assert.equal(saved[1].final,true);
 assert.equal(statuses.at(-1),'Texto de la conversación guardado.');
});
test('client enforces UTF-8 limits and reports failed saves',async()=>{
 const statuses=[];const log=new ConversationLog('signed',{report:text=>statuses.push(text),send:async()=>new Response('',{status:500})});
 for(let i=0;i<10;i++){log.append('user','😀'.repeat(3000));log.newTurn();}
 assert.ok(log.bytes<=30000);assert.ok(log.turns.every(turn=>turn.text.length<=6000));
 await log.save(true);assert.ok(statuses.at(-1).startsWith('No pudimos confirmar'));
});
test('a late checkpoint cannot replace the final save status',async()=>{
 const pending=[];const statuses=[];
 const log=new ConversationLog('signed',{report:text=>statuses.push(text),send:()=>new Promise(resolve=>pending.push(resolve))});
 log.append('user','Hola');const checkpoint=log.save();const final=log.save(true);
 pending[1](Response.json({saved:true}));await final;
 pending[0](Response.json({saved:false}));await checkpoint;
 assert.deepEqual(statuses,['Texto de la conversación guardado.']);
});
