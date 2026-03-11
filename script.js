'use strict';

const VERSION = 'v51-sfx-restore';
const GAS_FALLBACK_URL = 'https://script.googleusercontent.com/a/macros/happy-epo8.com/echo?user_content_key=AY5xjrSdWJkoK3aTbQwAm_7pckNb0kfcNjsSXpDyz2CcUeQLE7trA2elCPtIm2qv_pfGX5B6xO2AQB9UoZ5ySNwojthuY7RGdro2JG1SG90AOZcBw3Gqya_c-rybyuLn1aQ-be6hO8ZjwQus07sg8_XDkTvuJPJ1vLTvQqOcK7fsPfajRJndtZH3BbFL2S21_KhMc5FWFxS3hfUc97tQa_XhmhTUKibH89MW9TK9qVBS-heioHwGo6A4l3g_9ayEe2GXefMmAKUKNR28e9z2U_QcdAMa17oz9nMYqgEHJ_VgxFWNKXvMqaf8IP9xxwSjZA&lib=MTTUCtxO1Y-zBMPQ7OIoeEZ7_d7M672O9';

const GAS_ENDPOINT = (() => {
  const meta = document.querySelector('meta[name="gas-url"]');
  return meta && meta.content ? meta.content.trim() : GAS_FALLBACK_URL;
})();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const firstLine = (value) => String(value || '').split(/\r?\n/).map(v => v.trim()).find(Boolean) || '';

const FOOD_ICON_SRC = {
  'にく': './img/oniku1.png',
  'くさ': './img/kusa2.png',
  'たいや': './img/taiya3.png',
  'げきからりょうり': './img/gekikara4.png'
};

const ANIMALS = [
  { id: 'lion', name: 'ライオン', emoji: '🦁', img: './img/raion.webp', first: 'オレ', personality: '自信家で王様気質' },
  { id: 'penguin', name: 'ペンギン', emoji: '🐧', img: './img/pengin.webp', first: 'ぼく', personality: '元気で好奇心旺盛' },
  { id: 'capybara', name: 'カピバラ', emoji: '🦫', img: './img/kapipara.webp', first: 'わたし', personality: 'のんびりマイペース' },
  { id: 'panda', name: 'パンダ', emoji: '🐼', img: './img/panda.webp', first: 'ぼく', personality: 'おっとりで食いしんぼう' }
];

const BEG_LINES = {
  lion: ['腹が減ったぜ…', 'なにかくれよ！', 'うまいの頼む！'],
  penguin: ['おなかすいた〜', 'なんかある？', 'もぐもぐしたい！'],
  capybara: ['のんびり…食べたい…', 'なにか…ちょうだい…', 'おなか…すいた…'],
  panda: ['たけ…ほしい…', 'もぐもぐ…したい…', 'なにか…ある？']
};

const LOADING_LINES = [
  'もぐもぐ準備中…',
  'えさを はこんでいます…',
  'いただきます の じゅんび…',
  'ゆっくり かみかみ…',
  'あじを たしかめています…',
  'おまちどうさま…',
  'もぐもぐ…もうすぐ！'
];

const MEGA_DISLIKE = {
  'たいや': {
    mood: '😵',
    lines: {
      lion: ['それ食べものじゃねぇ！', 'ゴム臭っ！ムリだ！', '歯が折れるって！'],
      penguin: ['それ、食べものじゃないよ〜！', 'くちばし痛い…！', 'ゴムはやだ…'],
      capybara: ['ごむ…むり…', 'かたい…やめる…', 'におい…だめ…'],
      panda: ['たけじゃない…だめ…', 'ころころ…いらない…', 'むり…ゴム…']
    },
    extra: ['見た瞬間、距離をとった…！', 'かじりかけて、ぷいっとした…', '一口で完全に固まった…']
  },
  'げきからりょうり': {
    mood: '🥵',
    lines: {
      lion: ['か、辛っ！舌が燃える！', '口の中が火事だ！', 'これ…戦いか！？'],
      penguin: ['からいっ！水〜！', 'くちがヒリヒリ…！', 'あつい…むり…'],
      capybara: ['からい…むり…', 'ひりひり…やめる…', 'むせる…'],
      panda: ['うぅ…辛い…', 'たけ…たけ…（求）', 'しびれる…やめる…']
    },
    extra: ['一口で目がうるうる…！', 'からすぎて、しばらくフリーズ…！', '舌がヒリヒリして大あわて…！']
  }
};

