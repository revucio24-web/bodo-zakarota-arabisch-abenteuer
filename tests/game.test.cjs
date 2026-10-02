const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}
function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

function makeTarget(action, dataset = {}) {
  return { dataset: { action, ...dataset }, closest(selector) { return selector === 'button[data-action]' ? this : null; } };
}
function createGame({ speechRecognition = true, speechSynthesis = true, arabicVoice = true, storedProgress = null } = {}) {
  const app = { innerHTML: '', listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; }, querySelector() { return { focus() {} }; } };
  const progressPill = { textContent: '' };
  const ids = new Map();
  for (const id of ['audio-status', 'clear-status']) ids.set(id, { textContent: '' });
  ids.set('clear-confirm', { hidden: true });
  const brand = { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } };
  const clearRequest = { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; }, focus() {} };
  const clearNow = { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; }, focus() {} };
  const clearCancel = { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; }, focus() {} };
  ids.set('clear-request', clearRequest); ids.set('clear-now', clearNow); ids.set('clear-cancel', clearCancel);
  const documentListeners = {}; const windowListeners = {}; const localStore = new Map();
  if (storedProgress !== null) localStore.set('bodo-zakarota-arabisch-mvp-v1', storedProgress);
  const localStorage = { getItem(key) { return localStore.has(key) ? localStore.get(key) : null; }, setItem(key, value) { localStore.set(key, String(value)); }, removeItem(key) { localStore.delete(key); } };
  const document = { visibilityState: 'visible', getElementById(id) { if (id === 'stage-root') return app; if (id === 'progress-pill') return progressPill; return ids.get(id) || null; }, querySelector(selector) { return selector === '.brand' ? brand : null; }, addEventListener(type, callback) { documentListeners[type] = callback; } };
  const recognitionInstances = [];
  class FakeRecognition { constructor() { this.aborted = false; recognitionInstances.push(this); } start() { this.started = true; } abort() { this.aborted = true; } }
  const utterances = [];
  const speech = speechSynthesis ? { cancel() {}, getVoices() { return arabicVoice ? [{ lang: 'ar' }] : []; }, speak(utterance) { utterances.push(utterance); } } : undefined;
  const window = { addEventListener(type, callback) { windowListeners[type] = callback; } };
  if (speech) window.speechSynthesis = speech;
  if (speechRecognition) window.SpeechRecognition = FakeRecognition;
  window.SpeechSynthesisUtterance = class SpeechSynthesisUtterance { constructor(text) { this.text = text; } };
  const context = { document, window, localStorage, SpeechSynthesisUtterance: window.SpeechSynthesisUtterance, console };
  vm.runInNewContext(gameSource, context, { filename: 'game.js' });
  return {
    app, brand, document, documentListeners, windowListeners, progressPill, localStore, recognitionInstances, utterances, ids,
    click(action, dataset = {}) { const button = makeTarget(action, dataset); app.listeners.click({ target: { closest: () => button } }); },
    clickBrand() { brand.listeners.click({ preventDefault() {} }); },
    clickClear(action) { const map = { 'request-clear': clearRequest, 'clear-progress': clearNow, 'cancel-clear': clearCancel }; map[action].listeners.click(); }
  };
}
function skipAudio(game) { if (game.app.innerHTML.includes('data-action="skip-audio"')) game.click('skip-audio'); }
function answer(game, index) { skipAudio(game); game.click('answer', { option: String(index) }); }
function saved(game) { return JSON.parse(game.localStore.get('bodo-zakarota-arabisch-mvp-v1')); }

test('Die Startansicht ist eine spielbare Dorfkarte mit Rollen und einem sofortigen Startpfad', () => {
  const game = createGame();
  assert.match(game.app.innerHTML, /Bodos Dorf/);
  assert.match(game.app.innerHTML, /data-action="continue"/);
  assert.match(game.app.innerHTML, /Bodo/);
  assert.match(game.app.innerHTML, /Zakarota/);
  assert.match(game.app.innerHTML, /class="map-cast"/);
  assert.match(game.app.innerHTML, /portrait-lulu/);
  assert.match(game.app.innerHTML, /data-action="open-lesson"/);
});

