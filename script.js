'use strict';

/**
 * v13（安定修正版）
 * - 対象UI: v10系（index.html に screenSelect/screenGame/screenResult がある前提）
 * - 結果画面が「背景だけ」になる事故を防ぐため、画面切替を class + style.display の両方で強制
 * - 効果音（WebAudio）を復活（クリック/選択/えさ/結果）
 * - GASは結果画面表示後に非同期で実行し、失敗/タイムアウトでもゲームは止まらない
 */

const GAS_URL = 'https://script.google.com/a/macros/happy-epo8.com/s/AKfycbzNsriAaYZoBL9JTyqlbiWc9oSUcU4Cj3-lZS6sG6i0Lm28QHImhCsLdFA4i37WKujvkg/exec'; // 変更するならここ

// --------------------
// DOM helpers
// --------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '');
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function firstLine(msg) {
  if (!msg) return '';
  return String(msg).split(/\r?\n/).map(s => s.trim()).find(Boolean) || '';
}

// --------------------
// Elements (v10 UI)
// --------------------
const el = {
  screenSelect: $('#screenSelect'),
  screenGame: $('#screenGame'),
  screenResult: $('#screenResult'),

  animalImg: $('#animalImg'),
  begLine: $('#begLine'),
  freeInput: $('#freeInput'),
  btnSend: $('#btnSend'),

  resultAnimalImg: $('#resultAnimalImg'),
  resultEmoji: $('#resultEmoji'),
  resultSub: $('#resultSub'),
  resultText: $('#resultText'),
  resultImageWrap: $('#resultImageWrap'),
  resultImage: $('#resultImage'),
  resultFoodBadge: $('#resultFoodBadge'),
  resultMoodBadge: $('#resultMoodBadge'),
  btnResultBack: $('#btnResultBack'),

  toast: $('#toast'),
  toastText: $('#toastText'),
  toastClose: $('#toastClose'),

  loadingOverlay: $('#loadingOverlay'),
  loadingLine: $('#loadingLine'),
  loadingAnimalImg: $('#loadingAnimalImg'),

  imgModal: $('#imgModal'),
  imgModalBackdrop: $('#imgModalBackdrop'),
  imgModalClose: $('#imgModalClose'),
  imgModalImg: $('#imgModalImg'),
};

// 必須要素チェック（欠けてても落とさない）
(function sanity() {
  const must = ['screenSelect','screenGame','screenResult','btnSend','btnResultBack'];
  const missing = must.filter(k => !el[k]);
  if (missing.length) {
    console.warn('Missing DOM:', missing);
    showToast('UI読み込みエラー：更新してね', true);
  }
})();

// --------------------
// Data
// --------------------
const ANIMALS = [
  { id:'lion',     name:'ライオン',  emoji:'🦁', img:'./img/raion.webp',    first:'オレ' },
  { id:'penguin',  name:'ペンギン',  emoji:'🐧', img:'./img/pengin.webp',   first:'ぼく' },
  { id:'capybara', name:'カピバラ',  emoji:'🦫', img:'./img/kapipara.webp', first:'わたし' },
  { id:'panda',    name:'パンダ',    emoji:'🐼', img:'./img/panda.webp',    first:'ぼく' },
];

const FOOD_TYPES = ['肉','草','タイヤ','激辛料理'];

const BEG_LINES = {
  lion:     ['腹が減ったぜ…', 'なにかくれよ！', 'うまいの頼む！'],
  penguin:  ['おなかすいた〜', 'なんかある？', 'もぐもぐしたい！'],
  capybara: ['のんびり…食べたい…', 'なにか…ちょうだい…', 'おなか…すいた…'],
  panda:    ['たけ…ほしい…', 'もぐもぐ…したい…', 'なにか…ある？'],
};

