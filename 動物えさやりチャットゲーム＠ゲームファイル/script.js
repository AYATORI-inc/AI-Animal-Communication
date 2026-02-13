'use strict';

/*
  v8
  - ✅ 好き嫌いヒント（👍好き/👎苦手）を非表示（UI撤去）
  - ✅ えさ選択中のおねだりセリフが時間経過で切り替わる（動物ごと）
     - 4.2〜7.0秒ごと／同じセリフ連続なし
     - もぐもぐ中・結果画面・タイトル画面では止める
  - ✅ 結果は別ページ（screenResult）
  - ✅ タイトル表示中はスクロールしない（body.noScroll）
  - 効果音あり／待機中上下揺れ／結果SEは1種類
*/

const NG_WORDS = [
  '死', '殺', '爆', '麻薬', 'ドラッグ', '下ネタ', 'エロ', 'セックス', '裸',
  '差別', 'ヘイト', '暴力', 'グロ',
];
function hasNgWord(text){
  const t = (text || '').toLowerCase();
  return NG_WORDS.some(w => t.includes(w.toLowerCase()));
}

const ANIMALS = [
  {
    id: 'lion',
    name: 'ライオン',
    art: '🦁',
    personality: '王様きどり',
    likes: ['肉'],
    dislikes: ['草'],
    begLines: [
      'おい、人間。おれさまのために、うまい肉を持ってこい。',
      'ぐぅ…おなかがなる…。肉！いますぐ肉！',
      '王の食事にふさわしいものを頼むぞ。',
      'ふむ…そろそろ献上品の時間だな。',
    ],
  },
  {
    id: 'penguin',
    name: 'ペンギン',
    art: '🐧',
    personality: 'きまじめ',
    likes: ['魚'],
    dislikes: ['肉'],
    begLines: [
      'えっと…できれば新鮮なお魚がいいです。',
      'ぼく、魚が大好きなんだ。よろしくね。',
      '氷の上でも食べやすいごはんだとうれしいな。',
      'できれば骨が少ないタイプだと助かります…！',
    ],
  },
  {
    id: 'capybara',
    name: 'カピバラ',
    art: '🦫',
    personality: 'のんびり',
    likes: ['草', '野菜'],
    dislikes: ['肉'],
    begLines: [
      'ふぁ〜…おなかすいた。やさしい味がいいなぁ。',
      'のんびり食べられるやつ…ある？',
      'あったかいお風呂のあとに…野菜とか…いいな…',
      '急がないから、ゆっくり選んでねぇ…',
    ],
  },
  {
    id: 'panda',
    name: 'パンダ',
    art: '🐼',
    personality: 'マイペース',
    likes: ['草'],
    dislikes: ['魚'],
    begLines: [
      'もぐもぐする準備はできてるよ。',
      '笹っぽいの、ある？（なんでも笹に見える…）',
      'あんまり急かさないでね〜。',
      'ぼくのペースで食べたいな〜。',
    ],
  },
];

const QUICK_OPTIONS = ['肉','魚','草','野菜'];

const el = {
  // screens
  screenGame: document.getElementById('screenGame'),
  screenResult: document.getElementById('screenResult'),

  // title
  titleOverlay: document.getElementById('titleOverlay'),
  btnStart: document.getElementById('btnStart'),
  btnStartMuted: document.getElementById('btnStartMuted'),

  // gameplay
  animalArt: document.getElementById('animalArt'),
  animalName: document.getElementById('animalName'),
  animalTag: document.getElementById('animalTag'),
  begLine: document.getElementById('begLine'),

  chatLog: document.getElementById('chatLog'),
  freeInput: document.getElementById('freeInput'),
  btnSend: document.getElementById('btnSend'),

  toast: document.getElementById('toast'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingLine: document.getElementById('loadingLine'),

  // result screen
  resultSub: document.getElementById('resultSub'),
  resultAnimal: document.getElementById('resultAnimal'),
  resultArt: document.getElementById('resultArt'),
  resultText: document.getElementById('resultText'),
  btnResultNext: document.getElementById('btnResultNext'),
  btnResultToTitle: document.getElementById('btnResultToTitle'),
};

const state = {
  animal: null,
  locked: true,
  sfxEnabled: true,
  lastResult: null,

  // ✅ おねだりセリフの自動切替
  begTimeout: null,
  currentBeg: '',
};

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
    try{ await sfx.ctx.resume(); }catch(e){}
  }
}
function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  // ✅ 成功/失敗でも同じ（1種類）
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
  const isGame = name === 'game';
  el.screenGame.classList.toggle('show', isGame);
  el.screenResult.classList.toggle('show', !isGame);
  el.screenResult.setAttribute('aria-hidden', String(isGame));

  // ✅ 画面に応じておねだりループ制御
  if(isGame) startBegLoop();
  else stopBegLoop();
}

