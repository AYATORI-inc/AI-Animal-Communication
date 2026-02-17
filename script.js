'use strict';

/*
  v14
  - ✅ 性格設定資料.txt の「一人称/語尾/リアクション」を PERSONA に導入
  - ✅ おねだりセリフ（begLines）もキャラ口調に統一
  - ✅ 反応文（generateLocalReaction）を persona ベースに刷新（好みヒントは画面に出さない）
  - ✅ 画像参照は ./img/*.jpg（要望通り）
*/

// ================================
// NGワード（簡易）
// ================================
const NG_WORDS = [
  '死','殺','爆','麻薬','ドラッグ','下ネタ','エロ','セックス','裸','差別','ヘイト','暴力','グロ'
];
function hasNgWord(text){
  const t = (text || '').toLowerCase();
  return NG_WORDS.some(w => t.includes(w.toLowerCase()));
}

// ================================
// 性格（TXTから反映）
// ================================
const PERSONA = {
  lion: {
    label: '王様気質・強がり',
    first: 'オレ',
    begLines: [
      '子分！オレにうまいもん、もってこいだぜ！',
      'お前たち、王さまのごはんの時間だぜ！',
      '腹が鳴ってるぜ…でも余裕だ！…たぶんな！',
      '肉でも魚でも、ドーンとこいだぜ！',
      'ふむ…献上品はまだか？楽しみだぜ！',
      'オレの胃袋はでっかいぞ！さぁ、いくぜ！',
    ],
    react: {
      like: [
        'うまいぜ！',
        'よし！最高だぜ！',
        'さすが子分、気がきくな！',
        '王の口に合う！よい！',
      ],
      dislike: [
        '余裕だ！…が、これはちがうな！',
        'むむ…王はなんでも食える…たぶん！',
        'こ、これは訓練だぜ！へっちゃら…！',
        'オレは平気だ…でも次はうまいの頼むぜ！',
      ],
      unknown: [
        'ふむ…これは何だ？まあ、試してやるぜ！',
        'おもしろい献上品だな！食べてみるぜ！',
        'よし、王がチェックしてやるぜ！',
      ],
    },
  },

  penguin: {
    label: '陽気・ちょっぴり心配性',
    first: 'ボク',
    begLines: [
      'わーい！ボク、おなかペコペコだよ！',
      'ねぇねぇ！なにくれるの？たのしみっ！',
      'おさかなだと、うれしいなっ！',
      'ボク、がんばって食べるよっ！',
      'えっと…びっくりするのは、ちょっとこわいです…っ',
      'はやくはやく〜！ドキドキだよ！',
    ],
    react: {
      like: [
        'ありがとー！うまっ！',
        'やったよー！最高だよっ！',
        'うれしいっ！もぐもぐ〜！',
        'えへへ！大好きだよ！',
      ],
      dislike: [
        'だ、大丈夫です…！たぶん…！',
        'えっと…これ、ボクには強いかも…っ',
        'うぅ…がんばります…！',
        'あの…すみません…ちょっとだけ…こわいです…！',
      ],
      unknown: [
        'これは…なに味だろ？ドキドキ…！',
        'よーし！ためしてみるっ！',
        'うーん…でもワクワクするよっ！',
      ],
    },
  },

  capybara: {
    label: '穏やか・平和主義',
    first: 'ぼく',
    begLines: [
      'のんびり…ごはん…たべたいなぁ…',
      'ぼく、ひなたで…もぐもぐしたい…',
      'おなか…すいたよぉ…ゆっくりでいいよぉ…',
      'おふろのあとに…おやつ…いいねぇ…',
      'なにかなぁ…まぁ、たのしみだねぇ…',
      'ぼく…うれしいと…すぐ眠くなるよぉ…',
    ],
    react: {
      like: [
        'うんうん、ありがと〜',
        'いいねぇ…しあわせだねぇ…',
        'ほわぁ…おいしいよぉ…',
        'やさしい味だねぇ…',
      ],
      dislike: [
        'ん〜…まぁ、いっかぁ…',
        'これは…ちょっとびっくりだねぇ…',
        'うーん…きょうはこういう日だねぇ…',
        'ふむぅ…まぁ、のんびりいこっかぁ…',
      ],
      unknown: [
        'ふむぅ…よくわかんないけど…もぐもぐ…',
        'のんびり、ためしてみるねぇ…',
        'まぁ…一口だけ…ねぇ…',
      ],
    },
  },

  panda: {
    label: '天然・シュール',
    first: 'パンダ',
    begLines: [
      'パンダ…おなか…すいた…',
      'えっと…ごはん…ある…？',
      'パンダ、もぐもぐしたい…',
      '竹…じゃなくても…いい日…',
      'これは…食べるやつ…？（わくわく）',
      'パンダ、しあわせ補給したい…',
    ],
    react: {
      like: [
        '美味しい〜！幸せ…',
        'もぐもぐ…じわじわ来る…',
        'パンダ、これ好き。',
        'ふしぎ…でも好き…',
      ],
      dislike: [
        'え、これ…食べるやつ？',
        'パンダ、ちょっと迷う…',
        'これは…竹じゃない…',
        'うーん…食べ方がわからない…',
      ],
      unknown: [
        'ふしぎ…でも気になる…',
        'パンダ、ためしてみる。',
        'これ…新ジャンル…？',
      ],
    },
  },
};