// タイヤ/激辛：全動物共通で「大嫌い」、ただしカテゴリ別リアクション
const MEGA_DISLIKE = {
  'タイヤ': {
    base: {
      lion:     ['それ食べものじゃねぇ！','ゴム臭っ！ムリだ！','歯が折れるって！'],
      penguin:  ['それ、食べものじゃないよ〜！','くちばし痛い…！','ゴムはやだ…'],
      capybara: ['ごむ…むり…','かたい…やめる…','におい…だめ…'],
      panda:    ['たけじゃない…だめ…','ころころ…いらない…','むり…ゴム…'],
    },
    body: [
      '口元に近づけたら、すぐ目をそらした…。',
      '見た瞬間、距離をとった…！',
      'かじりかけて…ぷいっ！と転がした。',
    ],
    extra: '（ゴムの匂い…！）',
    mood: '😡',
    emoji: '🛞',
  },
  '激辛料理': {
    base: {
      lion:     ['か、辛っ！舌が燃える！','口の中が火事だ！','これ…戦いか！？'],
      penguin:  ['からいっ！水〜！','くちがヒリヒリ…！','あつい…むり…'],
      capybara: ['からい…むり…','ひりひり…やめる…','むせる…'],
      panda:    ['うぅ…辛い…','たけ…たけ…（求）','しびれる…やめる…'],
    },
    body: [
      '一口で目がうるうる…！',
      'からすぎて…しばらくフリーズした…！',
      '舌がヒリヒリ！バタバタしている！',
    ],
    extra: '（舌がヒリヒリ…！）',
    mood: '😡',
    emoji: '🌶️',
  },
};

const NEUTRAL_LINES = {
  lion:     ['ふーん。','…普通だな。','まあ、食べられる。'],
  penguin:  ['ふつう。','うん。','まあまあ。'],
  capybara: ['ふつう…','まあ…','悪くない…'],
  panda:    ['ふつう。','うん。','まあまあ。'],
};

// --------------------
// State
// --------------------
const state = {
  animal: null,
  locked: false,
  begTimer: null,
  reqId: 0,
  lastFood: '',
};

// --------------------
// Screen control (class + inline style)
// --------------------
function showScreen(name) {
  const map = {
    select: el.screenSelect,
    game: el.screenGame,
    result: el.screenResult,
  };
  Object.entries(map).forEach(([k, node]) => {
    if (!node) return;
    const on = (k === name);
    node.classList.toggle('isActive', on);
    // CSSだけに依存せず、確実に表示/非表示
    node.style.display = on ? 'grid' : 'none';
  });
}

function setImgSafe(imgEl, src, alt) {
  if (!imgEl) return;
  imgEl.src = src || '';
  imgEl.alt = alt || '';
}

// --------------------
// Toast
// --------------------
let toastTimer = null;
function showToast(msg, isError=false) {
  if (!el.toast || !el.toastText) {
    if (isError) console.warn(msg);
    return;
  }
  if (toastTimer) clearTimeout(toastTimer);
  el.toast.classList.toggle('isError', !!isError);
  el.toastText.textContent = msg;
  el.toast.classList.add('show');
  // エラーは手動で閉じられるように少し長め
  toastTimer = setTimeout(() => {
    if (!isError) hideToast();
  }, isError ? 5000 : 1600);
}
function hideToast() {
  if (!el.toast) return;
  el.toast.classList.remove('show');
}

// --------------------
// Loading overlay
// --------------------
function setLoading(on, line) {
  if (!el.loadingOverlay) return;
  el.loadingOverlay.classList.toggle('show', !!on);
  if (el.loadingLine) el.loadingLine.textContent = line || 'イラスト生成中…';
}

// --------------------
// Image modal (uses isHidden only)
// --------------------
function openImageModal(src) {
  if (!src || !el.imgModal || !el.imgModalImg) return;
  el.imgModalImg.src = src;
  el.imgModal.classList.remove('isHidden');
}
function closeImageModal() {
  if (!el.imgModal) return;
  el.imgModal.classList.add('isHidden');
  if (el.imgModalImg) el.imgModalImg.removeAttribute('src');
}

// --------------------
// Audio (WebAudio SFX)
// --------------------
let audioCtx = null;
let audioUnlocked = false;

function ensureAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
}

async function unlockAudio() {
  ensureAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch(_e){}
  }
  audioUnlocked = (audioCtx.state === 'running');
}

