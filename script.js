'use strict';
const VERSION = 'v30';
const GAS_URL = 'https://script.google.com/a/macros/happy-epo8.com/s/AKfycbzNsriAaYZoBL9JTyqlbiWc9oSUcU4Cj3-lZS6sG6i0Lm28QHImhCsLdFA4i37WKujvkg/exec';

// ================================
// Debug pill（見える化）
// ================================
const debugState = { screen:'-', gas:'-', audio:'off' };
function ensureDebugPill(){
  if(document.getElementById('debugPill')) return;
  const d = document.createElement('div');
  d.id = 'debugPill';
  d.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:12px/1.2 ui-monospace,Menlo,Consolas,monospace;backdrop-filter:blur(6px)';
  document.body.appendChild(d);
}
function renderDebug(){
  ensureDebugPill();
  const d = document.getElementById('debugPill');
  if(!d) return;
  d.textContent = `${VERSION} screen=${debugState.screen} gas=${debugState.gas} audio=${debugState.audio}`;
}
renderDebug();

window.addEventListener('error', (e) => {
  debugState.gas = 'ERR';
  renderDebug();
  console.warn(e);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e && e.reason && (e.reason.message || String(e.reason))) ? (e.reason.message || String(e.reason)) : '';
  debugState.gas = msg.includes('timeout') ? 'timeout' : 'REJ';
  renderDebug();
  console.warn(e);
});

// ================================
// helpers
// ================================
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const pick = (a) => (a && a.length ? a[Math.floor(Math.random()*a.length)] : '');
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
const firstLine = (m) => String(m||'').split(/\r?\n/).map(s=>s.trim()).find(Boolean) || '';


const FOOD_ICON_SRC = {
  '肉': './img/oniku1.png',
  '草': './img/kusa2.png',
  'タイヤ': './img/taiya3.png',
  '激辛料理': './img/gekikara4.png',
};

function setFoodBadge(badgeEl, category, raw){
  if(!badgeEl) return;
  while(badgeEl.firstChild) badgeEl.removeChild(badgeEl.firstChild);
  badgeEl.append(document.createTextNode('えさ：'));
  const img = document.createElement('img');
  img.className = 'badgeFoodIcon';
  img.alt = '';
  img.setAttribute('aria-hidden','true');
  img.src = FOOD_ICON_SRC[category] || '';
  badgeEl.append(img);
  badgeEl.append(document.createTextNode(' ' + (raw || '')));
}
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

function showToast(msg, isError=false){
  if(!el.toast || !el.toastText){
    if(isError) console.warn(msg);
    return;
  }
  el.toast.classList.toggle('isError', !!isError);
  el.toastText.textContent = msg;
  el.toast.classList.add('show');
  if(!isError) setTimeout(()=>el.toast.classList.remove('show'), 1600);
}

const LOADING_LINES = [
  'もぐもぐ準備中…',
  'えさを はこんでいます…',
  'いただきます の じゅんび…',
  'ゆっくり かみかみ…',
  'あじを たしかめています…',
  'おいしい きぶん…',
  'ちょっと まってね…',
  'おまちどうさま…',
  'もぐもぐ タイム…',
  'もぐもぐ…もうすぐ！',
  'いま ひとくちめ…',
  'じゅんび できたら すぐだよ…'
];
let loadingBag = [];
function nextLoadingLine(){
  if(loadingBag.length === 0){
    // 連続で同じ文になりにくいようにシャッフルして使い切り
    loadingBag = LOADING_LINES.slice().sort(()=>Math.random() - 0.5);
  }
  return loadingBag.pop() || 'ちょっと まってね…';
}

function setLoading(on, line){
  // ローディング表示中は“もぐもぐ”効果音
  if(on) startLoadingSfx(); else stopLoadingSfx();
  if(!el.loadingOverlay) return;
  el.loadingOverlay.classList.toggle('show', !!on);
  if(el.loadingLine) el.loadingLine.textContent = on ? nextLoadingLine() : ''; // ← AI表現を避ける
}

function setImgSafe(img, src, alt){
  if(!img) return;
  img.src = src || '';
  img.alt = alt || '';
}

function openImageModal(src){
  if(!src || !el.imgModal || !el.imgModalImg) return;
  el.imgModalImg.src = src;
  el.imgModal.classList.remove('isHidden');
}
function closeImageModal(){
  if(!el.imgModal) return;
  el.imgModal.classList.add('isHidden');
  if(el.imgModalImg) el.imgModalImg.removeAttribute('src');
}