// ================================
// 動物データ（好き嫌いは内部ロジック用）
// ================================
const ANIMALS = [
  { id: 'lion',    name: 'ライオン',   img: './img/raion.jpg',    emoji: '🦁', likes: ['肉'],        dislikes: ['草'] },
  { id: 'penguin', name: 'ペンギン',   img: './img/pengin.jpg',   emoji: '🐧', likes: ['魚'],        dislikes: ['肉'] },
  { id: 'capybara',name: 'カピバラ',   img: './img/kapipara.jpg', emoji: '🦫', likes: ['草','野菜'], dislikes: ['肉'] },
  { id: 'panda',   name: 'パンダ',     img: './img/panda.jpg',    emoji: '🐼', likes: ['草'],        dislikes: ['魚'] },
];

// persona を反映（UIとおねだりに使う）
ANIMALS.forEach(a => {
  const p = PERSONA[a.id];
  a.personality = p?.label || '—';
  a.begLines = (p?.begLines || []).slice();
});

const QUICK_OPTIONS = ['肉','魚','草','野菜'];

// ================================
// DOM
// ================================
const el = {
  // screens
  screenSelect: document.getElementById('screenSelect'),
  screenGame: document.getElementById('screenGame'),
  screenResult: document.getElementById('screenResult'),

  // select
  pickButtons: Array.from(document.querySelectorAll('[data-animal]')),

  // game
  animalArtBox: document.getElementById('animalArtBox'),
  animalImg: document.getElementById('animalImg'),
  animalName: document.getElementById('animalName'),
  animalTag: document.getElementById('animalTag'),
  begLine: document.getElementById('begLine'),
  freeInput: document.getElementById('freeInput'),
  btnSend: document.getElementById('btnSend'),
  btnBackToSelect: document.getElementById('btnBackToSelect'),
  chatLog: document.getElementById('chatLog'),

  // result
  resultSub: document.getElementById('resultSub'),
  resultAnimalImg: document.getElementById('resultAnimalImg'),
  resultArt: document.getElementById('resultArt'),
  resultText: document.getElementById('resultText'),
  btnResultNext: document.getElementById('btnResultNext'),

  // overlay / toast
  toast: document.getElementById('toast'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingLine: document.getElementById('loadingLine'),
  loadingAnimalImg: document.getElementById('loadingAnimalImg'),
};

// ================================
// State
// ================================
const state = {
  animal: null,
  locked: true,
  sfxEnabled: true,

  begTimeout: null,
  currentBeg: '',
};

// ================================
// Utils
// ================================
function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}
function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

// ================================
// 効果音（Web Audio API）
// ================================
const sfx = { ctx: null, munchTimer: null };

function ensureAudio(){
  if(sfx.ctx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return;
  sfx.ctx = new AudioContext();
}
async function resumeAudio(){
  if(!sfx.ctx) return;
  if(sfx.ctx.state === 'suspended'){
    try{ await sfx.ctx.resume(); }catch(_e){}
  }
}
function playTone(freq, ms, type='sine', gain=0.08){
  if(!sfx.ctx || !state.sfxEnabled) return;
  const t0 = sfx.ctx.currentTime;
  const osc = sfx.ctx.createOscillator();
  const g = sfx.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms/1000);

  osc.connect(g);
  g.connect(sfx.ctx.destination);
  osc.start(t0);
  osc.stop(t0 + ms/1000 + 0.02);
}
function sfxClick(){ playTone(660, 70, 'square', 0.05); }
function sfxMunchOnce(){
  playTone(220 + randInt(-25, 25), 90, 'triangle', 0.06);
  playTone(440 + randInt(-35, 35), 50, 'sine', 0.03);
}
function sfxResult(){
  // 成功/失敗で同じ（1種類）
  const seq = [523, 659];
  seq.forEach((f, i) => setTimeout(() => playTone(f, 110, 'sine', 0.07), i * 120));
}
function startMunchLoop(){
  stopMunchLoop();
  if(!state.sfxEnabled) return;
  sfx.munchTimer = window.setInterval(() => sfxMunchOnce(), 320);
}
function stopMunchLoop(){
  if(sfx.munchTimer){
    window.clearInterval(sfx.munchTimer);
    sfx.munchTimer = null;
  }
}

