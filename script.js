'use strict';

const VERSION = 'v55-rebuild-fetch';
const GAS_FALLBACK_URL = 'https://script.google.com/a/macros/happy-epo8.com/s/AKfycbxN_lNgpMEsQ1_bCu2uPeMZT_byjb0bId_g9IbBWAecG6hFVWTpuvgzrkLVT0affBXpqA/exec';
const GAS_ENDPOINT = (() => {
  const meta = document.querySelector('meta[name="gas-url"]');
  return meta && meta.content ? meta.content.trim() : GAS_FALLBACK_URL;
})();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const firstLine = (value) => String(value || '').split(/\r?\n/).map((v) => v.trim()).find(Boolean) || '';

const MASCOT_STYLE_BASE = {
  medium: 'single cute 3d mascot asset for a Japanese children app',
  render: 'soft fluffy plush texture, toy-like finish, polished 3d mascot render, kid-friendly lighting',
  composition: 'front-facing, centered, full body visible, one character only, isolated cutout asset style',
  proportions: 'oversized head, compact rounded body, short limbs, simplified silhouette, very readable shape',
  background: 'transparent background look or very plain clean background, no scenery, no extra props, no text, no logo'
};

const ANIMALS = {
  lion: {
    id: 'lion',
    name: 'ライオン',
    emoji: '🦁',
    img: './img/raion.webp',
    first: 'オレ',
    personality: '自信満々でワイルド',
    profile: {
      silhouette: 'golden lion mascot with a very large fluffy curly mane, round head, compact torso, short legs, rounded paws, tail with fluffy tuft',
      pose: 'standing proudly with legs apart and arms crossed in front of the chest',
      face: 'confident smile, bright eyes, cute rounded muzzle, self-assured and friendly expression',
      details: 'small colorful crown on top of the mane, neat plush fur, clean toy-like paws',
      palette: 'warm golden yellow fur, creamy white belly, soft orange shadows'
    }
  },
  penguin: {
    id: 'penguin',
    name: 'ペンギン',
    emoji: '🐧',
    img: './img/pengin.webp',
    first: 'ぼく',
    personality: 'まじめでのんびり',
    profile: {
      silhouette: 'baby penguin mascot with a very round body, oversized head, tiny feet, tiny beak, fluffy wings',
      pose: 'standing front-facing with both wings raised wide in an energetic celebration pose',
      face: 'big sparkling blue eyes, open happy mouth, excited cheerful expression',
      details: 'small glittering silver crown, white face and belly, plush soft surface',
      palette: 'pastel ice blue feathers, clean white belly, yellow beak and feet, soft pink cheeks'
    }
  },
  capybara: {
    id: 'capybara',
    name: 'カピバラ',
    emoji: '🦫',
    img: './img/kapipara.webp',
    first: 'わたし',
    personality: 'おっとりしてやさしい',
    profile: {
      silhouette: 'chubby capybara mascot with a large rounded head, potato-like body, tiny hands, tiny feet, seated front-facing',
      pose: 'sitting calmly with both little hands gathered in front of the chest and feet visible forward',
      face: 'sleepy half-closed eyes, small relaxed smile, front teeth slightly showing, peaceful expression',
      details: 'soft plush fur, small ears, big rounded nose, subtle blush on cheeks',
      palette: 'warm beige fur, cream belly, brown paws and nose'
    }
  },
  panda: {
    id: 'panda',
    name: 'パンダ',
    emoji: '🐼',
    img: './img/panda.webp',
    first: 'ぼく',
    personality: 'マイペースで食いしんぼう',
    profile: {
      silhouette: 'cute panda mascot with an oversized round head, fluffy rounded body, seated front-facing, thick plush arms and legs',
      pose: 'sitting relaxed with legs open forward and arms resting naturally at the sides',
      face: 'sleepy half-closed eyes, tiny tongue sticking out, playful lazy smile',
      details: 'soft pink cheeks, very fluffy fur, round ears, visible paw pads on the feet',
      palette: 'clean white fur, deep black ears and limbs, soft pink blush accents'
    }
  }
};

