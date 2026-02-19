'use strict';

/*
  v19
  - 背景画像：./img/background.jpg
  - トップ：動物選択（横並び）
  - 好き嫌いヒントは表示しない（内部で判定のみ）
  - おねだりセリフ：時間経過でローテ（各20個）＋連続同一回避
  - 待機演出：動物アイコン上下に揺れる（もぐもぐ）
  - 結果：別ページ（result screen）
  - 効果音：クリック / もぐもぐ / 結果（成功・失敗で同じ1種類）
  - 注意文：※ 危ない言葉はブロックされます。
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
// 性格（txtの意図を反映）
// ================================
const PERSONA = {
  lion: {
    name: 'ライオン',
    label: '王様気質・強がり',
    first: 'オレ',
    toneRules: {
      bravadoRate: 0.75,
      bravadoAdds: ['…でも余裕だぜ！', 'へっ、問題ないぜ！', 'たぶんな！', 'オレならいけるぜ！']
    },
    begLines: [
      '子分！オレにうまいもん、もってこいだぜ！',
      '王さまのごはんの時間だぜ！',
      'お前たち、献上品はまだか？楽しみだぜ！',
      '腹が鳴ってるぜ…でも余裕だ！…たぶんな！',
      '肉でも魚でも、ドーンとこいだぜ！',
      'オレの胃袋はでっかいぞ！',
      'よし、さっさと始めるぜ！',
      '今日のオレは機嫌がいい。ごちそうでな！',
      'オレに新しい味を見せてみろよ！',
      'ん？それ、強そうなにおいがするぜ…！',
      '子分、期待してるぜ！',
      '王がチェックしてやるぜ！',
      'ふむ…ワイルドにいこうぜ！',
      'さぁ来い！オレは準備できてるぜ！',
      'オレの勝ちパターンは「うまいもの」だぜ！',
      'お腹が空くと…オレ、もっと王さまになるぜ！',
      'すぐ食べる。王さまは待てないぜ！',
      'お前のセンス、見せてみろ！',
      'オレのドキドキ？そんなの…ない！…たぶん！',
      'よし、いただく準備はできてるぜ！'
    ],
    react: {
      like: [
        'うまいぜ！さすが子分、わかってるな！',
        '最高だぜ！王さまにふさわしい！',
        'よし！これは勝ち確だぜ！',
        'ふふん、オレの口に合う！'
      ],
      dislike: [
        '…こ、これは…変わってるな！',
        'むむ…王は何でも食える…はずだぜ！',
        '子分、チャレンジ精神は認めるぜ！',
        'オレは平気だ…たぶん！'
      ],
      unknown: [
        'なんだそれ！？でも面白そうだぜ！',
        'オレに新しい世界を見せる気だな！',
        'よし…試してみるぜ！',
        'ふむ…とりあえず噛んでみるぜ！'
      ]
    }
  },

  penguin: {
    name: 'ペンギン',
    label: '陽気・ちょっぴり心配性',
    first: 'ボク',
    toneRules: {
      politeRate: 0.65,
      politeLike: ['ありがとうございます！', 'うれしいです！'],
      politeScared: ['だ、大丈夫です…！', 'す、すみません…ちょっとだけ…', 'こ、こわいです…！']
    },
    begLines: [
      'わーい！ボク、おなかペコペコだよ！',
      'ねぇねぇ！なにくれるの？たのしみっ！',
      'はやくはやく〜！ドキドキだよ！',
      'おさかなだと、うれしいなっ！',
      'ボク、がんばって食べるよっ！',
      'えっと…びっくりするのは、ちょっとこわいです…っ',
      'わくわく！うれしい予感がするっ！',
      'ボクのこと、びっくりさせないでね…っ！',
      'ねぇ、いいにおいしてる？してる？',
      'もぐもぐの練習しておくねっ！',
      'やさしい味だとうれしいな…！',
      'あっ！それ、ボク知ってるかも！',
      'ふむふむ…まずは匂いチェックだよっ！',
      'よーし！準備OKだよっ！',
      'ちょっとだけ…小さいのからだと安心かも…！',
      'ボク、食べたらジャンプできるかもっ！',
      'うれしいとね、羽がパタパタしちゃうんだ！',
      'えへへ、きょうのごはんは何かなっ！',
      'あの…変なのは…ゆっくりでお願いします…！',
      'よし！いただきますっ！'
    ],
    react: {
      like: [
        'ありがとー！うまっ！サイコーだよ！',
        'わぁ〜！これ大好きっ！うれしい〜！',
        'パクパク…止まらないよっ！',
        'やったぁ！うれしいっ！'
      ],
      dislike: [
        'うぅ…ちょっとドキドキする…でもがんばるっ！',
        'えっ…こ、これ…むずかしいかも…！',
        'あわわ…びっくりした…！',
        'うーん…ちょっとだけ苦手かも…！'
      ],
      unknown: [
        'なにそれ！？おもしろそうっ！',
        'ボクの知らないごはんだ！わくわくっ！',
        'よーし！チャレンジしてみるよっ！',
        'これは…新しい発見かもっ！'
      ]
    }
  },

  capybara: {
    name: 'カピバラ',
    label: 'おっとり・マイペース',
    first: 'ぼく',
    toneRules: {
      maaRate: 0.70,
      maaAdds: ['まぁ、いっかぁ…', 'のんびりいこっかぁ…', 'そういう日もあるねぇ…']
    },
    begLines: [
      'のんびり…ごはん…たべたいなぁ…',
      'ぼく、ひなたで…もぐもぐしたい…',
      'おなか…すいたよぉ…ゆっくりでいいよぉ…',
      'おふろのあとに…おやつ…いいねぇ…',
      'なにかなぁ…まぁ、たのしみだねぇ…',
      'ぼく…うれしいと…すぐ眠くなるよぉ…',
      'いい匂いだと…しあわせだねぇ…',
      'もぐもぐ…ゆっくり味わうよぉ…',
      'ぼく、まってるよぉ…',
      'きょうは…どんな気分かなぁ…',
      'やさしいのが…すきだよぉ…',
      'ひなたぼっこしながら…食べたいなぁ…',
      'お茶でも飲みながら…どう…？',
      'ふわぁ…ごはん…ください…',
      'ぼくのペースで…もぐもぐするねぇ…',
      'あわてないよぉ…ゆっくりで大丈夫…',
      'おいしいと…ほっぺがゆるむよぉ…',
      'のんびり食べると…もっとおいしいねぇ…',
      'すこしだけ…味見してみたいなぁ…',
      'いただくねぇ…ありがとう…'
    ],
    react: {
      like: [
        'うんうん…ありがと〜…おいしいねぇ…',
        'ゆっくり味わうよぉ…しあわせだねぇ…',
        'これは…好きだよぉ…もぐもぐ…',
        'やさしい味だねぇ…'
      ],
      dislike: [
        'ん〜…ちょっと不思議だねぇ…',
        'ぼくには…新しい味…だよぉ…',
        'むりはしないよぉ…でも、ありがとうねぇ…',
        'ふむぅ…びっくりしたねぇ…'
      ],
      unknown: [
        'へぇ…そんなのあるんだねぇ…',
        'ゆっくり…ためしてみるよぉ…',
        'おもしろいねぇ…ありがと〜…',
        '一口だけ…ねぇ…'
      ]
    }
  },

  panda: {
    name: 'パンダ',
    label: '天然・シュール',
    first: 'パンダ',
    toneRules: {
      questionRate: 0.70,
      questionLines: [
        'え、これ…食べるやつ？',
        'これは…ごはん…？',
        'パンダのルールだと…どうかな…？',
        '食べ方が…わからない…'
      ]
    },
    begLines: [
      'パンダ…おなか…すいた…',
      'えっと…ごはん…ある…？',
      'パンダ、もぐもぐしたい…',
      '竹…じゃなくても…いい日…',
      'これは…食べるやつ…？（わくわく）',
      'パンダ、しあわせ補給したい…',
      '…きょうは、何味…？',
      'パンダ、ゆっくり食べたい…',
      '…まってる。たぶん。',
      'それ…新ジャンル…？',
      '…いいにおい、する？',
      'パンダ、試してみたい…',
      '…静かに、もぐもぐする。',
      '…おなかの気分が、そう言ってる。',
      'パンダの心：おやつ…ください…',
      '…それ、食べたらどうなる…？',
      '（じーっ）…それ、気になる…',
      '…もぐもぐの前に…観察する。',
      '竹じゃないけど…まあ…いいかも…',
      '…いただく。たぶん。'
    ],
    react: {
      like: [
        '美味しい〜！幸せ…',
        '…しみる。これ、すき。',
        'パンダ、いま、いい気分…',
        'もぐもぐ…じわじわ来る…'
      ],
      dislike: [
        'うーん…パンダのルールだと…ちょっと違う…',
        '…今日は、見学でいい…？',
        '…それ、竹じゃない…',
        'パンダ、ちょっと迷う…'
      ],
      unknown: [
        'へぇ…それ、なに…？食べる…？',
        'パンダ、初めて見た…',
        '…試してみる。たぶん。',
        '…気になる。とても。'
      ]
    }
  }
};

// ================================
// 動物データ（好き嫌いは内部用・画面には出さない）
// ================================
const ANIMALS = [
  { id:'lion',    name:'ライオン',   img:'./img/raion.webp',    emoji:'🦁', likes:['肉'],        dislikes:['草'] },
  { id:'penguin', name:'ペンギン',   img:'./img/pengin.webp',   emoji:'🐧', likes:['魚'],        dislikes:['肉'] },
  { id:'capybara',name:'カピバラ',   img:'./img/kapipara.webp', emoji:'🦫', likes:['草','野菜'], dislikes:['肉'] },
  { id:'panda',   name:'パンダ',     img:'./img/panda.webp',    emoji:'🐼', likes:['草'],        dislikes:['魚'] }
];
const QUICK_OPTIONS = ['肉','魚','草','野菜'];

// ================================
// DOM
// ================================
const el = {
  screenSelect: document.getElementById('screenSelect'),
  screenGame: document.getElementById('screenGame'),
  screenResult: document.getElementById('screenResult'),

  pickButtons: Array.from(document.querySelectorAll('[data-animal]')),

  animalImg: document.getElementById('animalImg'),
  begLine: document.getElementById('begLine'),

  freeInput: document.getElementById('freeInput'),
  btnSend: document.getElementById('btnSend'),

  resultSub: document.getElementById('resultSub'),
  resultEmoji: document.getElementById('resultEmoji'),
  resultAnimalImg: document.getElementById('resultAnimalImg'),
  resultText: document.getElementById('resultText'),
  btnResultBack: document.getElementById('btnResultBack'),

  toast: document.getElementById('toast'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingLine: document.getElementById('loadingLine'),
  loadingAnimalImg: document.getElementById('loadingAnimalImg')
};


// ================================
// State
// ================================
const state = {
  animal: null,
  locked: false,
  currentBeg: '',
  begTimer: null,
  sfxEnabled: true
};

// ================================
// Utils
// ================================
function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickNotSame(arr, last){
  if(!arr || arr.length === 0) return '';
  if(arr.length === 1) return arr[0];
  let v = arr[Math.floor(Math.random() * arr.length)];
  let guard = 0;
  while(v === last && guard < 10){
    v = arr[Math.floor(Math.random() * arr.length)];
    guard++;
  }
  return v;
}
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}
function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

// ================================
// 効果音（Web Audio）
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
// UI helpers
// ================================
function setHeader(mode, sub){
  if(!el.headerTitle || !el.headerSub) return;
  if(mode === 'select'){
    el.headerTitle.textContent = 'すきな どうぶつを えらんでね';
    el.headerSub.textContent = 'どの どうぶつに えさを あげる？';
  }else if(mode === 'game'){
    el.headerTitle.textContent = 'えさを あげよう';
    el.headerSub.textContent = 'ボタン 4つ or じゆうに いれてね';
  }else if(mode === 'result'){
    el.headerTitle.textContent = 'けっか';
    el.headerSub.textContent = sub || '入力：—';
  }
}
function showScreen(name){
  el.screenSelect.classList.remove('isActive');
  el.screenGame.classList.remove('isActive');
  el.screenResult.classList.remove('isActive');

  if(name === 'select') el.screenSelect.classList.add('isActive');
  if(name === 'game') el.screenGame.classList.add('isActive');
  if(name === 'result') el.screenResult.classList.add('isActive');
}
function showToast(text){
  if(!el.toast) return;
  el.toast.textContent = text;
  el.toast.classList.add('show');
  window.setTimeout(() => el.toast.classList.remove('show'), 1500);
}
function setImgSafe(imgEl, src, alt, fallbackEmoji='🐾'){
  if(!imgEl) return;
  imgEl.alt = alt || '';
  imgEl.onerror = () => {
    const p = imgEl.parentElement;
    if(p) p.innerHTML = `<div style="font-size:36px;line-height:1">${fallbackEmoji}</div>`;
  };
  imgEl.src = src;
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
// Begging loop
// ================================
function setBegLine(line){
  state.currentBeg = line || '';
  el.begLine.textContent = state.currentBeg || '…';
}
function stopBegLoop(){
  if(state.begTimer){
    window.clearTimeout(state.begTimer);
    state.begTimer = null;
  }
}
function startBegLoop(){
  stopBegLoop();
  const a = state.animal;
  if(!a) return;
  const persona = PERSONA[a.id];
  if(!persona || !persona.begLines || persona.begLines.length === 0) return;

  const tick = () => {
    if(!state.animal) return;
    const next = pickNotSame(persona.begLines, state.currentBeg);
    setBegLine(next);
    state.begTimer = window.setTimeout(tick, randInt(2600, 4200));
  };
  state.begTimer = window.setTimeout(tick, randInt(2200, 3600));
}

// ================================
// Item classification
// ================================
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
    { category:'草', keys:['草','笹','葉','はっぱ','牧草','芝','しば','竹','たけ'] },
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

// ================================
// Scoring
// ================================
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

// ================================
// Persona reaction (①：状況で口調が変わる)
// ================================
function pickPersonaBucket(animal, itemInfo, judged){
  const likes = animal.likes.includes(itemInfo.category);
  const dislikes = animal.dislikes.includes(itemInfo.category);

  if(judged.outcome === 'だいせいこう' || judged.outcome === 'せいこう'){
    if(dislikes) return 'unknown';
    return likes ? 'like' : 'unknown';
  }
  if(judged.outcome === 'しっぱい'){
    if(likes) return 'unknown';
    return dislikes ? 'dislike' : 'dislike';
  }

  if(likes) return 'like';
  if(dislikes) return 'dislike';
  return 'unknown';
}

function applyToneRules(animalId, base, bucket, itemInfo, judged){
  const p = PERSONA[animalId];
  if(!p || !p.toneRules) return base;

  if(animalId === 'lion'){
    const need = (bucket !== 'like') || (judged.outcome === 'しっぱい');
    if(need && Math.random() < p.toneRules.bravadoRate){
      return `${base} ${pick(p.toneRules.bravadoAdds)}`;
    }
    return base;
  }

  if(animalId === 'penguin'){
    const scared = (bucket !== 'like') || (judged.outcome === 'しっぱい') || (itemInfo.vibe === 'スパイシー');
    if(scared && Math.random() < p.toneRules.politeRate){
      return `${pick(p.toneRules.politeScared)} ${base}`;
    }
    if(bucket === 'like' && Math.random() < 0.18){
      return `${pick(p.toneRules.politeLike)} ${base}`;
    }
    return base;
  }

  if(animalId === 'capybara'){
    const need = (bucket !== 'like') || (judged.outcome === 'しっぱい');
    if(need && Math.random() < p.toneRules.maaRate){
      return `${base} ${pick(p.toneRules.maaAdds)}`;
    }
    return base;
  }

  if(animalId === 'panda'){
    const need = (bucket !== 'like') || (judged.outcome === 'しっぱい');
    if(need && Math.random() < p.toneRules.questionRate){
      const q = pick(p.toneRules.questionLines);
      return `${q}\n${base}`;
    }
    return base;
  }

  return base;
}

function generateLocalReaction(animal, itemInfo, judged){
  const persona = PERSONA[animal.id];
  const bucket = pickPersonaBucket(animal, itemInfo, judged);

  let base = persona ? pick(persona.react[bucket] || persona.react.unknown) : 'もぐもぐ…';
  base = applyToneRules(animal.id, base, bucket, itemInfo, judged);

  const bodyTemplates = {
    'だいせいこう': [
      `「${itemInfo.raw}」に大満足！目がキラキラしてる！`,
      'もぐもぐ…！テンションMAX！大よろこび！',
      'もう一口！って顔してる！'
    ],
    'せいこう': [
      `「${itemInfo.raw}」をもぐもぐ…いい感じ。`,
      'ほどよく満腹。にこにこしてる。',
      '落ち着いて味わってる。'
    ],
    'びみょう': [
      `「${itemInfo.raw}」を一口…ふしぎな顔。`,
      '悪くはないけど、ちょっと首をかしげてる。',
      'もぐもぐ…（無言）'
    ],
    'しっぱい': [
      `「${itemInfo.raw}」を見た瞬間、ちょっと固まった…！`,
      '食べるより…別の使い方を思いついたみたい。',
      'じーっ…（距離を取っている）'
    ]
  };

  const extra =
    (itemInfo.vibe === 'ファンタジー') ? '（なにか不思議なオーラが漂っている…）' :
    (itemInfo.vibe === 'ほっこり') ? '（やさしい匂いがする…）' :
    (itemInfo.vibe === 'スパイシー') ? '（鼻がツーン！）' :
    (itemInfo.vibe === 'ボリューム') ? '（量が多い…！）' : '';

  const body = pick(bodyTemplates[judged.outcome]);
  const text = `${base}\n${body}${extra ? `\n${extra}` : ''}`.trim();

  const commentator = pick([
    `実況：満足度は ${judged.score}/100！`,
    `実況：この反応…満足度 ${judged.score}/100！`,
    `実況：評価は ${judged.score}/100 でした！`
  ]);

  return { text, commentator, bucket };
}

function buildResultText(itemInfo, judged, reaction){
  const base = {
    'だいせいこう': '超大成功！まんぞくそう！',
    'せいこう': '成功！いい感じに食べた！',
    'びみょう': 'うーん…ちょっと微妙。',
    'しっぱい': '失敗…好みじゃなかったみたい。'
  }[judged.outcome];

  return `${base}\n\n入力：${itemInfo.raw}\n分類：${itemInfo.category} / 雰囲気：${itemInfo.vibe}\n\n${reaction.text}\n\n${reaction.commentator}`;
}

// ================================
// Navigation
// ================================
function gotoSelect(){
  setLoading(false);
  stopBegLoop();
  state.animal = null;
  state.locked = false;
  el.freeInput.value = '';
  setHeader('select');
  showScreen('select');
}

function renderAnimal(){
  const a = state.animal;
  if(!a) return;
  const persona = PERSONA[a.id];

  setImgSafe(el.animalImg, a.img, a.name, a.emoji);
  setImgSafe(el.resultAnimalImg, a.img, a.name, a.emoji);
  setImgSafe(el.loadingAnimalImg, a.img, a.name, a.emoji);

}

function startGameWithAnimal(animalId){
  const a = ANIMALS.find(x => x.id === animalId);
  if(!a) return;

  state.animal = a;
  state.locked = false;

  el.freeInput.value = '';

  renderAnimal();
  setHeader('game');
  showScreen('game');

  const persona = PERSONA[a.id];
  setBegLine(pick(persona.begLines));
  startBegLoop();}

async function handleFeed(rawInput){
  const input = (rawInput || '').trim();
  if(!input){
    showToast('なにか入力してね');
    el.freeInput.focus();
    return;
  }
  if(state.locked) return;
  if(!state.animal){
    gotoSelect();
    return;
  }

  ensureAudio();
  await resumeAudio();

  if(hasNgWord(input)){
    sfxClick();
    showToast('その言葉はつかえないよ');
    return;
  }

  sfxClick();

  const a = state.animal;
  const itemInfo = classifyItem(input);


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
  // 結果ページへ
  stopBegLoop();
  state.locked = true;

  const sub = `入力：${itemInfo.raw}`;
  setHeader('result', sub);

  el.resultSub.textContent = `入力：${itemInfo.raw}`;
  el.resultEmoji.textContent = judged.art;
  setImgSafe(el.resultAnimalImg, a.img, a.name, a.emoji);
  el.resultText.textContent = buildResultText(itemInfo, judged, reaction);

  showScreen('result');
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

  el.btnResultBack.addEventListener('click', async () => {
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