test('Die erste Szene stimmt mit dem Dorftor überein und zeigt Bodo sowie Lulu eindeutig', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' });
  assert.match(game.app.innerHTML, /Am leuchtenden Dorftor wartet Bodo auf dich\./);
  assert.doesNotMatch(game.app.innerHTML, /Am Dorfbrunnen/);
  assert.match(game.app.innerHTML, /Illustrierte Szene: Ein leuchtendes Dorftor/);
  assert.match(game.app.innerHTML, /class="scene-cast" role="group" aria-label="Figuren in der Szene"/);
  assert.match(game.app.innerHTML, /portrait-cutout portrait-bodo scene-cast-bodo/);
  assert.match(game.app.innerHTML, /class="scene-cast-lulu"/);
  assert.match(game.app.innerHTML, /aria-label="Lulu, ein kleiner freundlicher Drache"/);
});

test('Bodo und Lulu bleiben in den aktiven Farben- und Zahlen-Szenen sichtbar', () => {
  const game = createGame({ storedProgress: JSON.stringify({ completed: ['hallo', 'farben'], missedWordIds: [] }) });
  game.click('open-lesson', { lesson: '1' });
  assert.match(game.app.innerHTML, /class="scene-cast"/);
  assert.match(game.app.innerHTML, /scene-cast-bodo/);
  assert.match(game.app.innerHTML, /class="scene-cast-lulu"/);
  game.click('home'); game.click('open-lesson', { lesson: '2' });
  assert.match(game.app.innerHTML, /class="scene-cast"/);
  assert.match(game.app.innerHTML, /scene-cast-bodo/);
  assert.match(game.app.innerHTML, /class="scene-cast-lulu"/);
});

test('Die Aufgabenfläche ist opak hell; Titel und Hinweistext erfüllen mindestens 4,5:1 Kontrast', () => {
  assert.match(stylesSource, /--paper:\s*#fffdf7/i);
  assert.match(stylesSource, /\.challenge-panel\s*\{[^}]*background:\s*var\(--paper\)/s);
  assert.match(stylesSource, /\.question-title\s*\{[^}]*color:\s*#28213c/i);
  assert.match(stylesSource, /\.question-detail\s*\{[^}]*color:\s*#686471/i);
  const titleRatio = contrastRatio('#28213c', '#fffdf7');
  const detailRatio = contrastRatio('#686471', '#fffdf7');
  assert.ok(titleRatio >= 4.5, `Hör-Titel: ${titleRatio.toFixed(2)}:1`);
  assert.ok(detailRatio >= 4.5, `Hinweistext: ${detailRatio.toFixed(2)}:1`);
});

test('Hörschritt sperrt Bildkarten bis zum Vorlese-Ende oder bewussten Überspringen; Arabisch wird erst nach der Bildantwort sichtbar', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' });
  assert.match(game.app.innerHTML, /Arabisches Wort anhören/);
  assert.match(game.app.innerHTML, /Zakarota/);
  assert.match(game.app.innerHTML, /portrait-cutout portrait-zakarota/);
  assert.doesNotMatch(game.app.innerHTML, /class="arabic-word"/);
  game.click('answer', { option: '0' });
  assert.doesNotMatch(game.app.innerHTML, /Welches Bild passt/);
  game.click('speak', { speech: 'مرحبا' }); assert.equal(game.utterances.length, 1);
  assert.doesNotMatch(game.app.innerHTML, /class="arabic-word"/);
  game.utterances[0].onend(); assert.match(game.app.innerHTML, /Weiter zur Bildauswahl/);
  game.click('continue-to-pictures'); assert.match(game.app.innerHTML, /Welches Bild passt/);
  assert.doesNotMatch(game.app.innerHTML, /class="arabic-word"/);
  answer(game, 0); assert.match(game.app.innerHTML, /مَرْحَبًا/);
  assert.match(game.app.innerHTML, /marḥaban/);
  assert.match(game.app.innerHTML, /lang="ar-Latn" dir="ltr"/);
});

test('Fehlversuch zeigt freundliches Feedback und speichert nur die Wort-ID in der begrenzten Wiederholungsliste', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' }); answer(game, 1);
  assert.match(game.app.innerHTML, /Guter Versuch/);
  assert.match(game.app.innerHTML, /Bilder zur Auswahl/);
  assert.deepEqual(Array.from(saved(game).missedWordIds), ['greeting-hello']);
  assert.deepEqual(Object.keys(saved(game)).sort(), ['completed', 'missedWordIds']);
  answer(game, 0); assert.match(game.app.innerHTML, /مَرْحَبًا/);
  assert.deepEqual(Array.from(saved(game).missedWordIds), []);
});

test('Nicht verfügbare Sprachausgabe bietet einen lesbaren Fallback und einen expliziten Hörsprung', () => {
  const game = createGame({ speechSynthesis: false }); game.click('open-lesson', { lesson: '0' });
  game.click('speak', { speech: 'مرحبا' }); assert.match(game.ids.get('audio-status').textContent, /nicht verfügbar/);
  game.click('skip-audio'); assert.match(game.app.innerHTML, /Bilder zur Auswahl/);
  answer(game, 0); assert.match(game.app.innerHTML, /مَرْحَبًا/);
});

test('Fehlendes arabisches Stimmprofil löst keinen falschen Vorleseversuch aus', () => {
  const game = createGame({ arabicVoice: false }); game.click('open-lesson', { lesson: '0' });
  game.click('speak', { speech: 'مرحبا' }); assert.equal(game.utterances.length, 0);
  assert.match(game.ids.get('audio-status').textContent, /keine arabische Sprachausgabe verfügbar/);
  game.click('skip-audio'); assert.match(game.app.innerHTML, /Bilder zur Auswahl/);
});

test('Eine verfehlte Karte erscheint am Abschnittsende genau einmal zur Sitzung-Wiederholung', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' });
  answer(game, 1); answer(game, 0); game.click('next-question');
  answer(game, 1); game.click('next-question');
  assert.match(game.app.innerHTML, /Kurz wiederholen 1 von 1/);
  answer(game, 0); game.click('next-question');
  assert.match(game.app.innerHTML, /Der erste Splitter leuchtet/);
  assert.deepEqual(Array.from(saved(game).missedWordIds), []);
});