const state = {
  animal: null,
  begTimer: null,
  locked: false,
  reqId: 0,
  lastPayload: null,
  lastGasData: null,
  lastGasTrace: null
};

const el = {
  screenSelect: $('#screenSelect'),
  screenGame: $('#screenGame'),
  screenResult: $('#screenResult'),
  animalImg: $('#animalImg'),
  loadingAnimalImg: $('#loadingAnimalImg'),
  begLine: $('#begLine'),
  freeInput: $('#freeInput'),
  btnSend: $('#btnSend'),
  btnBackToSelect: $('#btnBackToSelect'),
  resultSub: $('#resultSub'),
  resultEmoji: $('#resultEmoji'),
  resultAnimalImg: $('#resultAnimalImg'),
  resultFoodBadge: $('#resultFoodBadge'),
  resultMoodBadge: $('#resultMoodBadge'),
  resultText: $('#resultText'),
  resultImagePlaceholder: $('#resultImagePlaceholder'),
  resultImage: $('#resultImage'),
  btnRetryImage: $('#btnRetryImage'),
  btnCopyGas: $('#btnCopyGas'),
  btnResultBack: $('#btnResultBack'),
  loadingOverlay: $('#loadingOverlay'),
  loadingLine: $('#loadingLine'),
  toast: $('#toast'),
  toastText: $('#toastText'),
  toastClose: $('#toastClose'),
  imgModal: $('#imgModal'),
  imgModalBackdrop: $('#imgModalBackdrop'),
  imgModalClose: $('#imgModalClose'),
  imgModalImg: $('#imgModalImg')
};

/* ================================
   効果音
================================ */

let audioCtx = null;
let audioUnlocked = false;
let loadingSfxTimer = null;

function ensureAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
}

async function unlockAudio() {
  ensureAudio();
  if (!audioCtx) return false;

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (_error) {}
  }

  audioUnlocked = audioCtx.state === 'running';
  return audioUnlocked;
}

function tone(freq = 440, dur = 0.08, gain = 0.05, type = 'sine') {
  if (!audioUnlocked || !audioCtx) return;

  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(amp);
  amp.connect(audioCtx.destination);

  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const sfx = {
  click: () => tone(520, 0.06, 0.04, 'square'),
  select: () => {
    tone(440, 0.06, 0.035, 'sine');
    setTimeout(() => tone(660, 0.07, 0.035, 'sine'), 60);
  },
  feed: () => {
    tone(240, 0.05, 0.03, 'triangle');
    setTimeout(() => tone(180, 0.06, 0.03, 'triangle'), 70);
  },
  ok: () => {
    tone(660, 0.07, 0.04, 'sine');
    setTimeout(() => tone(880, 0.09, 0.04, 'sine'), 80);
  },
  ng: () => tone(220, 0.10, 0.05, 'sawtooth'),
  mogumogu: () => {
    tone(260, 0.05, 0.018, 'triangle');
    setTimeout(() => tone(190, 0.06, 0.018, 'triangle'), 70);
  }
};

async function playSfx(name) {
  await unlockAudio();
  if (sfx[name]) sfx[name]();
}

function startLoadingSfx() {
  if (loadingSfxTimer) return;
  if (!audioUnlocked) return;

  sfx.mogumogu();
  loadingSfxTimer = setInterval(() => {
    sfx.mogumogu();
  }, 850);
}

function stopLoadingSfx() {
  if (!loadingSfxTimer) return;
  clearInterval(loadingSfxTimer);
  loadingSfxTimer = null;
}

window.addEventListener('pointerdown', () => {
  unlockAudio();
}, { once: true });

/* ================================
   共通
================================ */

function showToast(message, isError = false) {
  if (!el.toast || !el.toastText) return;
  el.toastText.textContent = message;
  el.toast.classList.toggle('isError', isError);
  el.toast.classList.add('show');

  if (!isError) {
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      el.toast.classList.remove('show');
    }, 1800);
  }
}

function showScreen(name) {
  const map = {
    select: el.screenSelect,
    game: el.screenGame,
    result: el.screenResult
  };

  Object.entries(map).forEach(([key, node]) => {
    if (!node) return;
    node.classList.toggle('isActive', key === name);
  });

  if (name === 'result') {
    const card = document.querySelector('#screenResult .resultCard');
    if (card) card.scrollTop = 0;
  }
}