// ================================
// UIユーティリティ
// ================================
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

function showToast(message){
  el.toast.textContent = message;
  el.toast.classList.add('show');
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => el.toast.classList.remove('show'), 1800);
}
function scrollChatToBottom(){ el.chatLog.scrollTop = el.chatLog.scrollHeight; }

function addChatMessage({who, text, avatar}){
  const msg = document.createElement('div');
  msg.className = `msg ${who === 'me' ? 'me' : 'npc'}`;

  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = avatar || (who === 'me' ? '🙂' : '🐾');

  const bubble = document.createElement('div');
  bubble.className = 'msgBubble';
  bubble.textContent = text;

  msg.appendChild(av);
  msg.appendChild(bubble);
  el.chatLog.appendChild(msg);
  scrollChatToBottom();
}

function setLoading(isOn, line){
  if(isOn){
    el.loadingLine.textContent = line || '動物が味わっています…';
    el.loadingOverlay.classList.add('show');
    el.loadingOverlay.setAttribute('aria-hidden', 'false');
    // ✅ 動物アイコンを上下に揺らす
    el.animalArt.classList.add('bob');
    startMunchLoop();
  }else{
    el.loadingOverlay.classList.remove('show');
    el.loadingOverlay.setAttribute('aria-hidden', 'true');
    el.animalArt.classList.remove('bob');
    stopMunchLoop();
  }

  // ✅ もぐもぐ中はおねだりセリフの自動切替を止める（落ち着いた演出）
  if(isOn) stopBegLoop();
  else startBegLoop();
}

// ================================
// ✅ おねだりセリフ自動切替
// ================================
function stopBegLoop(){
  if(state.begTimeout){
    window.clearTimeout(state.begTimeout);
    state.begTimeout = null;
  }
}

function canRotateBeg(){
  // タイトル表示中は止める
  if(el.titleOverlay.classList.contains('show')) return false;
  // ゲーム画面じゃなければ止める
  if(!el.screenGame.classList.contains('show')) return false;
  // もぐもぐ中は止める
  if(el.loadingOverlay.classList.contains('show')) return false;
  // 動物がいなければ止める
  if(!state.animal) return false;
  // 結果表示待ち（locked true）でも止める
  if(state.locked) return false;
  return true;
}

function setBegLine(text){
  state.currentBeg = text;
  el.begLine.textContent = text;
}

function nextBegLine(){
  const lines = state.animal?.begLines || [];
  if(lines.length === 0) return;

  if(lines.length === 1){
    setBegLine(lines[0]);
    return;
  }

  // 同じセリフ連続なし
  let candidate = pick(lines);
  let guard = 0;
  while(candidate === state.currentBeg && guard < 8){
    candidate = pick(lines);
    guard++;
  }
  setBegLine(candidate);
}

function startBegLoop(){
  stopBegLoop();

  // 条件を満たすまで「予約だけして様子見」する（画面遷移直後に安定）
  const schedule = () => {
    state.begTimeout = window.setTimeout(() => {
      if(canRotateBeg()) nextBegLine();
      // 継続（ゲーム中のみ回る）
      if(el.screenGame.classList.contains('show')) schedule();
    }, randInt(4200, 7000));
  };

  if(el.screenGame.classList.contains('show')) schedule();
}

// ================================
// タイトル制御
// ================================
function showTitle(){
  setLoading(false);
  state.locked = true;
  document.body.classList.add('noScroll');
  el.titleOverlay.classList.add('show');

  // ✅ タイトル中はおねだりループ停止
  stopBegLoop();

  // タイトルに戻った時点ではゲーム画面にしておく（開始でスムーズ）
  showScreen('game');
}
function hideTitle(){
  el.titleOverlay.classList.remove('show');
  document.body.classList.remove('noScroll');
  state.locked = false;
  // ✅ ゲームに戻ったら再開
  startBegLoop();
}