test('Persistierte Wort-ID startet beim nächsten Kapitelbesuch zuerst eine kurze Wiederholung und wird bei Erfolg entfernt', () => {
  const game = createGame({ storedProgress: JSON.stringify({ completed: [], missedWordIds: ['greeting-hello'] }) });
  game.click('continue'); assert.match(game.app.innerHTML, /Wortspur vom letzten Besuch/);
  answer(game, 0); assert.match(game.app.innerHTML, /مَرْحَبًا/);
  game.click('next-question');
  assert.match(game.app.innerHTML, /erklärt die Aufgabe/);
  assert.match(game.app.innerHTML, /Aufgabe 1 von 2/);
  assert.deepEqual(Array.from(saved(game).missedWordIds), []);
});

test('Zahlenkapitel macht „drei“ beim Apfelsammeln handlungswirksam und schließt alle drei Kapitel ab', () => {
  const game = createGame();
  game.click('open-lesson', { lesson: '0' }); answer(game, 0); game.click('next-question'); answer(game, 1); game.click('next-question');
  game.click('open-lesson', { lesson: '1' }); answer(game, 1); game.click('next-question'); answer(game, 1); game.click('next-question');
  game.click('open-lesson', { lesson: '2' }); answer(game, 1); game.click('next-question');
  assert.match(game.app.innerHTML, /Wähle drei von fünf Äpfeln/);
  game.click('apple', { apple: '0' }); game.click('apple', { apple: '2' }); game.click('apple', { apple: '4' });
  game.click('check-apples'); assert.match(game.app.innerHTML, /Genau drei Äpfel/); game.click('finish-apples');
  assert.match(game.app.innerHTML, /عَمَلٌ رَائِعٌ/);
  assert.match(game.app.innerHTML, /ʿamalun rāʾiʿun/);
  assert.match(game.app.innerHTML, /Lulu: Tolle Arbeit!/);
  assert.match(game.app.innerHTML, /Du hast alle drei Abenteuerabschnitte geschafft/);
  assert.deepEqual(Array.from(saved(game).completed), ['hallo', 'farben', 'zahlen']);
});

