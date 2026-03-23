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
    
    if (imageBase64.length > 5500000) {
      resolve({ success: false, error: '图片太大(>4MB)，请选择较小的图片' });
      return;
    }
    
    if (imageBase64.length < 1000) {
      resolve({ success: false, error: '图片太小，请重新拍摄' });
      return;
    }
    
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
        console.log('📡 API完整响应:', JSON.stringify(res.data));
        
        if (res.statusCode === 200 && res.data) {
          // 直接获取 content
          const content = res.data.choices?.[0]?.message?.content;
          
          console.log('📝 AI返回内容:', content);
          
          if (content) {
            // 构造植物数据对象
            const plant = {
              id: 'plant_' + Date.now(),
              name: '植物',
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
            
            // 尝试从文本中提取植物名称
            const namePatterns = [
              /这是(.+?)的图片/,
              /图片中是(.+?)[，,。]/,
              /这是一(.*?)(植物|花|树)/,
              /植物[是为]?\s*(.+?)[，,。]/
            ];
            
            for (const pattern of namePatterns) {
              const match = content.match(pattern);
              if (match && match[1]) {
                plant.name = match[1].trim();
                break;
              }
            }
            
            console.log('✅ 解析成功，植物名称:', plant.name);
            resolve({ success: true, data: plant });
          } else {
            resolve({ success: false, error: 'API返回内容为空' });
          }
        } else {
          let errMsg = '识别失败';
          if (res.statusCode === 401) errMsg = 'API认证失败';
          else if (res.statusCode === 429) errMsg = '请求太频繁';
          else if (res.statusCode >= 500) errMsg = '服务器繁忙';
          resolve({ success: false, error: errMsg + '(' + res.statusCode + ')' });
        }
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
        resolve({ success: false, error: '网络错误: ' + (err.errMsg || '请检查网络') });
      }
    });
  });
};

module.exports = { identifyPlant };