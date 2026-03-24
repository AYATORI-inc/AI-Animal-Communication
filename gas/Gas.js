/**
 * Google Apps Script (GAS) - 動物えさやりAIアプリ バックエンド
 * 
 * このスクリプトは、フロントエンドからのプロンプトを受け取り、
 * OpenAI APIに転送して結果を返します。
 */

const ANIMAL_FOOD_PREFERENCES = {
  'ライオン': { meat: '大好き', grass: '嫌い', tire: '大嫌い', spicy: '嫌い', free: '普通' },
  'ペンギン': { meat: '好き', grass: '嫌い', tire: '大嫌い', spicy: '嫌い', free: '普通' },
  'カピバラ': { meat: '普通', grass: '大好き', tire: '嫌い', spicy: '大嫌い', free: '普通' },
  'パンダ': { meat: '嫌い', grass: '好き', tire: '大嫌い', spicy: '大嫌い', free: '普通' }
};

/**
 * POSTリクエストを処理する関数
 * @param {Object} e - イベントオブジェクト（リクエスト情報を含む）
 * @return {TextOutput} CORS対応のレスポンス
 */
function doPost(e) {
  try {
    // リクエストボディを取得
    let requestData = null;
    let prompt = '';
    
    if (e.postData && e.postData.contents) {
      const body = e.postData.contents;
      // JSON形式かテキスト形式かを判定
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        // JSONでない場合は旧形式のテキストプロンプトとして扱う
        prompt = body;
      }
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

    // 新しいJSON形式のリクエストを処理
    if (requestData) {
      // 必須項目のチェック
      if (!requestData.animalType) {
        return createCorsResponse({
          success: false,
          error: 'animalType（動物種類）が指定されていません。'
        }, 400);
      }
      
      // 食べ物の判定：freeWordが優先、なければfoodTypeを使用
      const foodItem = requestData.freeWord || requestData.foodType || '';
      if (!foodItem) {
        return createCorsResponse({
          success: false,
          error: 'foodType（食べ物種類）またはfreeWord（フリーワード）が指定されていません。'
        }, 400);
      }
      
      // プロンプトを生成
      const resolvedLikeLevel = resolveLikeLevel(
        requestData.animalType,
        requestData.foodCategory || null,
        foodItem,
        requestData.likeLevel || null
      );
      prompt = buildPromptFromData(
        requestData.animalType,
        foodItem,
        resolvedLikeLevel,
        requestData.freeWord ? true : false
      );
      
      // 画像生成用の基礎プロンプトを取得（オプション）
      const baseImagePrompt = requestData.baseImagePrompt || null;
      
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
      const enhancedPrompt = prompt + '\n\n【重要】必ず以下のJSON形式のみで回答してください。余計な解説、テキスト、マークダウン記号は一切不要です。JSONのみを返してください。\n\n{\n  "message": "動物のセリフや反応（日本語、60文字以内）",\n  "imagePrompt": "画像生成用の英語プロンプト（DALL-E用、詳細に描写、例: A cute cartoon monkey happily eating a banana, Pixar style, white background）",\n  "likeLevel": "大好き|好き|普通|嫌い|大嫌い のいずれか",\n  "moodEmoji": "感情を表す絵文字1つ"\n}\n\nlikeLevelは必ず上記5種類のいずれかにしてください。';
    
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
      let responseLikeLevel = null;
      let moodEmoji = null;
      
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
          responseLikeLevel = normalizeLikeLevel(parsedContent.likeLevel);
          moodEmoji = String(parsedContent.moodEmoji || '').trim();
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
        Logger.log('警告: 画像生成用プロンプトが取得できませんでした。フォールバックを使用します。');
        // 基礎プロンプトがある場合はそれを使用、なければ元のプロンプトから生成
        if (baseImagePrompt) {
          imagePrompt = baseImagePrompt + ', ' + foodItem;
        } else {
          imagePrompt = buildImagePromptFromData(requestData.animalType, foodItem, resolvedLikeLevel);
        }
      } else {
        // 基礎プロンプトがある場合は、それを先頭に追加
        if (baseImagePrompt) {
          imagePrompt = baseImagePrompt + ', ' + imagePrompt;
        }
        // 好き度を反映
        if (resolvedLikeLevel) {
          imagePrompt = enhanceImagePromptWithLikeLevel(imagePrompt, resolvedLikeLevel);
        }
      }
      
      // DALL-E APIで画像を生成
      let imageUrl = null;
      let imageError = null;
      try {
        const imageResult = generateImageWithDalle(imagePrompt);
        imageUrl = imageResult.url;
        imageError = imageResult.error;
      } catch (error) {
        imageError = '画像生成中に予期しないエラーが発生しました: ' + error.toString();
        Logger.log('画像生成エラー: ' + imageError);
      }
      
      // テキストと画像URLを含むレスポンスを作成
      const finalLikeLevel = resolvedLikeLevel || responseLikeLevel;
      const finalMessage = normalizeMessageByLikeLevel(messageText, finalLikeLevel, foodItem);
      const enhancedResponse = {
        success: true,
        message: finalMessage,
        likeLevel: finalLikeLevel,
        moodEmoji: emojiFromLikeLevel(finalLikeLevel) || moodEmoji || null,
        imageUrl: imageUrl,
        imagePrompt: imagePrompt,
        imageError: imageError,
        rawResponse: responseData // デバッグ用に元のレスポンスも含める
      };
      
      return createCorsResponse(enhancedResponse);
    }
    
    // 旧形式のテキストプロンプト処理（後方互換性のため）
    if (!prompt) {
      return createCorsResponse({
        success: false,
        error: 'プロンプトが指定されていません。'
      }, 400);
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
    const enhancedPrompt = prompt + '\n\n【重要】必ず以下のJSON形式のみで回答してください。余計な解説、テキスト、マークダウン記号は一切不要です。JSONのみを返してください。\n\n{\n  "message": "動物のセリフや反応（日本語、60文字以内）",\n  "imagePrompt": "画像生成用の英語プロンプト（DALL-E用、詳細に描写、例: A cute cartoon monkey happily eating a banana, Pixar style, white background）",\n  "likeLevel": "大好き|好き|普通|嫌い|大嫌い のいずれか",\n  "moodEmoji": "感情を表す絵文字1つ"\n}\n\nlikeLevelは必ず上記5種類のいずれかにしてください。';
    
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
    let responseLikeLevel = null;
    let moodEmoji = null;
    
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
        responseLikeLevel = normalizeLikeLevel(parsedContent.likeLevel);
        moodEmoji = String(parsedContent.moodEmoji || '').trim();
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
      const imageResult = generateImageWithDalle(imagePrompt);
      imageUrl = imageResult.url;
      imageError = imageResult.error;
    } catch (error) {
      imageError = '画像生成中に予期しないエラーが発生しました: ' + error.toString();
      Logger.log('画像生成エラー: ' + imageError);
    }
    
    // テキストと画像URLを含むレスポンスを作成
    const finalLikeLevel = resolvedLikeLevel || responseLikeLevel;
    const finalMessage = normalizeMessageByLikeLevel(messageText, finalLikeLevel, foodItem);
    const enhancedResponse = {
      success: true,
      message: finalMessage,
      likeLevel: finalLikeLevel,
      moodEmoji: emojiFromLikeLevel(finalLikeLevel) || moodEmoji || null,
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
 * OPTIONSリクエストを処理する関数（CORSプリフライトリクエスト対応）
 * @param {Object} e - イベントオブジェクト
 * @return {TextOutput} CORS対応のレスポンス
 */
function doOptions(e) {
  return createCorsResponse({}, 200);
}

/**
 * GETリクエストを処理する関数
 * @param {Object} e - イベントオブジェクト
 * @return {TextOutput} CORS対応のレスポンス
 */
function doGet(e) {
  try {
    // テスト用のHello Worldリクエストを処理
    if (!e.parameter || Object.keys(e.parameter).length === 0) {
      return createCorsResponse({
        success: true,
        message: 'Hello World! GAS接続成功！',
        timestamp: new Date().toISOString()
      });
    }

    // クエリパラメータからデータを取得
    const animalType = e.parameter.animalType;
    const foodType = e.parameter.foodType;
    const freeWord = e.parameter.freeWord;
    const foodCategory = e.parameter.foodCategory;
    const likeLevel = e.parameter.likeLevel;
    const baseImagePrompt = e.parameter.baseImagePrompt;
    const prompt = e.parameter.prompt; // 旧形式のテキストプロンプト

    // 旧形式のテキストプロンプトを処理
    if (prompt) {
      return processTextPrompt(prompt);
    }

    // 新しいJSON形式のリクエストを処理
    if (!animalType) {
      return createCorsResponse({
        success: false,
        error: 'animalType（動物種類）が指定されていません。'
      }, 400);
    }
    
    // 食べ物の判定：freeWordが優先、なければfoodTypeを使用
    const foodItem = freeWord || foodType || '';
    if (!foodItem) {
      return createCorsResponse({
        success: false,
        error: 'foodType（食べ物種類）またはfreeWord（フリーワード）が指定されていません。'
      }, 400);
    }
    
    // プロンプトを生成
    const resolvedLikeLevel = resolveLikeLevel(
      animalType,
      foodCategory || null,
      foodItem,
      likeLevel || null
    );
    const generatedPrompt = buildPromptFromData(
      animalType,
      foodItem,
      resolvedLikeLevel,
      freeWord ? true : false
    );
    
    // 画像生成用の基礎プロンプトを取得（オプション）
    const baseImagePromptValue = baseImagePrompt || null;
    
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
    const enhancedPrompt = generatedPrompt + '\n\n【重要】必ず以下のJSON形式のみで回答してください。余計な解説、テキスト、マークダウン記号は一切不要です。JSONのみを返してください。\n\n{\n  "message": "動物のセリフや反応（日本語、60文字以内）",\n  "imagePrompt": "画像生成用の英語プロンプト（DALL-E用、詳細に描写、例: A cute cartoon monkey happily eating a banana, Pixar style, white background）",\n  "likeLevel": "大好き|好き|普通|嫌い|大嫌い のいずれか",\n  "moodEmoji": "感情を表す絵文字1つ"\n}\n\nlikeLevelは必ず上記5種類のいずれかにしてください。';
    
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
    let responseLikeLevel = null;
    let moodEmoji = null;
    
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
        responseLikeLevel = normalizeLikeLevel(parsedContent.likeLevel);
        moodEmoji = String(parsedContent.moodEmoji || '').trim();
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
      Logger.log('警告: 画像生成用プロンプトが取得できませんでした。フォールバックを使用します。');
      // 基礎プロンプトがある場合はそれを使用、なければ元のプロンプトから生成
      if (baseImagePromptValue) {
        imagePrompt = baseImagePromptValue + ', ' + foodItem;
      } else {
        imagePrompt = buildImagePromptFromData(animalType, foodItem, resolvedLikeLevel);
      }
    } else {
      // 基礎プロンプトがある場合は、それを先頭に追加
      if (baseImagePromptValue) {
        imagePrompt = baseImagePromptValue + ', ' + imagePrompt;
      }
      // 好き度を反映
      if (resolvedLikeLevel) {
        imagePrompt = enhanceImagePromptWithLikeLevel(imagePrompt, resolvedLikeLevel);
      }
    }
    
    // DALL-E APIで画像を生成
    let imageUrl = null;
    let imageError = null;
    try {
      const imageResult = generateImageWithDalle(imagePrompt);
      imageUrl = imageResult.url;
      imageError = imageResult.error;
    } catch (error) {
      imageError = '画像生成中に予期しないエラーが発生しました: ' + error.toString();
      Logger.log('画像生成エラー: ' + imageError);
    }
    
    // テキストと画像URLを含むレスポンスを作成
    const finalLikeLevel = resolvedLikeLevel || responseLikeLevel;
    const finalMessage = normalizeMessageByLikeLevel(messageText, finalLikeLevel, foodItem);
    const enhancedResponse = {
      success: true,
      message: finalMessage,
      likeLevel: finalLikeLevel,
      moodEmoji: emojiFromLikeLevel(finalLikeLevel) || moodEmoji || null,
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
 * テキストプロンプトを処理する関数（旧形式・後方互換）
 * @param {String} prompt - テキストプロンプト
 * @return {TextOutput} CORS対応のレスポンス
 */
function processTextPrompt(prompt) {
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
    Logger.log('警告: 画像生成用プロンプトが取得できませんでした。フォールバックを使用します。');
    imagePrompt = prompt.length > 1000 ? prompt.substring(0, 1000) : prompt;
  }
  
  // DALL-E APIで画像を生成
  let imageUrl = null;
  let imageError = null;
  try {
    const imageResult = generateImageWithDalle(imagePrompt);
    imageUrl = imageResult.url;
    imageError = imageResult.error;
  } catch (error) {
    imageError = '画像生成中に予期しないエラーが発生しました: ' + error.toString();
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
}

/**
 * DALL-E APIで画像を生成する関数
 * @param {String} prompt - 画像生成用プロンプト
 * @return {Object} {url: String|null, error: String|null} 画像URLとエラーメッセージ
 */
function generateImageWithDalle(prompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    
    if (!apiKey) {
      const errorMsg = 'APIキーが設定されていません';
      Logger.log('DALL-E API: ' + errorMsg);
      return { url: null, error: errorMsg };
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
        return { url: responseData.data[0].url, error: null };
      } else {
        const errorMsg = '画像データが取得できませんでした';
        Logger.log('DALL-E API: ' + errorMsg);
        Logger.log('レスポンス: ' + responseText);
        return { url: null, error: errorMsg };
      }
    } else {
      // エラーレスポンスを解析
      let errorDetails = responseText;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error && errorData.error.message) {
          errorDetails = errorData.error.message;
        } else {
          errorDetails = JSON.stringify(errorData, null, 2);
        }
      } catch (e) {
        // JSONでない場合はそのまま使用
      }
      
      const errorMsg = `DALL-E API エラー (HTTP ${responseCode}): ${errorDetails}`;
      Logger.log('DALL-E API エラー: HTTP ' + responseCode);
      Logger.log('レスポンス: ' + responseText);
      return { url: null, error: errorMsg };
    }
  } catch (error) {
    const errorMsg = '画像生成中にエラーが発生しました: ' + error.toString();
    Logger.log('DALL-E API エラー: ' + errorMsg);
    return { url: null, error: errorMsg };
  }
}

