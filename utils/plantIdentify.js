/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 * API 文档: https://help.aliyun.com/document_detail/2412504.html
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
// 使用 OpenAI 兼容模式 API（更稳定）
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 识别植物
 * @param {string} imageBase64 - 图片的 base64 编码（不含前缀）
 */
const identifyPlant = (imageBase64) => {
  return new Promise((resolve, reject) => {
    // 构建完整的 data URL
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log('🌿 开始调用植物识别API...');
    
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
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: 'text',
                text: `请识别这张图片中的植物，直接返回JSON格式，不要有其他文字说明：
{"name":"植物名称","scientificName":"学名","family":"科属","description":"简短描述(30字内)","careGuide":{"light":"光照需求","water":"浇水频率","temperature":"适宜温度","humidity":"湿度要求","fertilizer":"施肥建议","tips":"养护技巧"},"difficulty":"简单","toxicity":false,"features":["特点1","特点2"]}`
              }
            ]
          }
        ],
        max_tokens: 1000
      },
      success: (res) => {
        console.log('📡 API响应状态:', res.statusCode);
        console.log('📡 API响应数据:', JSON.stringify(res.data).substring(0, 500));
        
        if (res.statusCode !== 200) {
          const errorMsg = res.data?.error?.message || res.data?.message || `HTTP错误(${res.statusCode})`;
          console.error('❌ API错误:', errorMsg);
          resolve({ success: false, error: errorMsg });
          return;
        }
        
        // OpenAI 兼容格式: choices[0].message.content
        const content = res.data?.choices?.[0]?.message?.content;
        
        if (!content) {
          console.error('❌ 未找到返回内容');
          resolve({ success: false, error: 'AI未返回内容' });
          return;
        }
        
        console.log('✅ AI返回内容:', content.substring(0, 200));
        
        try {
          // 尝试提取 JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const plantData = JSON.parse(jsonMatch[0]);
            console.log('✅ 解析成功:', plantData.name);
            resolve({ success: true, data: plantData });
          } else {
            // 如果没有 JSON 格式，尝试从文本中提取
            console.log('⚠️ 未找到JSON，使用默认格式');
            resolve({ 
              success: true, 
              data: { 
                name: '植物',
                description: content.substring(0, 100),
                family: '未知',
                difficulty: '中等',
                toxicity: false,
                careGuide: {
                  light: '适中光照',
                  water: '适量浇水',
                  temperature: '常温'
                }
              } 
            });
          }
        } catch (e) {
          console.error('❌ JSON解析失败:', e);
          resolve({ success: false, error: '解析失败: ' + e.message });
        }
      },
      fail: (err) => {
        console.error('❌ 网络请求失败:', err);
        resolve({ success: false, error: '网络错误: ' + (err.errMsg || '未知错误') });
      }
    });
  });
};

module.exports = { identifyPlant };