'use strict';

/*
  v28
  - タイトル画面：広々レイアウト
  - GAS Web App にPOST（text/plain）して {ok, message, image_b64, image_mime} を受け取る
  - 画像生成結果を結果画面に表示
  - 中止ボタンは一旦なし（待機中はもぐもぐ表示のみ）
*/

// ================================
// GAS（URLはコードに直書き）
// ================================
const GAS_URL = 'https://script.google.com/a/macros/happy-epo8.com/s/AKfycbzNsriAaYZoBL9JTyqlbiWc9oSUcU4Cj3-lZS6sG6i0Lm28QHImhCsLdFA4i37WKujvkg/exec';
function getGasUrl(){ return GAS_URL; }

function setGasUrl(url){
  try { localStorage.setItem(GAS_STORAGE.url, (url || '').trim()); } catch(_){}
}
function getUseImage(){
  try {
    const v = localStorage.getItem(GAS_STORAGE.useImage);
    if(v === null) return true; // デフォルトON
    return v === '1';
  } catch(_){ return true; }
}
function setUseImage(on){
  try { localStorage.setItem(GAS_STORAGE.useImage, on ? '1' : '0'); } catch(_){}
}


/** GASにPOSTして {ok, message, image_b64, image_mime} を受け取る */
async function callGas(payload){
  const url = getGasUrl();
  if(!url) throw new Error('GAS URL が未設定です');

  // GASはOPTIONS(プリフライト)が弱いことがあるので、
  // プリフライトが走りにくい "application/x-www-form-urlencoded" で送る
  const form = new URLSearchParams();

  // ① JSONをそのまま渡す（最優先）
  form.set('payload', JSON.stringify(payload));

  // ② パラメータをフラットにも渡す（GAS側実装差異に強くする）
  try{
    if(payload.mode) form.set('mode', String(payload.mode));
    if(payload.animalName) form.set('animalName', String(payload.animalName));
    if(payload.animal) form.set('animal', String(payload.animal));
    if(payload.food) form.set('food', String(payload.food));
    if(payload.feed) form.set('feed', String(payload.feed));
    if(payload.item) form.set('item', String(payload.item));
    if(payload.outcome) form.set('outcome', String(payload.outcome));
    if(typeof payload.like !== 'undefined') form.set('like', payload.like ? '1' : '0');
    if(typeof payload.wantImage !== 'undefined') form.set('wantImage', payload.wantImage ? '1' : '0');

    // 画像プロンプト（GAS側が prompt を読んでいる場合に合わせる）
    const p = payload.imagePrompt || payload.imgPrompt || payload.prompt || '';
    if(p) {
      form.set('imagePrompt', p);
      form.set('imgPrompt', p);
      form.set('prompt', p);
    }

    // コメントプロンプト（GAS側が text を読んでいる場合に合わせる）
    const t = payload.commentPrompt || payload.textPrompt || '';
    if(t) {
      form.set('commentPrompt', t);
      form.set('textPrompt', t);
      form.set('text', t);
    }
  }catch(_){/* noop */}
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form
  });

  const txt = await res.text();

  if(!res.ok){
    // 画面側で原因が追えるように本文の先頭だけ含める
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 180)}`);
  }

  let data;
  try{
    data = JSON.parse(txt);
  }catch(_){
    // JSONで返さないGASもあるので、HTMLっぽい場合だけエラー扱い
    const t = (txt || '').trim();
    if(t.startsWith('<') || t.toLowerCase().includes('<html')){
      throw new Error(`HTTP ${res.status}: ${t.slice(0, 180)}`);
    }
    return { ok:true, message: t };
  }

  if(data && data.ok === false) throw new Error(data.error || 'GAS error');
  return data || {};
}


/** GASにPOST（text/plain）で「文字列プロンプト」を渡す（GASが生テキストをプロンプトとして使う実装に対応） */
async function callGasText(promptText){
  const url = getGasUrl();
  if(!url) throw new Error('GAS URL が未設定です');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: String(promptText ?? '')
  });

  const txt = await res.text();
  if(!res.ok){
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 180)}`);
  }

  try{
    return JSON.parse(txt);
  }catch(_){
    const t = (txt || '').trim();
    // HTMLが返ったらエラー扱い
    if(t.startsWith('<') || t.toLowerCase().includes('<html')) throw new Error(t.slice(0, 180));
    return { ok:true, message: t };
  }
}