// ================================
// 画面切り替え
// ================================
function showScreen(name){
  const map = { select: el.screenSelect, game: el.screenGame, result: el.screenResult };
  Object.values(map).forEach(node => node?.classList.remove('isActive'));
  map[name]?.classList.add('isActive');
}

// ================================
// 表示
// ================================
function setImgSafe(imgEl, src, alt, fallbackEmoji='🐾'){
  if(!imgEl) return;
  imgEl.alt = alt || '';
  imgEl.onerror = () => {
    const parent = imgEl.parentElement;
    if(parent){
      parent.innerHTML = `<div style="font-size:48px;line-height:1">${fallbackEmoji}</div>`;
    }
  };
  imgEl.src = src;
}

function renderAnimal(){
  const a = state.animal;
  if(!a) return;

  setImgSafe(el.animalImg, a.img, a.name, a.emoji);
  setImgSafe(el.resultAnimalImg, a.img, a.name, a.emoji);
  setImgSafe(el.loadingAnimalImg, a.img, a.name, a.emoji);

  el.animalName.textContent = a.name;
  el.animalTag.textContent = a.personality || '—';
}

function showToast(text){
  if(!el.toast) return;
  el.toast.textContent = text;
  el.toast.classList.add('show');
  window.setTimeout(() => el.toast.classList.remove('show'), 1500);
}

function setLoading(on, line){
  if(!el.loadingOverlay) return;
  el.loadingLine.textContent = line || '動物が味わっています…';
  el.loadingOverlay.classList.toggle('show', !!on);
  el.loadingOverlay.setAttribute('aria-hidden', on ? 'false' : 'true');
  if(on) startMunchLoop();
  else stopMunchLoop();
}

// ================================
// チャット
// ================================
function makeAvatarNode(avatar){
  const av = document.createElement('div');
  av.className = 'avatar';

  if(typeof avatar === 'string'){
    av.textContent = avatar;
    return av;
  }
  if(avatar && avatar.type === 'img'){
    const img = document.createElement('img');
    img.alt = avatar.alt || '';
    img.src = avatar.src || '';
    img.onerror = () => { av.textContent = avatar.fallback || '🐾'; };
    av.appendChild(img);
    return av;
  }
  av.textContent = '🐾';
  return av;
}

function addChatMessage({ who, avatar, text }){
  const row = document.createElement('div');
  row.className = `msg ${who === 'me' ? 'me' : 'npc'}`;

  const av = makeAvatarNode(avatar);
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  row.appendChild(av);
  row.appendChild(bubble);
  el.chatLog.appendChild(row);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
}

// ================================
// おねだりループ（時間経過で変化）
// ================================
function setBegLine(line){
  state.currentBeg = line || '';
  if(el.begLine) el.begLine.textContent = state.currentBeg || '…';
}

function stopBegLoop(){
  if(state.begTimeout){
    window.clearTimeout(state.begTimeout);
    state.begTimeout = null;
  }
}

function startBegLoop(){
  stopBegLoop();
  const a = state.animal;
  if(!a || !a.begLines || a.begLines.length === 0) return;

  const tick = () => {
    if(!state.animal) return;
    const next = pick(a.begLines);
    setBegLine(next);
    state.begTimeout = window.setTimeout(tick, randInt(2600, 4200));
  };
  state.begTimeout = window.setTimeout(tick, randInt(2200, 3600));
}

// ================================
// ゲームロジック
// ================================
function findAnimal(id){
  return ANIMALS.find(a => a.id === id) || null;
}

function gotoSelect(){
  setLoading(false);
  state.locked = true;
  state.animal = null;
  stopBegLoop();
  if(el.chatLog) el.chatLog.innerHTML = '';
  showScreen('select');
}

function startGameWithAnimal(animalId){
  const a = findAnimal(animalId);
  if(!a) return;

  state.animal = a;
  state.locked = false;

  el.chatLog.innerHTML = '';
  el.freeInput.value = '';

  renderAnimal();
  showScreen('game');

  setBegLine(pick(a.begLines));
  startBegLoop();

  const avatar = { type:'img', src: a.img, alt: a.name, fallback: a.emoji };
  addChatMessage({ who:'npc', avatar, text: `【${a.name}】をえらんだ！` });
  addChatMessage({ who:'npc', avatar, text: state.currentBeg });
}