function setLoading(show) {
  if (show) {
    startLoadingSfx();
  } else {
    stopLoadingSfx();
  }

  if (!el.loadingOverlay) return;
  el.loadingOverlay.classList.toggle('show', show);

  if (show && el.loadingLine) {
    el.loadingLine.textContent = pick(LOADING_LINES);
  }
}

function setImgSafe(img, src, alt) {
  if (!img) return;
  img.src = src || '';
  img.alt = alt || '';
}

function setFoodBadge(category, raw) {
  if (!el.resultFoodBadge) return;
  el.resultFoodBadge.textContent = '';
  el.resultFoodBadge.append('えさ：');

  const icon = document.createElement('img');
  icon.className = 'badgeFoodIcon';
  icon.alt = '';
  icon.src = FOOD_ICON_SRC[category] || '';
  el.resultFoodBadge.append(icon);
  el.resultFoodBadge.append(` ${raw}`);
}

function openImageModal(src) {
  if (!src || !el.imgModal || !el.imgModalImg) return;
  el.imgModalImg.src = src;
  el.imgModal.classList.remove('isHidden');
}

function closeImageModal() {
  el.imgModal?.classList.add('isHidden');
  if (el.imgModalImg) el.imgModalImg.src = '';
}

function setPlaceholderState(kind, detail = '') {
  if (!el.resultImagePlaceholder) return;

  const title = el.resultImagePlaceholder.querySelector('.phTitle');
  const sub = el.resultImagePlaceholder.querySelector('.phSub');

  if (kind === 'loading') {
    if (title) title.textContent = 'イラストを じゅんびしています…';
    if (sub) sub.textContent = 'ちょっと まってね…';
  } else if (kind === 'error') {
    if (title) title.textContent = 'イラストの じゅんびに しっぱいしました…';
    if (sub) sub.textContent = detail || 'つうしんが うまくいかなかったみたい…';
  } else {
    if (title) title.textContent = 'イラストが うまく でませんでした…';
    if (sub) sub.textContent = detail || '「もういちど」で やりなおせます';
  }

  el.resultImagePlaceholder.classList.remove('isHidden');
  el.resultImage?.classList.add('isHidden');
  if (el.resultImage) el.resultImage.src = '';
}

function stopBegLoop() {
  if (state.begTimer) {
    clearTimeout(state.begTimer);
    state.begTimer = null;
  }
}

function startBegLoop() {
  stopBegLoop();
  if (!state.animal || !el.begLine) return;

  const lines = BEG_LINES[state.animal.id] || ['おなかすいた…'];

  const tick = () => {
    if (!state.animal || !el.begLine) return;
    el.begLine.textContent = pick(lines);
    state.begTimer = setTimeout(tick, 2400 + Math.random() * 1600);
  };

  tick();
}

function gotoSelect() {
  state.animal = null;
  state.locked = false;
  stopBegLoop();
  setLoading(false);
  closeImageModal();
  if (el.freeInput) el.freeInput.value = '';
  showScreen('select');
}

function gotoGame(animalId) {
  const animal = ANIMALS.find(item => item.id === animalId);
  if (!animal) return;

  state.animal = animal;
  setImgSafe(el.animalImg, animal.img, animal.name);
  setImgSafe(el.loadingAnimalImg, animal.img, animal.name);
  startBegLoop();
  showScreen('game');
}

function normalizeFood(input) {
  const raw = String(input || '').trim();
  const lower = raw.toLowerCase();

  if (!raw) return { raw: '', category: 'にく' };

  const direct = [
    { words: ['にく', '肉'], category: 'にく' },
    { words: ['くさ', '草'], category: 'くさ' },
    { words: ['たいや', 'タイヤ'], category: 'たいや' },
    { words: ['げきからりょうり', '激辛料理', '激辛'], category: 'げきからりょうり' }
  ];

  for (const item of direct) {
    if (item.words.some(word => word === raw || word.toLowerCase() === lower)) {
      return { raw: item.category, category: item.category };
    }
  }

  if (['たいや', 'タイヤ', 'ホイール', '車輪', 'ゴム', 'くるま', 'バイク'].some(word => lower.includes(word.toLowerCase()))) {
    return { raw, category: 'たいや' };
  }

  if (['げきから', '激辛', '辛', '辛い', '唐辛子', 'ハバネロ', '火鍋', 'カレー', 'わさび'].some(word => lower.includes(word.toLowerCase()))) {
    return { raw, category: 'げきからりょうり' };
  }

  if (['くさ', '草', '笹', '葉', 'はっぱ', '竹', 'たけ', '牧草', 'クローバー'].some(word => lower.includes(word.toLowerCase()))) {
    return { raw, category: 'くさ' };
  }

  return { raw, category: 'にく' };
}