// ================================
// ロジック
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
    { category:'草', keys:['草','笹','葉','はっぱ','牧草','芝','しば'] },
    { category:'野菜', keys:['野菜','にんじん','キャベツ','トマト','きゅうり','ブロッコリー','かぼちゃ','サラダ'] },
  ];

  let category = '不明';
  for(const r of catRules){
    if(r.keys.some(k => t.includes(k))){ category = r.category; break; }
  }

  let vibe = 'ふつう';
  if(['魔法','まほう','きらきら','虹','にじ','伝説','でんせつ','レア'].some(k=>t.includes(k))) vibe = 'ファンタジー';
  if(['激辛','げきから','超辛','唐辛子','わさび'].some(k=>t.includes(k))) vibe = 'スパイシー';
  if(['特大','でっかい','巨大','メガ','山盛り'].some(k=>t.includes(k))) vibe = 'ボリューム';
  if(['手作り','てづくり','お母さん','おばあちゃん','家庭'].some(k=>t.includes(k))) vibe = 'ほっこり';

  return { raw, category, vibe };
}

function scoreFeeding(animal, itemInfo){
  let score = 50;

  if(animal.likes.includes(itemInfo.category)) score += 28;
  if(animal.dislikes.includes(itemInfo.category)) score -= 26;

  if(itemInfo.category === '不明'){
    score += (itemInfo.vibe === 'ファンタジー' || itemInfo.vibe === 'ほっこり') ? 10 : -5;
  }

  if(itemInfo.vibe === 'ボリューム') score += 8;
  if(itemInfo.vibe === 'スパイシー') score -= 8;
  if(itemInfo.vibe === 'ほっこり') score += 6;
  if(itemInfo.vibe === 'ファンタジー') score += 6;

  score += randInt(-8, 8);
  score = clamp(score, 0, 100);

  let outcome = 'ふつう';
  if(score >= 78) outcome = 'だいせいこう';
  else if(score >= 60) outcome = 'せいこう';
  else if(score >= 40) outcome = 'びみょう';
  else outcome = 'しっぱい';

  const artByOutcome = {
    'だいせいこう': ['😍','🥳','✨','💖'],
    'せいこう': ['😊','😋','👍','🌟'],
    'びみょう': ['😐','🤔','😅','🙃'],
    'しっぱい': ['😖','🤢','💦','😵'],
  };

  return { score, outcome, art: pick(artByOutcome[outcome]) };
}

function generateLocalReaction(animal, itemInfo, judged){
  const { outcome, score } = judged;
  const item = itemInfo.raw;

  const tone = {
    'ライオン': { good: ['よい！','なかなかだ！','王の口に合う！'], bad: ['むむ…','これは…ちがうな。','王の食事ではない…'] },
    'ペンギン': { good: ['ありがとうございます！','やった！','うれしいです！'], bad: ['あの…','ちょっと…','これは苦手かも…'] },
    'カピバラ': { good: ['いいねぇ…','しあわせ…','ほわぁ…'], bad: ['うーん…','きょうはちがう…','ちょっとびっくり…'] },
    'パンダ': { good: ['もぐもぐ…最高。','いい感じ。','ぼくこれ好き。'], bad: ['ん？','これは…そうでもない。','ちょっと謎。'] }
  };

  const name = animal.name;
  const t = tone[name] || {good:['やった！'], bad:['うーん…']};

  const templates = {
    'だいせいこう': [
      `${pick(t.good)} 「${item}」を食べた瞬間、目がキラキラ！\nおなかも心も大満足みたい。`,
      `「${item}」…これは当たり！\n${name}は大喜びで、しっぽ（あるいは気分）をふりふりしている。`,
    ],
    'せいこう': [
      `${pick(t.good)} 「${item}」はおいしい！\nほどよく満腹になってごきげん。`,
      `${name}は「${item}」をもぐもぐ…\n“また今度もこれがいいな”って顔をしている。`,
    ],
    'びみょう': [
      `${pick(t.bad)} 「${item}」を一口…\n悪くはないけど、ちょっと首をかしげている。`,
      `「${item}」は…ふしぎな味！\n${name}はニコニコしつつも、なぜか遠い目。`,
    ],
    'しっぱい': [
      `${pick(t.bad)} 「${item}」を見た瞬間、表情が固まった…！\nどうやら好みじゃなかったみたい。`,
      `${name}は「${item}」を…頭にのせた！\n食べるより、別の使い方を思いついたらしい。`,
    ],
  };

  const extra = (itemInfo.vibe === 'ファンタジー')
    ? '（なにか不思議なオーラが漂っている…）'
    : (itemInfo.vibe === 'ほっこり')
      ? '（やさしい匂いがする…）'
      : (itemInfo.vibe === 'スパイシー')
        ? '（鼻がツーン！）'
        : '';

  const line = pick(templates[outcome]) + (extra ? `\n${extra}` : '');
  const commentator = [
    `実況：満足度は ${score}/100！`,
    `実況：この反応…満足度 ${score}/100！`,
    `実況：評価は ${score}/100 でした！`,
  ];

  return { text: line, commentary: pick(commentator) };
}