/**
 * リクエストデータからプロンプトを生成する関数
 * @param {String} animalType - 動物種類
 * @param {String} foodItem - 食べ物（foodTypeまたはfreeWord）
 * @param {String|null} likeLevel - 好き度（オプション）
 * @param {Boolean} isFreeWord - フリーワードかどうか
 * @return {String} 生成されたプロンプト
 */
function buildPromptFromData(animalType, foodItem, likeLevel, isFreeWord) {
  let prompt = `あなたは「${animalType}」という動物です。`;
  
  // 好き度がある場合は追加
  if (likeLevel) {
    prompt += `この食べ物への好き度は「${likeLevel}」です。`;
  }
  
  // フリーワードかどうかで表現を変える
  if (isFreeWord) {
    prompt += `今「${foodItem}」を食べました（または与えられました）。`;
  } else {
    prompt += `今「${foodItem}」を食べました。`;
  }
  
  prompt += '子供向けの口調で、60文字以内で感想を言ってください。';
  
  return prompt;
}

/**
 * 動物ごとの好み定義からlikeLevelを解決する
 * 優先順位: リクエスト指定値 > foodCategory推定値 > free
 * @param {String} animalType - 動物種類
 * @param {String|null} foodCategory - 食べ物カテゴリ（meat/grass/tire/spicy/free）
 * @param {String} foodItem - 食べ物の表示文字列
 * @param {String|null} likeLevel - リクエスト指定の好き度
 * @return {String|null}
 */
