/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 识别植物
 */
const identifyPlant = (imageBase64) => {
  return new Promise((resolve) => {
    console.log('🌿 图片Base64长度:', imageBase64.length);
    
    // 检查图片大小（最大约4MB base64）
    if (imageBase64.length > 5500000) {
      resolve({ success: false, error: '图片太大(>4MB)，请选择较小的图片' });
      return;
    }
    
    // 检查图片大小（最小要求）
    if (imageBase64.length < 1000) {
      resolve({ success: false, error: '图片太小，请重新拍摄' });
      return;
    }
    
    // 构建请求
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log('🚀 发送识别请求...');
    
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: '请识别这张图片中的植物，告诉我：1.植物名称 2.简单养护建议'
              }
            ]
          }
        ]
      },
      timeout: 60000,  // 60秒超时
      success: (res) => {
        console.log('📡 API状态码:', res.statusCode);
        console.log('📡 API响应:', JSON.stringify(res.data).substring(0, 500));
        
        if (res.statusCode === 200) {
          const content = res.data?.choices?.[0]?.message?.content;
          
          if (content) {
            // 尝试解析JSON，如果失败就用文本
            let plant = {
              name: '识别结果',
              description: content,
              family: '未知',
              difficulty: '中等',
              toxicity: false,
              careGuide: {
                light: '请参考描述',
                water: '请参考描述',
                temperature: '常温'
              }
            };
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                plant = { ...plant, ...parsed };
              } else {
                // 从文本提取名称
                const nameMatch = content.match(/(?:植物|名称)[是为：:]\s*([^\n,，。]+)/);
                if (nameMatch) {
                  plant.name = nameMatch[1].trim();
                }
              }
            } catch (e) {
              console.log('JSON解析失败，使用文本模式');
            }
            
            resolve({ success: true, data: plant });
          } else {
            resolve({ success: false, error: 'API未返回内容' });
          }
        } else {
          // 处理错误
          let errMsg = '识别失败';
          const errData = res.data?.error || res.data;
          
          if (errData?.message) {
            errMsg = errData.message;
            // 解析常见错误
            if (errMsg.includes('image length and width')) {
              errMsg = '图片尺寸不符合要求，请重新拍摄';
            } else if (errMsg.includes('Failed to download')) {
              errMsg = '图片处理失败，请重试';
            }
          } else if (res.statusCode === 401) {
            errMsg = 'API认证失败，请联系管理员';
          } else if (res.statusCode === 429) {
            errMsg = '请求太频繁，请稍后再试';
          } else if (res.statusCode >= 500) {
            errMsg = '服务器繁忙，请稍后再试';
          }
          
          resolve({ success: false, error: errMsg });
        }
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
        let errMsg = '网络请求失败';
        if (err.errMsg?.includes('timeout')) {
          errMsg = '请求超时，请检查网络';
        } else if (err.errMsg?.includes('fail')) {
          errMsg = '网络连接失败，请检查网络';
        }
        resolve({ success: false, error: errMsg });
      }
    });
  });
};

module.exports = { identifyPlant };