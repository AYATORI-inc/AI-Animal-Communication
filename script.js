'use strict';

/*
  v16: 背景画像（./img/background.jpg）対応 + 性格（条件分岐） + おねだり増量
  - トップ：動物選択
  - えさ：4ボタン + 自由入力
  - 待機：動物アイコンが上下に揺れる（もぐもぐ）
  - 結果：個別ページ表示 + 戻るボタン
  - 効果音：クリック / もぐもぐ / 結果（成功失敗で同じ）
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
// 性格（txtの内容をゲーム用に定義）
// ================================
const PERSONA = {
  lion: {
    name: 'ライオン',
    label: '王様気質・強がり',
    first: 'オレ',
    toneRules: {
      bravadoRate: 0.75, // 困ったときに強がりを混ぜる確率
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
      ],
    },
  },

  penguin: {
    name: 'ペンギン',
    label: '陽気・ちょっぴり心配性',
    first: 'ボク',
    toneRules: {
      politeRate: 0.65, // 困ったときに敬語が混ざる確率
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
      'やさしいごはんだとうれしいな…！',
      'あっ！それ、ボク知ってるかも！',
      'ふむふむ…まずは匂いチェックだよっ！',
      'よーし！準備OKだよっ！',
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
      ],
    },
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
      ],
    },
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
      ],
    },
  }
};

// ================================
// 動物データ（好き嫌いは内部用・画面には出さない）
// ================================
const ANIMALS = [
  { id:'lion',    name:'ライオン',   img:'./img/raion.jpg',    emoji:'🦁', likes:['肉'],        dislikes:['草'] },
  { id:'penguin', name:'ペンギン',   img:'./img/pengin.jpg',   emoji:'🐧', likes:['魚'],        dislikes:['肉'] },
  { id:'capybara',name:'カピバラ',   img:'./img/kapipara.jpg', emoji:'🦫', likes:['草','野菜'], dislikes:['肉'] },
  { id:'panda',   name:'パンダ',     img:'./img/panda.jpg',    emoji:'🐼', likes:['草'],        dislikes:['魚'] },
];

const QUICK_OPTIONS = ['肉','魚','草','野菜'];

// ================================
// DOM
// ================================
const el = {
  headerTitle: document.getElementById('headerTitle'),
  headerSub: document.getElementById('headerSub'),

  screenSelect: document.getElementById('screenSelect'),
  screenGame: document.getElementById('screenGame'),
  screenResult: document.getElementById('screenResult'),

  pickButtons: Array.from(document.querySelectorAll('[data-animal]')),

  btnBackToSelect: document.getElementById('btnBackToSelect'),
  chatLog: document.getElementById('chatLog'),
  freeInput: document.getElementById('freeInput'),
  btnSend: document.getElementById('btnSend'),
  begLine: document.getElementById('begLine'),

  animalImg: document.getElementById('animalImg'),
  animalName: document.getElementById('animalName'),
  animalPersona: document.getElementById('animalPersona'),

  resultSub: document.getElementById('resultSub'),
  resultEmoji: document.getElementById('resultEmoji'),
  resultAnimalImg: document.getElementById('resultAnimalImg'),
  resultText: document.getElementById('resultText'),
  btnResultBack: document.getElementById('btnResultBack'),

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
  begTimer: null,
  lastBeg: '',
  sfxEnabled: true,
};

// ================================
// Utils
// ================================
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function setImgSafe(imgEl, src, alt, fallbackEmoji='🐾'){
  if(!imgEl) return;
  imgEl.alt = alt || '';
  imgEl.onerror = () => {
    const parent = imgEl.parentElement;
    if(parent){
      parent.innerHTML = `<div style="font-size:42px;line-height:1">${fallbackEmoji}</div>`;
    }
  };
  imgEl.src = src;
}

// ================================
// 効果音（WebAudio）
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
function showToast(text){
  el.toast.textContent = text;
  el.toast.classList.add('show');
  window.setTimeout(() => el.toast.classList.remove('show'), 1500);
}

function updateHeader(screen, subText){
  if(screen === 'select'){
    el.headerTitle.textContent = 'すきな どうぶつを えらんでね';
    el.headerSub.textContent = 'どの どうぶつに えさを あげる？';
    return;
  }
  if(screen === 'game'){
    el.headerTitle.textContent = 'えさを あげよう';
    el.headerSub.textContent = 'ボタン 4つ or じゆうに いれてね';
    return;
  }
  if(screen === 'result'){
    el.headerTitle.textContent = 'けっか';
    el.headerSub.textContent = subText || '入力：—';
    return;
  }
}

function showScreen(name, headerSub){
  el.screenSelect.classList.remove('isActive');
  el.screenGame.classList.remove('isActive');
  el.screenResult.classList.remove('isActive');

  if(name === 'select') el.screenSelect.classList.add('isActive');
  if(name === 'game') el.screenGame.classList.add('isActive');
  if(name === 'result') el.screenResult.classList.add('isActive');

  updateHeader(name, headerSub);
}

function setLoading(on, line){
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

function addChat({ who, avatar, text }){
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
// おねだり（時間で変える）
// ================================
function stopBeg(){
  if(state.begTimer){
    window.clearTimeout(state.begTimer);
    state.begTimer = null;
  }
}
function setBegLine(line){
  state.lastBeg = line || '';
  el.begLine.textContent = state.lastBeg || '…';
}
function pickBegLine(persona){
  const lines = persona?.begLines || [];
  if(lines.length === 0) return '…';
  // 連続同じを避ける
  let next = pick(lines);
  if(lines.length >= 2){
    let guard = 0;
    while(next === state.lastBeg && guard < 6){
      next = pick(lines);
      guard++;
    }
  }
  return next;
}
function startBeg(){
  stopBeg();
  const p = PERSONA[state.animal?.id];
  if(!p) return;

  const tick = () => {
    if(!state.animal) return;
    setBegLine(pickBegLine(p));
    state.begTimer = window.setTimeout(tick, randInt(2800, 4200));
  };

  // 最初
  setBegLine(pickBegLine(p));
  state.begTimer = window.setTimeout(tick, randInt(2600, 3600));
}

// ================================
// ゲームロジック
// ================================
function findAnimal(id){ return ANIMALS.find(a => a.id === id) || null; }

function gotoSelect(){
  setLoading(false);
  stopBeg();
  state.animal = null;
  state.locked = true;

  el.chatLog.innerHTML = '';
  el.freeInput.value = '';

  showScreen('select');
}

function startGameWithAnimal(id){
  const a = findAnimal(id);
  if(!a) return;

  state.animal = a;
  state.locked = false;

  el.chatLog.innerHTML = '';
  el.freeInput.value = '';

  // animal UI
  setImgSafe(el.animalImg, a.img, a.name, a.emoji);
  setImgSafe(el.loadingAnimalImg, a.img, a.name, a.emoji);
  setImgSafe(el.resultAnimalImg, a.img, a.name, a.emoji);

  const p = PERSONA[a.id];
  el.animalName.textContent = a.name;
  el.animalPersona.textContent = p?.label || '—';

  showScreen('game');
  startBeg();

  const avatar = { type:'img', src: a.img, alt: a.name, fallback: a.emoji };
  addChat({ who:'npc', avatar, text: `【${a.name}】がやってきた！` });
  addChat({ who:'npc', avatar, text: state.lastBeg || '…' });
}

function classifyItem(input){
  const raw = (input || '').trim();
  if(!raw) return { raw: '', category: '不明', vibe: 'ふつう' };

  if(QUICK_OPTIONS.includes(raw)){
    return { raw, category: raw, vibe: 'ふつう' };
  }

  const t = raw.toLowerCase();
  const rules = [
    { category:'肉', keys:['肉','ハンバーグ','ステーキ','チキン','からあげ','ソーセージ','ベーコン','焼肉'] },
    { category:'魚', keys:['魚','さかな','サーモン','まぐろ','ツナ','いわし','さしみ','寿司','すし'] },
    { category:'草', keys:['草','笹','葉','はっぱ','牧草','芝','しば'] },
    { category:'野菜', keys:['野菜','にんじん','キャベツ','トマト','きゅうり','ブロッコリー','かぼちゃ','サラダ'] },
  ];

  let category = '不明';
  for(const r of rules){
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

  return { score, outcome, emoji: pick(artByOutcome[outcome]) };
}

function decideBucket(animal, itemInfo, judged){
  const cat = itemInfo.category;
  const liked = animal.likes.includes(cat);
  const disliked = animal.dislikes.includes(cat);

  let base = 'unknown';
  if(liked) base = 'like';
  else if(disliked) base = 'dislike';

  // 結果で少し補正（予測不能感）
  if(judged.outcome === 'だいせいこう' || judged.outcome === 'せいこう'){
    if(base === 'unknown') base = 'like';
    if(base === 'dislike') base = 'unknown';
  }
  if(judged.outcome === 'しっぱい'){
    if(base === 'like') base = 'unknown';
    if(base === 'unknown') base = 'dislike';
  }
  return base;
}

function applyToneRules(animalId, bucket, itemInfo, judged, baseLine){
  const p = PERSONA[animalId];
  if(!p) return baseLine;

  const vibe = itemInfo.vibe;
  const badish = (bucket !== 'like') || judged.outcome === 'しっぱい' || judged.outcome === 'びみょう';
  let line = baseLine;

  // ① ペンギン：困ると敬語が混ざる
  if(animalId === 'penguin' && badish){
    const r = p.toneRules;
    const trigger = (Math.random() < r.politeRate) || vibe === 'スパイシー';
    if(trigger){
      // 先頭に敬語/不安を混ぜる
      const head = pick(r.politeScared);
      line = `${head} ${line}`.replace(/\s+/g,' ').trim();
    }
  }

  // ② ライオン：強がりが付きやすい
  if(animalId === 'lion' && badish){
    const r = p.toneRules;
    if(Math.random() < r.bravadoRate){
      const add = pick(r.bravadoAdds);
      // 末尾に足す（句点重複を軽く避ける）
      if(!line.includes(add)) line = `${line} ${add}`.replace(/\s+/g,' ').trim();
    }
  }

  // ③ カピバラ：「まぁ、いっかぁ」が混ざる
  if(animalId === 'capybara' && badish){
    const r = p.toneRules;
    if(Math.random() < r.maaRate){
      const add = pick(r.maaAdds);
      line = `${line} ${add}`.replace(/\s+/g,' ').trim();
    }
  }

  // ④ パンダ：困ると疑問が増える
  if(animalId === 'panda' && badish){
    const r = p.toneRules;
    if(Math.random() < r.questionRate){
      // 疑問文に寄せる（ベースを置き換え or 先頭付与）
      const q = pick(r.questionLines);
      // 置き換えのほうが「シュール」になりやすい
      line = Math.random() < 0.55 ? q : `${q} ${line}`.replace(/\s+/g,' ').trim();
    }
  }

  return line;
}

function generateReactionText(animal, itemInfo, judged){
  const bucket = decideBucket(animal, itemInfo, judged);
  const p = PERSONA[animal.id];
  const base = pick((p?.react?.[bucket]) || (p?.react?.unknown) || ['…']);

  const toned = applyToneRules(animal.id, bucket, itemInfo, judged, base);

  // 一言の食べ描写（過剰に長くしない）
  const extraByShow = {
    'だいせいこう': ['もぐもぐ…！', 'おかわり…！', 'にこにこ！'],
    'せいこう': ['もぐもぐ…', 'いい感じ…', 'ごきげん。'],
    'びみょう': ['…うーん。', 'ちょっとふしぎ。', '首をかしげた。'],
    'しっぱい': ['…うぅ。', 'むずかしい…。', 'しょんぼり。'],
  };
  const bite = pick(extraByShow[judged.outcome] || ['もぐもぐ…']);

  // 「入力：」はヘッダー/結果に出すので、ここでは会話だけ
  return `${toned}\n（${itemInfo.raw}）${bite}`.trim();
}

function buildResultText(animal, itemInfo, judged, reactionText){
  const base = {
    'だいせいこう': '超大成功！まんぞくそう！',
    'せいこう': '成功！いい感じに食べた！',
    'びみょう': 'うーん…ちょっと微妙。',
    'しっぱい': '失敗…好みじゃなかったみたい。',
  }[judged.outcome];

  const commentator = pick([
    `実況：満足度は ${judged.score}/100！`,
    `実況：この反応…満足度 ${judged.score}/100！`,
    `実況：評価は ${judged.score}/100 でした！`,
  ]);

  return `${base}\n\n${reactionText}\n\n${commentator}`.trim();
}

function showResult(animal, itemInfo, judged, reactionText){
  const headerSub = `入力：${itemInfo.raw}`;
  showScreen('result', headerSub);

  el.resultSub.textContent = `入力：${itemInfo.raw}`;
  el.resultEmoji.textContent = judged.emoji;
  setImgSafe(el.resultAnimalImg, animal.img, animal.name, animal.emoji);
  el.resultText.textContent = buildResultText(animal, itemInfo, judged, reactionText);
}

// ================================
// えさをあげる
// ================================
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
    addChat({ who:'npc', avatar:'🛡️', text:'安全のため、その内容は受け取れませんでした。ちがう言葉で試してね。' });
    return;
  }

  sfxClick();

  const a = state.animal;
  const itemInfo = classifyItem(input);

  addChat({ who:'me', avatar:'🙂', text:`「${itemInfo.raw}」をあげる` });

  state.locked = true;
  setLoading(true, pick([
    '動物がくんくんにおいをかいでいる…',
    'もぐもぐ…味をたしかめ中…',
    'しばらく観察している…'
  ]));

  await sleep(randInt(950, 1600));

  const judged = scoreFeeding(a, itemInfo);
  const reactionText = generateReactionText(a, itemInfo, judged);

  setLoading(false);
  sfxResult();

  // チャットにも一言だけ残す（結果は別画面）
  const avatar = { type:'img', src: a.img, alt: a.name, fallback: a.emoji };
  addChat({ who:'npc', avatar, text: reactionText.split('\n')[0] });

  showResult(a, itemInfo, judged, reactionText);
}

// ================================
// Events
// ================================
function wireEvents(){
  el.pickButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      ensureAudio(); await resumeAudio();
      sfxClick();
      startGameWithAnimal(btn.getAttribute('data-animal'));
    });
  });

  el.btnBackToSelect.addEventListener('click', async () => {
    ensureAudio(); await resumeAudio();
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

  el.btnResultBack.addEventListener('click', async () => {
    ensureAudio(); await resumeAudio();
    sfxClick();
    gotoSelect();
  });
}

// init
(function init(){
  wireEvents();
  gotoSelect();
})();