test('Bestehender Fortschritt mit nur completed wird gelesen; falsche Antworten und Audio werden nicht gespeichert', () => {
  const game = createGame({ storedProgress: JSON.stringify({ completed: ['hallo'] }) });
  assert.equal(game.progressPill.textContent, '1 von 3 Splittern'); game.click('continue'); answer(game, 1);
  assert.deepEqual(Object.keys(saved(game)).sort(), ['completed']);
  assert.deepEqual(Array.from(saved(game).completed), ['hallo']);
  assert.equal(JSON.stringify(saved(game)).includes('مرحبا'), false);
});

test('Fortschritt und Review-IDs lassen sich nach Inline-Bestätigung vollständig lokal löschen', () => {
  const game = createGame({ storedProgress: JSON.stringify({ completed: ['hallo'], missedWordIds: ['greeting-hello'] }) });
  game.clickClear('request-clear'); assert.equal(game.ids.get('clear-confirm').hidden, false);
  game.clickClear('clear-progress');
  assert.equal(game.localStore.has('bodo-zakarota-arabisch-mvp-v1'), false);
  assert.match(game.app.innerHTML, /0 \/ 3/);
  assert.match(game.ids.get('clear-status').textContent, /wurden gelöscht/);
});

test('Gesperrte Kapitel bleiben geschlossen und Marke führt zurück zur Karte', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '1' });
  assert.match(game.app.innerHTML, /Die Karte ist wach/);
  game.click('open-lesson', { lesson: '0' }); assert.match(game.app.innerHTML, /SPUR 01/);
  game.clickBrand(); assert.match(game.app.innerHTML, /Die Karte ist wach/);
});

test('Optionale Spracherkennung zeigt vorab den externen Verarbeitungshinweis und lässt sich ablehnen oder abbrechen', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' }); skipAudio(game);
  game.click('recognize', { speech: 'مرحبا' });
  assert.match(game.app.innerHTML, /außerhalb dieses Spiels verarbeitet/); assert.equal(game.recognitionInstances.length, 0);
  game.click('cancel-speech'); assert.match(game.app.innerHTML, /Mikrofon bleibt aus/);
  game.click('recognize', { speech: 'مرحبا' }); game.click('confirm-speech');
  assert.equal(game.recognitionInstances[0].started, true);
  game.click('stop-recognition'); assert.equal(game.recognitionInstances[0].aborted, true);
});

test('Mikrofon und Sprachausgabe werden beim Verbergen des Tabs sowie bei pagehide beendet', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' }); skipAudio(game);
  game.click('recognize', { speech: 'مرحبا' }); game.click('confirm-speech');
  game.document.visibilityState = 'hidden'; game.documentListeners.visibilitychange();
  assert.equal(game.recognitionInstances[0].aborted, true);
  assert.match(game.app.innerHTML, /in den Hintergrund gewechselt/);
  const pagehideGame = createGame(); pagehideGame.click('open-lesson', { lesson: '0' }); skipAudio(pagehideGame);
  pagehideGame.click('recognize', { speech: 'مرحبا' }); pagehideGame.click('confirm-speech'); pagehideGame.windowListeners.pagehide();
  assert.equal(pagehideGame.recognitionInstances[0].aborted, true);
  assert.equal(pagehideGame.recognitionInstances[0].onresult, null);
});

test('Eine Bildantwort beendet aktives Zuhören; nicht unterstützte Spracherkennung fällt sauber zurück', () => {
  const game = createGame(); game.click('open-lesson', { lesson: '0' }); skipAudio(game);
  game.click('recognize', { speech: 'مرحبا' }); game.click('confirm-speech'); game.click('answer', { option: '0' });
  assert.equal(game.recognitionInstances[0].aborted, true); assert.match(game.app.innerHTML, /مَرْحَبًا/);
  const unsupported = createGame({ speechRecognition: false }); unsupported.click('open-lesson', { lesson: '0' }); skipAudio(unsupported);
  unsupported.click('recognize', { speech: 'مرحبا' });
  assert.match(unsupported.ids.get('audio-status').textContent, /Spracherkennung ist in diesem Browser nicht verfügbar/);
});

test('App fügt keine eigenen Netzwerktransport-Aufrufe oder fremde Hosts hinzu', () => {
  assert.doesNotMatch(gameSource, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|new\s+WebSocket/);
  assert.doesNotMatch(gameSource, /https?:\/\//);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /https?:\/\//);
});