function classifyItem(input){
  const raw = (input || '').trim();
  if(!raw) return { raw: '', category: '不明', vibe: 'ふつう' };

  if(QUICK_OPTIONS.includes(raw)){
    return { raw, category: raw, vibe: 'ふつう' };
  }

  const t = raw.toLowerCase();
  const catRules = [
    { category:'肉', keys:['肉','ハンバーグ','ステーキ','チキン','からあげ','ソーセージ','ベーコン','焼肉'] },
    { category:'魚', keys:['魚','さかな','サーモン','まぐろ','ツナ','いわし','さしみ','寿司','すし'] },
    { category:'草', keys:['草','笹','葉','はっぱ','牧草','芝','しば'] },
    { category:'野菜', keys:['野菜','にんじん','キャベツ','トマト','きゅうり','ブロッコリー','かぼちゃ','サラダ'] },
  ];

  let category = '不明';
  for(const r of catRules){
    if(r.keys.some(k => t.includes(k))){ category = r.category; break; }
  }

  let vibe = 'ふつう';
  if(['魔法','まほう','きらきら','伝説','でんせつ','レア','神','ドラゴン'].some(k=>t.includes(k))) vibe = 'ファンタジー';
  if(['激辛','げきから','超辛','唐辛子','とうがらし','わさび'].some(k=>t.includes(k))) vibe = 'スパイシー';
  if(['特大','でっかい','巨大','メガ','山盛り'].some(k=>t.includes(k))) vibe = 'ボリューム';
  if(['手作り','てづくり','お母さん','おばあちゃん','家庭','ほっと'].some(k=>t.includes(k))) vibe = 'ほっこり';

  return { raw, category, vibe };
}

function scoreFeeding(animal, itemInfo){
  let score = 50 + Math.floor(Math.random()*21) - 10;

  if(animal.likes.includes(itemInfo.category)) score += 25;
  if(animal.dislikes.includes(itemInfo.category)) score -= 25;

  if(itemInfo.vibe === 'ほっこり') score += 6;
  if(itemInfo.vibe === 'ファンタジー') score += 4;
  if(itemInfo.vibe === 'スパイシー') score -= 4;
  if(itemInfo.vibe === 'ボリューム') score += 3;

  score = clamp(score, 0, 100);

  let outcome = 'びみょう';
  if(score >= 80) outcome = 'だいせいこう';
  else if(score >= 60) outcome = 'せいこう';
  else if(score < 35) outcome = 'しっぱい';

  const artByOutcome = {
    'だいせいこう': ['🤩','🎉','✨','😆'],
    'せいこう': ['😊','😋','👍','🍀'],
    'びみょう': ['😐','🤔','😅','🫥'],
    'しっぱい': ['😖','🤢','💦','😵'],
  };

  return { score, outcome, art: pick(artByOutcome[outcome]) };
}

function pickPersonaLine(animal, itemInfo, outcome){
  const p = PERSONA[animal.id];
  if(!p) return '…';

  const category = itemInfo.category;
  const likes = animal.likes.includes(category);
  const dislikes = animal.dislikes.includes(category);

  let bucket = 'unknown';
  if(outcome === 'だいせいこう' || outcome === 'せいこう'){
    bucket = dislikes ? 'unknown' : 'like';
  }else if(outcome === 'しっぱい'){
    bucket = likes ? 'unknown' : 'dislike';
  }else{
    bucket = likes ? 'like' : (dislikes ? 'dislike' : 'unknown');
  }

  return pick(p.react[bucket] || p.react.unknown);
}