function renderAnimal(){
  const a = state.animal;
  el.animalArt.textContent = a.art;
  el.animalName.textContent = a.name;
  el.animalTag.textContent = a.personality;
}

function startRound(){
  state.animal = pick(ANIMALS);
  state.locked = false;

  renderAnimal();

  // ✅ 初回セリフをセット（自動切替の起点）
  setBegLine(pick(state.animal.begLines));
  startBegLoop();

  addChatMessage({ who:'npc', avatar: state.animal.art, text: `【${state.animal.name}】があらわれた！` });
  addChatMessage({ who:'npc', avatar: state.animal.art, text: state.currentBeg });
}

function buildResultText(animal, itemInfo, judged){
  const base = {
    'だいせいこう': '超大成功！まんぞくそう！',
    'せいこう': '成功！いい感じに食べた！',
    'びみょう': 'うーん…ちょっと微妙。',
    'しっぱい': '失敗…好みじゃなかったみたい。',
  }[judged.outcome];

  const extra = [];
  // ヒントはUIで隠しているが、結果の解説としては残す
  if(animal.likes.includes(itemInfo.category)) extra.push('（たぶん好みっぽい！）');
  if(animal.dislikes.includes(itemInfo.category)) extra.push('（たぶん苦手っぽい…）');
  if(itemInfo.category === '不明') extra.push('（自由入力の想像力がカギ！）');

  return `${base}\n${extra.join(' ')}`.trim();
}

function showResultPage({ animal, itemInfo, judged, reaction }){
  el.resultSub.textContent = `入力：${itemInfo.raw}（分類：${itemInfo.category} / 雰囲気：${itemInfo.vibe}）`;
  el.resultAnimal.textContent = animal.art;
  el.resultArt.textContent = judged.art;

  const summary = buildResultText(animal, itemInfo, judged);
  el.resultText.textContent = `${summary}\n\n${reaction.text}\n\n${reaction.commentary}`;

  // ✅ 結果ページへ移動する時におねだりを止める
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
    'しばらく観察している…',
  ]));

  await sleep(randInt(900, 1600));

  const judged = scoreFeeding(a, itemInfo);
  const reaction = generateLocalReaction(a, itemInfo, judged);

  setLoading(false);
  sfxResult();

  addChatMessage({ who:'npc', avatar: a.art, text: reaction.text });
  addChatMessage({ who:'npc', avatar:'🎙️', text: reaction.commentary });

  state.lastResult = { animal: a, itemInfo, judged, reaction };

  // ✅ 結果ページへ
  showResultPage(state.lastResult);
  state.locked = true;
}

function resetAll(){
  state.locked = false;
  state.lastResult = null;
  el.chatLog.innerHTML = '';
  showScreen('game');
  startRound();
  showToast('最初からはじめるよ');
}

function wireEvents(){
  // タイトル：開始
  el.btnStart.addEventListener('click', async () => {
    state.sfxEnabled = true;
    ensureAudio();
    await resumeAudio();
    sfxClick();
    hideTitle();
    resetAll();
  });

  // タイトル：音なし開始
  el.btnStartMuted.addEventListener('click', () => {
    state.sfxEnabled = false;
    hideTitle();
    resetAll();
  });

  // クイック
  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleFeed(btn.getAttribute('data-quick'));
    });
  });

  // 自由入力
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

  // 結果：次の動物へ
  el.btnResultNext.addEventListener('click', async () => {
    ensureAudio();
    await resumeAudio();
    sfxClick();
    showScreen('game');
    startRound();
    state.locked = false;
  });

  // 結果：タイトルへ
  el.btnResultToTitle.addEventListener('click', async () => {
    ensureAudio();
    await resumeAudio();
    sfxClick();
    showTitle();
  });
}

(function init(){
  wireEvents();
  showTitle();
})();