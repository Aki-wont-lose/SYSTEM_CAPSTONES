// Guards the fixes for the two reported mail defects:
//   1. the inbox looked like it was "always loading" because every poll pulled
//      full message bodies and polls were allowed to overlap, and
//   2. opening a second conversation could show the previous thread's messages
//      under the new contact's name when a slow response landed late.
//
// These are structural checks: no database is touched, but removing any guard
// fails here instead of silently regressing the UI.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (relative) => fs.readFileSync(path.join(here, '..', relative), 'utf8');

const service = read('src/modules/messaging/service.js');
const controller = read('src/modules/messaging/controller.js');
const page = read('../frontend/src/pages/Messages.jsx');
const messageService = read('../frontend/src/services/messageService.js');
const apiClient = read('../frontend/src/services/api.js');

let pass = 0;
let fail = 0;

const check = (name, condition, detail = '') => {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
  }
};

console.log('\n== contacts query stays small ==');

check('contacts are aggregated in SQL, not in Node', service.includes('$queryRaw'));
check('previews are truncated in the database', service.includes('substring(m.content, 1, 80)'));
check(
  'contacts no longer select full message content',
  !/prisma\.message\.findMany\(\{[\s\S]{0,400}content: true[\s\S]{0,400}\}\);/.test(service.slice(0, service.indexOf('getConversation')))
);
check('directory and conversation stats run in parallel', service.includes('Promise.all'));
check('blocked test accounts are matched case-insensitively', service.includes('blocked.has(String(u.email'));

console.log('\n== conversation loads the newest messages ==');

const conversationFn = service.slice(service.indexOf('export const getConversation'), service.indexOf('export const sendMessage'));
check('conversation is ordered newest-first for the query', /orderBy:\s*\{\s*createdAt:\s*'desc'\s*\}/.test(conversationFn));
check('conversation is capped at 200', /take:\s*200/.test(conversationFn));
check('rows are flipped back into reading order', conversationFn.includes('rows.reverse()'));

console.log('\n== read receipts are accurate on open ==');

const fetchConversation = controller.slice(controller.indexOf('export const fetchConversation'), controller.indexOf('export const postMessage'));
check(
  'messages are marked read before they are returned',
  fetchConversation.indexOf('markAsRead') > -1 &&
    fetchConversation.indexOf('markAsRead') < fetchConversation.indexOf('getConversation')
);

console.log('\n== the reading pane cannot show another thread ==');

check('a request sequence number is kept', page.includes('threadSeqRef'));
check('stale responses are dropped', page.includes('seq !== threadSeqRef.current'));
check('the selected thread is re-checked', page.includes('selectedIdRef.current !== contactId'));
check('switching threads aborts the previous request', page.includes('threadAbortRef.current?.abort()'));
check('the pane is cleared the moment a thread is opened', /const openThread[\s\S]{0,400}setMessages\(\[\]\)/.test(page));

console.log('\n== polls cannot stack up ==');

check('contacts polling is self-scheduling', page.includes('setTimeout(tick, 7000)'));
check('thread polling is self-scheduling', page.includes('setTimeout(() => tick(false), 5000)'));
check('interval polling is gone from the thread', !page.includes('setInterval(() => loadConversation'));
check('contacts requests are de-duplicated', page.includes('contactsInFlightRef'));
check('a slow thread load surfaces an error instead of spinning', page.includes('threadError') && page.includes('took too long'));
check('a slow inbox load surfaces an error instead of spinning', page.includes('contactsError') && page.includes('Retry'));

console.log('\n== sending cannot duplicate or vanish ==');

check('double-send is blocked synchronously', page.includes('sendingRef.current'));
check('sent message is painted immediately', page.includes('showSentMessage'));
check('painted message is de-duplicated by id', page.includes('current.some((m) => m.id === created.id)'));
check('failed send restores the draft', page.includes('setText(body)'));

console.log('\n== compose recipient search ==');

check('recipient picker is a combobox, not a scroll dropdown', page.includes('role="combobox"') && !page.includes('<select'));
check('matches are filtered by name and email', page.includes("`${contact.displayName || ''} ${contact.email || ''}`.toLowerCase().includes(term)"));
check('the picker is focused when the modal opens', page.includes('autoFocus'));
check('picking a recipient shows a removable chip', page.includes('Remove recipient') && page.includes('clearComposeRecipient'));
check('picking a recipient closes the suggestion list', page.includes('composeOpen && composeFocused && !composeTo'));
check('keyboard navigation works', page.includes("event.key === 'ArrowDown'") && page.includes("event.key === 'ArrowUp'") && page.includes("event.key === 'Enter'"));
check('typing releases an old pick', page.includes('if (composeTo) setComposeTo'));

console.log('\n== requests cannot hang forever ==');

check('axios has a global timeout', apiClient.includes('timeout: 60000'));
check('polling calls use a shorter timeout', messageService.includes('POLL_TIMEOUT'));

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}`);
process.exit(fail === 0 ? 0 : 1);
