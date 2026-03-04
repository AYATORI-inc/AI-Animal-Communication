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
* **メソッド:** `POST`
* **リクエストボディ:** プロンプト全文（テキスト形式）

### プロンプトの仕様

プロンプトは動物の行動や状況を説明するテキスト（日本語可）を送信してください。
システムが自動的にJSON形式で返答し、画像も生成します。

**入力例:**
```
あなたは「サル」という動物です。性格は「元気で好奇心旺盛」。今「バナナ」を食べました。子供向けの口調で、60文字以内で感想を言ってください。
```

**注意:** プロンプト内で「画像を生成」などと指示する必要はありません。システムが自動的に処理します。

---

## 2. バックエンド仕様 (先生担当)

### 役割

* フロントエンドから届いたプロンプトをそのまま受け取る。
* 安全に管理された **APIキー** を付与してAI（OpenAI API）へ転送する。
* テキスト生成（GPT-3.5-turbo）と画像生成（DALL-E 3）を実行する。
* テキストと画像URLを含むレスポンスをフロントエンドへ返却する。

### GASの実装要件

* `doPost(e)` 関数を使用してリクエストを処理する。
* APIキーは `PropertiesService` を使用して、コード内に露出させない。
  * 必要なプロパティ: `OPENAI_API_KEY`
* CORS（ブラウザのセキュリティ制限）を回避するため、適切なレスポンス形式を維持する。
* プロンプトにJSON形式で返すよう自動的に指示を追加する。
* AIレスポンスから`imagePrompt`を抽出し、DALL-E 3で画像を生成する。

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
* **imageUrl**: DALL-E 3で生成された画像のURL（成功時のみ）
* **imagePrompt**: 画像生成に使用したプロンプト（英語）
* **imageError**: 画像生成エラーのメッセージ（エラー時のみ）
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

---
