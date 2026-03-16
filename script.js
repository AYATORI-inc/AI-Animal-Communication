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
  common: [
    'Square 1:1 composition.',
    'Cute stylized 3D mascot character for a Japanese children app.',
    'Clearly a high-quality 3D mascot character, not a flat illustration.',
    'Soft furry volume.',
    'Clear character silhouette.',
    'Polished game asset render.',
    'A single animal, only one subject, centrally positioned.',
    'Full body visible.',
    'One character only.',
    'Please limit the number of animals in the image to one.',
    '1 animal only, no duplicate character, no extra face, no second pose.',
    'No preview, mini view, thumbnail preview, or 3-view required.',
    'Do not mix preview sheet style, three-view style, or mini-view formats.',
    'Please refrain from using left-right comparison compositions.',
    'Multiple angles such as three-dimensional views are not required.',
    'Multiple reactions are not required.',
    'No thumbnails or color palettes are needed when generating images.',
    'Very large head.',
    'Compact rounded body.',
    'Short limbs.',
    'A dynamic, lively, fun illustration is allowed as long as the animal remains clear and readable.',
    'No text.',
    'No logo.',
    'No tray.',
    'No plate.',
    'No wooden board.',
    'No pedestal.',
    'No panel.',
    'No character sheet.',
    'No reference sheet.',
    'No multiple views.',
    'No color palette.',
    'No grid.',
    'Visible fluffy fur volume and a soft furry outline.',
    'Not a smooth doll-like surface.',
    'Strong mascot readability.',
    'Do not make the animal smooth, plastic, glossy, photorealistic, or doll-like.'
  ],
  priorities: [
    'Animal silhouette.',
    'Animal pose.',
    'Animal face.',
    'Animal personality reflected in pose and facial expression.',
    'Animal details.',
    'Animal colors.'
  ]
};

const FOOD_STYLE_BASE = [
  'Prioritize recognizability of the food item.',
  'The food must not overshadow the animal.',
  'Basically no base, plate, dish, tray, or wooden board.',
  'Only one food item.',
  'Easy to see from the front.',
  'Slightly stylized 3D representation that matches the animal world.',
  '3D mascot-like food representation that matches the animal.'
];

const ZOO_BACKGROUND_BASE = [
  'Use the same common zoo background for all animals.',
  'The background must clearly look like a cheerful zoo environment, not a blank or plain studio background.',
  'Show a bright playful zoo setting with soft blue sky, green grass, a few trees, a simple fence in the distance, and a clean dirt path.',
  'The zoo background must be visibly present behind the animal.',
  'Do not use a plain white background, plain gradient background, empty background, or backgroundless composition.',
  'Keep the background child-friendly, soft, colorful, and non-distracting so the animal remains the clear main subject.'
];

const ANIMALS = {
  lion: {
    id: 'lion',
    name: 'ライオン',
    speciesEn: 'lion',
    emoji: '🦁',
    img: './img/raion.webp',
    first: 'オレ',
    personality: '自信満々でワイルド、王者らしい',
    personalityEn: 'confident, wild, regal',
    profile: {
      silhouette: 'Golden lion 3D mascot. Clearly a stylized 3D mascot character with visible three-dimensional depth. Huge messy curly mane made of thick yarn-like curls. Face clearly separated from the mane.',
      pose: 'Standing proudly in a dimensional 3D pose with visible body depth. Arms crossed.',
      face: 'Confident noble smile. Bright eyes.',
      details: 'Small colorful crown on the mane. Clearly white belly. Plush-like furry volume, but still clearly a polished 3D mascot character. The mane, face, body, and limbs must show clear depth and rounded volume. Not flat, not orthographic, not sheet-like, not a front elevation drawing.',
      palette: 'Golden yellow fur with white belly.'
    }
  },
  penguin: {
    id: 'penguin',
    name: 'ペンギン',
    speciesEn: 'penguin',
    emoji: '🐧',
    img: './img/pengin.webp',
    first: 'ぼく',
    personality: 'まじめでのんびり、でも明るい',
    personalityEn: 'serious, laid-back, cheerful',
    profile: {
      silhouette: 'Round baby penguin mascot. Very large head. Tiny feet.',
      pose: 'Standing in a lively playful pose. Both wings raised wide.',
      face: 'Very large blue eyes. Open happy beak.',
      details: 'Small silver crown.',
      palette: 'Pastel blue and white body. Yellow beak and feet.'
    }
  },
  capybara: {
    id: 'capybara',
    name: 'カピバラ',
    speciesEn: 'capybara',
    emoji: '🦫',
    img: './img/kapipara.webp',
    first: 'わたし',
    personality: 'やさしくて穏やか',
    personalityEn: 'gentle, kind, calm',
    profile: {
      silhouette: 'Chubby capybara mascot. Large rounded head. Potato-like body. Single character only.',
      pose: 'Sitting in a gentle playful pose. Tiny hands near the chest. Single character only. No multiple views.',
      face: 'Usually sleepy half-closed eyes. Eyes open when surprised. Visible front teeth. Peaceful smile.',
      details: 'Big rounded nose.',
      palette: 'Warm beige fur with cream belly.'
    }
  },
  panda: {
    id: 'panda',
    name: 'パンダ',
    speciesEn: 'panda',
    emoji: '🐼',
    img: './img/panda.webp',
    first: 'ぼく',
    personality: 'マイペースで食べるのが大好き',
    personalityEn: 'goes at his own pace, loves to eat',
    profile: {
      silhouette: 'Cute panda 3D mascot. Clearly a stylized 3D mascot character. Oversized round head. Rounded seated body.',
      pose: 'Sitting in a relaxed playful pose. Legs open forward.',
      face: 'Sleepy half-closed eyes. Tiny tongue sticking out.',
      details: 'Soft pink cheeks. Fluffy rounded fur volume, but still clearly a polished 3D mascot character.',
      palette: 'Black and white fur.'
    }
  }
};