function getFirstVariants(animalId){
  const map = {
    lion: ['オレ','俺'],
    penguin: ['ボク','僕'],
    capybara: ['ぼく','僕'],
    panda: ['ぼく','ボク','僕']
  };
  return map[animalId] || [];
}

function normalizeCommentText(msg){
  if(!msg) return '';
  let t = String(msg).trim();
  // まず1行目を優先
  const firstLine = t.split('\n').map(x=>x.trim()).filter(Boolean)[0];
  if(firstLine) t = firstLine;

  // 空白を詰める
  t = t.replace(/\s+/g, ' ').trim();

  // 先頭の引用符っぽい記号を除去
  t = t.replace(/^[「\"'＂]+/, '').replace(/[」\"'＂]+$/, '').trim();

  // 2文までにする
  const parts = t.split(/(?<=[。！？!])\s*/);
  if(parts.length > 2) t = parts.slice(0, 2).join('');

  // 長すぎる場合は省略
  if(t.length > 60) t = t.slice(0, 60) + '…';
  return t;
}

function buildUnifiedPrompt(animalId, animalName, food, mood, foodVisualJa){
  const first = (PERSONA[animalId] && PERSONA[animalId].first) ? PERSONA[animalId].first : 'わたし';
  const fv = foodVisualJa ? String(foodVisualJa) : food;

  return [
    // コメントは先頭に（GASが先頭だけ使う場合の保険）
    `【コメント】あなたは${animalName}。一人称は「${first}」。日本語で1文だけ（18〜32文字）。`,
    `「${food}」を食べた直後の感想。表情は「${mood}」。説明・第三者視点・英語・コード・プロンプト復唱は禁止。`,
    '',
    // 画像（えさを必ず描かせる）
    '【画像】Square 1:1 / cute flat game illustration / medium close-up / centered.',
    `${animalName}が「${food}」（${fv}）を口元か手元で食べている。食べ物は前景で大きく、必ず見える。`,
    `表情は${mood}（わかりやすく誇張）。背景は単色。風景・広い背景は禁止。`,
    '文字/ロゴ/説明文は入れない。動物だけの単体絵は禁止。食べ物を省略しない。'
  ].join('\n');
}


function buildCommentOnlyPrompt(animalId, animalName, food, mood, bucket){
  const first = (PERSONA[animalId] && PERSONA[animalId].first) ? PERSONA[animalId].first : 'わたし';
  // 感想「だけ」を返させる（設定文・条件文を返させない）
  const b = bucket ? `（好み：${bucket}）` : '';
  return `（${animalName}の${first}）「${food}」を食べた${mood}な感想を、日本語で1文だけ。感想の文だけ出力。${b}`;
}



function isMetaInstructionJapanese(msg){
  if(!msg) return false;
  const t = String(msg).trim();
  const s = t.replace(/\s+/g,'');
  // 典型的な「条件・設定文」の復唱
  if(s.includes('あなたは') && (s.includes('一人称') || s.includes('必ず') || s.includes('返して') || s.includes('禁止') || s.includes('日本語で') || s.includes('文だけ') || s.includes('第三者視点') || s.includes('条件') || s.includes('出力'))){
    return true;
  }
  // 「一人称は『ぼく』」のような設定だけが返ってくる
  if(s.startsWith('あなたは') && s.includes('一人称') && (s.includes('。') || s.includes('！') || s.includes('!'))){
    return true;
  }
  // 命令形が強い
  const cmdHints = ['〜して','してください','してね','返して','出して','出力','禁止','条件','次の'];
  if(cmdHints.some(w => s.includes(w.replace('〜','')) ) && (s.includes('日本語') || s.includes('一文') || s.includes('1文') || s.includes('一人称'))){
    return true;
  }
  return false;
}
function isPromptEchoText(msg){
  if(!msg) return false;
  const t = String(msg).trim();

  // 設定文・条件文（メタ指示）の復唱はプロンプトエコー扱い
  if(isMetaInstructionJapanese(t)) return true;

  // 自分が送ったJSONやプロンプトがそのまま返ってきたパターン
  if(t.startsWith('{') && t.endsWith('}')){
    const low = t.toLowerCase();
    if(low.includes('"mode"') && (low.includes('"feed"') || low.includes('feed')) &&
       (low.includes('animal') || low.includes('food') || low.includes('wantimage'))){
      return true;
    }
  }
  // こちらの統合プロンプトの見出しが残っている
  if(t.includes('【画像】') || t.includes('【コメント】')) return true;

  // prompt系フィールドや説明文が混ざっている
  const low = t.toLowerCase();
  if(low.includes('imageprompt') || low.includes('commentprompt') || low.includes('textprompt')) return true;

  // 「プロンプトについて説明しているだけ」の文章（第三者説明・メタ文）
  const metaHints = [
    'the prompt', 'prompt for the image', 'here is an image',
    'this image', 'proportions are', 'background is a single color'
  ];
  if(metaHints.some(w => low.includes(w))) return true;

  return false;
}

function isBadCommentText(msg, animalId){
  const t = sanitizeMessage(msg);
  if(!t) return true;
  // プロンプトのエコー（送信内容がそのまま返る等）はコメントとして不適切
  if(isPromptEchoText(t)) return true;
  // 日本語が含まれないコメントはNG（ゲーム向け）
  if(!/[ぁ-んァ-ヶ一-龠]/.test(t)) return true;

  // 動物の一人称が入っていない（=第三者視点になりがち）ならNGにして作り直す
  const firsts = getFirstVariants(animalId);
  if(firsts.length){
    const hasFirst = firsts.some(w => t.includes(w));
    if(!hasFirst) return true;
  }
  // 長すぎるのもNG（画面を押し広げる）
  if(t.length > 70) return true;
  // プロンプト説明っぽい語
  const bad = ['prompt', 'proportion', 'Here is an image', 'The prompt', 'This image', 'Lions are'];
  const lower = t.toLowerCase();
  if(bad.some(w => lower.includes(w.toLowerCase()))) return true;
  return false;
}


function isProbablyCodeText(s){
  if(!s) return false;
  const t = String(s).trim();

  // 典型的な「関数本文がそのまま出てしまう」パターン
  if(/^async\s+function\b/.test(t) || /^function\b/.test(t)) return true;

  // Markdownのコードブロックだけが出ている
  if(/^```[\s\S]*```$/.test(t)) return true;

  // JS/GASっぽい単語・記号が多い
  const codeWords = /(UrlFetchApp|ContentService|doPost|doGet|JSON\.stringify|return\b|const\b|let\b|var\b|=>|\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\bclass\b)/;
  if(codeWords.test(t)) return true;

  // 記号比率が高い（=コードっぽい）
  const punct = (t.match(/[{};=<>]/g) || []).length;
  if(t.length >= 120 && punct / Math.max(1, t.length) > 0.04) return true;

  if(t === '[object Object]') return true;
  return false;
}




function deepFindHumanText(obj){
  // オブジェクト全体から「それっぽい短い文章」を探す（base64等は除外）
  const candidates = [];
  const seen = new Set();

  const visit = (v)=>{
    if(v === null || v === undefined) return;
    if(typeof v === 'string'){
      const s = v.trim();
      if(!s) return;
      if(s.length > 1200) return; // 長すぎは除外（base64等）
      if(s.startsWith('data:image')) return;
      if(/^[A-Za-z0-9+/=]{300,}$/.test(s)) return;
      candidates.push(s);
      return;
    }
    if(typeof v !== 'object') return;
    if(seen.has(v)) return;
    seen.add(v);
    if(Array.isArray(v)){
      for(const it of v) visit(it);
    }else{
      for(const k of Object.keys(v)){
        const key = String(k).toLowerCase();
        if(key.includes('prompt')) continue; // imagePrompt/commentPrompt等
        if(key === 'rawresponse') continue;  // 巨大で誤抽出しやすい
        visit(v[k]);
      }
    }
  };

  visit(obj);

  // 日本語っぽいのを優先
  const jp = candidates.filter(s => /[ぁ-んァ-ヶ一-龥]/.test(s));
  const pool = jp.length ? jp : candidates;

  // コードっぽいのを除外して、短い順で
  const cleaned = pool
    .map(sanitizeMessage)
    .filter(s => s && s.length <= 220)
    .filter(s => !isPromptEchoText(s) && !isMetaInstructionJapanese(s));

  return cleaned[0] || '';
}


function extractMessage(gasData){
  if(!gasData) return '';

  // OpenAI Responses API っぽい形
  try{
    if(typeof gasData.output_text === 'string' && gasData.output_text.trim()) return gasData.output_text.trim();
    if(Array.isArray(gasData.output)){
      for(const item of gasData.output){
        if(item && Array.isArray(item.content)){
          for(const c of item.content){
            if(c && typeof c.text === 'string' && c.text.trim()) return c.text.trim();
          }
        }
      }
    }
  }catch(_){/* ignore */}

  // Chat Completions っぽい形
  try{
    const cc = gasData.choices && gasData.choices[0] && gasData.choices[0].message && gasData.choices[0].message.content;
    if(typeof cc === 'string' && cc.trim()) return cc.trim();
  }catch(_){/* ignore */}

  // よくあるキー
  let m =
    gasData.message ??
    gasData.comment ??
    gasData.text ??
    gasData.reply ??
    gasData.result ??
    gasData.output ??
    gasData.response ??
    '';

  if(typeof m !== 'string'){
    try{ m = JSON.stringify(m); }catch(_){ m = String(m); }
  }

  const trimmed = (m || '').trim();

  // message自体がJSON文字列のケース
  if((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))){
    try{
      const obj = JSON.parse(trimmed);
      const inner = extractMessage(obj);
      if(inner) return inner;
    }catch(_){ /* ignore */ }
  }

  // まだ空 or コードっぽいなら、全体から文章候補を探索
  const safe = sanitizeMessage(trimmed);
  if(safe) return safe;

  const deep = deepFindHumanText(gasData);
  if(deep) return deep;

  return trimmed;
}


function sanitizeMessage(msg){
  if(!msg) return '';
  let t = String(msg).trim();

  // JSON文字列だったら中身をもう一段見る（message/comment等）
  if((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))){
    try{
      const obj = JSON.parse(t);
      const inner = extractMessage(obj);
      if(inner) t = String(inner).trim();
    }catch(_){/* ignore */}
  }

  // Markdownコードブロックを除去（文章が残る場合はそれを採用）
  if(t.includes('```')){
    const removed = t.replace(/```[\s\S]*?```/g, '').trim();
    if(removed) t = removed;
  }

  // それでもコードっぽいなら空扱い（ローカルにフォールバックさせる）
  if(isProbablyCodeText(t)) return '';
  return t.trim();
}