function resolveLikeLevel(animalType, foodCategory, foodItem, likeLevel) {
  const direct = normalizeLikeLevel(likeLevel);
  if (direct) return direct;

  const table = ANIMAL_FOOD_PREFERENCES[String(animalType || '').trim()];
  if (!table) return null;

  const category = detectFoodCategory(foodCategory, foodItem);
  if (category && table[category]) return table[category];
  return table.free || null;
}

/**
 * foodCategory文字列とfoodItemからカテゴリを推定する
 * @param {String|null} foodCategory
 * @param {String} foodItem
 * @return {String} meat|grass|tire|spicy|free
 */
function detectFoodCategory(foodCategory, foodItem) {
  const category = String(foodCategory || '').trim().toLowerCase();
  if (category === 'meat' || category === 'grass' || category === 'tire' || category === 'spicy' || category === 'free') {
    return category;
  }

  const text = String(foodItem || '').trim().toLowerCase();
  if (!text) return 'free';
  if (text.indexOf('meat') !== -1 || text.indexOf('肉') !== -1 || text.indexOf('fish') !== -1 || text.indexOf('さかな') !== -1) return 'meat';
  if (text.indexOf('grass') !== -1 || text.indexOf('草') !== -1 || text.indexOf('くさ') !== -1) return 'grass';
  if (text.indexOf('tire') !== -1 || text.indexOf('タイヤ') !== -1 || text.indexOf('たいや') !== -1) return 'tire';
  if (text.indexOf('spicy') !== -1 || text.indexOf('辛') !== -1 || text.indexOf('から') !== -1 || text.indexOf('げきから') !== -1) return 'spicy';
  return 'free';
}