// ================================
// screen switch（“背景だけ”防止）
// ================================
function showScreen(name){
  const map = { select: el.screenSelect, game: el.screenGame, result: el.screenResult };
  const target = map[name];
  if(!target){
    // target が無いなら他を消さない（背景だけになるのを防ぐ）
    debugState.screen = 'missing:' + name;
    renderDebug();
    showToast('画面のHTMLが古い可能性があります', true);
    return;
  }

  Object.entries(map).forEach(([k,node])=>{
    if(!node) return;
    const on = (k===name);
    node.classList.toggle('isActive', on);
    node.style.display = on ? 'grid' : 'none';
  });
  debugState.screen = name;
  renderDebug();
}

// ================================
// audio（効果音）
// ================================
let audioCtx=null;
let audioUnlocked=false;
let loadingSfxTimer = null;
function ensureAudio(){
  if(audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return;
  audioCtx = new Ctx();
}
async function unlockAudio(){
  ensureAudio();
  if(!audioCtx) return;
  if(audioCtx.state === 'suspended'){
    try{ await audioCtx.resume(); }catch(_e){}
  }
  audioUnlocked = (audioCtx.state === 'running');
  debugState.audio = audioUnlocked ? 'on' : 'off';
  renderDebug();
}
function tone(freq=440, dur=0.08, gain=0.05, type='sine'){
  if(!audioUnlocked || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t0); o.stop(t0+dur+0.02);
}
const sfx = {
  click: ()=>tone(520,0.06,0.04,'square'),
  select: ()=>{ tone(440,0.06,0.035,'sine'); setTimeout(()=>tone(660,0.07,0.035,'sine'),60); },
  feed: ()=>{ tone(240,0.05,0.03,'triangle'); setTimeout(()=>tone(180,0.06,0.03,'triangle'),70); },
  ok: ()=>{ tone(660,0.07,0.04,'sine'); setTimeout(()=>tone(880,0.09,0.04,'sine'),80); },
  ng: ()=>tone(220,0.10,0.05,'sawtooth'),
  mogumogu: ()=>{ tone(260,0.05,0.018,'triangle'); setTimeout(()=>tone(190,0.06,0.018,'triangle'),70); },
};
function startLoadingSfx(){
  if(loadingSfxTimer) return;
  // もぐもぐ音を一定間隔で鳴らす（控えめ）
  sfx.mogumogu();
  loadingSfxTimer = setInterval(()=>{ sfx.mogumogu(); }, 850);
}
function stopLoadingSfx(){
  if(!loadingSfxTimer) return;
  clearInterval(loadingSfxTimer);
  loadingSfxTimer = null;
}

window.addEventListener('pointerdown', ()=>unlockAudio(), {once:true});

// ================================
// data
// ================================
const ANIMALS = [
  { id:'lion',     name:'ライオン',  emoji:'🦁', img:'./img/raion.webp',    first:'オレ' },
  { id:'penguin',  name:'ペンギン',  emoji:'🐧', img:'./img/pengin.webp',   first:'ぼく' },
  { id:'capybara', name:'カピバラ',  emoji:'🦫', img:'./img/kapipara.webp', first:'わたし' },
  { id:'panda',    name:'パンダ',    emoji:'🐼', img:'./img/panda.webp',    first:'ぼく' },
];

const PERSONALITY = {
  lion:     '自信家で王様気質',
  penguin:  '元気で好奇心旺盛',
  capybara: 'のんびりマイペース',
  panda:    'おっとりで食いしんぼう',
};

const FOOD_TYPES = ['肉','草','タイヤ','激辛料理'];
const BEG_LINES = {
  lion: ['腹が減ったぜ…','なにかくれよ！','うまいの頼む！'],
  penguin:['おなかすいた〜','なんかある？','もぐもぐしたい！'],
  capybara:['のんびり…食べたい…','なにか…ちょうだい…','おなか…すいた…'],
  panda:['たけ…ほしい…','もぐもぐ…したい…','なにか…ある？'],
};
const MEGA_DISLIKE = {
  'タイヤ': {
    base: {
      lion:['それ食べものじゃねぇ！','ゴム臭っ！ムリだ！','歯が折れるって！'],
      penguin:['それ、食べものじゃないよ〜！','くちばし痛い…！','ゴムはやだ…'],
      capybara:['ごむ…むり…','かたい…やめる…','におい…だめ…'],
      panda:['たけじゃない…だめ…','ころころ…いらない…','むり…ゴム…'],
    },
    body:['口元に近づけたら、すぐ目をそらした…。','見た瞬間、距離をとった…！','かじりかけて…ぷいっ！と転がした。'],
    extra:'（ゴムの匂い…！）',
    mood:'😡',
    emoji:'🛞',
  },
  '激辛料理': {
    base: {
      lion:['か、辛っ！舌が燃える！','口の中が火事だ！','これ…戦いか！？'],
      penguin:['からいっ！水〜！','くちがヒリヒリ…！','あつい…むり…'],
      capybara:['からい…むり…','ひりひり…やめる…','むせる…'],
      panda:['うぅ…辛い…','たけ…たけ…（求）','しびれる…やめる…'],
    },
    body:['一口で目がうるうる…！','からすぎて…しばらくフリーズした…！','舌がヒリヒリ！バタバタしている！'],
    extra:'（舌がヒリヒリ…！）',
    mood:'😡',
    emoji:'🌶️',
  },
};
const NEUTRAL_LINES = {
  lion:['ふーん。','…普通だな。','まあ、食べられる。'],
  penguin:['ふつう。','うん。','まあまあ。'],
  capybara:['ふつう…','まあ…','悪くない…'],
  panda:['ふつう。','うん。','まあまあ。'],
};

// ================================
// state
// ================================
const state = { animal:null, locked:false, begTimer:null, reqId:0 };

function stopBegLoop(){
  if(state.begTimer){ clearTimeout(state.begTimer); state.begTimer=null; }
}
function startBegLoop(){
  stopBegLoop();
  const a=state.animal;
  if(!a || !el.begLine) return;
  const lines = BEG_LINES[a.id] || [];
  if(!lines.length) return;
  const tick=()=>{
    if(!state.animal) return;
    el.begLine.textContent = pick(lines);
    state.begTimer = setTimeout(tick, 2400 + Math.floor(Math.random()*2000));
  };
  state.begTimer = setTimeout(tick, 350);
}

function gotoSelect(){
  state.locked=false;
  state.animal=null;
  stopBegLoop();
  setLoading(false);
  closeImageModal();
  if(el.freeInput) el.freeInput.value='';
  showScreen('select');
}
function gotoGame(animalId){
  const a = ANIMALS.find(x=>x.id===animalId);
  if(!a) return;
  state.animal=a;
  state.locked=false;
  setImgSafe(el.animalImg, a.img, a.name);
  setImgSafe(el.loadingAnimalImg, a.img, a.name);
  if(el.begLine) el.begLine.textContent='…';
  showScreen('game');
  startBegLoop();
}

function classifyFood(input){
  const raw=(input||'').trim();
  if(!raw) return {raw:'', category:'肉'};
  if(FOOD_TYPES.includes(raw)) return {raw, category:raw};
  const t = raw.toLowerCase();
  if(['タイヤ','ホイール','車輪','くるま','バイク','ゴム'].some(k=>t.includes(k))) return {raw, category:'タイヤ'};
  if(['激辛','辛','辛い','唐辛子','チリ','ハバネロ','麻婆','担々','火鍋','カレー','わさび','ペヤング'].some(k=>t.includes(k))) return {raw, category:'激辛料理'};
  if(['草','笹','葉','はっぱ','牧草','芝','しば','竹','たけ','クローバー'].some(k=>t.includes(k))) return {raw, category:'草'};
  return {raw, category:'肉'};
}
function judgeScore(category){
  let base=60;
  if(category==='草') base=55;
  if(category==='タイヤ') base=10;
  if(category==='激辛料理') base=20;
  const score = clamp(base + (Math.floor(Math.random()*21)-10), 0, 100);
  let outcome='せいこう';
  if(score>=80) outcome='だいせいこう';
  else if(score>=55) outcome='せいこう';
  else if(score>=35) outcome='びみょう';
  else outcome='しっぱい';
  if(category==='タイヤ') outcome='しっぱい';
  if(category==='激辛料理' && outcome==='だいせいこう') outcome='びみょう';
  const art = (outcome==='だいせいこう'||outcome==='せいこう')?'😄':(outcome==='びみょう')?'😐':'😡';
  return {score,outcome,art};
}
function makeLocalText(animal, foodInfo, judged){
  const aId=animal.id;
  const cat=foodInfo.category;
  if(cat==='タイヤ' || cat==='激辛料理'){
    const meta = MEGA_DISLIKE[cat];
    const base = pick((meta.base||{})[aId] || ['やだ…']);
    const body = pick(meta.body || [`「${foodInfo.raw}」は苦手…`]);
    return { text:`${base}\n${body}\n${meta.extra}`.trim(), mood: meta.mood, foodEmoji: meta.emoji, ok:false };
  }
  const base = pick(NEUTRAL_LINES[aId] || ['ふつう。']);
  const body = pick([`「${foodInfo.raw}」をもぐもぐ。`,`「${foodInfo.raw}」を一口。`,`「${foodInfo.raw}」を食べた。`]);
  return { text:`${base}\n${body}`.trim(), mood: judged.art, foodEmoji:(cat==='肉')?'🍖':'🌿', ok:(judged.outcome==='だいせいこう'||judged.outcome==='せいこう') };
}
function foodVisual(foodInfo){
  if(foodInfo.category==='肉') return {en:'a steak'};
  if(foodInfo.category==='草') return {en:'a bundle of fresh green grass'};
  if(foodInfo.category==='タイヤ') return {en:'a rubber tire'};
  if(foodInfo.category==='激辛料理') return {en:'an extremely spicy dish with red chili peppers'};
  return {en: foodInfo.raw};
}

let apiMode = 'auto'; // 'json' | 'form' | 'auto'

async function fetchWithTimeout(url, options, timeoutMs){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeoutMs);
  try{
    const res = await fetch(url, { ...options, signal: controller.signal });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const txt = await res.text();
    let data = null;
    // JSONならparse
    try{ data = JSON.parse(txt); }catch(_e){ data = null; }
    return { ok: res.ok, status: res.status, data, text: txt, contentType: ct };
  }catch(e){
    if(e && e.name === 'AbortError') return { ok:false, status:0, data:null, text:'', contentType:'', error:'timeout' };
    return { ok:false, status:0, data:null, text:'', contentType:'', error: (e && e.message) ? e.message : String(e) };
  }finally{
    clearTimeout(timer);
  }
}