function extractImageSrc(gasData){
  if(!gasData) return null;

  // data URI がそのまま来るケース
  const direct = gasData.image_datauri || gasData.datauri || gasData.dataUri;
  if(typeof direct === 'string' && direct.startsWith('data:')) return { src: direct };

  // URL形式
  const url = gasData.imageUrl || gasData.image_url || gasData.url || gasData.image || gasData.imageURL;
  if(typeof url === 'string' && /^https?:\/\//.test(url)) return { src: url };

  // base64形式（想定キー多数）
  const b64 =
    gasData.image_b64 ||
    gasData.imageBase64 ||
    gasData.b64 ||
    (gasData.data && gasData.data[0] && (gasData.data[0].b64_json || gasData.data[0].b64));

  if(typeof b64 === 'string' && b64.length > 50){
    const mime = gasData.image_mime || gasData.mime || gasData.contentType || 'image/webp';
    return { src: `data:${mime};base64,${b64}`, mime };
  }

  return null;
}

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
  // ※ライオン：肉が好き、草＆野菜が苦手
  { id:'lion',    name:'ライオン',   img:'./img/raion.webp',    emoji:'🦁', likes:['肉'],        dislikes:['草','野菜'] },
  { id:'penguin', name:'ペンギン',   img:'./img/pengin.webp',   emoji:'🐧', likes:['魚'],        dislikes:['肉'] },
  // ※カピバラ：草＆野菜が好き、肉＆魚は苦手
  { id:'capybara',name:'カピバラ',   img:'./img/kapipara.webp', emoji:'🦫', likes:['草','野菜'], dislikes:['肉','魚'] },
  // ※パンダ：竹(草)が好き、肉＆魚は苦手
  { id:'panda',   name:'パンダ',     img:'./img/panda.webp',    emoji:'🐼', likes:['草'],        dislikes:['肉','魚'] }
];
const QUICK_OPTIONS = ['肉','魚','草','野菜'];

