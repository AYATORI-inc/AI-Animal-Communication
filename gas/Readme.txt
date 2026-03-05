---

# 🐾 動物えさやりAIアプリ：開発仕様書

このプロジェクトは、フロントエンド（HTML/JS）から先生が用意したバックエンド（GAS）を経由し、安全にAIと通信する仕組みを学習するためのものです。

---

## 🏗️ システム構成

生徒の皆さんは **Frontend** の作成を担当し、APIキー（秘密の鍵）は先生側の **Backend** で管理されます。

---

## 1. フロントエンド仕様 (生徒担当)

### 役割

* ユーザーからの入力（えさの種類、動物の性格など）を受け取る。
* AIへの**プロンプト（命令文）**を組み立てる。
* GASのURLに対してデータを送信し、返ってきた結果（テキストと画像）を画面に表示する。

### 通信プロトコル

* **送信先URL:** `https://script.google.com/macros/s/XXXXX/exec`（先生が配布）
* **メソッド:** `GET`（推奨・CORSエラーが発生しません）
* **リクエスト形式:** クエリパラメータ（URLに含める）

### リクエスト形式

#### 新形式（JSON形式・推奨）

JSON形式で以下の項目を送信してください。

**必須項目:**
* `animalType` (文字列): 動物種類（例: "サル", "ライオン", "ペンギン"）

**必須項目（どちらか一方）:**
* `foodType` (文字列): 食べ物種類（例: "バナナ", "肉", "草"）
* `freeWord` (文字列): フリーワード（例: "魔法のジュース", "お母さんの手作りハンバーグ"）
  * 注意: `freeWord`が指定されている場合、`foodType`は無視されます。

**オプション項目:**
* `likeLevel` (文字列): 好き度（例: "大好き", "好き", "普通", "嫌い", "大嫌い"）
* `baseImagePrompt` (文字列): 動物イラスト画質用基礎プロンプト
  * **重要:** 英語で記述することを強く推奨します（例: "A cute cartoon style, Pixar animation, white background, high quality"）
  * 日本語も動作しますが、DALL-E 3は英語プロンプトの方が精度が高く、エラーが発生しにくいです
  * 日本語の例: "80年代少年漫画風"（動作しますが、英語の方が確実です）

**リクエスト例（GETリクエスト）:**

```
https://script.google.com/macros/s/XXXXX/exec?animalType=サル&foodType=バナナ&likeLevel=大好き&baseImagePrompt=A+cute+cartoon+style%2C+Pixar+animation%2C+white+background
```

```
https://script.google.com/macros/s/XXXXX/exec?animalType=ライオン&freeWord=魔法のジュース&likeLevel=普通
```

**JavaScriptでの送信例:**
```javascript
const params = new URLSearchParams();
params.append('animalType', 'サル');
params.append('foodType', 'バナナ');
params.append('likeLevel', '大好き');

const response = await fetch(gasUrl + '?' + params.toString(), {
  method: 'GET'
});
```

#### 旧形式（テキスト形式・後方互換）

プロンプトは動物の行動や状況を説明するテキスト（日本語可）をクエリパラメータ`prompt`として送信してください。
システムが自動的にJSON形式で返答し、画像も生成します。

**リクエスト例（GETリクエスト）:**
```
https://script.google.com/macros/s/XXXXX/exec?prompt=あなたは「サル」という動物です。性格は「元気で好奇心旺盛」。今「バナナ」を食べました。子供向けの口調で、60文字以内で感想を言ってください。
```

**JavaScriptでの送信例:**
```javascript
const prompt = 'あなたは「サル」という動物です。...';
const response = await fetch(gasUrl + '?prompt=' + encodeURIComponent(prompt), {
  method: 'GET'
});
```

**注意:** 
* プロンプト内で「画像を生成」などと指示する必要はありません。システムが自動的に処理します。
* URLの長さ制限（約2000文字）があるため、非常に長いテキストを送信する場合は注意してください。

---

## 2. バックエンド仕様 (先生担当)

### 役割

* フロントエンドから届いたプロンプトをそのまま受け取る。
* 安全に管理された **APIキー** を付与してAI（OpenAI API）へ転送する。
* テキスト生成（GPT-3.5-turbo）と画像生成（DALL-E 3）を実行する。
* テキストと画像URLを含むレスポンスをフロントエンドへ返却する。

### GASの実装要件

* `doGet(e)` 関数を使用してリクエストを処理する（GETリクエスト方式・推奨）。
* `doPost(e)` 関数も実装しており、POSTリクエストにも対応（後方互換性のため）。
* `doOptions(e)` 関数を実装してCORSプリフライトリクエストに対応する（POSTリクエスト用）。
* リクエストはJSON形式（新形式）とテキスト形式（旧形式）の両方に対応する。
* JSON形式の場合、以下の項目を受け取る:
  * `animalType` (必須): 動物種類
  * `foodType` または `freeWord` (必須): 食べ物種類またはフリーワード
  * `likeLevel` (オプション): 好き度
  * `baseImagePrompt` (オプション): 画像生成用基礎プロンプト
