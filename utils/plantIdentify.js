/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

/**
 * 识别植物
 * @param {string} imageBase64 - 图片的 base64 编码（不含前缀）
 */
const identifyPlant = (imageBase64) => {
  return new Promise((resolve, reject) => {
    // 添加图片前缀
    const imageData = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log('开始识别植物...');
    
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        input: {
          messages: [
            {
              role: 'user',
              content: [
                {
                  image: imageData
                },
                {
                  text: `请识别这张图片中的植物，直接返回JSON格式，不要有其他文字：
{"name":"植物名称","scientificName":"学名","family":"科属","description":"简短描述","careGuide":{"light":"光照需求","water":"浇水频率","temperature":"适宜温度","humidity":"湿度要求","fertilizer":"施肥建议","tips":"养护技巧"},"difficulty":"简单或中等或困难","toxicity":false,"features":["特点1","特点2"]}`
                }
              ]
            }
          ]
        }
      },
      success: (res) => {
        console.log('API响应:', res);
        
        if (res.statusCode !== 200) {
          console.error('API错误:', res.statusCode, res.data);
          resolve({ success: false, error: `API错误(${res.statusCode}): ${JSON.stringify(res.data)}` });
          return;
        }
        
        // 尝试多种响应格式
        let content = null;
        
        // 格式1: output.choices[0].message.content
        if (res.data?.output?.choices?.[0]?.message?.content) {
          content = res.data.output.choices[0].message.content;
        }
        // 格式2: output.text
        else if (res.data?.output?.text) {
          content = res.data.output.text;
        }
        // 格式3: data.choices (OpenAI 格式)
        else if (res.data?.choices?.[0]?.message?.content) {
          content = res.data.choices[0].message.content;
        }
        
        console.log('AI返回内容:', content);
        
        if (!content) {
          console.error('未找到返回内容:', JSON.stringify(res.data));
          resolve({ success: false, error: 'AI未返回内容' });
          return;
        }
        
        try {
          // 尝试提取 JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const plantData = JSON.parse(jsonMatch[0]);
            console.log('解析成功:', plantData);
            resolve({ success: true, data: plantData });
          } else {
            // 如果没有 JSON，尝试直接用内容
            resolve({ 
              success: true, 
              data: { 
                name: '识别结果', 
                description: content,
                family: '未知',
                careGuide: {
                  light: '请查看描述',
                  water: '请查看描述',
                  temperature: '请查看描述'
                }
              } 
            });
          }
        } catch (e) {
          console.error('JSON解析失败:', e);
          resolve({ success: false, error: 'JSON解析失败: ' + e.message });
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        resolve({ success: false, error: '网络失败: ' + (err.errMsg || JSON.stringify(err)) });
      }
    });
  });
};

module.exports = { identifyPlant };