// ================================
// Neutral reactions（好きでも嫌いでもない = 平凡）
// ================================
const NEUTRAL_REACT = {
  lion: ['ふーん。', '…普通だな。', 'まあ、食べられる。'],
  penguin: ['うん。', 'ふつうだね。', 'まあまあ。'],
  capybara: ['ふつう…', 'まあ…', '悪くない…'],
  panda: ['ふつう。', 'うん。', 'まあまあ。'],
};

// ================================
// 画像用：えさを「描ける具体物」に寄せる（A案）
// ================================
function foodVisual(itemInfo){
  const t = String(itemInfo.raw || '').replace(/[\s　]+/g,'').toLowerCase();

  const table = [
    {keys:['にんじん','人参'], ja:'にんじん', en:'a carrot'},
    {keys:['キャベツ'], ja:'キャベツ', en:'a cabbage'},
    {keys:['レタス'], ja:'レタス', en:'lettuce'},
    {keys:['トマト'], ja:'トマト', en:'a tomato'},
    {keys:['きゅうり'], ja:'きゅうり', en:'a cucumber'},
    {keys:['竹','たけ','笹','ささ','バンブー'], ja:'竹の葉', en:'bamboo leaves'},
    {keys:['ステーキ'], ja:'ステーキ', en:'a steak'},
    {keys:['ハンバーグ'], ja:'ハンバーグ', en:'a hamburger steak'},
    {keys:['さかな','魚'], ja:'魚の切り身', en:'a fish fillet'},
    {keys:['サーモン'], ja:'サーモン', en:'salmon'},
    {keys:['ジャーキー'], ja:'ジャーキー', en:'jerky'},
  ];

  for(const row of table){
    if(row.keys.some(k => t.includes(String(k).toLowerCase().replace(/[\s　]+/g,'')))) return { ja:row.ja, en:row.en };
  }

  if(itemInfo.category === '肉') return { ja:'ステーキ', en:'a steak' };
  if(itemInfo.category === '魚') return { ja:'魚の切り身', en:'a fish fillet' };
  if(itemInfo.category === '草') return { ja:'青い草の束', en:'a bundle of fresh green grass' };
  if(itemInfo.category === '野菜') return { ja:'野菜（小皿）', en:'a small plate of vegetables' };

  return { ja:`小皿にのった「${itemInfo.raw}」`, en:`a small plate of "${itemInfo.raw}"` };
}