const QUICK_FOODS = {
  'にく': {
    key: 'meat',
    label: 'にく',
    category: 'にく',
    visual: 'a juicy steak',
    imageStyle: 'single clearly visible juicy steak, thick and meaty, red flesh and white fat clearly visible, easy-to-read silhouette, slightly stylized 3D mascot-like food, not grass, not leaves, not vegetables'
  },
  'くさ': {
    key: 'grass',
    label: 'くさ',
    category: 'くさ',
    visual: 'a bundle of fresh green grass',
    imageStyle: 'single clearly visible bundle of long fresh green grass blades, clearly visible green leafy mass, easy-to-read silhouette, slightly stylized 3D mascot-like food, not meat, not steak, not red flesh'
  },
  'たいや': {
    key: 'tire',
    label: 'たいや',
    category: 'たいや',
    visual: 'a worn rubber tire',
    imageStyle: 'recognizable single tire, round silhouette, slightly worn but easy to identify, slightly stylized 3D mascot-like object'
  },
  'げきからりょうり': {
    key: 'spicy',
    label: 'げきからりょうり',
    category: 'げきからりょうり',
    visual: 'an extremely spicy dish with red chili peppers',
    imageStyle: 'recognizable extra spicy dish, very red, chili peppers clearly visible, spicy look at first glance, slightly stylized 3D mascot-like food'
  }
};