/**
 * AI応答のlikeLevelを正規化する
 * @param {String} value - AIから返ってきたlikeLevel
 * @return {String|null} 正規化されたlikeLevel
 */
function normalizeLikeLevel(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (text === '大好き' || text === '好き' || text === '普通' || text === '嫌い' || text === '大嫌い') {
    return text;
  }
  return null;
}

/**
 * likeLevelに対応する絵文字を返す
 * @param {String|null} likeLevel
 * @return {String|null}
 */
function emojiFromLikeLevel(likeLevel) {
  switch (normalizeLikeLevel(likeLevel)) {
    case '大好き':
      return '😍';
    case '好き':
      return '😊';
    case '普通':
      return '😐';
    case '嫌い':
      return '😖';
    case '大嫌い':
      return '🤢';
    default:
      return null;
  }
}

/**
 * likeLevelと文面の整合をとる（嫌い系なのに過剰にポジティブな文を補正）
 * @param {String} message
 * @param {String|null} likeLevel
 * @param {String} foodItem
 * @return {String}
 */
function normalizeMessageByLikeLevel(message, likeLevel, foodItem) {
  const text = String(message || '').trim();
  const level = normalizeLikeLevel(likeLevel);
  if (!text || !level) return text;

  const positivePattern = /(おいしい|美味|最高|ジューシー|もっと食べたい|うれしい|だいすき|大好き|うまい)/;
  if ((level === '嫌い' || level === '大嫌い') && positivePattern.test(text)) {
    if (level === '大嫌い') {
      return `うーん、${foodItem}はちょっと苦手だよ。ぼくには合わないかな。`;
    }
    return `うーん、${foodItem}はぼくにはあまり合わないな。`;
  }

  return text;
}

