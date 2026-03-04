/**
 * Google Apps Script (GAS) - 動物えさやりAIアプリ バックエンド
 * 
 * このスクリプトは、フロントエンドからのプロンプトを受け取り、
 * OpenAI APIに転送して結果を返します。
 */

/**
 * POSTリクエストを処理する関数
 * @param {Object} e - イベントオブジェクト（リクエスト情報を含む）
 * @return {TextOutput} CORS対応のレスポンス
 */
function doPost(e) {
  try {
    // リクエストボディからプロンプトを取得
    let prompt = '';
    if (e.postData && e.postData.contents) {
      prompt = e.postData.contents;
    } else if (e.parameter && e.parameter.prompt) {
      prompt = e.parameter.prompt;
    } else {
      // テスト用のHello Worldリクエストを処理
      return createCorsResponse({
        success: true,
        message: 'Hello World! GAS接続成功！',
        timestamp: new Date().toISOString()
      });
    }

    // APIキーをPropertiesServiceから取得
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      return createCorsResponse({
        success: false,
        error: 'APIキーが設定されていません。PropertiesServiceにOPENAI_API_KEYを設定してください。'
      }, 500);
    }

    // OpenAI APIのエンドポイント
    const apiUrl = 'https://api.openai.com/v1/chat/completions';

    // OpenAI APIにリクエストを送信
    // プロンプトにJSON形式で返すように指示を追加（画像生成用キーワードを含めるため）
    const enhancedPrompt = prompt + '\n\n【重要】必ず以下のJSON形式のみで回答してください。余計な解説、テキスト、マークダウン記号は一切不要です。JSONのみを返してください。\n\n{\n  "message": "動物のセリフや反応（日本語、60文字以内）",\n  "imagePrompt": "画像生成用の英語プロンプト（DALL-E用、詳細に描写、例: A cute cartoon monkey happily eating a banana, Pixar style, white background）"\n}';
    
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that always responds in valid JSON format only. Do not include any markdown, code blocks, or explanations. Return only the JSON object.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: 0.7
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = responseText;
      }
      return createCorsResponse({
        success: false,
        error: 'OpenAI APIエラー',
        statusCode: responseCode,
        details: errorDetails
      }, responseCode);
    }

    // レスポンスを解析
    const responseData = JSON.parse(responseText);
    
    // OpenAI APIのレスポンスからテキストを抽出
    let aiResponseText = '';
    let messageText = '';
    let imagePrompt = null;
    
    if (responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
      aiResponseText = responseData.choices[0].message.content;
      messageText = aiResponseText;
      
      // JSON形式のレスポンスから画像生成用プロンプトを抽出
      try {
        // マークダウンコードブロックを除去
        let cleanedText = aiResponseText.trim();
        if (cleanedText.startsWith('```')) {
          // コードブロックを除去
          cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        
        const parsedContent = JSON.parse(cleanedText);
        if (parsedContent.message) {
          messageText = parsedContent.message;
        }
        if (parsedContent.imagePrompt) {
          // imagePromptを優先
          imagePrompt = parsedContent.imagePrompt;
        } else if (parsedContent.imageWord) {
          // imageWordがある場合はそれを使用（後方互換性）
          imagePrompt = parsedContent.imageWord;
        }
      } catch (e) {
        // JSON形式でない場合は、ログに記録
        Logger.log('JSON解析エラー: ' + e.toString());
        Logger.log('AIレスポンス: ' + aiResponseText);
      }
    }
    
    // 画像生成用プロンプトが取得できなかった場合のフォールバック
    if (!imagePrompt) {
      // 元のプロンプトから画像生成用プロンプトを生成
      // 簡易的に、プロンプトの内容を画像生成用に変換（英語化を試みる）
      Logger.log('警告: 画像生成用プロンプトが取得できませんでした。フォールバックを使用します。');
      // 元のプロンプトをそのまま使用（DALL-Eは日本語も理解するが、英語の方が精度が高い）
      imagePrompt = prompt.length > 1000 ? prompt.substring(0, 1000) : prompt;
    }
    
    // DALL-E APIで画像を生成
    let imageUrl = null;
    let imageError = null;
    try {
      imageUrl = generateImageWithDalle(imagePrompt);
      if (!imageUrl) {
        imageError = '画像の生成に失敗しました';
      }
    } catch (error) {
      imageError = error.toString();
      Logger.log('画像生成エラー: ' + imageError);
    }
    
    // テキストと画像URLを含むレスポンスを作成
    const enhancedResponse = {
      success: true,
      message: messageText,
      imageUrl: imageUrl,
      imagePrompt: imagePrompt,
      imageError: imageError,
      rawResponse: responseData // デバッグ用に元のレスポンスも含める
    };
    
    return createCorsResponse(enhancedResponse);

  } catch (error) {
    // エラーハンドリング
    return createCorsResponse({
      success: false,
      error: error.toString(),
      message: 'サーバー側でエラーが発生しました。'
    }, 500);
  }
}

/**
 * GETリクエストを処理する関数（テスト用）
 * @param {Object} e - イベントオブジェクト
 * @return {HtmlOutput} テスト用HTMLページ
 */
function doGet(e) {
  return HtmlService.createHtmlOutput(`
    <html>
      <body>
        <h1>GAS バックエンド動作確認</h1>
        <p>このエンドポイントは正常に動作しています。</p>
        <p>POSTリクエストでプロンプトを送信してください。</p>
      </body>
    </html>
  `);
}

/**
 * DALL-E APIで画像を生成する関数
 * @param {String} prompt - 画像生成用プロンプト
 * @return {String|null} 画像URL（取得失敗時はnull）
 */
function generateImageWithDalle(prompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      Logger.log('DALL-E API: APIキーが設定されていません');
      return null;
    }
    
    const apiUrl = 'https://api.openai.com/v1/images/generations';
    
    // DALL-E 3のプロンプトは最大4000文字、推奨は1000文字以下
    const imagePrompt = prompt.length > 1000 ? prompt.substring(0, 1000) : prompt;
    
    const payload = {
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard', // 'standard' または 'hd'
      style: 'vivid' // 'vivid' または 'natural'
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode === 200) {
      const responseData = JSON.parse(responseText);
      if (responseData.data && responseData.data.length > 0) {
        return responseData.data[0].url;
      }
    } else {
      // エラーログを出力
      Logger.log('DALL-E API エラー: HTTP ' + responseCode);
      Logger.log('レスポンス: ' + responseText);
    }
    
    return null;
  } catch (error) {
    Logger.log('DALL-E API エラー: ' + error.toString());
    return null;
  }
}

/**
 * CORS対応のレスポンスを作成
 * @param {Object} data - 返却するデータ
 * @param {Number} statusCode - HTTPステータスコード（デフォルト: 200）
 * @return {TextOutput} CORS対応のレスポンス
 */
function createCorsResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(data));
  
  // CORSヘッダーを設定（GASでは自動的に処理されるが、明示的に設定）
  return output;
}