function moodFromBucket(bucket){
  if(bucket === 'like') return { ja:'うれしそう', en:'delighted' };
  if(bucket === 'dislike') return { ja:'イヤそう', en:'disgusted' };
  return { ja:'ふつうの顔', en:'neutral expression' };
}




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
  toastText: document.getElementById('toastText'),
  toastClose: document.getElementById('toastClose'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingLine: document.getElementById('loadingLine'),
  loadingAnimalImg: document.getElementById('loadingAnimalImg'),

  // 画像表示
  resultImageWrap: document.getElementById('resultImageWrap'),
  resultImage: document.getElementById('resultImage'),
  resultFoodBadge: document.getElementById('resultFoodBadge'),
  resultMoodBadge: document.getElementById('resultMoodBadge'),

  // API設定
  btnApi: document.getElementById('btnApi'),
  apiModal: document.getElementById('apiModal'),
  gasUrlInput: document.getElementById('gasUrlInput'),
  useImageToggle: document.getElementById('useImageToggle'),
  btnApiTest: document.getElementById('btnApiTest'),
  btnApiSave: document.getElementById('btnApiSave'),
  btnApiClose: document.getElementById('btnApiClose'),
  imgModal: document.getElementById('imgModal'),
  imgModalBackdrop: document.getElementById('imgModalBackdrop'),
  imgModalClose: document.getElementById('imgModalClose'),
  imgModalImg: document.getElementById('imgModalImg'),
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

let toastTimer = null;
function hideToast(){
  if(!el.toast) return;
  if(toastTimer){
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  el.toast.classList.remove('show');
  el.toast.classList.remove('isError');
  el.toast.setAttribute('aria-live', 'polite');
}
function showToast(text){
  if(!el.toast) return;
  if(toastTimer){
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  el.toast.classList.remove('isError');
  el.toast.setAttribute('aria-live', 'polite');
  if(el.toastText) el.toastText.textContent = text;
  else el.toast.textContent = text;
  el.toast.classList.add('show');
  toastTimer = window.setTimeout(() => hideToast(), 1500);
}

// エラーは自動で消さず、×で閉じるまで表示
function showError(text){
  if(!el.toast) return;
  if(toastTimer){
    window.clearTimeout(toastTimer);
    toastTimer = null;
  }
  el.toast.classList.add('isError');
  el.toast.setAttribute('aria-live', 'assertive');
  if(el.toastText) el.toastText.textContent = text;
  else el.toast.textContent = text;
  el.toast.classList.add('show');
}

// API設定モーダル
function toggleApiModal(on){
  if(!el.apiModal) return;
  el.apiModal.classList.toggle('show', !!on);
  el.apiModal.setAttribute('aria-hidden', on ? 'false' : 'true');

  if(on){
    if(el.gasUrlInput) el.gasUrlInput.value = getGasUrl();
    if(el.useImageToggle) el.useImageToggle.checked = getUseImage();
  }
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
function pickPersonaBucket(animal, itemInfo){
  // 好き嫌いは「結果(outcome)」より優先して固定（逆転防止）
  const likes = animal.likes.includes(itemInfo.category);
  const dislikes = animal.dislikes.includes(itemInfo.category);
  if(likes) return 'like';
  if(dislikes) return 'dislike';
  return 'neutral'; // ←好きでも嫌いでもない = 平凡
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
  const bucket = pickPersonaBucket(animal, itemInfo);

  // ① 好き嫌いがない食べ物は「平凡」な反応（大げさにしない）
  let base = 'もぐもぐ…';
  if(bucket === 'neutral'){
    base = pick((NEUTRAL_REACT[animal.id] || ['ふーん。','…普通。','まあまあ。']));
  }else{
    base = persona ? pick(persona.react[bucket] || persona.react.unknown) : 'もぐもぐ…';
    base = applyToneRules(animal.id, base, bucket, itemInfo, judged);
  }

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

  const neutralBodies = [
    `「${itemInfo.raw}」をもぐもぐ。`,
    `「${itemInfo.raw}」を食べた。`,
    `「${itemInfo.raw}」を一口。`,
  ];

  const extra =
    (itemInfo.vibe === 'ファンタジー') ? '（なにか不思議なオーラが漂っている…）' :
    (itemInfo.vibe === 'ほっこり') ? '（やさしい匂いがする…）' :
    (itemInfo.vibe === 'スパイシー') ? '（鼻がツーン！）' :
    (itemInfo.vibe === 'ボリューム') ? '（量が多い…！）' : '';

  const body = (bucket === 'neutral') ? pick(neutralBodies) : pick(bodyTemplates[judged.outcome]);
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
    'しっぱい': '失敗…うまく食べられなかったみたい。'
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

  // まずローカルでゲーム判定（好き嫌い＆結果演出はここで確定）
  const judged = scoreFeeding(a, itemInfo);
  const reaction = generateLocalReaction(a, itemInfo, judged);
  const localResultText = buildResultText(itemInfo, judged, reaction);

  // GASに問い合わせ（テキスト＋画像）
  setLoading(true, pick([
    '動物がくんくんにおいをかいでいる…',
    'もぐもぐ…味をたしかめ中…',
    'しばらく観察している…',
    'イラストを準備中…'
  ]));

  let gasData = null;
  try{

    const bucket = reaction.bucket; // like / dislike / neutral
const moodObj = moodFromBucket(bucket);
const mood = moodObj.ja;

// 画像生成が「動物＋風景だけ」になりがちな時のため、えさ＆リアクションを強く固定
const fv = foodVisual(itemInfo);
const imagePrompt = [
  'Square 1:1 / cute flat game illustration.',
  `Medium close-up, centered: ${a.name} ${a.emoji}.`,
  `MUST show the food clearly: ${fv.en} ("${itemInfo.raw}") large in the foreground, in the mouth or paws.`,
  `Reaction: ${moodObj.en} (exaggerated, easy to read).`,
  'Background: plain solid color. No wide landscape / no scenery.',
  'No text, no logo. Do NOT omit the food.'
].join(' ');

const first = (PERSONA[a.id] && PERSONA[a.id].first) ? PERSONA[a.id].first : 'わたし';

const commentPrompt =
  `あなたは${a.name}。一人称は「${first}」。必ず一人称で話す。\n` +
  `「${itemInfo.raw}」を食べた直後の感想を、日本語で1文だけ（18〜32文字）。\n` +
  `（好み：${bucket} / 表情：${mood}）\n` +
  '第三者視点・説明・英語・コード・プロンプトの話は禁止。';
const payload = {
  mode: 'feed',

  // 動物（いくつか別名でも送る：GAS側の実装差異に合わせる）
  animal: a.id,
  animalId: a.id,
  animalName: a.name,
  animal_ja: a.name,

  // えさ（別名も送る）
  food: itemInfo.raw,
  feed: itemInfo.raw,
  meal: itemInfo.raw,
  item: itemInfo.raw,

  category: itemInfo.category,
  vibe: itemInfo.vibe,
  outcome: judged.outcome,
  score: judged.score,
  like: (bucket === 'like'),
  bucket,
  mood,
  foodVisual: fv.ja,

  // リアクションのヒント（画像/コメント生成に使えるように）
  mood,
  reactionText: reaction.text,
  commentator: reaction.commentator,

  // 画像生成
  wantImage: true,
  imageStyle: 'cute-flat',
  imagePrompt,   // 期待：このpromptをGASが使う場合がある
  prompt: imagePrompt,
  imgPrompt: imagePrompt,

  // コメント生成
  commentPrompt,
  textPrompt: commentPrompt
};

// ① まずは「生テキスト」を投げる（GASが e.postData.contents をそのままプロンプトにしている場合に効く）
try{
  const unified = buildUnifiedPrompt(a.id, a.name, itemInfo.raw, mood, fv.ja);
  gasData = await callGasText(unified);

  // 画像が取れないなら従来のJSON方式へフォールバック
  if(!extractImageSrc(gasData)){
    gasData = await callGas(payload);
  }
}catch(_primaryErr){
  gasData = await callGas(payload);
}

// ② コメントがゲーム向きでない場合は「コメント専用」で再問い合わせ（画像は無視）
try{
  const msg0 = normalizeCommentText(extractMessage(gasData));
  if(isBadCommentText(msg0, a.id)){
    const commentData = await callGasText(buildCommentOnlyPrompt(a.id, a.name, itemInfo.raw, mood, bucket));
    const msg1 = normalizeCommentText(extractMessage(commentData));
    if(!isBadCommentText(msg1, a.id)){
      // 表示用に上書き（GASの返却キー差異に強くする）
      gasData = Object.assign({}, gasData, { message: msg1, comment: msg1, text: msg1 });
    }
  }
}catch(_commentErr){ /* フォールバックでOK */ }

  }catch(err){
    console.warn(err);
    showError('API失敗：' + (err && err.message ? err.message : err) + '（ローカル表示）');
  }finally{
    setLoading(false);
  }

  sfxResult();

  // 結果ページへ
  stopBegLoop();
  state.locked = true;

  el.resultSub.textContent = `入力：${itemInfo.raw}`;
  el.resultEmoji.textContent = judged.art;
  setImgSafe(el.resultAnimalImg, a.img, a.name, a.emoji);

  // テキスト：基本は「動物の一言コメント」だけを表示（長文・実況・説明は出さない）
  const apiMsgRaw = sanitizeMessage(extractMessage(gasData));
  const apiMsg = normalizeCommentText(apiMsgRaw);

  const localComment = normalizeCommentText((reaction.text || '').split('\n')[0] || '');
  el.resultText.textContent = (!isBadCommentText(apiMsg, a.id) ? apiMsg : localComment);

  // 画像（GASが返せたら表示）
  if(el.resultImageWrap && el.resultImage){
    const img = extractImageSrc(gasData);
    if(img && img.src){
      el.resultImage.src = img.src;
      el.resultImage.alt = `${a.name}が${itemInfo.raw}を食べているイラスト`;
      el.resultImageWrap.classList.remove('isHidden');
      // 画像メタ（えさ＆気分）
      if(el.resultFoodBadge){
        const foodEmoji = ({'肉':'🍖','魚':'🐟','草':'🌿','野菜':'🥕'}[itemInfo.category] || '🍽️');
        el.resultFoodBadge.textContent = `えさ：${foodEmoji} ${itemInfo.raw}`;
      }
      if(el.resultMoodBadge){
        el.resultMoodBadge.textContent = `きぶん：${judged.art}`;
      }
    }else{
      el.resultImageWrap.classList.add('isHidden');
      el.resultImage.removeAttribute('src');
      el.resultImage.alt = '';
      if(el.resultFoodBadge) el.resultFoodBadge.textContent = '—';
      if(el.resultMoodBadge) el.resultMoodBadge.textContent = '—';
    }
  }

  showScreen('result');
}


// ================================
// Events
// ================================
function wireEvents(){

  // トースト（エラー表示の閉じる）
  if(el.toastClose){
    el.toastClose.addEventListener('click', (e) => {
      e.preventDefault();
      hideToast();
    });
  }

  // API設定（モーダル）
  if(el.btnApi){
    el.btnApi.addEventListener('click', () => toggleApiModal(true));
  }
  if(el.btnApiClose){
    el.btnApiClose.addEventListener('click', () => toggleApiModal(false));
  }
  if(el.apiModal){
    el.apiModal.addEventListener('click', (e) => {
      if(e.target === el.apiModal) toggleApiModal(false);
    });
  }
  if(el.btnApiSave){
    el.btnApiSave.addEventListener('click', () => {
      if(el.gasUrlInput) setGasUrl(el.gasUrlInput.value);
      if(el.useImageToggle) setUseImage(!!el.useImageToggle.checked);
      toggleApiModal(false);
      showToast('保存しました');
    });
  }
  if(el.btnApiTest){
    el.btnApiTest.addEventListener('click', async () => {
      try{
        const data = await callGas({ mode:'ping' });
        showToast((data && data.message) ? data.message : 'OK');
      }catch(err){
        console.warn(err);
        showError('接続失敗：' + (err && err.message ? err.message : err));
      }
    });
  }

  el.pickButtons.forEach(btn => {
    const go = async () => {
      ensureAudio();
      await resumeAudio();
      sfxClick();
      startGameWithAnimal(btn.getAttribute('data-animal'));
    };

    btn.addEventListener('click', go);

    // キーボード操作（Enter / Space）にも対応
    btn.addEventListener('keydown', (ev) => {
      const k = ev.key;
      if(k === 'Enter' || k === ' '){
        ev.preventDefault();
        go();
      }
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


function openImageModal(src, alt){
  if(!el.imgModal || !el.imgModalImg) return;
  el.imgModalImg.src = src;
  el.imgModalImg.alt = alt || '拡大画像';
  el.imgModal.classList.remove('isHidden');
  el.imgModal.setAttribute('aria-hidden','false');
}

function closeImageModal(){
  if(!el.imgModal || !el.imgModalImg) return;
  el.imgModal.classList.add('isHidden');
  el.imgModal.setAttribute('aria-hidden','true');
  // 画像を外してメモリ節約（特にbase64）
  el.imgModalImg.removeAttribute('src');
  el.imgModalImg.alt = '';
}


(function init(){

  // 生成画像クリックで拡大表示
  if(el.resultImage){
    const open = ()=>{
      const src = el.resultImage.getAttribute('src');
      if(src) openImageModal(src, el.resultImage.alt || '生成画像');
    };
    el.resultImage.addEventListener('click', open);
    el.resultImage.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        open();
      }
    });
  }
  if(el.imgModalClose) el.imgModalClose.addEventListener('click', closeImageModal);
  if(el.imgModalBackdrop) el.imgModalBackdrop.addEventListener('click', closeImageModal);
  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape' && el.imgModal && !el.imgModal.classList.contains('isHidden')){
      closeImageModal();
    }
  });
  wireEvents();
  gotoSelect();
})();