function makeLocalComment(animal, foodInfo) {
  const special = MEGA_DISLIKE[foodInfo.category];

  if (special) {
    return {
      text: `${pick(special.lines[animal.id] || ['やだ…'])}\n${pick(special.extra)}`,
      mood: special.mood,
      ok: false
    };
  }

  const normalLines = {
    lion: ['ふーん。悪くないな。', 'なかなか うまいじゃん！', 'これは けっこう 好きだ。'],
    penguin: ['わーい、いい感じ！', 'もぐもぐ…おいしい！', 'これ、けっこう好き！'],
    capybara: ['のんびり…おいしい…', 'これ、落ちつく味…', 'もぐもぐ…いいかんじ…'],
    panda: ['うん、わるくない。', 'もぐもぐ…好きかも。', 'これは ちょっと うれしい。']
  };

  return {
    text: `${pick(normalLines[animal.id] || ['おいしい。'])}\n「${foodInfo.raw}」を もぐもぐ たべた。`,
    mood: '😋',
    ok: true
  };
}

function buildImagePrompt(animal, foodInfo) {
  const foodVisual = {
    'にく': 'a juicy steak',
    'くさ': 'a bundle of fresh green grass',
    'たいや': 'a rubber tire',
    'げきからりょうり': 'an extremely spicy dish with red chili peppers'
  }[foodInfo.category] || foodInfo.raw;

  const reaction = ['たいや', 'げきからりょうり'].includes(foodInfo.category) ? 'disgusted' : 'delighted';

  return [
    'Square 1:1. kawaii mascot 2D illustration, pastel, soft shading, thick clean outlines, children picture book style.',
    `Animal: ${animal.name} ${animal.emoji}. Medium close-up, centered.`,
    `FOOD MUST MATCH EXACTLY: "${foodInfo.raw}".`,
    `ONLY FOOD: ${foodVisual}. This is the only food in the image.`,
    `Show the food clearly in the animal mouth or paws: ${foodVisual}.`,
    `Reaction: ${reaction}.`,
    'Background: simple pastel studio background. No scenery.',
    'Negative: photorealistic, realistic animal, cinematic lighting, 3D render, landscape, mountains, ocean, extra animals, extra foods, text, logo.'
  ].join('\n');
}

function buildCommentPrompt(animal, foodInfo) {
  return `あなたは「${animal.name}」という動物です。性格は「${animal.personality}」。今「${foodInfo.raw}」を食べました。${animal.first}の口調で、60文字以内で感想を言ってください。`;
}

function extractImageSrc(data) {
  if (!data || typeof data !== 'object') return '';

  const direct = [
    data.imageUrl,
    data.imageURL,
    data.image_url,
    data.image,
    data.outputImageUrl,
    data.output_image_url,
    data.resultImageUrl,
    data.result_image_url
  ].find(Boolean);

  if (direct) return String(direct);

  const base64 = data.imageBase64 || data.base64 || data.image_base64;
  if (base64) {
    const clean = String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    return `data:image/png;base64,${clean}`;
  }

  if (data.data && typeof data.data === 'object') {
    return extractImageSrc(data.data);
  }

  return '';
}

function isBadAiLine(line) {
  return ['AI', '生成しました', '画像', 'プロンプト'].some(word => line.includes(word));
}

function buildPayload(animal, foodInfo, fromQuick) {
  const categorySource = fromQuick ? 'fixed' : 'auto_requested';
  const categoryForGas = fromQuick ? foodInfo.category : '';

  const imagePrompt = buildImagePrompt(animal, foodInfo);
  const commentPrompt = buildCommentPrompt(animal, foodInfo);

  return {
    mode: 'feed',
    gameVersion: VERSION,
    animalId: animal.id,
    animalName: animal.name,
    animalType: animal.name,
    animalPersonality: animal.personality,
    animalFirst: animal.first,
    foodRaw: foodInfo.raw,
    category: categoryForGas,
    categorySource,
    food: foodInfo.raw,
    foodType: categoryForGas,
    imagePrompt,
    commentPrompt,
    prompt: imagePrompt,
    text: commentPrompt,
    wantImage: true,
    nonce: `${Date.now()}-${Math.random()}`
  };
}