const REACTIONS = {
  lion: {
    meat: { likeLevel: '大好き', mood: '😍', text: '見事だ。王者であるオレが口にしても、十分に満足できる味だ。' },
    grass: { likeLevel: '嫌い', mood: '😖', text: 'オレには似合わない。王者が求める一皿とは言いがたい。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'これは論外だ。オレの前に出すなら、食べものとしての品格を備えてこい。' },
    spicy: { likeLevel: '嫌い', mood: '🥵', text: '勢いは認める。だが、味わうには刺激が強すぎる。' },
    free: { likeLevel: '普通', mood: '😐', text: '悪くはない。まずは静かに味を見極めよう。' }
  },
  penguin: {
    meat: { likeLevel: '好き', mood: '😊', text: 'まじめに味見したけど、これはけっこう好きかも。' },
    grass: { likeLevel: '嫌い', mood: '😕', text: 'ちゃんと食べてみたけど、くさは少しのんびりしすぎる味だね。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'これはさすがに食べものじゃないよ。ぼくでもそれはわかるよ。' },
    spicy: { likeLevel: '嫌い', mood: '🥵', text: 'からくてびっくりしたけど、なんだかちょっと笑っちゃうね。' },
    free: { likeLevel: '普通', mood: '🙂', text: 'よし、落ち着いてひとくち。どんな味かたしかめてみるね。' }
  },
  capybara: {
    grass: { likeLevel: '大好き', mood: '😍', text: 'やさしい味でほっとするね。これはとても好きだな。' },
    meat: { likeLevel: '普通', mood: '😐', text: '食べられるけれど、ぼくにはもう少し穏やかな味が合うかな。' },
    tire: { likeLevel: '嫌い', mood: '😖', text: 'かたくてびっくりしたよ。これは食べないほうがよさそうだね。' },
    spicy: { likeLevel: '大嫌い', mood: '🤢', text: 'からいのは苦手なんだ。落ち着いて食べられる味がいいな。' },
    free: { likeLevel: '普通', mood: '🙂', text: 'やさしく味わってみるね。どんな味でも落ち着いてたしかめるよ。' }
  },
  panda: {
    grass: { likeLevel: '好き', mood: '😊', text: 'おいしいけど、ぼくは笹の方がうれしいな。' },
    meat: { likeLevel: '嫌い', mood: '😖', text: 'ぼくは食べるのが大好きだけど、これはあんまり進まないな。' },
    tire: { likeLevel: '大嫌い', mood: '🤢', text: 'それはさすがに食べものじゃないよ。食いしんぼうのぼくでも無理だ。' },
    spicy: { likeLevel: '大嫌い', mood: '🥵', text: 'からいとたくさん食べられない。ぼくはおいしく山ほど食べたいんだ。' },
    free: { likeLevel: '普通', mood: '😐', text: 'まずはひとくち。でも、おいしかったらもっと食べたい。' }
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
  const isGrassDislikeCase = foodInfo.key === 'grass' && (animal.id === 'lion' || animal.id === 'penguin');
  const foodSpecificRules = {
    meat: [
      'The selected food must look clearly like meat.',
      'Show one clearly visible steak with red flesh and white fat.',
      'Do not generate grass, leaves, salad, vegetables, or plants instead of the meat.'
    ],
    grass: [
      'The selected food must look clearly like grass.',
      'Show one clearly visible bundle of long green grass blades.',
      'Do not generate meat, steak, bones, or red flesh instead of the grass.'
    ],
    tire: [
      'The selected object must clearly look like one tire.',
      'Do not replace the tire with food.'
    ],
    spicy: [
      'The selected food must clearly look like an extra spicy dish.',
      'Red chili peppers must be clearly visible.'
    ]
  };
  const emotionMap = {
    '大好き': 'very happy, sparkling eyes, excited, eager to eat',
    '好き': 'happy, pleased, smiling',
    '普通': 'calm, curious, neutral smile',
    '嫌い': 'reluctant, awkward, slightly troubled face',
    '大嫌い': 'disgusted, recoiling, dramatic grossed-out reaction'
  };
  const emotion = emotionMap[reaction.likeLevel] || 'curious expression';
  const lines = [
    'Create one image only.',
    `The animal must be a ${animal.speciesEn || animal.id}.`,
    `This is definitely a ${animal.speciesEn || animal.id}, not any other animal.`,
    ...ZOO_BACKGROUND_BASE,
    ...FOOD_STYLE_BASE,
    `The selected food item is ${subjectFood}.`,
    `The food must clearly and visibly appear as ${subjectFood}.`,
    `The image must include exactly one clearly recognizable food item: ${subjectFood}.`,
    `The animal is eating or holding ${subjectFood}.`,
    ...(foodSpecificRules[foodInfo.key] || []),
    ...(isGrassDislikeCase ? [
      `Even if unusual for a ${animal.speciesEn || animal.id}, the ${animal.speciesEn || animal.id} must clearly be shown actually eating the grass.`,
      'The grass must be visibly in the mouth or held right in front of the mouth while being eaten.',
      'Do not replace the grass with any other food.',
      'The reaction must clearly look like dislike, reluctance, or discomfort while still eating the grass.'
    ] : []),
    `Food design reference: ${foodStyle}.`,
    animalProfile.silhouette || `Cute ${animal.speciesEn || animal.id} mascot.`,
    animalProfile.pose || 'Dynamic mascot pose.',
    animalProfile.face || 'Cute friendly face.',
    animalProfile.details || 'Visible fluffy fur volume.',
    animalProfile.palette || 'Soft character colors.',
    `Animal personality: ${animal.personalityEn || animal.personality}.`,
    'The pose and facial expression should clearly reflect the personality.',
    ...MASCOT_STYLE_BASE.common,
    `This image must show exactly one ${animal.speciesEn || animal.id}.`,
    'No duplicate character. No extra face. No second pose. No other animal.',
    'Only one food item is shown.',
    `Do not omit or hide the selected food item: ${subjectFood}.`,
    `Emotion: ${emotion}.`
  ];

  return lines.join(' ');
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

function sanitizeAnimalComment(animal, line) {
  const text = String(line || '').trim();
  if (!text) return '';

  if (animal && animal.id === 'lion') {
    return text
      .replace(/だ(?:にゃー|ニャー|にゃあ|ニャア|にゃん|ニャン|にゃ|ニャ)([。！!？?〜～…」』]*)$/u, 'だ$1')
      .replace(/(?:にゃー|ニャー|にゃあ|ニャア|にゃん|ニャン|にゃ|ニャ)([。！!？?〜～…」』]*)$/u, '$1')
      .trim();
  }

  if (animal && animal.id === 'penguin') {
    return text.replace(/めちゃくちゃ/g, 'とっても').trim();
  }

  return text;
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
  const keepLocalReactionComment = foodInfo && foodInfo.key === 'grass' && (animal.id === 'lion' || animal.id === 'penguin' || animal.id === 'panda');
  const sanitizedLine = keepLocalReactionComment ? '' : sanitizeAnimalComment(animal, line);
  if (sanitizedLine && el.resultText) {
    el.resultText.textContent = sanitizedLine;
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
