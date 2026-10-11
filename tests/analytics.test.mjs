import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code = fs.readFileSync('public/assets/js/analytics.js', 'utf8');
function boot(choice, hostname = 'genialabs.cl') {
  const buttons = ['accepted', 'rejected'].map(choice => ({dataset: {choice}, style: {}}));
  const appended = [];
  const document = { title: 'Genia Labs', referrer: 'https://example.com/path?email=private', cookie: '',
    querySelector: () => ({content: 'G-TEST123'}),
    createElement: () => ({style: {}, setAttribute() {}, querySelector: () => ({style: {}}), querySelectorAll: () => buttons}),
    head: {append: value => appended.push(value)}, body: {append() {}},
    addEventListener() {}, getElementById: () => null };
  const window = {};
  const context = {document, window, location: {hostname, origin: 'https://' + hostname, pathname: '/', search: '?utm_source=linkedin&utm_campaign=asesoria&email=private', reload() {}}, localStorage: {getItem: () => choice, setItem() {}}, URL, URLSearchParams, Set, Date};
  vm.runInNewContext(code, context);
  return {window, buttons, appended};
}
test('analytics sends nothing before consent or after rejection; previews are disabled', () => {
  for (const choice of [null, 'rejected']) {
    const state = boot(choice); state.window.geniaTrack('generate_lead');
    assert.equal(state.appended.length, 0); assert.equal(state.window.dataLayer, undefined);
  }
  assert.equal(boot('accepted', 'localhost').window.geniaTrack, undefined);
});
test('acceptance loads once, whitelists events and strips private URL data', () => {
  const state = boot(null); state.buttons[0].onclick(); state.buttons[0].onclick();
  assert.equal(state.appended.length, 1);
  state.window.geniaTrack('voice_assistant_use'); state.window.geniaTrack('private_event');
  const events = state.window.dataLayer.map(args => [...args]);
  assert.equal(events.filter(event => event[1] === 'page_view').length, 1);
  assert.equal(events.filter(event => event[1] === 'voice_assistant_use').length, 1);
  assert.equal(JSON.stringify(events).includes('private'), false);
  assert.equal(events.find(event => event[0] === 'config')[2].campaign_source, 'linkedin');
  state.buttons[1].onclick(); const count = events.length;
  state.window.geniaTrack('generate_lead'); assert.equal(state.window.dataLayer.length, count);
});