function normalizeGasResponse(r){
  if(!r) return { ok:false, error:'no_response' };
  if(!r.ok){
    return { ok:false, error: r.error || ('http_'+r.status), raw: r.text };
  }
  if(r.contentType && r.contentType.includes('text/html') && !r.data){
    return { ok:false, error:'html_response', raw: r.text };
  }
  if(r.data && typeof r.data === 'object') return r.data;
  return { ok:true, message: String(r.text || '') };
}

async function callGas(payload, timeoutMs=30000){
  const tryJson = async ()=>{
    const r = await fetchWithTimeout(GAS_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload),
    }, timeoutMs);
    const out = normalizeGasResponse(r);
    if(out && out.ok !== false) apiMode = 'json';
    return out;
  };

  const tryForm = async ()=>{
    const form = new URLSearchParams();
    form.set('payload', JSON.stringify(payload));
    const flatKeys = ['mode','animalId','animalName','animalPersonality','animalFirst','foodRaw','category','categorySource','food','foodType','wantImage','imagePrompt','commentPrompt','prompt','text','nonce','gameVersion'];
    flatKeys.forEach(k=>{ if(payload[k] != null) form.set(k, String(payload[k])); });
    if(payload.allowedCategories) form.set('allowedCategories', JSON.stringify(payload.allowedCategories));

    const r = await fetchWithTimeout(GAS_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8' },
      body: form.toString(),
    }, timeoutMs);
    const out = normalizeGasResponse(r);
    if(out && out.ok !== false) apiMode = 'form';
    return out;
  };

  if(apiMode === 'json') return await tryJson();
  if(apiMode === 'form') return await tryForm();

  const a = await tryJson();
  if(a && a.ok !== false) return a;
  const b = await tryForm();
  return b;
}
function extractImageSrc(gasData){
  if(!gasData) return '';

  // data URI そのまま
  const direct = gasData.image_datauri || gasData.datauri || gasData.dataUri || (gasData.image && (gasData.image.datauri || gasData.image.dataUri));
  if(typeof direct === 'string' && direct.startsWith('data:')) return direct;

  // URL形式
  const url =
    gasData.imageUrl ||
    gasData.image_url ||
    gasData.url ||
    gasData.image ||
    gasData.imageURL ||
    (gasData.image && (gasData.image.url || gasData.image.imageUrl || gasData.image.image_url)) ||
    (gasData.result && (gasData.result.imageUrl || gasData.result.image_url || gasData.result.url));
  if(typeof url === 'string'){
    if(url.startsWith('data:')) return url;
    if(/^https?:\/\//.test(url)) return url;
  }

  // base64形式（想定キー多数）
  const b64 =
    gasData.image_b64 ||
    gasData.imageBase64 ||
    gasData.image_base64 ||
    gasData.b64 ||
    (gasData.image && (gasData.image.b64 || gasData.image.base64 || gasData.image.b64_json)) ||
    (gasData.data && gasData.data[0] && (gasData.data[0].b64_json || gasData.data[0].b64)) ||
    (gasData.result && (gasData.result.image_b64 || gasData.result.imageBase64 || gasData.result.b64));

  if(typeof b64 === 'string' && b64.length > 50){
    const mime =
      gasData.image_mime ||
      gasData.mime ||
      gasData.contentType ||
      (gasData.image && (gasData.image.mime || gasData.image.contentType)) ||
      (gasData.result && (gasData.result.image_mime || gasData.result.mime)) ||
      'image/webp';
    return `data:${mime};base64,${b64}`;
  }

  // images 配列
  const arr = gasData.images || (gasData.data && Array.isArray(gasData.data) ? gasData.data : null);
  if(Array.isArray(arr) && arr.length){
    const one = arr[0];
    const b = one && (one.b64_json || one.b64 || one.base64);
    if(typeof b === 'string' && b.length > 50){
      const mime = one.mime || one.contentType || gasData.image_mime || 'image/webp';
      return `data:${mime};base64,${b}`;
    }
    const u = one && (one.url || one.imageUrl || one.image_url);
    if(typeof u === 'string' && /^https?:\/\//.test(u)) return u;
  }

  return '';
}
function isBadAiLine(line){
  const s=String(line||'').trim();
  if(!s) return true;
  if(s.length<2||s.length>70) return true;
  const ng=['プロンプト','prompt','```','function','const ','return ','http://','https://'];
  if(ng.some(k=>s.toLowerCase().includes(k))) return true;
  if(!/[ぁ-んァ-ヶ一-龯]/.test(s)) return true;
  return false;
}

async function handleFeed(raw, fromQuick=false){
  const input=(raw||'').trim();
  if(!input){ showToast('なにか入力してね', true); return; }
  if(state.locked) return;
  if(!state.animal){ gotoSelect(); return; }
  state.locked=true;

  const a=state.animal;
  const foodInfo = classifyFood(input);
  // 4択ボタンならカテゴリ固定。フリー入力はGAS側でカテゴリ判定してもらう（categoryを空にする）
  const categorySource = fromQuick ? 'fixed' : 'auto_requested';
  const categoryForGas = fromQuick ? foodInfo.category : '';

  const judged=judgeScore(foodInfo.category);
  const local=makeLocalText(a, foodInfo, judged);

  // ローカル結果（必ず）
  try{
    setImgSafe(el.resultAnimalImg, a.img, a.name);
    if(el.resultSub) el.resultSub.textContent = `入力：${foodInfo.raw}`;
    if(el.resultEmoji) el.resultEmoji.textContent = local.mood || judged.art;
    if(el.resultFoodBadge) setFoodBadge(el.resultFoodBadge, foodInfo.category, foodInfo.raw);
    if(el.resultMoodBadge) el.resultMoodBadge.textContent = `きぶん：${local.mood || judged.art}`;
    if(el.resultText) el.resultText.textContent = local.text;
    if(el.resultImageWrap) el.resultImageWrap.classList.add('isHidden');
    if(el.resultImage){ el.resultImage.removeAttribute('src'); el.resultImage.alt=''; }
  }catch(e){ console.warn(e); }

  showScreen('result');
  (local.ok ? sfx.ok : sfx.ng)();

  // GAS 後追い
  const myReq = ++state.reqId;
  debugState.gas = 'wait';
  renderDebug();
  setLoading(true); // ← AI表現を避ける

  try{
    const fv = foodVisual(foodInfo);
    const moodWord = (foodInfo.category==='タイヤ'||foodInfo.category==='激辛料理') ? 'disgusted' : 'delighted';
    const imagePrompt = [
      'Square 1:1, cute flat illustration, game art.',
      `Animal: ${a.name} ${a.emoji}. Medium close-up, centered.`,
      // 食べ物の一致を強制（ここが最重要）
      `FOOD MUST MATCH EXACTLY: "${foodInfo.raw}".`,
      `ONLY FOOD: ${fv.en}. This is the only food in the entire image.`,
      `MUST show the food clearly: ${fv.en} ("${foodInfo.raw}") large in the foreground, in the animal\\'s mouth or paws.`,
      'Do NOT include any other foods or dishes (no fish, no vegetables, no fruit, no milk, no picnic basket, no bowl, no sweets). One single food item only.',
      `Reaction: ${moodWord} (exaggerated).`,
      'Background: plain solid color. No wide landscape. No scenery.',
      'No text, no logo, no extra animals. Do NOT omit the food.'
    ].join('\\n');

    const personality = PERSONALITY[a.id] || 'やさしい';
    const commentPrompt =
      `あなたは「${a.name}」という動物です。性格は「${personality}」。` +
      `今「${foodInfo.raw}」を食べました。` +
      `（${a.first}の口調で）、60文字以内で感想を言ってください。`;

    const payload = {
      mode: 'feed',
      gameVersion: VERSION,
      animalId: a.id,
      animalName: a.name,
      animalPersonality: personality,
      animalFirst: a.first,
      foodRaw: foodInfo.raw,
      category: categoryForGas,
      categorySource,
      allowedCategories: FOOD_TYPES,
      // 互換：旧キー
      food: foodInfo.raw,
      foodType: categoryForGas,
      imagePrompt,
      commentPrompt,
      prompt: imagePrompt,
      text: commentPrompt,
      nonce: String(Date.now()) + '-' + Math.random(),
      wantImage: true,
    };
    const gasData = await callGas(payload, 30000);
    if(myReq !== state.reqId) return;

    if(!gasData || gasData.ok===false){
      debugState.gas = gasData ? (gasData.error||'ng') : 'ng';
      renderDebug();
      return;
    }
    debugState.gas = 'ok';
    renderDebug();

    const line = firstLine(gasData.message);
    if(line && !isBadAiLine(line) && el.resultText){
      if(foodInfo.category==='タイヤ'||foodInfo.category==='激辛料理'){
        const pos=['うまい','おいしい','最高','すき','大好き','やった'];
        if(!pos.some(k=>line.includes(k))) el.resultText.textContent=line;
      } else {
        el.resultText.textContent=line;
      }
    }

    const src = extractImageSrc(gasData);
    if(!src){
      debugState.gas = 'ok-noimg';
      renderDebug();
    }

    if(src && el.resultImageWrap && el.resultImage){
      el.resultImage.src = src;
      el.resultImage.alt = `${a.name}が${foodInfo.raw}を食べているイラスト`;
      el.resultImageWrap.classList.remove('isHidden');
    }
  } finally {
    setLoading(false);
    state.locked=false;
  }
}

function safeRun(fn){
  return async (...args)=>{
    try{
      await unlockAudio();
      await fn(...args);
    }catch(e){
      console.warn(e);
      showToast('処理に失敗しました', true);
      state.locked=false;
      setLoading(false);
    }
  };
}

function bind(){
  showScreen('select');

  $$('[data-animal]').forEach(node=>{
    node.addEventListener('click', safeRun(()=>{
      sfx.select();
      gotoGame(node.getAttribute('data-animal'));
    }));
  });

  $$('[data-quick]').forEach(btn=>{
    btn.addEventListener('click', safeRun(()=>{
      sfx.feed();
      return handleFeed(btn.getAttribute('data-quick'), true);
    }));
  });

  el.btnSend?.addEventListener('click', safeRun(()=>{
    sfx.feed();
    const v = el.freeInput?.value || '';
    if(el.freeInput) el.freeInput.value='';
    return handleFeed(v, false);
  }));

  el.freeInput?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); el.btnSend?.click(); }
  });

  el.btnResultBack?.addEventListener('click', safeRun(()=>{
    sfx.click();
    gotoSelect();
  }));

  el.toastClose?.addEventListener('click', ()=>{
    sfx.click();
    el.toast?.classList.remove('show');
  });

  el.resultImage?.addEventListener('click', ()=>{
    if(el.resultImage?.src){
      sfx.click();
      openImageModal(el.resultImage.src);
    }
  });

  el.imgModalClose?.addEventListener('click', ()=>{
    sfx.click();
    closeImageModal();
  });
  el.imgModalBackdrop?.addEventListener('click', ()=>closeImageModal());

  renderDebug();
}
bind();
