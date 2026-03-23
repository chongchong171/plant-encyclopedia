/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/**
 * 识别植物
 */
const identifyPlant = (imageBase64) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',  // 使用免费额度模型（100万Token，90天内）
        input: {
          messages: [
            {
              role: 'user',
              content: [
                { image: imageBase64 },
                { 
                  text: `请识别这张图片中的植物，并以 JSON 格式返回：
{
  "name": "植物名称",
  "scientificName": "学名",
  "family": "科属",
  "description": "简短描述",
  "careGuide": {
    "light": "光照需求",
    "water": "浇水频率",
    "temperature": "适宜温度",
    "humidity": "湿度要求",
    "fertilizer": "施肥建议",
    "tips": "养护技巧"
  },
  "difficulty": "养殖难度",
  "toxicity": false,
  "features": ["特点1", "特点2"]
}`
                }
              ]
            }
          ]
        }
      },
      success: (res) => {
        if (res.statusCode !== 200) {
          resolve({ success: false, error: `API错误: ${res.statusCode}` });
          return;
        }
        
        const content = res.data?.output?.choices?.[0]?.message?.content;
        if (!content) {
          resolve({ success: false, error: 'AI未返回内容' });
          return;
        }
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            resolve({ success: true, data: JSON.parse(jsonMatch[0]) });
          } else {
            resolve({ success: true, data: { name: '未知植物', description: content } });
          }
        } catch (e) {
          resolve({ success: false, error: '解析失败' });
        }
      },
      fail: (err) => {
        resolve({ success: false, error: err.errMsg || '网络失败' });
      }
    });
  });
};

module.exports = { identifyPlant };