(() => {
  'use strict';

  const STORAGE_KEY = 'bodo-zakarota-arabisch-mvp-v1';
  const MAX_REVIEW_WORDS = 5;
  const characterImage = 'media/characters.webp';
  const lessons = [
    {
      id: 'hallo', title: 'Hallo', short: 'Finde die freundliche Begrüßung.', icon: 'door', reward: 'Der erste Splitter leuchtet.',
      questions: [
        { id: 'greeting-hello', title: 'Ein Gruß für Bodo', speaker: 'bodo', speakerText: 'erklärt dir eine freundliche Begrüßung', scene: 'Am leuchtenden Dorftor wartet Bodo auf dich.', art: 'greeting', arabic: 'مَرْحَبًا', transliteration: 'marḥaban', explanation: 'Ein freundlicher Gruß: Hallo.', speech: 'مرحبا', options: [
          { visual: 'wave', text: 'Jemand grüßt dich.', correct: true }, { visual: 'moon', text: 'Es wird Nacht.' }, { visual: 'thanks', text: 'Jemand bedankt sich.' }
        ] },
        { id: 'greeting-welcome', title: 'Ein neuer Gast', speaker: 'zakarota', speakerText: 'hat einen Gast am Tor entdeckt', scene: 'Das Dorftor öffnet sich für einen neuen Freund.', art: 'guest', arabic: 'أَهْلًا', transliteration: 'ahlan', explanation: 'Ein freundlicher Gruß, etwa Hi oder Willkommen.', speech: 'أهلا', options: [
          { visual: 'stop', text: 'Jemand sagt nein.' }, { visual: 'door', text: 'Ein Gast wird willkommen geheißen.', correct: true }, { visual: 'sleep', text: 'Es ist Schlafenszeit.' }
        ] }
      ]
    },
    {
      id: 'farben', title: 'Farben', short: 'Entdecke Blau und Grün.', icon: 'paint', reward: 'Ein Farbfunke für Lulus Spur.',
      questions: [
        { id: 'color-blue', title: 'Finde das Blau', speaker: 'bodo', speakerText: 'zeigt dir Dinge aus dem Dorf', scene: 'Auf dem Markt glitzert etwas im blauen Tuch.', art: 'blue', arabic: 'أَزْرَق', transliteration: 'azraq', explanation: 'أَزْرَق ist die maskuline Grundform für Blau.', speech: 'أزرق', options: [
          { visual: 'berry', text: 'Eine rote Erdbeere' }, { visual: 'blue', text: 'Blaubeeren', correct: true }, { visual: 'leaf', text: 'Ein grünes Blatt' }
        ] },
        { id: 'color-green', title: 'Finde das Grün', speaker: 'zakarota', speakerText: 'hat etwas Buntes gefunden', scene: 'Zakarota zeigt dir ein Blatt aus dem Garten.', art: 'green', arabic: 'أَخْضَر', transliteration: 'akhḍar', explanation: 'أَخْضَر ist die maskuline Grundform für Grün.', speech: 'أخضر', options: [
          { visual: 'flower', text: 'Eine gelbe Blume' }, { visual: 'leaf', text: 'Ein grünes Blatt', correct: true }, { visual: 'balloon', text: 'Ein roter Ballon' }
        ] }
      ]
    },
    {
      id: 'zahlen', title: 'Zahlen', short: 'Zähle genau drei Äpfel.', icon: 'basket', reward: 'Lulu findet seinen Kristall.',
      questions: [
        { id: 'number-three', title: 'Die Zahl im Apfelkorb', speaker: 'bodo', speakerText: 'zählt mit dir die Äpfel', scene: 'Bodo braucht genau drei Äpfel für Lulu.', art: 'three', arabic: 'ثَلَاثَة', transliteration: 'thalātha', explanation: 'ثَلَاثَة heißt „drei“. Gleich brauchst du die Zahl im Obstkorb.', speech: 'ثلاثة', options: [
          { visual: 'two-apples', text: 'Zwei Äpfel', count: 2 }, { visual: 'three-apples', text: 'Drei Äpfel', count: 3, correct: true }, { visual: 'four-apples', text: 'Vier Äpfel', count: 4 }
        ] }
      ]
    }
  ];
  const validWordIds = new Set(lessons.flatMap(lesson => lesson.questions.map(question => question.id)));
  const app = document.getElementById('stage-root');
  const progressPill = document.getElementById('progress-pill');
  const clearRequest = document.getElementById('clear-request');
  const clearConfirm = document.getElementById('clear-confirm');
  const clearNow = document.getElementById('clear-now');
  const clearCancel = document.getElementById('clear-cancel');
  const clearStatus = document.getElementById('clear-status');
  const stored = readProgress();
  let completed = stored.completed;
  let missedWordIds = stored.missedWordIds;
  let state = freshState('home', 0);
  let activeRecognition = null;
  let recognitionToken = 0;
  let speechOutputToken = 0;
  let speechConsentGranted = false;

  function freshState(screen, lesson) {
    return { screen, lesson, question: 0, pickedApples: [], audioStatus: '', feedback: '', correct: false, chosenOption: undefined, lastWrong: undefined, applesStarted: false, showSpeechInfo: false, recognizing: false, phase: 'listen', audioComplete: false, missedQuestions: [], reviewQueue: [], reviewIndex: 0, isReview: false, reviewKind: '' };
  }

  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const done = Array.isArray(value.completed) ? lessons.map(lesson => lesson.id).filter(id => value.completed.includes(id)) : [];
      const missed = Array.isArray(value.missedWordIds) ? Array.from(new Set(value.missedWordIds.filter(id => validWordIds.has(id)))).slice(0, MAX_REVIEW_WORDS) : [];
      return { completed: done, missedWordIds: missed };
    } catch (_) { return { completed: [], missedWordIds: [] }; }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, missedWordIds: missedWordIds.slice(0, MAX_REVIEW_WORDS) })); }
    catch (_) { /* The current visit stays playable if browser storage is unavailable. */ }
  }

  function addMissedWord(id) {
    if (!validWordIds.has(id) || missedWordIds.includes(id)) return;
    missedWordIds = [...missedWordIds, id].slice(-MAX_REVIEW_WORDS);
    saveProgress();
  }

  function removeMissedWord(id) {
    const next = missedWordIds.filter(wordId => wordId !== id);
    if (next.length === missedWordIds.length) return;
    missedWordIds = next;
    saveProgress();
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }
  function unlocks(index) { return index === 0 || completed.includes(lessons[index - 1].id); }
  function continueIndex() { const next = lessons.findIndex(lesson => !completed.includes(lesson.id)); return next < 0 ? 0 : next; }
  function lessonMissedIndexes(index) { return lessons[index].questions.map((question, questionIndex) => missedWordIds.includes(question.id) ? questionIndex : -1).filter(questionIndex => questionIndex >= 0); }

  function render(focusSelector = '') {
    progressPill.textContent = `${completed.length} von ${lessons.length} Splittern`;
    if (state.screen === 'home') app.innerHTML = renderHome();
    else if (state.screen === 'lesson') app.innerHTML = renderLesson();
    else app.innerHTML = renderReward();
    if (focusSelector) { const element = app.querySelector(focusSelector); if (element) element.focus({ preventScroll: true }); }
  }

  function glyph(name, extra = '') {
    const paths = {
      star: '<path d="m24 5 4.8 12.4L42 22l-13.2 4.6L24 39l-4.8-12.4L6 22l13.2-4.6z"/>',
      door: '<path d="M9 39V13a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v26M7 39h34M16 39V17h16v22M27 27h.1"/><path d="M4 43h40"/>',
      paint: '<path d="M9 31c-3-3-4-7-3-12 2-8 10-13 19-13s17 5 19 13c1 5-1 8-5 10-3 2-5 2-7 0-1-1-2-2-4-2h-4c-2 0-3 1-3 3 0 3-2 5-5 5-3 0-5-1-7-4z"/><circle cx="14" cy="18" r="1.7"/><circle cx="21" cy="13" r="1.7"/><circle cx="30" cy="13" r="1.7"/><circle cx="36" cy="19" r="1.7"/>',
      basket: '<path d="M8 21h32l-4 19H12zM16 21l8-12 8 12M7 21h34M16 27v8M24 27v8M32 27v8"/>',
      wave: '<path d="M7 27c3-3 6-3 9 0l4 4M20 31l-4-10a2.7 2.7 0 0 1 5-2l5 11-1-16a2.7 2.7 0 0 1 5-.3l2 17 2-9a2.6 2.6 0 0 1 5 .9l-2 14c-.8 5-4 8-9 8h-6c-4 0-7-2-9-5l-6-9a2.8 2.8 0 0 1 4-3.7z"/>',
      moon: '<path d="M34 7a17 17 0 1 0 9 28A18 18 0 0 1 34 7z"/><path d="m13 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1zM37 26l1.3 3.2 3.2 1.3-3.2 1.2-1.3 3.3-1.2-3.3-3.3-1.2 3.3-1.3z"/>',
      thanks: '<path d="M24 39 9 25a9 9 0 0 1 13-13l2 2 2-2a9 9 0 0 1 13 13z"/><path d="M7 7l3 3M41 7l-3 3M24 4v4"/>',
      stop: '<path d="M17 5h14l10 10v14L31 39H17L7 29V15z"/><path d="M24 14v11M24 31h.1"/>',
      sleep: '<path d="M11 33a13 13 0 0 0 20 9 14 14 0 0 1-7-24 13 13 0 0 0-13 15z"/><path d="m37 8 1.3 3.2 3.2 1.3-3.2 1.2L37 17l-1.2-3.3-3.3-1.2 3.3-1.3z"/>',
      berry: '<path d="M24 12c-3-5-10-5-12 0-4 8 5 26 12 31 7-5 16-23 12-31-2-5-9-5-12 0z"/><path d="M24 12c-1-5 3-9 9-9M24 12c-4-5-9-6-13-4"/><path d="M19 20h.1M28 25h.1M21 33h.1"/>',
      blue: '<circle class="color-dot" cx="16" cy="19" r="7"/><circle class="color-dot" cx="29" cy="15" r="7"/><circle class="color-dot" cx="25" cy="29" r="7"/><path d="M21 8c0-3 2-5 5-6M33 31c3 1 5 3 5 6"/>',
      leaf: '<path d="M42 7C22 7 9 13 8 27c-1 10 8 15 16 11C37 31 42 7 42 7z"/><path d="M8 42c8-12 16-18 27-27M18 31l-1-9M27 23l8 1"/>',
      flower: '<path d="M24 22c-7-3-11-9-6-13 4-3 7 1 6 7 1-6 4-10 8-7 5 4 1 10-6 13 7-3 14-2 14 4s-7 7-14 2c6 5 8 12 2 14-5 1-7-4-4-10-3 6-8 10-12 6-4-5 1-10 7-12-7 3-14 2-14-4s7-7 14-2z"/><circle cx="24" cy="24" r="5"/><path d="M24 29v14m0-7-7-4m7 8 7-5"/>',
      balloon: '<path d="M24 5c-10 0-16 8-14 19 1 7 7 12 14 12s13-5 14-12C40 13 34 5 24 5z"/><path d="m21 36 3 5 3-5M24 41l-4 5m4-5 4 5"/>',
      crystal: '<path d="m24 3 15 9 3 17-18 14L6 29l3-17z"/><path d="m9 12 15 2 15-2M24 14v29M6 29l18-15 18 15"/>',
      apple: '<path d="M24 15c-8-7-19 0-16 13 2 10 8 18 15 14 1-.5 2-.5 3 0 7 4 13-4 15-14 3-13-8-20-17-13z"/><path d="M24 15c-1-7 3-11 10-12M25 10c4-5 9-5 13-3-2 5-7 7-13 6"/>',
      'basket-small': '<path d="M7 21h34l-4 19H11zM16 21l8-12 8 12M6 21h36"/>',
      lock: '<rect x="11" y="20" width="26" height="21" rx="4"/><path d="M17 20v-7a7 7 0 0 1 14 0v7M24 29v5"/>'
    };
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" ${extra}>${paths[name] || paths.star}</svg>`;
  }

  function mapArtwork() {
    return `<svg class="world-art" viewBox="0 0 1200 650" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Eine handgezeichnete Karte von Bodos Dorf mit Hügeln, Häusern, einem Bach und einem gewundenen Pfad">
      <defs>
        <linearGradient id="map-sky" x2="0" y2="1"><stop stop-color="#26203f"/><stop offset=".58" stop-color="#50617b"/><stop offset="1" stop-color="#d1a66e"/></linearGradient>
        <linearGradient id="map-ground" x2="0" y2="1"><stop stop-color="#839575"/><stop offset=".48" stop-color="#687e69"/><stop offset="1" stop-color="#415c59"/></linearGradient>
        <linearGradient id="map-river" x2="1" y2="1"><stop stop-color="#7ed2ce"/><stop offset="1" stop-color="#468f9b"/></linearGradient>
        <radialGradient id="map-moon"><stop stop-color="#fff4ce"/><stop offset="1" stop-color="#e9bd68"/></radialGradient>
      </defs>
      <rect width="1200" height="650" fill="url(#map-sky)"/>
      <circle cx="1012" cy="100" r="48" fill="url(#map-moon)" opacity=".96"/><circle cx="1012" cy="100" r="72" fill="#f5d792" opacity=".11"/>
      <g fill="#fff3ce" opacity=".76"><circle cx="94" cy="77" r="2"/><circle cx="228" cy="111" r="1.8"/><circle cx="408" cy="66" r="2"/><circle cx="591" cy="104" r="1.5"/><circle cx="782" cy="63" r="2"/><circle cx="1120" cy="183" r="1.5"/><circle cx="943" cy="199" r="1.7"/><path d="m312 129 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="m705 139 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/></g>
      <path d="M0 289 122 205l83 56 101-139 140 152 102-111 137 116 112-150 104 110 97-95 202 157v240H0z" fill="#49516b" opacity=".77"/>
      <path d="M0 337c121-106 217-41 319-67 110-29 157-111 277-70 105 36 143 117 255 76 120-44 218-84 349-7v381H0z" fill="#657b76"/>
      <path d="M0 418c129-108 251-84 368-42 122 44 205 19 303-42 121-75 222-47 335 9 74 36 132 28 194-14v321H0z" fill="url(#map-ground)"/>
      <path d="M0 536c158-53 246-7 353 29 123 41 214 24 315-20 123-54 264-84 532-9v114H0z" fill="#415b57" opacity=".6"/>
      <path d="M-30 498C107 435 185 440 280 460s173 65 274 47c86-15 137-82 228-86 105-4 155 76 254 72 67-3 120-38 194-28" fill="none" stroke="url(#map-river)" stroke-width="32" opacity=".9"/>
      <path d="M-30 498C107 435 185 440 280 460s173 65 274 47c86-15 137-82 228-86 105-4 155 76 254 72 67-3 120-38 194-28" fill="none" stroke="#c8efda" stroke-width="3" stroke-dasharray="2 17" opacity=".8"/>
      <path class="map-route-shadow" d="M80 590C180 558 207 522 268 490c85-44 116-60 190-61 112-1 141 68 251 57 102-10 131-105 249-114 89-7 134 27 201 11"/>
      <path class="map-route" d="M80 590C180 558 207 522 268 490c85-44 116-60 190-61 112-1 141 68 251 57 102-10 131-105 249-114 89-7 134 27 201 11"/>
      <path class="route-center" d="M80 590C180 558 207 522 268 490c85-44 116-60 190-61 112-1 141 68 251 57 102-10 131-105 249-114 89-7 134 27 201 11"/>
      <g opacity=".98">
        <path d="M420 388V280l77-59 77 59v108z" fill="#c98163" stroke="#553d53" stroke-width="5"/><path d="m406 284 91-76 91 76" fill="#e5b073" stroke="#553d53" stroke-width="6"/><path d="M477 388v-68a20 20 0 0 1 40 0v68" fill="#5a4b61"/><rect x="438" y="300" width="28" height="29" rx="4" fill="#f6d17e"/><rect x="527" y="300" width="27" height="29" rx="4" fill="#f6d17e"/>
        <path d="M585 389V309l66-49 66 49v80z" fill="#d7ab75" stroke="#604453" stroke-width="4"/><path d="m574 313 77-61 78 61" fill="#bd6d61" stroke="#604453" stroke-width="5"/><path d="M630 389v-52a21 21 0 0 1 42 0v52" fill="#554762"/><rect x="596" y="322" width="24" height="24" rx="3" fill="#ffe199"/><rect x="681" y="322" width="22" height="24" rx="3" fill="#ffe199"/>
        <path d="M756 391V325l53-40 52 40v66z" fill="#d89f68" stroke="#5d4554" stroke-width="4"/><path d="m746 329 63-52 63 52" fill="#e7ca8a" stroke="#5d4554" stroke-width="5"/><path d="M791 391v-41a18 18 0 0 1 36 0v41" fill="#5c4b5e"/><rect x="765" y="338" width="18" height="20" rx="3" fill="#f6d17e"/><rect x="835" y="338" width="18" height="20" rx="3" fill="#f6d17e"/>
        <path d="M665 252v-80" stroke="#e5cc91" stroke-width="5"/><path d="M668 176h75l-20 18 20 18h-75z" fill="#e77868"/><circle cx="665" cy="169" r="8" fill="#f4cd72"/>
      </g>
      <g fill="#2d4b4d"><path d="M122 422c-2-49 14-81 45-99 30 29 39 63 22 99z"/><path d="M160 424c2-48 25-74 53-88 24 31 25 64 4 91z"/><path d="M1008 415c-2-55 16-91 51-112 35 31 45 71 22 112z"/><path d="M1060 420c2-48 22-79 51-96 27 31 29 65 8 96z"/></g>
      <g fill="#e4c478"><circle cx="181" cy="431" r="7"/><circle cx="1054" cy="439" r="6"/><circle cx="315" cy="368" r="4"/><circle cx="889" cy="287" r="5"/></g>
      <g fill="#c9a982" opacity=".8"><ellipse cx="298" cy="529" rx="22" ry="8"/><ellipse cx="334" cy="508" rx="19" ry="7"/><ellipse cx="903" cy="422" rx="24" ry="7"/><ellipse cx="930" cy="447" rx="17" ry="6"/></g>
      <g stroke="#f5e5b7" stroke-width="2" opacity=".8"><path d="M65 222v24m-12-12h24"/><path d="M883 223v19m-10-9h20"/></g>
    </svg>`;
  }

  function mapIcon(name) { return glyph(name); }
  function renderHome() {
    const nextIndex = continueIndex();
    const nextLesson = lessons[nextIndex];
    const allDone = completed.length === lessons.length;
    const reviewTotal = missedWordIds.length;
    const nodes = lessons.map((lesson, index) => {
      const done = completed.includes(lesson.id);
      const open = unlocks(index);
      const status = done ? 'Geschafft' : open ? 'Jetzt spielen' : 'Erst vorherige Spur';
      const symbol = index === 0 ? 'door' : index === 1 ? 'paint' : 'basket';
      return `<button class="map-node ${done ? 'is-done' : ''}" type="button" data-action="open-lesson" data-lesson="${index}" ${open ? '' : 'disabled'} aria-label="${open ? `Abschnitt ${index + 1}: ${lesson.title}${done ? ', schon geschafft' : ''}` : `${lesson.title}, noch gesperrt`}" style="--node-number:${index + 1}">
        <span class="node-medal">${mapIcon(symbol)}</span><span class="node-copy"><small>Spur 0${index + 1}</small><strong>${lesson.title}</strong><em>${done ? '✓ ' : ''}${status}</em></span></button>`;
    }).join('');
    const storyTitle = allDone ? 'Der Kristall strahlt wieder!' : 'Lulus Kristall ist verschwunden.';
    const storyText = allDone ? 'Dein Dorfabenteuer wartet auf eine neue Runde. Spiel ein Kapitel noch einmal.' : 'Folge den leuchtenden Spuren durchs Dorf. Höre ein Wort, finde das passende Bild und hilf Lulu.';
    const buttonText = allDone ? `${nextLesson.title} noch einmal` : completed.length ? `Weiter: ${nextLesson.title}` : 'Erste Spur finden';
    const review = reviewTotal ? `<div class="review-banner"><span class="review-banner-icon" aria-hidden="true">${glyph('crystal')}</span><span><strong>${reviewTotal} Wort${reviewTotal === 1 ? '' : 'er'} wartet${reviewTotal === 1 ? '' : 'en'} auf eine kurze Wiederholung.</strong> Beim nächsten Besuch in diesem Kapitel hörst du sie noch einmal.</span></div>` : '';
    return `<section class="map-screen" id="abenteuerkarte" aria-labelledby="welcome-title">
      <header class="map-heading"><div class="map-heading-copy"><p class="map-kicker">BODOS DORF · DIE KRISTALLSUCHE</p><h1 id="welcome-title" tabindex="-1">Die Karte ist wach.</h1><p>Drei Spuren. Ein Dorf. Hilf Lulu, seinen Sprachkristall wiederzufinden.</p></div><div class="map-ledger" aria-label="${completed.length} von drei Kapiteln abgeschlossen"><span class="ledger-gem">${glyph('crystal')}</span><span class="ledger-copy"><strong>${completed.length} / 3</strong>Splittersuche</span></div></header>
      <div class="village-map" aria-label="Spielbare Abenteuerkarte von Bodos Dorf">
        ${mapArtwork()}<div class="map-vignette" aria-hidden="true"></div>
        <div class="quest-plaque"><div class="quest-label">Dein nächster Auftrag</div><h2>${storyTitle}</h2><p>${storyText}</p><div class="map-cast" aria-label="Bodo, Zakarota und Lulu begleiten dich"><span class="map-cast-person">${portrait('bodo')}<span>Bodo</span></span><span class="map-cast-person">${portrait('zakarota')}<span>Zakarota</span></span><span class="map-cast-person"><span class="map-cast-lulu" aria-hidden="true">${luluArt()}</span><span>Lulu</span></span></div><button class="primary-button" type="button" data-action="continue">${buttonText}<span class="button-arrow" aria-hidden="true">→</span></button></div>
        <div class="guide-roster" aria-label="Bodo erklärt, Zakarota gibt Hinweise und Lulu sucht seinen Sprachkristall"><div class="roster-faces"><span class="portrait-cutout portrait-zakarota"><img src="${characterImage}" alt="" aria-hidden="true"></span><span class="portrait-cutout portrait-bodo"><img src="${characterImage}" alt="" aria-hidden="true"></span><span class="portrait-cutout portrait-lulu" aria-hidden="true">${luluArt()}</span></div><span class="roster-names"><span>Zakarota · Hinweise</span><span>Bodo · erklärt</span><small class="roster-caption">Lulu wartet auf euch.</small></span></div>
        ${nodes}<div class="map-legend"><span class="legend-star" aria-hidden="true">✦</span>Tippe auf eine offene Spur</div>
      </div>${review}
    </section>`;
  }

  function currentQuestionIndex() { return state.isReview ? state.reviewQueue[state.reviewIndex] : state.question; }
  function currentQuestion() { return lessons[state.lesson].questions[currentQuestionIndex()]; }

  function sceneIllustration(art) {
    const palette = {
      greeting: ['#f2c875', '#bc735f', '#53657a'], guest: ['#e9be78', '#8f6b8b', '#486777'], blue: ['#7ecbc4', '#5077a6', '#354b69'], green: ['#90bc78', '#56836c', '#426374'], three: ['#e5a366', '#a85458', '#67506f']
    }[art] || ['#f2c875', '#bc735f', '#53657a'];
    const object = art === 'blue'
      ? '<ellipse cx="230" cy="245" rx="116" ry="21" fill="#181833" opacity=".23"/><path d="M133 111h194l-22 113c-3 18-19 31-37 31h-76c-18 0-34-13-37-31z" fill="#f0c985" stroke="#604d64" stroke-width="7"/><path d="M149 125h162l-15 78c-3 14-15 24-29 24h-73c-14 0-26-10-29-24z" fill="${palette[1]}"/><path d="M129 116h202" stroke="#fff0cb" stroke-width="11" stroke-linecap="round"/><circle cx="198" cy="174" r="23" fill="#5276b4" stroke="#a6caee" stroke-width="5"/><circle cx="245" cy="163" r="25" fill="#6384c0" stroke="#a6caee" stroke-width="5"/><circle cx="276" cy="190" r="20" fill="#4c72ae" stroke="#a6caee" stroke-width="5"/><path d="M176 94c20-28 56-28 76 0" fill="none" stroke="#e6d48b" stroke-width="8" stroke-linecap="round"/>'
      : art === 'green'
      ? '<ellipse cx="230" cy="249" rx="122" ry="20" fill="#17172f" opacity=".22"/><path d="M230 239c-3-69 11-122 50-165" fill="none" stroke="#668252" stroke-width="11" stroke-linecap="round"/><path d="M239 198c-60 2-88-28-77-65 39 1 71 24 77 65z" fill="#85b868" stroke="#d0dfa0" stroke-width="5"/><path d="M250 151c3-52 38-81 78-75 3 42-24 73-78 75z" fill="#62a775" stroke="#b9d991" stroke-width="5"/><path d="M236 220c-39-38-76-37-99-10 23 33 55 47 99 10z" fill="#75ab64" stroke="#c0d98c" stroke-width="5"/><path d="M228 238c13-42 36-69 78-86M230 238c-15-28-40-48-76-54" fill="none" stroke="#edf0b6" stroke-width="3"/>'
      : art === 'three'
      ? '<ellipse cx="230" cy="245" rx="122" ry="21" fill="#191733" opacity=".23"/><path d="M134 151h192l-20 88H154z" fill="#a46f59" stroke="#503f59" stroke-width="7"/><path d="m132 150 98-68 98 68z" fill="#c18d67" stroke="#503f59" stroke-width="7"/><path d="M147 156h166l-14 68H162z" fill="#70516d"/><g fill="#e45d54" stroke="#f4c17a" stroke-width="4"><circle cx="190" cy="165" r="24"/><circle cx="230" cy="157" r="24"/><circle cx="269" cy="168" r="24"/></g><g fill="#729a58"><path d="M188 137c-1-14 8-20 17-20 1 10-4 17-17 20"/><path d="M228 129c0-14 9-20 18-18 0 10-5 17-18 18"/><path d="M267 140c0-14 9-19 18-17 0 10-5 16-18 17"/></g>'
      : art === 'guest'
      ? '<ellipse cx="230" cy="246" rx="128" ry="22" fill="#17172f" opacity=".22"/><path d="M124 240V105a106 106 0 0 1 212 0v135" fill="none" stroke="#d69d65" stroke-width="20"/><path d="M154 238V108a76 76 0 0 1 152 0v130" fill="none" stroke="#f2d493" stroke-width="8"/><path d="M198 230v-46a32 32 0 0 1 64 0v46" fill="#786183" stroke="#4b3b59" stroke-width="7"/><circle cx="228" cy="153" r="34" fill="#f0c8a5"/><path d="M196 145c5-36 63-39 68 2-22-9-44-9-68-2z" fill="#55415b"/><path d="M207 228v-27a22 22 0 0 1 44 0v27" fill="#6a93a2"/>'
      : '<ellipse cx="230" cy="247" rx="124" ry="21" fill="#191733" opacity=".23"/><path d="M90 238V111a140 140 0 0 1 280 0v127" fill="none" stroke="#b97161" stroke-width="19"/><path d="M120 239V115a110 110 0 0 1 220 0v124" fill="none" stroke="#f1d28c" stroke-width="7"/><path d="M208 239v-61a22 22 0 0 1 44 0v61" fill="#f0c889"/><circle cx="112" cy="162" r="18" fill="#f2c96f"/><path d="M105 181h14l9 31h-32z" fill="#66b8ac"/><path d="M332 160h15v37h-15z" fill="#ec8369"/><path d="m326 161 13-18 13 18" fill="#f4d183"/>';
    return `<svg class="scene-art" viewBox="0 0 460 300" role="img" aria-label="Illustrierte Szene: ${escapeText(art === 'guest' ? 'Ein offenes Willkommenstor' : art === 'blue' ? 'Blaubeeren auf dem Markt' : art === 'green' ? 'Ein grünes Blatt im Garten' : art === 'three' ? 'Drei Äpfel im Korb' : 'Ein leuchtendes Dorftor')}"><defs><linearGradient id="art-sky" x2="0" y2="1"><stop stop-color="#374267"/><stop offset="1" stop-color="#c48d73"/></linearGradient><radialGradient id="art-orb"><stop stop-color="#fff1b7"/><stop offset="1" stop-color="#e6b858"/></radialGradient></defs><path d="M0 0h460v300H0z" fill="url(#art-sky)"/><circle cx="350" cy="69" r="36" fill="url(#art-orb)" opacity=".9"/><circle cx="350" cy="69" r="58" fill="#f2d482" opacity=".1"/><g fill="#fff2cd" opacity=".7"><circle cx="78" cy="49" r="2"/><circle cx="155" cy="77" r="1.5"/><circle cx="253" cy="36" r="2"/><path d="m92 105 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g><path d="M0 214c73-56 115-40 179-20 72 22 126 13 186-20 34-19 65-20 95-10v136H0z" fill="#547873"/><path d="M0 247c84-31 139-23 202 0s137 33 258-8v61H0z" fill="#324f53"/>${object}</svg>`;
  }

  function portrait(name, extraClass = '') {
    return `<span class="portrait-cutout portrait-${name} ${extraClass}"><img src="${characterImage}" alt="" aria-hidden="true"></span>`;
  }

  function renderCharacterCue(question) {
    const speakerName = question.speaker === 'zakarota' ? 'Zakarota' : 'Bodo';
    return `<div class="character-cue" aria-label="Bodo, der Aufgaben-Erklärer, und Zakarota, der Hinweisgeber"><div class="coach ${question.speaker === 'bodo' ? 'is-speaking' : ''}">${portrait('bodo')}<span><strong>Bodo</strong><small>erklärt die Aufgabe</small></span></div><div class="coach ${question.speaker === 'zakarota' ? 'is-speaking' : ''}">${portrait('zakarota')}<span><strong>Zakarota</strong><small>gibt einen Hinweis</small></span></div></div><p class="speaker-line"><strong>${speakerName}:</strong> ${escapeText(question.speakerText)}.</p>`;
  }

  function renderSceneCast() {
    return `<div class="scene-cast" role="group" aria-label="Figuren in der Szene"><span class="scene-cast-person">${portrait('bodo', 'scene-cast-bodo')}<span>Bodo</span></span><span class="scene-cast-person"><span class="scene-cast-lulu" aria-hidden="true">${sceneLuluArt()}</span><span>Lulu</span></span></div>`;
  }

  function renderSpeechControl(speech) {
    if (state.recognizing) return `<button class="language-button stop-speech-button" type="button" data-action="stop-recognition">Versuch abbrechen</button>`;
    return `<button class="language-button" type="button" data-action="recognize" data-speech="${escapeText(speech)}">Nachsprechen (freiwillig)</button>`;
  }

  function renderSpeechInfo() {
    if (!state.showSpeechInfo) return '';
    return `<section class="speech-consent" aria-labelledby="speech-consent-title"><h3 id="speech-consent-title">Möchtest du das Mikrofon benutzen?</h3><p>Bitte frage vorher eine erwachsene Person. Je nach Browser kann deine Stimme von einem Dienst außerhalb dieses Spiels verarbeitet werden. Das können wir nicht prüfen. Das Mikrofon startet erst mit „Jetzt starten“ und du kannst den Versuch abbrechen. Nachsprechen ist freiwillig.</p><div class="consent-actions"><button class="primary-button" type="button" data-action="confirm-speech">Jetzt starten</button><button class="quiet-button" type="button" data-action="cancel-speech">Nein, danke</button></div></section>`;
  }

  function optionArt(name) {
    if (name === 'two-apples' || name === 'three-apples' || name === 'four-apples') {
      const count = name === 'two-apples' ? 2 : name === 'three-apples' ? 3 : 4;
      return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 14c-8-6-16 1-14 11 2 9 7 15 13 12 1-.5 2-.5 3 0 6 3 11-3 13-12 2-10-6-17-15-11z" fill="#e26258" stroke="#9b4845" stroke-width="1.8"/><path d="M24 14c0-6 4-9 9-10m-9 7c4-4 8-4 11-2" fill="none" stroke="#598052" stroke-width="2.5" stroke-linecap="round"/>${Array.from({ length: count - 1 }, (_, i) => `<circle cx="${17 + i * 7}" cy="27" r="1.1" fill="#ffd59a"/>`).join('')}</svg>`;
    }
    const variants = {
      wave: '<path d="M15 26c2-2 4-2 6 0l3 3M24 30l-3-8a2 2 0 0 1 4-1l4 9-1-13a2 2 0 0 1 4-.2l1 14 2-7a2 2 0 0 1 4 .7l-2 11c-.7 4-3 6-7 6h-5c-3 0-5-1-7-4l-4-7a2 2 0 0 1 3-3z"/>',
      moon: '<path d="M34 8a16 16 0 1 0 7 28 17 17 0 0 1-7-28z"/><path d="m13 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
      thanks: '<path d="M24 38 11 26a8 8 0 0 1 11-12l2 2 2-2a8 8 0 0 1 11 12z"/><path d="M8 8l3 3m26-3-3 3M24 5v4"/>',
      stop: '<path d="M18 7h12l9 9v12l-9 9H18l-9-9V16z"/><path d="M24 14v11m0 6h.1"/>',
      door: '<path d="M11 40V12a3 3 0 0 1 3-3h20a3 3 0 0 1 3 3v28M8 40h32M17 40V17h14v23M27 28h.1"/>',
      sleep: '<path d="M12 32a13 13 0 0 0 19 9 14 14 0 0 1-7-24 13 13 0 0 0-12 15z"/><path d="m37 8 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
      berry: '<path d="M24 14c-3-5-10-5-12 0-4 8 5 22 12 27 7-5 16-19 12-27-2-5-9-5-12 0z" fill="#e77861"/><path d="M24 14c-1-5 3-8 8-9m-8 9c-4-4-8-5-12-3"/><path d="M19 21h.1m9 5h.1m-7 7h.1"/>',
      blue: '<circle cx="17" cy="19" r="7" fill="#5978b5"/><circle cx="29" cy="16" r="7" fill="#718bc5"/><circle cx="25" cy="29" r="7" fill="#4c70ab"/><path d="M22 7c0-3 2-4 5-5"/>',
      leaf: '<path d="M41 8C22 8 11 14 10 27 9 36 17 41 25 37 36 31 41 8 41 8z" fill="#77aa6a"/><path d="M9 41c9-12 18-19 28-29m-17 18-1-9m10 2 7 1"/>',
      flower: '<path d="M24 22c-6-4-9-9-5-12 4-3 6 1 5 6 1-5 4-9 8-6 4 4 0 9-6 12 6-3 12-2 12 3s-6 6-12 2c5 4 7 10 2 12-4 1-6-4-4-9-3 5-7 8-11 5-3-4 1-9 6-10-6 2-12 1-12-4s6-6 12-1z" fill="#f0c65f"/><circle cx="24" cy="24" r="4" fill="#b75e51"/><path d="M24 29v13m0-7-6-4m6 7 6-4"/>',
      balloon: '<path d="M24 6c-9 0-14 7-13 17 1 8 6 12 13 12s12-4 13-12C38 13 33 6 24 6z" fill="#e77868"/><path d="m21 35 3 5 3-5M24 40l-4 5m4-5 4 5"/>'
    };
    return `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${variants[name] || variants.wave}</svg>`;
  }

  function renderStepper(label, fraction) {
    const percent = Math.min(100, Math.max(7, Math.round(fraction * 100)));
    return `<div class="stepper"><div class="stepper-label"><span>${escapeText(label)}</span><span>${percent}%</span></div><div class="stepper-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="Fortschritt in diesem Kapitel"><div class="stepper-fill" style="width:${percent}%"></div></div></div>`;
  }

  function renderLesson() {
    const lesson = lessons[state.lesson];
    const q = currentQuestion();
    const current = state.isReview ? lesson.questions.length + state.reviewIndex + 1 : state.question + 1;
    const total = lesson.questions.length + state.reviewQueue.length;
    const stepLabel = state.isReview ? `${state.reviewKind === 'persistent' ? 'Wiederholung' : 'Kurz wiederholen'} ${state.reviewIndex + 1} von ${state.reviewQueue.length}` : `Aufgabe ${current} von ${total}`;
    const fraction = state.isReview ? (lesson.questions.length + state.reviewIndex + 1) / total : (state.question + 1) / Math.max(total, 1);
    return `<section class="lesson-shell lesson-${lesson.id}" aria-labelledby="lesson-title">
      <header class="game-toolbar"><button class="back-button" type="button" data-action="home"><span aria-hidden="true">←</span> Karte</button><div class="toolbar-title"><p class="game-kicker">SPUR 0${state.lesson + 1} · BODOS DORF</p><strong id="lesson-title" tabindex="-1">${lesson.title} <span aria-hidden="true">·</span> ${q.title}</strong></div>${renderStepper(stepLabel, fraction)}</header>
      <div class="learning-room"><section class="story-world" aria-label="Die Abenteuerszene"><span class="story-eyebrow">${escapeText(lesson.title)} · eine neue Spur</span><span class="stage-spark one" aria-hidden="true">✦</span><span class="stage-spark two" aria-hidden="true">✧</span><div class="scene-art-wrap">${sceneIllustration(q.art)}${renderSceneCast()}</div><p class="scene-story">${escapeText(q.scene)}<br><strong>Lausche erst – dann such das Bild.</strong></p></section><section class="challenge-panel" aria-label="Lernaufgabe">${renderCharacterCue(q)}${renderQuestion(q)}</section></div>
    </section>`;
  }

  function renderQuestion(q) {
    const reviewNote = state.isReview ? `<p class="review-note">${state.reviewKind === 'persistent' ? 'Wortspur vom letzten Besuch' : 'Eine kurze Wiederholung'} · ${state.reviewIndex + 1}/${state.reviewQueue.length}</p>` : '';
    if (state.phase === 'listen') {
      const audioLabel = state.audioComplete ? 'Wort noch einmal hören' : 'Arabisches Wort anhören';
      return `${reviewNote}<h2 class="question-title">Hör genau hin.</h2><p class="question-detail">Das gesprochene Wort ist der Hinweis. Die Schrift bleibt erst einmal verborgen.</p><div class="listen-hint"><span class="listen-hint-icon" aria-hidden="true">${glyph('wave')}</span><span>${state.isReview ? 'Erkennst du das Wort diesmal wieder?' : 'Hören reicht – du musst noch nichts lesen.'}</span></div><div class="question-audio"><button class="audio-main" type="button" data-action="speak" data-speech="${escapeText(q.speech)}"><span class="audio-orb" aria-hidden="true">${state.audioComplete ? '↻' : '♫'}</span><span>${audioLabel}<small>Arabisch · Audio aus dem Browser, wenn verfügbar</small></span></button><div class="audio-secondary-row">${renderSpeechControl(q.speech)}<button class="skip-audio-button" type="button" data-action="skip-audio">Ohne Audio weiter</button></div></div>${renderSpeechInfo()}<p class="audio-status" id="audio-status" role="status" aria-live="polite">${escapeText(state.audioStatus || 'Die Bildauswahl erscheint nach dem Vorlesen oder wenn du den Hörschritt überspringst.')}</p>${state.audioComplete ? '<button class="primary-button" type="button" data-action="continue-to-pictures">Weiter zur Bildauswahl <span class="button-arrow" aria-hidden="true">→</span></button>' : ''}`;
    }
    const options = q.options.map((option, index) => {
      const chosen = state.chosenOption === index;
      const wrong = state.lastWrong === index;
      return `<button class="option-button ${wrong ? 'is-wrong' : ''}" type="button" data-action="answer" data-option="${index}" aria-pressed="${chosen ? 'true' : 'false'}" ${state.correct ? 'disabled' : ''} aria-label="${escapeText(option.text)}"><span class="option-picture">${optionArt(option.visual)}</span><span class="option-main">${escapeText(option.text)}</span></button>`;
    }).join('');
    const revealed = state.correct ? `<div class="reveal-panel" aria-label="Arabische Schrift und Umschrift"><div class="word-part"><small>Arabische Schrift</small><span class="arabic-word" lang="ar" dir="rtl">${q.arabic}</span></div><span class="word-divider" aria-hidden="true"></span><div class="word-part" lang="ar-Latn" dir="ltr"><small>Umschrift · links nach rechts</small><span class="arabic-pronunciation">${escapeText(q.transliteration)}</span></div><p class="word-explanation">${escapeText(q.explanation)}</p></div>` : '';
    const last = state.isReview ? state.reviewIndex === state.reviewQueue.length - 1 : state.question === lessons[state.lesson].questions.length - 1;
    const nextLabel = state.isReview ? last ? state.reviewKind === 'persistent' ? 'Zur ersten Aufgabe' : state.lesson === 2 ? 'Weiter zu den Äpfeln' : 'Kristall einsammeln' : 'Nächste Wiederholung' : last ? state.missedQuestions.length ? 'Wörter kurz wiederholen' : state.lesson === 2 ? 'Weiter zu den Äpfeln' : 'Kristall einsammeln' : 'Weiter';
    return `${reviewNote}<div class="picture-prompt"><h2 class="question-title">Welches Bild passt?</h2><button class="replay-word" type="button" data-action="speak" data-speech="${escapeText(q.speech)}" aria-label="Das gesprochene Wort noch einmal anhören">${glyph('wave')} Noch einmal hören</button></div><p class="question-detail">Wähle das Bild. Danach siehst du die arabische Schrift und die Umschrift.</p><div class="options-grid" role="group" aria-label="Bilder zur Auswahl">${options}</div>${revealed}<p id="feedback" class="feedback ${state.feedback && !state.correct ? 'is-try' : ''}" role="status" aria-live="polite">${escapeText(state.feedback)}</p><div class="question-footer">${state.correct ? `<button class="primary-button next-button" type="button" data-action="next-question">${nextLabel}<span class="button-arrow" aria-hidden="true">→</span></button>` : ''}</div>${renderSpeechInfo()}<p class="audio-status" id="audio-status" role="status" aria-live="polite">${escapeText
 (state.audioStatus)}</p>`;
  }

  function renderApples(question) {
    const selected = state.pickedApples;
    const count = selected.length;
    const apples = Array.from({ length: 5 }, (_, index) => `<button class="apple-button" type="button" data-action="apple" data-apple="${index}" aria-label="Apfel ${index + 1} ${selected.includes(index) ? 'im Korb' : 'auswählen'}" aria-pressed="${selected.includes(index)}" ${state.correct ? 'disabled' : ''}>${optionArt('three-apples')}</button>`).join('');
    const prompt = state.correct ? 'Genau drei Äpfel!' : 'Sammle genau drei Äpfel für Lulu.';
    const hint = state.correct ? 'Bodo zählt mit dir: eins, zwei, drei.' : count > 3 ? `Ein Apfel zu viel – nimm ${count - 3} wieder heraus.` : count === 3 ? 'Prima! Gib den Korb ab.' : `Noch ${3 - count} ${3 - count === 1 ? 'Apfel' : 'Äpfel'} auswählen.`;
    return `<p class="question-title">${prompt}</p><p class="question-detail">Du hast gerade das arabische Wort für drei gehört. Jetzt wird das Wort zur Handlung: Lege genau drei Äpfel in den Korb.</p><div class="apple-word-recap"><div class="word-part"><small>Arabische Schrift</small><span class="arabic-word" lang="ar" dir="rtl">${question.arabic}</span></div><div class="word-part" lang="ar-Latn" dir="ltr"><small>Umschrift · LTR</small><span class="arabic-pronunciation">${escapeText(question.transliteration)} · drei</span></div></div><div class="apple-work"><p>Wähle drei von fünf Äpfeln.</p><div class="apple-area"><div class="apple-pile" role="group" aria-label="Fünf Äpfel zur Auswahl">${apples}</div><div class="basket" aria-live="polite">${glyph('basket-small')}<span class="basket-count">${count} von 3<br>im Korb</span></div></div><div class="apple-actions"><p class="apple-hint">${hint}</p>${state.correct ? `<button class="primary-button" type="button" data-action="finish-apples">Splitter einsammeln <span class="button-arrow" aria-hidden="true">→</span></button>` : `<button class="primary-button" type="button" data-action="check-apples" ${count === 3 ? '' : 'disabled'}>Korb abgeben <span class="button-arrow" aria-hidden="true">→</span></button>`}</div></div><p id="feedback" class="feedback" role="status" aria-live="polite">${escapeText(state.feedback)}</p><div class="question-audio"><div class="audio-secondary-row"><button class="language-button" type="button" data-action="speak" data-speech="${escapeText(question.speech)}">Wort noch einmal hören</button>${renderSpeechControl(question.speech)}</div></div>${renderSpeechInfo()}<p class="audio-status" id="audio-status" role="status" aria-live="polite">${escapeText(state.audioStatus)}</p>`;
  }

  function renderLesson() {
    const lesson = lessons[state.lesson];
    const q = currentQuestion();
    const current = state.isReview ? lesson.questions.length + state.reviewIndex + 1 : state.question + 1;
    const total = lesson.questions.length + state.reviewQueue.length;
    const stepLabel = state.isReview ? `${state.reviewKind === 'persistent' ? 'Wiederholung' : 'Kurz wiederholen'} ${state.reviewIndex + 1} von ${state.reviewQueue.length}` : `Aufgabe ${current} von ${total}`;
    const fraction = state.isReview ? (lesson.questions.length + state.reviewIndex + 1) / total : (state.question + 1) / Math.max(total, 1);
    return `<section class="lesson-shell lesson-${lesson.id}" aria-labelledby="lesson-title">
      <header class="game-toolbar"><button class="back-button" type="button" data-action="home"><span aria-hidden="true">←</span> Karte</button><div class="toolbar-title"><p class="game-kicker">SPUR 0${state.lesson + 1} · BODOS DORF</p><strong id="lesson-title" tabindex="-1">${lesson.title} <span aria-hidden="true">·</span> ${state.applesStarted ? 'Apfelkorb' : q.title}</strong></div>${renderStepper(stepLabel, fraction)}</header>
      <div class="learning-room"><section class="story-world" aria-label="Die Abenteuerszene"><span class="story-eyebrow">${escapeText(lesson.title)} · eine neue Spur</span><span class="stage-spark one" aria-hidden="true">✦</span><span class="stage-spark two" aria-hidden="true">✧</span><div class="scene-art-wrap">${sceneIllustration(q.art)}${renderSceneCast()}</div><p class="scene-story">${escapeText(q.scene)}<br><strong>Lausche erst – dann such das Bild.</strong></p></section><section class="challenge-panel" aria-label="Lernaufgabe">${renderCharacterCue(q)}${state.applesStarted ? renderApples(q) : renderQuestion(q)}</section></div>
    </section>`;
  }

  function luluArt() {
    return `<svg class="lulu-illustration" viewBox="0 0 320 250" role="img" aria-label="Lulu, ein kleiner freundlicher Drache, freut sich über den gefundenen Kristall"><path d="M97 105 52 61c-10 32 0 60 34 73M222 102l44-46c11 33 0 62-35 77" fill="#79c3b2" stroke="#35516b" stroke-width="8" stroke-linejoin="round"/><path d="m119 59 4-34 28 29m43 2 22-33 8 40" fill="#f5c768" stroke="#70536e" stroke-width="7" stroke-linejoin="round"/><ellipse cx="164" cy="142" rx="91" ry="76" fill="#78c5b1" stroke="#37546a" stroke-width="8"/><path d="M111 142c1-30 20-48 42-48 22 0 33 14 42 38 8 21 18 39 35 49-19 23-42 36-70 36-45 0-79-30-79-75z" fill="#f2d4a9"/><ellipse cx="132" cy="126" rx="10" ry="14" fill="#fff"/><ellipse cx="188" cy="126" rx="10" ry="14" fill="#fff"/><circle cx="135" cy="129" r="5" fill="#272440"/><circle cx="185" cy="129" r="5" fill="#272440"/><path d="M147 161c10 10 23 10 34 0" fill="none" stroke="#71495e" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="154" r="9" fill="#ee9a82"/><circle cx="216" cy="154" r="9" fill="#ee9a82"/><path d="M87 206c-5 11-14 15-25 15h-8m151 0h-8c-11 0-20-4-25-15" fill="none" stroke="#35516b" stroke-width="9" stroke-linecap="round"/><path d="m85 183-17-17m176 19 17-18" fill="none" stroke="#6cb49e" stroke-width="13" stroke-linecap="round"/><path d="m249 47 4 11 11 4-11 4-4 11-4-11-11-4 11-4z" fill="#f5d073"/><path d="m63 112 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#f5d073"/></svg>`;
  }

  function sceneLuluArt() {
    return luluArt().replace(', freut sich über den gefundenen Kristall', '');
  }

  function renderReward() {
    const lesson = lessons[state.lesson];
    const allDone = completed.length === lessons.length;
    const quote = 'عَمَلٌ رَائِعٌ!';
    const nextIndex = Math.min(state.lesson + 1, lessons.length - 1);
    const crystals = lessons.map(item => `<span class="crystal-chip ${completed.includes(item.id) ? 'is-found' : ''}" aria-label="${item.title}: ${completed.includes(item.id) ? 'gefunden' : 'noch nicht gefunden'}">${glyph('crystal')}</span>`).join('');
    const completion = allDone ? '<p class="completion-note">Du hast alle drei Abenteuerabschnitte geschafft.</p>' : '';
    const primary = state.lesson < lessons.length - 1 ? `<button class="primary-button" type="button" data-action="next-lesson">Weiter zu ${lessons[nextIndex].title}<span class="button-arrow" aria-hidden="true">→</span></button>` : '<button class="primary-button" type="button" data-action="home">Zur Dorfkarte<span class="button-arrow" aria-hidden="true">→</span></button>';
    return `<section class="reward-screen" aria-labelledby="reward-title"><div class="reward-copy"><p class="map-kicker">SPLITTER ${completed.length} VON 3 · ${escapeText(lesson.title.toUpperCase())}</p><h1 id="reward-title" tabindex="-1">${escapeText(lesson.reward)}</h1><p>${escapeText(lesson.id === 'zahlen' ? 'Lulu hat seinen magischen Sprachkristall wiedergefunden – und du hast „drei“ direkt beim Zählen benutzt.' : lesson.id === 'farben' ? 'Die farbige Spur leuchtet heller. Du hast zwei Farbwörter mit Bildern verbunden.' : 'Der erste Splitter ist entdeckt. Du hast zwei freundliche Begrüßungen mit passenden Bildern verbunden.')}</p><div class="reward-saying"><span class="arabic-word" lang="ar" dir="rtl">${quote}</span><span class="reward-saying-copy"><small>Arabisch · Schreibrichtung RTL</small><span class="arabic-pronunciation" lang="ar-Latn" dir="ltr">ʿamalun rāʾiʿun</span><strong>Lulu: Tolle Arbeit!</strong></span></div>${completion}<div class="crystal-row" aria-label="${completed.length} von drei Splittern gefunden">${crystals}</div><div class="reward-actions">${primary}<button class="quiet-button" type="button" data-action="home">Abenteuerkarte</button></div></div><div class="reward-illustration"><div class="reward-glow" aria-hidden="true"></div>${luluArt()}<span class="reward-shard" aria-hidden="true">${glyph('crystal')}</span><span class="reward-landmark">${glyph('door')}<span>Kristall<br>gefunden</span></span></div></section>`;
  }

  function currentOrAppleSpeech() { return state.applesStarted && lessons[state.lesson].id === 'zahlen' ? 'ثلاثة' : currentQuestion().speech; }
  function stopRecognition() {
    recognitionToken += 1;
    const recognition = activeRecognition;
    activeRecognition = null;
    state.recognizing = false;
    if (recognition) {
      recognition.onresult = null; recognition.onerror = null; recognition.onend = null;
      try { recognition.abort(); } catch (_) { /* Already ended in the browser. */ }
    }
  }
  function stopSpeechOutput() {
    speechOutputToken += 1;
    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') { try { window.speechSynthesis.cancel(); } catch (_) { /* Audio may already have ended. */ } }
  }
  function stopMedia() { stopRecognition(); stopSpeechOutput(); }
  function setAudioMessage(message) {
    state.audioStatus = message;
    const status = document.getElementById('audio-status');
    if (status) status.textContent = message;
  }
  function normalizeArabic(text) { return String(text).normalize('NFC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[.,!?؟،؛]/g, '').replace(/\s+/g, '').trim(); }
  function speakWord(text) {
    if (!window.speechSynthesis || typeof window.speechSynthesis.speak !== 'function' || !('SpeechSynthesisUtterance' in window)) { setAudioMessage('Sprachausgabe ist auf diesem Gerät nicht verfügbar. Du kannst ohne Audio fortfahren.'); return; }
    let voice;
    try { voice = window.speechSynthesis.getVoices().find(item => /^ar([_-]|$)/i.test(item.lang)); } catch (_) { voice = null; }
    if (!voice) { setAudioMessage('Auf diesem Gerät ist keine arabische Sprachausgabe verfügbar. Du kannst ohne Audio fortfahren.'); return; }
    stopSpeechOutput();
    const token = ++speechOutputToken;
    const unlockPictures = state.screen === 'lesson' && state.phase === 'listen' && !state.applesStarted;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'ar'; utterance.voice = voice;
    utterance.onend = () => {
      if (token !== speechOutputToken) return;
      if (unlockPictures && state.screen === 'lesson' && state.phase === 'listen') {
        state.audioComplete = true; state.audioStatus = 'Das Vorlesen ist beendet. Wenn du bereit bist, öffne die Bildauswahl.'; render('[data-action="continue-to-pictures"]');
      } else setAudioMessage('Das Vorlesen ist beendet.');
    };
    utterance.onerror = () => { if (token === speechOutputToken) setAudioMessage('Das Vorlesen hat nicht geklappt. Du kannst ohne Audio fortfahren.'); };
    setAudioMessage('Das arabische Wort wird vorgelesen. Danach kannst du ein Bild auswählen.');
    try { window.speechSynthesis.speak(utterance); } catch (_) { setAudioMessage('Das Vorlesen ist gerade nicht verfügbar. Du kannst ohne Audio fortfahren.'); }
  }
  function finishRecognition(recognition, token, message) {
    if (recognitionToken !== token || activeRecognition !== recognition) return;
    activeRecognition = null; state.recognizing = false; setAudioMessage(message); render('[data-action="recognize"]');
  }
  function startRecognition(expected) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { state.showSpeechInfo = false; setAudioMessage('Spracherkennung ist in diesem Browser nicht verfügbar. Das Spiel funktioniert ohne Mikrofon.'); render('[data-action="recognize"]'); return; }
    try {
      const recognition = new Recognition(); const token = ++recognitionToken;
      activeRecognition = recognition; state.recognizing = true; state.showSpeechInfo = false; state.audioStatus = 'Mikrofon ist während dieses Versuchs aktiv. Du kannst jederzeit abbrechen.';
      recognition.lang = 'ar'; recognition.interimResults = false; recognition.maxAlternatives = 4;
      recognition.onresult = event => {
        const results = event.results[0] || [];
        const matched = Array.from(results).some(item => normalizeArabic(item.transcript) === normalizeArabic(expected));
        finishRecognition(recognition, token, matched ? 'Danke fürs Ausprobieren! Das Wort klang passend.' : 'Danke fürs Ausprobieren! Du kannst das Wort noch einmal hören oder weiterspielen.');
      };
      recognition.onerror = event => finishRecognition(recognition, token, event && event.error === 'not-allowed' ? 'Mikrofonzugriff wurde nicht erlaubt. Spiele einfach ohne Mikrofon weiter.' : 'Die Spracherkennung ist gerade nicht verfügbar. Spiele einfach ohne Mikrofon weiter.');
      recognition.onend = () => finishRecognition(recognition, token, 'Sprachversuch beendet. Du kannst weiterspielen.');
      recognition.start(); render('[data-action="stop-recognition"]');
    } catch (_) { activeRecognition = null; state.recognizing = false; setAudioMessage('Das Mikrofon-Extra ist gerade nicht verfügbar. Das Spiel funktioniert auch ohne.'); render('[data-action="recognize"]'); }
  }
  function requestRecognition(expected) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setAudioMessage('Spracherkennung ist in diesem Browser nicht verfügbar. Das Quiz funktioniert ohne Mikrofon.'); return; }
    if (state.recognizing) { stopRecognition(); setAudioMessage('Sprachversuch abgebrochen. Das Mikrofon ist aus.'); render('[data-action="recognize"]'); return; }
    if (!speechConsentGranted) { state.showSpeechInfo = true; render('[data-action="confirm-speech"]'); return; }
    startRecognition(expected);
  }
  function prepareQuestion() {
    state.phase = 'listen'; state.audioComplete = false; state.correct = false; state.feedback = ''; state.lastWrong = undefined; state.chosenOption = undefined; state.audioStatus = ''; state.showSpeechInfo = false;
  }
  function openLesson(index) {
    if (!Number.isInteger(index) || index < 0 || index >= lessons.length || !unlocks(index)) return;
    stopMedia(); state = freshState('lesson', index);
    const persistent = lessonMissedIndexes(index);
    if (persistent.length) { state.reviewQueue = persistent; state.reviewIndex = 0; state.isReview = true; state.reviewKind = 'persistent'; state.audioStatus = `Kurze Wiederholung vom letzten Besuch: ${persistent.length} ${persistent.length === 1 ? 'Wort' : 'Wörter'}.`; }
    render('#lesson-title');
  }
  function goHome() { stopMedia(); const lesson = state.lesson; state = freshState('home', lesson); render('#welcome-title'); }
  function completeLesson() {
    stopMedia(); const id = lessons[state.lesson].id;
    if (!completed.includes(id)) completed = [...completed, id];
    saveProgress(); state.screen = 'reward'; state.feedback = ''; state.showSpeechInfo = false; render('#reward-title');
  }
  function advanceFromReview() {
    const lesson = lessons[state.lesson];
    if (state.reviewKind === 'persistent') {
      state.isReview = false; state.reviewQueue = []; state.reviewIndex = 0; state.reviewKind = ''; state.question = 0; prepareQuestion(); state.audioStatus = 'Prima, jetzt geht deine neue Spur weiter.'; render('[data-action="speak"]'); return;
    }
    state.isReview = false; state.reviewQueue = []; state.reviewIndex = 0; state.reviewKind = '';
    if (lesson.id === 'zahlen') { state.applesStarted = true; prepareQuestion(); render('.apple-button'); } else completeLesson();
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'home') goHome();
    else if (action === 'continue') openLesson(continueIndex());
    else if (action === 'open-lesson') openLesson(Number(button.dataset.lesson));
    else if (action === 'continue-to-pictures') {
      if (state.screen !== 'lesson' || state.applesStarted || state.phase !== 'listen' || !state.audioComplete) return;
      state.phase = 'answer'; state.audioStatus = 'Das Vorlesen ist beendet. Wähle jetzt ein passendes Bild.'; render('.option-button');
    } else if (action === 'skip-audio') {
      if (state.screen !== 'lesson' || state.applesStarted || state.phase !== 'listen') return;
      stopMedia(); state.phase = 'answer'; state.showSpeechInfo = false; state.audioStatus = 'Der Hörschritt wurde übersprungen. Du kannst ohne Audio weiterspielen.'; render('.option-button');
    } else if (action === 'answer') {
      if (state.screen !== 'lesson' || state.applesStarted || state.phase !== 'answer' || state.correct) return;
      const question = currentQuestion(); const option = question.options[Number(button.dataset.option)];
      if (!option) return;
      stopMedia(); state.showSpeechInfo = false; state.chosenOption = option.correct ? Number(button.dataset.option) : undefined; state.audioStatus = '';
      if (option.correct) { state.correct = true; state.lastWrong = undefined; state.feedback = 'Richtig! Jetzt siehst du die arabische Schrift und ihre Umschrift.'; removeMissedWord(question.id); render('[data-action="next-question"]'); }
      else { if (!state.isReview && !state.missedQuestions.includes(currentQuestionIndex())) { state.missedQuestions.push(currentQuestionIndex()); addMissedWord(question.id); } state.lastWrong = Number(button.dataset.option); state.feedback = 'Guter Versuch! Hör noch einmal hin und wähle ein anderes Bild.'; render(`[data-option="${Number(button.dataset.option)}"]`); }
    } else if (action === 'next-question') {
      if (state.screen !== 'lesson' || state.applesStarted || !state.correct) return;
      stopMedia(); const lesson = lessons[state.lesson]; const last = lesson.questions.length - 1;
      if (state.isReview && state.reviewIndex < state.reviewQueue.length - 1) { state.reviewIndex += 1; prepareQuestion(); render('[data-action="speak"]'); }
      else if (state.isReview) advanceFromReview();
      else if (state.question < last) { state.question += 1; prepareQuestion(); render('[data-action="speak"]'); }
      else if (state.missedQuestions.length) { state.reviewQueue = [...state.missedQuestions]; state.reviewIndex = 0; state.isReview = true; state.reviewKind = 'session'; prepareQuestion(); state.audioStatus = `Am Kapitelende wiederholen wir kurz ${state.reviewQueue.length} ${state.reviewQueue.length === 1 ? 'Wortkarte' : 'Wortkarten'}.`; render('[data-action="speak"]'); }
      else if (lesson.id === 'zahlen') { state.applesStarted = true; prepareQuestion(); render('.apple-button'); }
      else completeLesson();
    } else if (action === 'apple') {
      if (state.correct) return;
      const index = Number(button.dataset.apple); if (!Number.isInteger(index) || index < 0 || index >= 5) return;
      state.pickedApples = state.pickedApples.includes(index) ? state.pickedApples.filter(item => item !== index) : [...state.pickedApples, index]; state.audioStatus = ''; render(`[data-apple="${index}"]`);
    } else if (action === 'check-apples') {
      if (state.pickedApples.length !== 3) return;
      state.correct = true; state.feedback = 'Genau drei Äpfel! Bodo zählt mit dir: ثَلَاثَة – drei.'; render('[data-action="finish-apples"]');
    } else if (action === 'finish-apples') completeLesson();
    else if (action === 'next-lesson') openLesson(Math.min(state.lesson + 1, lessons.length - 1));
    else if (action === 'speak') speakWord(button.dataset.speech || '');
    else if (action === 'recognize') requestRecognition(button.dataset.speech || '');
    else if (action === 'confirm-speech') { speechConsentGranted = true; state.showSpeechInfo = false; startRecognition(currentOrAppleSpeech()); }
    else if (action === 'cancel-speech') { state.showSpeechInfo = false; state.audioStatus = 'Mikrofon bleibt aus. Du kannst ohne Nachsprechen weiterspielen.'; render('[data-action="recognize"]'); }
    else if (action === 'stop-recognition') { stopRecognition(); setAudioMessage('Sprachversuch abgebrochen. Das Mikrofon ist aus.'); render('[data-action="recognize"]'); }
  });

  const brand = document.querySelector('.brand');
  if (brand) brand.addEventListener('click', event => { event.preventDefault(); goHome(); });

  if (clearRequest && clearConfirm && clearNow && clearCancel) {
    clearRequest.addEventListener('click', () => { clearStatus.textContent = ''; clearConfirm.hidden = false; clearNow.focus(); });
    clearCancel.addEventListener('click', () => { clearConfirm.hidden = true; clearRequest.focus(); });
    clearNow.addEventListener('click', () => {
      stopMedia(); completed = []; missedWordIds = [];
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* The visible current session is still cleared. */ }
      state = freshState('home', 0); render('#welcome-title'); clearConfirm.hidden = true; clearStatus.textContent = 'Der lokale Lernstand und die Wiederholungsliste wurden gelöscht.';
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    const wasRecognizing = state.recognizing; stopMedia();
    if (wasRecognizing && state.screen === 'lesson') { state.audioStatus = 'Sprachversuch beendet, weil das Spiel in den Hintergrund gewechselt ist.'; render('[data-action="recognize"]'); }
  });
  window.addEventListener('pagehide', stopMedia);
  render();
})();