function generateLocalReaction(animal, itemInfo, judged){
  const { outcome, score } = judged;
  const item = itemInfo.raw;

  const personaLine = pickPersonaLine(animal, itemInfo, outcome);

  const bodyTemplates = {
    'だいせいこう': [
      `「${item}」に大満足！目がキラキラしてる！`,
      `もぐもぐ…！テンションMAX！大よろこび！`,
    ],
    'せいこう': [
      `「${item}」をもぐもぐ…いい感じだよ。`,
      `ほどよく満腹。にこにこしてる。`,
    ],
    'びみょう': [
      `「${item}」を一口…ふしぎな顔。`,
      `悪くはないけど、ちょっと首をかしげてる。`,
    ],
    'しっぱい': [
      `「${item}」を見た瞬間、ちょっと固まった…！`,
      `食べるより…別の使い方を思いついたみたい。`,
    ],
  };

  const extra =
    (itemInfo.vibe === 'ファンタジー') ? '（なにか不思議なオーラが漂っている…）' :
    (itemInfo.vibe === 'ほっこり') ? '（やさしい匂いがする…）' :
    (itemInfo.vibe === 'スパイシー') ? '（鼻がツーン！）' : '';

  const line = `${personaLine}\n${pick(bodyTemplates[outcome])}${extra ? `\n${extra}` : ''}`.trim();

  const commentator = pick([
    `実況：満足度は ${score}/100！`,
    `実況：この反応…満足度 ${score}/100！`,
    `実況：評価は ${score}/100 でした！`,
  ]);

  return { text: line, commentary: commentator };
}

function buildResultText(_animal, itemInfo, judged){
  const base = {
    'だいせいこう': '超大成功！まんぞくそう！',
    'せいこう': '成功！いい感じに食べた！',
    'びみょう': 'うーん…ちょっと微妙。',
    'しっぱい': '失敗…好みじゃなかったみたい。',
  }[judged.outcome];

  return `${base}\n\n入力：${itemInfo.raw}\n分類：${itemInfo.category} / 雰囲気：${itemInfo.vibe}`.trim();
}

function showResultPage({ animal, itemInfo, judged, reaction }){
  el.resultSub.textContent = `入力：${itemInfo.raw}（分類：${itemInfo.category} / 雰囲気：${itemInfo.vibe}）`;

  setImgSafe(el.resultAnimalImg, animal.img, animal.name, animal.emoji);
  el.resultArt.textContent = judged.art;

  const summary = buildResultText(animal, itemInfo, judged);
  el.resultText.textContent = `${summary}\n\n${reaction.text}\n\n${reaction.commentary}`.trim();

  stopBegLoop();
  showScreen('result');
}

async function handleFeed(rawInput){
  const input = (rawInput || '').trim();
  if(!input){
    showToast('なにか入力してね');
    el.freeInput.focus();
    return;
  }
  if(state.locked){
    showToast('いまは操作できないよ');
    return;
  }
  if(!state.animal){
    showToast('先に動物をえらんでね');
    gotoSelect();
    return;
  }

  ensureAudio();
  await resumeAudio();

  if(hasNgWord(input)){
    sfxClick();
    showToast('その言葉はつかえないよ（安全のため）');
    addChatMessage({ who:'npc', avatar:'🛡️', text: '安全のため、その内容は受け取れませんでした。ちがう言葉で試してね。' });
    return;
  }

  sfxClick();

  const a = state.animal;
  const itemInfo = classifyItem(input);

  addChatMessage({ who:'me', avatar:'🙂', text: `「${itemInfo.raw}」をあげる` });

  setLoading(true, pick([
    '動物がくんくんにおいをかいでいる…',
    'もぐもぐ…味をたしかめ中…',
    'しばらく観察している…'
  ]));

  await sleep(randInt(900, 1600));

  const judged = scoreFeeding(a, itemInfo);
  const reaction = generateLocalReaction(a, itemInfo, judged);

  setLoading(false);
  sfxResult();

  const avatar = { type:'img', src: a.img, alt: a.name, fallback: a.emoji };
  addChatMessage({ who:'npc', avatar, text: reaction.text });
  addChatMessage({ who:'npc', avatar:'🎙️', text: reaction.commentary });

  showResultPage({ animal: a, itemInfo, judged, reaction });
  state.locked = true;
}

// ================================
// Events
// ================================
function wireEvents(){
  el.pickButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      ensureAudio();
      await resumeAudio();
      sfxClick();
      startGameWithAnimal(btn.getAttribute('data-animal'));
    });
  });

  el.btnBackToSelect.addEventListener('click', async () => {
    ensureAudio();
    await resumeAudio();
    sfxClick();
    gotoSelect();
  });

  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleFeed(btn.getAttribute('data-quick'));
    });
  });

  el.btnSend.addEventListener('click', async () => {
    const v = el.freeInput.value;
    el.freeInput.value = '';
    await handleFeed(v);
  });

  el.freeInput.addEventListener('keydown', async (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      const v = el.freeInput.value;
      el.freeInput.value = '';
      await handleFeed(v);
    }
  });

  el.btnResultNext.addEventListener('click', async () => {
    ensureAudio();
    await resumeAudio();
    sfxClick();
    gotoSelect();
  });
}

(function init(){
  wireEvents();
  gotoSelect();
})();