async function callGasJsonp(payload, timeoutMs = 120000) {
  const params = new URLSearchParams();
  const callbackName = `__gas_cb_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  if (payload.animalType) params.set('animalType', payload.animalType);
  if (payload.foodRaw && payload.categorySource !== 'fixed') params.set('freeWord', payload.foodRaw);
  if (payload.categorySource === 'fixed' && payload.category) params.set('foodType', payload.category);
  if (payload.imagePrompt) params.set('imagePrompt', payload.imagePrompt.slice(0, 1800));
  if (payload.commentPrompt) params.set('commentPrompt', payload.commentPrompt.slice(0, 600));
  if (payload.gameVersion) params.set('gameVersion', payload.gameVersion);
  params.set('callback', callbackName);

  const url = `${GAS_ENDPOINT}${GAS_ENDPOINT.includes('?') ? '&' : '?'}${params.toString()}`;

  return new Promise((resolve) => {
    let done = false;
    const script = document.createElement('script');

    const cleanup = () => {
      done = true;
      clearTimeout(timer);
      try {
        delete window[callbackName];
      } catch (_error) {
        window[callbackName] = undefined;
      }
      script.remove();
    };

    window[callbackName] = (data) => {
      if (done) return;
      cleanup();
      if (data && typeof data === 'object') {
        data.__trace = { mode: 'jsonp', urlSample: url.slice(0, 800) };
      }
      resolve(data);
    };

    script.onerror = () => {
      if (done) return;
      cleanup();
      resolve({
        success: false,
        error: 'script_load_failed',
        __trace: { mode: 'jsonp', urlSample: url.slice(0, 800) }
      });
    };

    const timer = setTimeout(() => {
      if (done) return;
      cleanup();
      resolve({
        success: false,
        error: 'timeout',
        __trace: { mode: 'jsonp', urlSample: url.slice(0, 800) }
      });
    }, timeoutMs);

    script.src = url;
    script.async = true;
    document.body.appendChild(script);
  });
}

function applyResultBase(animal, foodInfo, localResult) {
  setImgSafe(el.resultAnimalImg, animal.img, animal.name);

  if (el.resultSub) el.resultSub.textContent = `入力：${foodInfo.raw}`;
  if (el.resultEmoji) el.resultEmoji.textContent = localResult.mood;
  if (el.resultMoodBadge) el.resultMoodBadge.textContent = `きぶん：${localResult.mood}`;
  setFoodBadge(foodInfo.category, foodInfo.raw);

  if (el.resultText) el.resultText.textContent = localResult.text;

  setPlaceholderState('loading');
  showScreen('result');
}

async function handleFeed(raw, fromQuick) {
  const input = String(raw || '').trim();

  if (!input) {
    showToast('なにか入力してね', true);
    return;
  }

  if (state.locked || !state.animal) return;
  state.locked = true;

  const animal = state.animal;
  const foodInfo = normalizeFood(input);
  const localResult = makeLocalComment(animal, foodInfo);
  const payload = buildPayload(animal, foodInfo, fromQuick);

  state.lastPayload = payload;
  applyResultBase(animal, foodInfo, localResult);
  await playSfx(localResult.ok ? 'ok' : 'ng');
  setLoading(true);

  const requestId = ++state.reqId;

  try {
    const gasData = await callGasJsonp(payload);
    if (requestId !== state.reqId) return;

    state.lastGasData = gasData;
    state.lastGasTrace = gasData && gasData.__trace ? gasData.__trace : null;

    if (!gasData || gasData.ok === false || gasData.success === false) {
      const error = gasData?.error || 'ng';
      const detail = error === 'script_load_failed'
        ? 'GASがJSONP(callback)未対応の可能性があります'
        : error === 'timeout'
          ? 'タイムアウト：GASの処理に時間がかかっています'
          : `えらー：${error}`;
      setPlaceholderState('error', detail);
      return;
    }

    const line = firstLine(gasData.message || gasData.comment || gasData.text);
    if (line && !isBadAiLine(line) && el.resultText) {
      el.resultText.textContent = line;
    }

    const src = extractImageSrc(gasData);
    if (src && el.resultImage) {
      el.resultImage.src = src;
      el.resultImage.alt = `${animal.name}が${foodInfo.raw}を食べているイラスト`;
      el.resultImage.classList.remove('isHidden');
      el.resultImagePlaceholder?.classList.add('isHidden');
    } else {
      setPlaceholderState('noimg', gasData?.imageError || gasData?.image_error || '画像URLかbase64が返っていません');
    }
  } finally {
    setLoading(false);
    state.locked = false;
  }
}

async function retryImage() {
  if (state.locked || !state.lastPayload) return;

  state.locked = true;
  setLoading(true);
  setPlaceholderState('loading');
  await playSfx('click');

  try {
    const payload = { ...state.lastPayload, nonce: `${Date.now()}-${Math.random()}`, wantImage: true };
    state.lastPayload = payload;

    const gasData = await callGasJsonp(payload);
    state.lastGasData = gasData;
    state.lastGasTrace = gasData && gasData.__trace ? gasData.__trace : null;

    if (!gasData || gasData.ok === false || gasData.success === false) {
      const error = gasData?.error || 'ng';
      setPlaceholderState(
        'error',
        error === 'script_load_failed'
          ? 'GASがJSONP(callback)未対応の可能性があります'
          : `えらー：${error}`
      );
      return;
    }

    const src = extractImageSrc(gasData);
    if (src && el.resultImage) {
      el.resultImage.src = src;
      el.resultImage.classList.remove('isHidden');
      el.resultImagePlaceholder?.classList.add('isHidden');
    } else {
      setPlaceholderState('noimg', gasData?.imageError || gasData?.image_error || '画像URLかbase64が返っていません');
    }
  } finally {
    setLoading(false);
    state.locked = false;
  }
}

async function copyGasResponse() {
  const text = JSON.stringify({
    payload: state.lastPayload,
    trace: state.lastGasTrace,
    data: state.lastGasData
  }, null, 2);

  try {
    await navigator.clipboard.writeText(text);
    showToast('こぴー しました');
  } catch (_error) {
    window.prompt('このテキストを こぴーして おくってね', text);
  }
}

function bind() {
  $$('[data-animal]').forEach((button) => {
    button.addEventListener('click', async () => {
      await playSfx('select');
      gotoGame(button.dataset.animal);
    });
  });

  $$('[data-quick]').forEach((button) => {
    button.addEventListener('click', async () => {
      await playSfx('feed');
      handleFeed(button.dataset.quick, true);
    });
  });

  el.btnSend?.addEventListener('click', async () => {
    await playSfx('feed');
    const value = el.freeInput?.value || '';
    if (el.freeInput) el.freeInput.value = '';
    handleFeed(value, false);
  });

  el.btnBackToSelect?.addEventListener('click', async () => {
    await playSfx('click');
    gotoSelect();
  });

  el.btnResultBack?.addEventListener('click', async () => {
    await playSfx('click');
    gotoSelect();
  });

  el.btnRetryImage?.addEventListener('click', () => {
    retryImage();
  });

  el.btnCopyGas?.addEventListener('click', async () => {
    await playSfx('click');
    copyGasResponse();
  });

  el.toastClose?.addEventListener('click', async () => {
    await playSfx('click');
    el.toast?.classList.remove('show');
  });

  el.resultImage?.addEventListener('click', async () => {
    if (!el.resultImage?.src) return;
    await playSfx('click');
    openImageModal(el.resultImage.src);
  });

  el.resultImage?.addEventListener('error', () => {
    setPlaceholderState('noimg', 'よみこみに しっぱい…');
  });

  el.imgModalClose?.addEventListener('click', async () => {
    await playSfx('click');
    closeImageModal();
  });

  el.imgModalBackdrop?.addEventListener('click', () => {
    closeImageModal();
  });

  el.freeInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      el.btnSend?.click();
    }
  });

  window.addEventListener('error', (event) => console.warn(event.error || event.message));
  window.addEventListener('unhandledrejection', (event) => console.warn(event.reason));

  showScreen('select');
}

bind();
console.info(`[${VERSION}] GAS_ENDPOINT`, GAS_ENDPOINT);