function playTone(freq=440, dur=0.08, gain=0.05, type='sine') {
  if (!audioUnlocked || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function sfxClick() { playTone(520, 0.06, 0.04, 'square'); }
function sfxSelect() {
  playTone(440, 0.06, 0.035, 'sine');
  setTimeout(()=>playTone(660, 0.07, 0.035, 'sine'), 60);
}
function sfxFeed() {
  playTone(240, 0.05, 0.03, 'triangle');
  setTimeout(()=>playTone(180, 0.06, 0.03, 'triangle'), 70);
}
function sfxResult(ok=true) {
  if (ok) {
    playTone(660, 0.07, 0.04, 'sine');
    setTimeout(()=>playTone(880, 0.09, 0.04, 'sine'), 80);
  } else {
    playTone(220, 0.10, 0.05, 'sawtooth');
  }
}

// --------------------
// Food classification
// --------------------
function classifyFood(input) {
  const raw = (input || '').trim();
  if (!raw) return { raw:'', category:'肉' };
  if (FOOD_TYPES.includes(raw)) return { raw, category: raw };

  const t = raw.toLowerCase();
  if (['タイヤ','ホイール','車輪','くるま','バイク','ゴム'].some(k=>t.includes(k))) return { raw, category:'タイヤ' };
  if (['激辛','辛','辛い','唐辛子','チリ','ハバネロ','麻婆','担々','火鍋','カレー','わさび','ペヤング'].some(k=>t.includes(k))) return { raw, category:'激辛料理' };
  if (['草','笹','葉','はっぱ','牧草','芝','しば','竹','たけ','クローバー'].some(k=>t.includes(k))) return { raw, category:'草' };
  // それ以外は肉扱い（仮）
  return { raw, category:'肉' };
}

function judgeScore(category) {
  let base = 60;
  if (category === '草') base = 55;
  if (category === 'タイヤ') base = 10;
  if (category === '激辛料理') base = 20;
  const score = clamp(base + (Math.floor(Math.random()*21)-10), 0, 100);

  let outcome = 'せいこう';
  if (score >= 80) outcome = 'だいせいこう';
  else if (score >= 55) outcome = 'せいこう';
  else if (score >= 35) outcome = 'びみょう';
  else outcome = 'しっぱい';

  if (category === 'タイヤ') outcome = 'しっぱい';
  if (category === '激辛料理' && outcome === 'だいせいこう') outcome = 'びみょう';

  const art = (outcome === 'だいせいこう' || outcome === 'せいこう') ? '😄'
            : (outcome === 'びみょう') ? '😐' : '😡';
  return { score, outcome, art };
}

function makeLocalText(animal, foodInfo, judged) {
  const aId = animal.id;
  const cat = foodInfo.category;

  if (cat === 'タイヤ' || cat === '激辛料理') {
    const meta = MEGA_DISLIKE[cat];
    const base = pick((meta.base || {})[aId] || ['やだ…']);
    const body = pick(meta.body || [`「${foodInfo.raw}」は苦手…`]);
    const text = `${base}\n${body}\n${meta.extra}`.trim();
    return { text, mood: meta.mood, foodEmoji: meta.emoji, ok:false };
  }

  // 肉/草は暫定 neutral（好みは後で相談）
  const base = pick(NEUTRAL_LINES[aId] || ['ふつう。']);
  const body = pick([
    `「${foodInfo.raw}」をもぐもぐ。`,
    `「${foodInfo.raw}」を一口。`,
    `「${foodInfo.raw}」を食べた。`,
  ]);
  const foodEmoji = (cat === '肉') ? '🍖' : '🌿';
  const ok = (judged.outcome === 'だいせいこう' || judged.outcome === 'せいこう');
  return { text: `${base}\n${body}`.trim(), mood: judged.art, foodEmoji, ok };
}

function foodVisual(foodInfo) {
  if (foodInfo.category === '肉') return { ja:'ステーキ', en:'a steak' };
  if (foodInfo.category === '草') return { ja:'青い草の束', en:'a bundle of fresh green grass' };
  if (foodInfo.category === 'タイヤ') return { ja:'ゴムのタイヤ', en:'a rubber tire' };
  if (foodInfo.category === '激辛料理') return { ja:'激辛料理（唐辛子たっぷり）', en:'an extremely spicy dish with red chili peppers' };
  return { ja: foodInfo.raw, en: foodInfo.raw };
}

// --------------------
// GAS call (never throws outward)
// --------------------
async function callGas(payload, timeoutMs=30000) {
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try {
    const form = new URLSearchParams();
    form.set('payload', JSON.stringify(payload));
    // 互換で平坦なキーも入れる
    if (payload.imagePrompt) form.set('imagePrompt', payload.imagePrompt);
    if (payload.commentPrompt) form.set('commentPrompt', payload.commentPrompt);
    if (payload.animalName) form.set('animalName', payload.animalName);
    if (payload.food) form.set('food', payload.food);
    if (payload.category) form.set('category', payload.category);

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form.toString(),
      signal: controller.signal,
    });

    const txt = await res.text();
    if (!res.ok) return { ok:false, error:`HTTP ${res.status}`, raw: txt };
    try {
      const data = JSON.parse(txt);
      return (data && typeof data === 'object') ? data : { ok:true, message: String(txt) };
    } catch(_e) {
      return { ok:true, message: String(txt) };
    }
  } catch(e) {
    if (e && e.name === 'AbortError') return { ok:false, error:'timeout' };
    return { ok:false, error: (e && e.message) ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

function extractImageSrc(data) {
  if (!data) return '';
  if (data.image_b64) {
    const mime = data.image_mime || 'image/png';
    return `data:${mime};base64,${data.image_b64}`;
  }
  if (data.imageUrl) return String(data.imageUrl);
  if (data.image_url) return String(data.image_url);
  if (data.url) return String(data.url);
  return '';
}

function isBadAiLine(line) {
  const s = String(line || '').trim();
  if (!s) return true;
  if (s.length < 2 || s.length > 70) return true;
  const ng = ['プロンプト','prompt','###','```','function','const ','return ','{','}','http://','https://'];
  if (ng.some(k => s.toLowerCase().includes(k.toLowerCase()))) return true;
  if (!/[ぁ-んァ-ヶ一-龯]/.test(s)) return true;
  return false;
}

// --------------------
// Beg loop
// --------------------
function stopBegLoop() {
  if (state.begTimer) {
    clearTimeout(state.begTimer);
    state.begTimer = null;
  }
}
function startBegLoop() {
  stopBegLoop();
  const a = state.animal;
  if (!a || !el.begLine) return;
  const lines = BEG_LINES[a.id] || [];
  if (!lines.length) return;

  const tick = () => {
    if (!state.animal) return;
    el.begLine.textContent = pick(lines);
    state.begTimer = setTimeout(tick, 2400 + Math.floor(Math.random()*2000));
  };
  state.begTimer = setTimeout(tick, 350);
}

// --------------------
// Navigation
// --------------------
function gotoSelect() {
  state.locked = false;
  state.animal = null;
  stopBegLoop();
  hideToast();
  setLoading(false);
  closeImageModal();
  if (el.freeInput) el.freeInput.value = '';
  showScreen('select');
}

function gotoGame(animalId) {
  const a = ANIMALS.find(x => x.id === animalId);
  if (!a) return;
  state.animal = a;
  state.locked = false;

  setImgSafe(el.animalImg, a.img, a.name);
  setImgSafe(el.loadingAnimalImg, a.img, a.name);
  if (el.begLine) el.begLine.textContent = '…';

  showScreen('game');
  startBegLoop();
}

// --------------------
// Main feed
// --------------------
async function handleFeed(raw) {
  const input = (raw || '').trim();
  if (!input) {
    showToast('なにか入力してね', true);
    return;
  }
  if (state.locked) return;
  if (!state.animal) {
    gotoSelect();
    return;
  }

  state.locked = true;
  state.lastFood = input;

  const a = state.animal;
  const foodInfo = classifyFood(input);
  const judged = judgeScore(foodInfo.category);
  const local = makeLocalText(a, foodInfo, judged);

  // まず結果画面（ローカル）を必ず描画
  try {
    setImgSafe(el.resultAnimalImg, a.img, a.name);
    if (el.resultSub) el.resultSub.textContent = `入力：${foodInfo.raw}`;
    if (el.resultEmoji) el.resultEmoji.textContent = local.mood || judged.art;
    if (el.resultFoodBadge) el.resultFoodBadge.textContent = `えさ：${local.foodEmoji} ${foodInfo.raw}`;
    if (el.resultMoodBadge) el.resultMoodBadge.textContent = `きぶん：${local.mood || judged.art}`;
    if (el.resultText) el.resultText.textContent = local.text;
    if (el.resultImageWrap) el.resultImageWrap.classList.add('isHidden');
    if (el.resultImage) {
      el.resultImage.removeAttribute('src');
      el.resultImage.alt = '';
    }
  } catch(e) {
    console.warn(e);
  }

  showScreen('result');
  sfxResult(local.ok);

  // ここからGAS（後追い）
  const myReq = ++state.reqId;
  setLoading(true, 'AIがイラストを作っています…');

  try {
    const fv = foodVisual(foodInfo);
    const moodWord =
      (foodInfo.category === 'タイヤ' || foodInfo.category === '激辛料理') ? 'イヤそう'
      : (judged.outcome === 'しっぱい') ? 'イヤそう'
      : (judged.outcome === 'びみょう') ? 'ちょっと微妙そう'
      : 'うれしそう';

    const imagePrompt = [
      'Square 1:1, cute flat illustration, game art.',
      `Animal: ${a.name} ${a.emoji}. Medium close-up, centered.`,
      `MUST show the food clearly: ${fv.en} ("${foodInfo.raw}") large in the foreground, in the animal\'s mouth or paws.`,
      `Reaction: ${moodWord}. Exaggerated facial expression.`,
      'Background: plain solid color. No wide landscape. No scenery.',
      'No text, no logo, no extra animals. Do NOT omit the food.'
    ].join('\n');

    const commentPrompt =
      `あなたは${a.name}。一人称は「${a.first}」。必ず一人称で話す。\n` +
      `「${foodInfo.raw}」を食べた直後の感想を、日本語で1文だけ（18〜32文字）。\n` +
      `第三者視点・説明・英語・コード・プロンプトの話は禁止。`;

    const payload = {
      mode: 'feed',
      animalId: a.id,
      animalName: a.name,
      food: foodInfo.raw,
      category: foodInfo.category,
      imagePrompt,
      commentPrompt,
      wantImage: true,
    };

    const gasData = await callGas(payload, 30000);
    if (myReq !== state.reqId) return;

    if (!gasData || gasData.ok === false) {
      // タイムアウト等：ローカルのまま
      if (gasData && gasData.error === 'timeout') {
        showToast('AIが混み合っています（ローカル表示）', false);
      }
      return;
    }

    // コメント上書き（1行だけ）
    const line = firstLine(gasData.message);
    if (line && !isBadAiLine(line) && el.resultText) {
      // 大嫌いカテゴリでポジティブは採用しない
      if (foodInfo.category === 'タイヤ' || foodInfo.category === '激辛料理') {
        const pos = ['うまい','おいしい','最高','すき','大好き','やった'];
        if (!pos.some(k => line.includes(k))) {
          el.resultText.textContent = line;
        }
      } else {
        el.resultText.textContent = line;
      }
    }

    // 画像
    const src = extractImageSrc(gasData);
    if (src && el.resultImageWrap && el.resultImage) {
      el.resultImage.src = src;
      el.resultImage.alt = `${a.name}が${foodInfo.raw}を食べているイラスト`;
      el.resultImageWrap.classList.remove('isHidden');
    }
  } catch(e) {
    console.warn(e);
    // 失敗は静かに（ローカル継続）
  } finally {
    setLoading(false);
    state.locked = false;
  }
}

// --------------------
// Bind
// --------------------
function safeRun(fn) {
  return async (...args) => {
    try {
      await unlockAudio(); // ユーザー操作で必ず解除を試す
      await fn(...args);
    } catch (e) {
      console.warn(e);
      showToast(`エラー: ${e && e.message ? e.message : e}`, true);
      state.locked = false;
      setLoading(false);
    }
  };
}

function bind() {
  // 初期表示
  showScreen('select');

  // 動物選択（divでもclickは発火）
  $$('[data-animal]').forEach(node => {
    node.addEventListener('click', safeRun(() => {
      sfxSelect();
      const id = node.getAttribute('data-animal');
      gotoGame(id);
    }));
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        node.click();
      }
    });
  });

  // クイックえさ
  $$('[data-quick]').forEach(btn => {
    btn.addEventListener('click', safeRun(() => {
      sfxFeed();
      return handleFeed(btn.getAttribute('data-quick'));
    }));
  });

  // 自由入力送信
  el.btnSend?.addEventListener('click', safeRun(() => {
    sfxFeed();
    const v = el.freeInput?.value || '';
    if (el.freeInput) el.freeInput.value = '';
    return handleFeed(v);
  }));

  el.freeInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      el.btnSend?.click();
    }
  });

  // 戻る
  el.btnResultBack?.addEventListener('click', safeRun(() => {
    sfxClick();
    gotoSelect();
  }));

  // トースト閉じる
  el.toastClose?.addEventListener('click', () => {
    sfxClick();
    hideToast();
  });

  // 画像拡大
  el.resultImage?.addEventListener('click', () => {
    if (el.resultImage?.src) {
      sfxClick();
      openImageModal(el.resultImage.src);
    }
  });
  el.imgModalClose?.addEventListener('click', () => {
    sfxClick();
    closeImageModal();
  });
  el.imgModalBackdrop?.addEventListener('click', () => {
    closeImageModal();
  });

  // どこかクリックでオーディオ解除（1回でOK）
  window.addEventListener('pointerdown', () => {
    unlockAudio();
  }, { once:true });
}

bind();