* 受け取った項目からプロンプトを自動生成する。
* APIキーは `PropertiesService` を使用して、コード内に露出させない。
  * 必要なプロパティ: `OPENAI_API_KEY`
* CORS（ブラウザのセキュリティ制限）を回避するため、適切なレスポンス形式を維持する。
* プロンプトにJSON形式で返すよう自動的に指示を追加する。
* AIレスポンスから`imagePrompt`を抽出し、DALL-E 3で画像を生成する。
* `baseImagePrompt`が指定されている場合、画像生成プロンプトの先頭に追加される。
* 画像生成エラーが発生した場合、詳細なエラーメッセージ（HTTPステータスコード、エラー内容）を返す。

### GASのWebアプリ公開設定

**重要:** GETリクエスト方式を使用する場合、CORSエラーは発生しません。

1. GASエディタで「公開」→「ウェブアプリケーションとして導入」を選択
2. 以下の設定を確認:
   * **Execute as:** Me（自分）
   * **Who has access to the app:** Anyone（誰でも）
3. 「デプロイ」をクリックしてURLを取得

**GETリクエスト方式の利点:**
* ローカルファイル（`file://`）から直接開いても動作します
* Webサーバーが不要です
* CORSエラーが発生しません
* シンプルなHTML/JavaScriptで実装できます

**注意:** 
* URLの長さ制限（約2000文字）があるため、非常に長いテキストを送信する場合は注意してください。
* 機密情報を含む場合は、POSTリクエストを使用することを推奨します（ただし、その場合はWebサーバーが必要です）。

---

## 3. セキュリティルール

* **APIキーの禁止:** HTMLやJavaScriptファイル内に、APIキーを直接記述してはいけません。
* **URLの管理:** 先生から配布されたGASのURLは、不特定多数に公開しないようにしてください（APIの利用制限を使い切ってしまう可能性があるため）。

---

## 4. 期待されるレスポンス形式

AIが正しく返答すると、以下のようなデータ（JSON）が届きます。これをJavaScriptで解析（`JSON.parse`）して画面を書き換えてください。

### 成功時のレスポンス

```json
{
  "success": true,
  "message": "ウキー！最高のご馳走だぜ！",
  "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "imagePrompt": "A cute cartoon monkey happily eating a banana, Pixar style, white background",
  "imageError": null,
  "rawResponse": {
    "choices": [
      {
        "message": {
          "content": "{\"message\": \"ウキー！最高のご馳走だぜ！\", \"imagePrompt\": \"A cute cartoon monkey happily eating a banana, Pixar style, white background\"}"
        }
      }
    ]
  }
}
```

### レスポンスの各フィールド

* **success**: リクエストが成功したかどうか（boolean）
* **message**: AIが生成したテキスト（日本語）
* **imageUrl**: DALL-E 3で生成された画像のURL（成功時のみ、nullの場合は画像生成に失敗）
* **imagePrompt**: 画像生成に使用したプロンプト（英語、または`baseImagePrompt`が指定されている場合はそれも含む）
* **imageError**: 画像生成エラーのメッセージ（エラー時のみ）
  * エラーが発生した場合、詳細なエラーメッセージ（HTTPステータスコード、エラー内容）が含まれます
  * 例: "DALL-E API エラー (HTTP 400): Invalid prompt..."
* **rawResponse**: 元のOpenAI APIレスポンス（デバッグ用）

### エラー時のレスポンス

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "statusCode": 500
}
```

### フロントエンドでの処理

1. `response.json()`でJSONを解析
2. `data.message`でテキストを表示
3. `data.imageUrl`が存在する場合、`<img>`タグで画像を表示
4. `data.imageError`が存在する場合、エラーメッセージを表示
   * エラーメッセージには詳細な情報が含まれているため、デバッグに役立ちます
   * よくあるエラー:
     * APIキーが設定されていない
     * プロンプトが不適切（例: 日本語の`baseImagePrompt`が原因の場合がある）
     * DALL-E APIのレート制限に達した
     * ネットワークエラー

### 画像生成に関する注意事項

* **`baseImagePrompt`は英語で記述することを強く推奨します**
  * DALL-E 3は英語プロンプトの方が精度が高く、エラーが発生しにくいです
  * 日本語も動作しますが、場合によってはエラーが発生する可能性があります
* **画像生成エラーが発生した場合**
  * `imageError`フィールドに詳細なエラーメッセージが含まれます
  * エラーメッセージを確認して、原因を特定してください
  * よくある原因: プロンプトが不適切、APIキーの問題、レート制限など

---