/**
 * 好き度を画像生成プロンプトに反映する関数
 * @param {String} imagePrompt - 元の画像生成プロンプト
 * @param {String|null} likeLevel - 好き度
 * @return {String} 好き度を反映した画像生成プロンプト
 */
function enhanceImagePromptWithLikeLevel(imagePrompt, likeLevel) {
  if (!likeLevel || !imagePrompt) {
    return imagePrompt;
  }
  
  // 好き度に応じた英語表現を追加
  let likeLevelExpression = '';
  switch (likeLevel) {
    case '大好き':
      likeLevelExpression = 'happily, joyfully, with great pleasure, big smile';
      break;
    case '好き':
      likeLevelExpression = 'happily, with pleasure, smiling';
      break;
    case '普通':
      likeLevelExpression = 'neutrally, calmly, with a neutral expression';
      break;
    case '嫌い':
      likeLevelExpression = 'reluctantly, with hesitation, making a slightly uncomfortable face';
      break;
    case '大嫌い':
      likeLevelExpression = 'unhappily, with disgust, making a disgusted or repulsed face';
      break;
    default:
      // 未知の値の場合はそのまま返す
      return imagePrompt;
  }
  
  // プロンプトに好き度の表現を追加
  // 動物の表情や動作を表す部分に追加するため、適切な位置に挿入
  return imagePrompt + ', ' + likeLevelExpression;
}

/**
 * 画像生成用プロンプトを生成する関数（フォールバック用）
 * @param {String} animalType - 動物種類
 * @param {String} foodItem - 食べ物
 * @param {String|null} likeLevel - 好き度（オプション）
 * @return {String} 画像生成用プロンプト
 */
function buildImagePromptFromData(animalType, foodItem, likeLevel = null) {
  // 簡易的な英語プロンプトを生成
  // 実際のAI生成プロンプトの方が品質が高いが、フォールバックとして使用
  let prompt = `A cute cartoon ${animalType} eating ${foodItem}, Pixar style, white background, high quality`;
  
  // 好き度がある場合は追加
  if (likeLevel) {
    prompt = enhanceImagePromptWithLikeLevel(prompt, likeLevel);
  }
  
  return prompt;
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
  
  // CORSヘッダーを設定
  // GASのContentServiceは自動的にCORSヘッダーを設定しますが、
  // 明示的に設定することで確実に動作します
  return output;
}