const QUICK_FOODS = {
  'にく': {
    key: 'meat',
    label: 'にく',
    category: 'にく',
    visual: 'a juicy steak',
    imageStyle: 'thick raw marbled meat slices arranged on a wooden board, isolated object, premium food asset look'
  },
  'くさ': {
    key: 'grass',
    label: 'くさ',
    category: 'くさ',
    visual: 'a bundle of fresh green grass',
    imageStyle: 'fresh green grass and wild herbs piled on a wooden board, isolated object, clean cutout asset look'
  },
  'たいや': {
    key: 'tire',
    label: 'たいや',
    category: 'たいや',
    visual: 'a worn rubber tire on the ground, isolated object, simple cutout asset look'
  },
  'げきからりょうり': {
    key: 'spicy',
    label: 'げきからりょうり',
    category: 'げきからりょうり',
    visual: 'an extremely spicy dish with red chili peppers',
    imageStyle: 'bright red extra spicy dish covered with many chili peppers on a wooden board, isolated object, dramatic food asset look'
  }
};

const REACTIONS = {
  lion: {
    meat: { likeLevel: '大好き', mood: '😍', text: 'うまい！ これはテンションが上がるぜ！' },
    grass: { likeLevel: '嫌い', mood: '😖', text: 'くさはちょっと違うかな…。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'たいやは食べものじゃないぞ！？' },
    spicy: { likeLevel: '嫌い', mood: '🥵', text: 'からすぎる！ でも気合いで食べる…！' },
    free: { likeLevel: '普通', mood: '😐', text: 'どんな味か、まずは食べてみるぞ。' }
  },
  penguin: {
    meat: { likeLevel: '好き', mood: '😊', text: 'おいしいね。もぐもぐ食べちゃう。' },
    grass: { likeLevel: '嫌い', mood: '😕', text: 'くさは、ちょっと食べにくいかな…。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'たいやは食べられないよ…。' },
    spicy: { likeLevel: '嫌い', mood: '🥵', text: 'からくてびっくりした…。' },
    free: { likeLevel: '普通', mood: '🙂', text: 'どきどきするけど、ひとくち食べてみるね。' }
  },
  capybara: {
    grass: { likeLevel: '大好き', mood: '😍', text: 'これは落ち着く味だねぇ。' },
    meat: { likeLevel: '普通', mood: '😐', text: '食べられるけど、いつもの感じではないかな。' },
    tire: { likeLevel: '嫌い', mood: '😖', text: 'かたいよ…。これはえさじゃないかも。' },
    spicy: { likeLevel: '大嫌い', mood: '🤢', text: 'からいのは苦手なんだ…。' },
    free: { likeLevel: '普通', mood: '🙂', text: 'のんびり味見してみるね。' }
  },
  panda: {
    grass: { likeLevel: '好き', mood: '😊', text: 'しゃきしゃきしていい感じ。' },
    meat: { likeLevel: '嫌い', mood: '😖', text: 'ぼくはもっと別のものが食べたいな…。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'たいやはむり！ ぜったいむり！' },
    spicy: { likeLevel: '大嫌い', mood: '🥵', text: 'からい！ みずー！' },
    free: { likeLevel: '普通', mood: '😐', text: 'まずはひとくち、ためしてみるよ。' }
  }
};

const BEG_LINES = {
  lion: ['おなかすいた！', 'がっつり食べたい！', 'うまいものをくれ！'],
  penguin: ['なにをくれるの？', 'おさかな以外も気になる…', 'ひとくち食べたいな'],
  capybara: ['のんびり食べたいな', 'やさしい味だとうれしい', 'もぐもぐしたい気分'],
  panda: ['おいしいものある？', 'おなかぺこぺこだよ', 'いっぱい食べたい！']
};

const LOADING_LINES = [
  '動物が味わっています…',
  'イラストを作っています…',
  'もぐもぐコメントを考えています…',
  'あとちょっとでできそう…'
];

const state = {
  animal: null,
  begTimer: null,
  loadingTimer: null,
  loadingSfxTimer: null,
  audioCtx: null,
  audioReady: false,
  locked: false,
  reqId: 0,
  lastPayload: null,
  lastGasData: null,
  lastGasTrace: null,
  toastTimer: null
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

function ensureAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!state.audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioCtx();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume().catch(() => {});
  }
  state.audioReady = true;
  return state.audioCtx;
}

function playTone(freq, duration, type, gainValue, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playSfx(kind) {
  if (!state.audioReady && kind !== 'unlock') return;

  switch (kind) {
    case 'unlock':
      ensureAudio();
      break;
    case 'select':
      playTone(660, 0.08, 'triangle', 0.05);
      playTone(880, 0.09, 'triangle', 0.04, 0.05);
      break;
    case 'click':
      playTone(520, 0.07, 'square', 0.04);
      break;
    case 'ok':
      playTone(523.25, 0.09, 'triangle', 0.05);
      playTone(659.25, 0.1, 'triangle', 0.045, 0.06);
      playTone(783.99, 0.12, 'triangle', 0.04, 0.12);
      break;
    case 'ng':
      playTone(320, 0.12, 'sawtooth', 0.045);
      playTone(220, 0.16, 'sawtooth', 0.04, 0.07);
      break;
    case 'munch':
      playTone(220, 0.06, 'triangle', 0.022);
      playTone(180, 0.07, 'triangle', 0.02, 0.09);
      playTone(300, 0.04, 'sine', 0.012, 0.18);
      break;
    default:
      break;
  }
}

function startLoadingSfx() {
  if (!state.audioReady) return;
  stopLoadingSfx();
  playSfx('munch');
  state.loadingSfxTimer = window.setInterval(() => {
    playSfx('munch');
  }, 900);
}

function stopLoadingSfx() {
  if (state.loadingSfxTimer) {
    window.clearInterval(state.loadingSfxTimer);
    state.loadingSfxTimer = null;
  }
}

function showScreen(name) {
  [el.screenSelect, el.screenGame, el.screenResult].forEach((screen) => {
    if (!screen) return;
    screen.classList.toggle('isActive', screen.id === `screen${name[0].toUpperCase()}${name.slice(1)}`);
  });
}

function setImage(img, src, alt) {
  if (!img) return;
  img.src = src || '';
  img.alt = alt || '';
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function startBegging(animal) {
  stopBegging();
  const lines = BEG_LINES[animal.id] || ['なにか食べたいな'];
  if (el.begLine) {
    el.begLine.textContent = randomItem(lines);
  }
  state.begTimer = window.setInterval(() => {
    if (el.begLine) {
      el.begLine.textContent = randomItem(lines);
    }
  }, 2200);
}

function stopBegging() {
  if (state.begTimer) {
    window.clearInterval(state.begTimer);
    state.begTimer = null;
  }
}

function setLoading(show) {
  if (!el.loadingOverlay) return;

  el.loadingOverlay.classList.toggle('show', Boolean(show));
  el.loadingOverlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  setImage(el.loadingAnimalImg, state.animal ? state.animal.img : '', state.animal ? state.animal.name : '');

  if (state.loadingTimer) {
    window.clearInterval(state.loadingTimer);
    state.loadingTimer = null;
  }

  stopLoadingSfx();

  if (show && el.loadingLine) {
    el.loadingLine.textContent = randomItem(LOADING_LINES);
    state.loadingTimer = window.setInterval(() => {
      el.loadingLine.textContent = randomItem(LOADING_LINES);
    }, 1600);
    startLoadingSfx();
  }
}

function setPlaceholderState(type, detail) {
  if (!el.resultImagePlaceholder) return;

  const title = el.resultImagePlaceholder.querySelector('.phTitle');
  const sub = el.resultImagePlaceholder.querySelector('.phSub');
  const message = detail || '';

  el.resultImagePlaceholder.classList.remove('isHidden');
  if (el.resultImage) {
    el.resultImage.classList.add('isHidden');
    el.resultImage.removeAttribute('src');
  }

  if (!title || !sub) return;

  if (type === 'loading') {
    title.textContent = 'イラストを じゅんびしています…';
    sub.textContent = 'ちょっと まってね…';
    return;
  }

  if (type === 'error') {
    title.textContent = 'つうしんで エラーが でました';
    sub.innerHTML = `${message || 'つうしんに しっぱいしました'}<br><strong>もういちどをおしてみてね</strong>`;
    return;
  }

  if (type === 'noimg') {
    title.textContent = 'イラストが つくれませんでした';
    sub.innerHTML = `${message || 'れすぽんすを かくにんしてね'}<br><strong>もういちどをおしてみてね</strong>`;
    return;
  }

  title.textContent = 'イラストを じゅんびしています…';
  sub.textContent = 'ちょっと まってね…';
}

function showToast(message, isError) {
  if (!el.toast || !el.toastText) return;

  if (state.toastTimer) {
    window.clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }

  el.toastText.textContent = message;
  el.toast.classList.toggle('isError', Boolean(isError));
  el.toast.classList.add('show');

  state.toastTimer = window.setTimeout(() => {
    el.toast.classList.remove('show');
  }, 2600);
}

function closeToast() {
  if (!el.toast) return;
  el.toast.classList.remove('show');
}

function openImageModal() {
  if (!el.imgModal || !el.imgModalImg || !el.resultImage || el.resultImage.classList.contains('isHidden')) {
    return;
  }
  el.imgModalImg.src = el.resultImage.src;
  el.imgModalImg.alt = el.resultImage.alt || '生成画像';
  el.imgModal.classList.remove('isHidden');
  el.imgModal.setAttribute('aria-hidden', 'false');
}

function closeImageModal() {
  if (!el.imgModal) return;
  el.imgModal.classList.add('isHidden');
  el.imgModal.setAttribute('aria-hidden', 'true');
}

function normalizeFood(input) {
  const raw = String(input || '').trim();
  const normalized = raw.replace(/\s+/g, '').toLowerCase();
  const quick = QUICK_FOODS[normalized] || null;

  if (quick) {
    return {
      raw,
      label: quick.label,
      key: quick.key,
      category: quick.category,
      visual: quick.visual,
      imageStyle: quick.imageStyle || '',
      isFreeWord: false
    };
  }

  return {
    raw,
    label: raw,
    key: 'free',
    category: '',
    visual: raw,
    imageStyle: '',
    isFreeWord: true
  };
}

function getReaction(animal, foodInfo) {
  const table = REACTIONS[animal.id] || {};
  return table[foodInfo.key] || table.free || { likeLevel: '普通', mood: '🙂', text: '食べてみるね。' };
}

function buildImagePrompt(animal, foodInfo, reaction) {
  const subjectFood = foodInfo.isFreeWord ? foodInfo.raw : foodInfo.visual;
  const animalProfile = animal.profile || {};
  const foodStyle = foodInfo.imageStyle || `single food item: ${subjectFood}`;
  const emotionMap = {
    '大好き': 'very happy, sparkling eyes, excited, eager to eat',
    '好き': 'happy, pleased, smiling',
    '普通': 'calm, curious, neutral smile',
    '嫌い': 'reluctant, awkward, slightly troubled face',
    '大嫌い': 'disgusted, recoiling, dramatic grossed-out reaction'
  };
  const emotion = emotionMap[reaction.likeLevel] || 'curious expression';

  return [
    'Square 1:1 composition.',
    `Style base: ${MASCOT_STYLE_BASE.medium}.`,
    `Rendering base: ${MASCOT_STYLE_BASE.render}.`,
    `Composition base: ${MASCOT_STYLE_BASE.composition}.`,
    `Proportion base: ${MASCOT_STYLE_BASE.proportions}.`,
    `Background base: ${MASCOT_STYLE_BASE.background}.`,
    `Animal: ${animal.name} ${animal.emoji}.`,
    `Animal silhouette: ${animalProfile.silhouette || `cute ${animal.name} mascot`}.`,
    `Animal pose: ${animalProfile.pose || 'front-facing mascot pose'}.`,
    `Animal face: ${animalProfile.face || 'cute friendly face'}.`,
    `Animal details: ${animalProfile.details || 'soft plush details'}.`,
    `Animal colors: ${animalProfile.palette || 'soft character colors'}.`,
    `Food design reference: ${foodStyle}.`,
    `Only one food item is shown and it must clearly read as ${subjectFood}.`,
    `The animal is eating or holding ${subjectFood}.`,
    `Expression and mood: ${emotion}.`,
    'Use a clean isolated composition with the same kind of mascot readability as a game asset sheet.',
    'Do not add realism, background scenery, extra accessories, extra food, extra animals, photorealism, or text.'
  ].join(' ');
}

function buildPayload(animal, foodInfo, reaction) {
  const baseImagePrompt = buildImagePrompt(animal, foodInfo, reaction);

  return {
    gameVersion: VERSION,
    animalType: animal.name,
    foodType: foodInfo.isFreeWord ? '' : foodInfo.label,
    freeWord: foodInfo.isFreeWord ? foodInfo.raw : '',
    likeLevel: reaction.likeLevel,
    baseImagePrompt,
    wantImage: true,
    nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`
  };
}

async function callGas(payload, timeoutMs = 45000) {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });

  const url = `${GAS_ENDPOINT}${GAS_ENDPOINT.includes('?') ? '&' : '?'}${params.toString()}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (_error) {
      return {
        success: false,
        error: 'invalid_json',
        errorDetail: text.slice(0, 1000),
        __trace: { mode: 'fetch', status: response.status, urlSample: url.slice(0, 900) }
      };
    }

    if (!data || typeof data !== 'object') {
      data = { success: false, error: 'invalid_payload' };
    }

    data.__trace = { mode: 'fetch', status: response.status, urlSample: url.slice(0, 900) };
    return data;
  } catch (error) {
    return {
      success: false,
      error: error && error.name === 'AbortError' ? 'timeout' : 'fetch_failed',
      errorDetail: error ? String(error) : '',
      __trace: { mode: 'fetch', urlSample: url.slice(0, 900) }
    };
  } finally {
    window.clearTimeout(timer);
  }
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
    data.result_image_url,
    data.generatedImageUrl,
    data.generated_image_url,
    data.imageSrc,
    data.image_src
  ].find(Boolean);

  if (direct) return String(direct);

  const base64 = data.imageBase64 || data.base64 || data.image_base64 || data.generatedImageBase64 || data.generated_image_base64;
  if (base64) {
    const clean = String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    return `data:image/png;base64,${clean}`;
  }

  if (data.data && typeof data.data === 'object') {
    return extractImageSrc(data.data);
  }

  return '';
}

function applyResultBase(animal, foodInfo, reaction) {
  setImage(el.resultAnimalImg, animal.img, animal.name);
  if (el.resultSub) el.resultSub.textContent = `入力：${foodInfo.raw}`;
  if (el.resultEmoji) el.resultEmoji.textContent = reaction.mood;
  if (el.resultFoodBadge) el.resultFoodBadge.textContent = `えさ：${foodInfo.raw}`;
  if (el.resultMoodBadge) el.resultMoodBadge.textContent = `きぶん：${reaction.likeLevel}`;
  if (el.resultText) el.resultText.textContent = reaction.text;
  setPlaceholderState('loading');
  showScreen('result');
}

function applyGasResult(animal, foodInfo, gasData) {
  const line = firstLine(gasData.message || gasData.comment || gasData.text || gasData.reply || gasData.responseText);
  if (line && el.resultText) {
    el.resultText.textContent = line;
  }

  const src = extractImageSrc(gasData);
  if (src && el.resultImage) {
    el.resultImage.src = src;
    el.resultImage.alt = `${animal.name}が${foodInfo.raw}を食べているイラスト`;
    el.resultImage.classList.remove('isHidden');
    if (el.resultImagePlaceholder) {
      el.resultImagePlaceholder.classList.add('isHidden');
    }
  } else {
    setPlaceholderState(
      'noimg',
      gasData.imageError || gasData.image_error || gasData.errorDetail || gasData.error_detail || '画像URLが返ってきませんでした'
    );
  }
}

function gasErrorMessage(gasData) {
  const error = gasData && gasData.error ? gasData.error : 'unknown_error';

  if (error === 'timeout') return 'GASの処理がタイムアウトしました';
  if (error === 'fetch_failed') return 'GASへの接続に失敗しました';
  if (error === 'invalid_json') return 'GASの応答がJSONではありませんでした';
  if (gasData && gasData.errorDetail) return gasData.errorDetail;
  return error;
}

async function handleFeed(raw) {
  const input = String(raw || '').trim();
  if (!input) {
    showToast('えさを入力してね', true);
    return;
  }
  if (state.locked || !state.animal) return;

  state.locked = true;
  playSfx('click');
  setLoading(true);

  const requestId = ++state.reqId;
  const animal = state.animal;
  const foodInfo = normalizeFood(input);
  const reaction = getReaction(animal, foodInfo);
  const payload = buildPayload(animal, foodInfo, reaction);

  state.lastPayload = payload;
  applyResultBase(animal, foodInfo, reaction);
  playSfx(['大好き', '好き'].includes(reaction.likeLevel) ? 'ok' : 'ng');

  try {
    const gasData = await callGas(payload);
    if (requestId !== state.reqId) return;

    state.lastGasData = gasData;
    state.lastGasTrace = gasData && gasData.__trace ? gasData.__trace : null;

    if (!gasData || gasData.success === false || gasData.ok === false) {
      setPlaceholderState('error', gasErrorMessage(gasData));
      return;
    }

    applyGasResult(animal, foodInfo, gasData);
  } finally {
    state.locked = false;
    setLoading(false);
  }
}

async function retryImage() {
  if (state.locked || !state.lastPayload || !state.animal) return;

  state.locked = true;
  playSfx('click');
  setLoading(true);
  setPlaceholderState('loading');

  const payload = {
    ...state.lastPayload,
    nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`
  };

  state.lastPayload = payload;

  try {
    const gasData = await callGas(payload);
    state.lastGasData = gasData;
    state.lastGasTrace = gasData && gasData.__trace ? gasData.__trace : null;

    if (!gasData || gasData.success === false || gasData.ok === false) {
      setPlaceholderState('error', gasErrorMessage(gasData));
      return;
    }

    const src = extractImageSrc(gasData);
    if (src && el.resultImage) {
      el.resultImage.src = src;
      el.resultImage.classList.remove('isHidden');
      if (el.resultImagePlaceholder) {
        el.resultImagePlaceholder.classList.add('isHidden');
      }
    } else {
      setPlaceholderState(
        'noimg',
        gasData.imageError || gasData.image_error || gasData.errorDetail || gasData.error_detail || '画像URLが返ってきませんでした'
      );
    }
  } finally {
    state.locked = false;
    setLoading(false);
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
    showToast('レスポンスをコピーしました');
  } catch (_error) {
    window.prompt('この内容をコピーしてください', text);
  }
}

function goToSelect() {
  state.animal = null;
  stopBegging();
  showScreen('select');
  setLoading(false);
  closeImageModal();
}

function goToGame(animalId) {
  const animal = ANIMALS[animalId];
  if (!animal) return;

  state.animal = animal;
  setImage(el.animalImg, animal.img, animal.name);
  setImage(el.loadingAnimalImg, animal.img, animal.name);
  if (el.freeInput) el.freeInput.value = '';
  startBegging(animal);
  showScreen('game');
  window.setTimeout(() => {
    if (el.freeInput) el.freeInput.focus();
  }, 0);
}

function bind() {
  window.addEventListener('pointerdown', () => {
    playSfx('unlock');
  }, { once: true });

  $$('[data-animal]').forEach((button) => {
    button.addEventListener('click', () => {
      playSfx('select');
      goToGame(button.dataset.animal);
    });
  });

  $$('[data-quick]').forEach((button) => {
    button.addEventListener('click', () => {
      handleFeed(button.dataset.quick || '');
    });
  });

  if (el.btnSend) {
    el.btnSend.addEventListener('click', () => {
      handleFeed(el.freeInput ? el.freeInput.value : '');
    });
  }

  if (el.freeInput) {
    el.freeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleFeed(el.freeInput.value);
      }
    });
  }

  if (el.btnBackToSelect) {
    el.btnBackToSelect.addEventListener('click', () => {
      playSfx('click');
      goToSelect();
    });
  }
  if (el.btnResultBack) {
    el.btnResultBack.addEventListener('click', () => {
      playSfx('click');
      goToSelect();
    });
  }
  if (el.btnRetryImage) el.btnRetryImage.addEventListener('click', retryImage);
  if (el.btnCopyGas) {
    el.btnCopyGas.addEventListener('click', () => {
      playSfx('click');
      copyGasResponse();
    });
  }
  if (el.toastClose) {
    el.toastClose.addEventListener('click', () => {
      playSfx('click');
      closeToast();
    });
  }
  if (el.resultImage) {
    el.resultImage.addEventListener('click', openImageModal);
    el.resultImage.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openImageModal();
      }
    });
  }
  if (el.imgModalBackdrop) {
    el.imgModalBackdrop.addEventListener('click', () => {
      playSfx('click');
      closeImageModal();
    });
  }
  if (el.imgModalClose) {
    el.imgModalClose.addEventListener('click', () => {
      playSfx('click');
      closeImageModal();
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeImageModal();
    }
  });
}

bind();
showScreen('select');
