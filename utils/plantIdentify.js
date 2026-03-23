/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 识别植物
 */
const identifyPlant = async (imageBase64) => {
  console.log('🌿 收到图片，Base64长度:', imageBase64.length);
  
  const sizeKB = imageBase64.length * 0.75 / 1024;
  console.log('📐 图片大小:', sizeKB.toFixed(1), 'KB');
  
  // 检查大小 - API 限制 10MB
  if (sizeKB > 9500) {
    return { success: false, error: '图片太大(>9MB)，请选择较小的图片' };
  }
  
  if (imageBase64.length < 1000) {
    return { success: false, error: '图片太小，请重新拍摄' };
  }
  
  return new Promise((resolve) => {
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
      timeout: 60000,
      success: (res) => {
        console.log('📡 API状态码:', res.statusCode);
        console.log('📡 API响应:', JSON.stringify(res.data));
        
        if (res.statusCode === 200 && res.data) {
          // 检查错误码
          if (res.data.code === 'InvalidParameter') {
            const msg = res.data.message || '图片格式不支持';
            console.log('❌ 参数错误:', msg);
            resolve({ success: false, error: '图片格式不支持，请换一张试试' });
            return;
          }
          
          const content = res.data.choices?.[0]?.message?.content;
          
          if (content) {
            const plant = {
              id: 'plant_' + Date.now(),
              name: '识别结果',
              description: content,
              scientificName: '',
              family: '未知',
              difficulty: '中等',
              toxicity: false,
              careGuide: {
                light: '适中光照',
                water: '适量浇水',
                temperature: '常温'
              }
            };
            
            console.log('✅ 识别成功');
            resolve({ success: true, data: plant });
          } else {
            resolve({ success: false, error: '识别失败，请重试' });
          }
        } else {
          resolve({ success: false, error: '网络错误(' + res.statusCode + ')' });
        }
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
        resolve({ success: false, error: '网络错误，请检查网络' });
      }
    });
  });
};

module.exports = { identifyPlant };