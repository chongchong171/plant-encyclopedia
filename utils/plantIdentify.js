/**
 * 混合植物识别工具
 * 优先使用 PlantNet API（精准识别）
 * 失败后自动切换到 Qwen-VL-Max（全能识别）
 */

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';
const PLANTNET_API_KEY = '2b10FL68fQYQN3rsOHf9xCrSe';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const QWEN_API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';

// 本地存储当日调用次数
let plantnetDailyCount = 0;
let plantnetDailyLimit = 500;
let lastResetDate = new Date().toDateString();

/**
 * 检查并重置每日计数
 */
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    plantnetDailyCount = 0;
    lastResetDate = today;
    console.log('📅 新的一天，PlantNet 计数已重置');
  }
}

/**
 * 混合识别入口
 */
const identifyPlant = async (imageBase64) => {
  checkDailyReset();
  
  console.log('🌿 开始混合识别...');
  
  // 优先使用 PlantNet
  if (plantnetDailyCount < plantnetDailyLimit) {
    console.log('📍 尝试 PlantNet API（精准模式）');
    const result = await identifyWithPlantNet(imageBase64);
    
    if (result.success) {
      plantnetDailyCount++;
      console.log(`✅ PlantNet 成功！今日已用 ${plantnetDailyCount}/${plantnetDailyLimit}`);
      
      // 拿到植物名称，补充养护建议
      const plantName = result.data.name;
      const careGuide = await getCareGuideFromQwen(plantName);
      
      return {
        success: true,
        data: {
          ...result.data,
          careGuide: careGuide,
          source: 'PlantNet + Qwen'
        }
      };
    }
    
    console.log('⚠️ PlantNet 失败，切换到 Qwen-VL...');
  } else {
    console.log('⚠️ PlantNet 今日额度已用完，使用 Qwen-VL...');
  }
  
  // 降级到 Qwen-VL-Max
  return await identifyWithQwenVL(imageBase64);
};

/**
 * PlantNet 识别
 */
async function identifyWithPlantNet(imageBase64) {
  return new Promise((resolve) => {
    // PlantNet 需要 form-data 格式
    const filePath = `${wx.env.USER_DATA_PATH}/temp_plant_${Date.now()}.jpg`;
    const buffer = wx.base64ToArrayBuffer(imageBase64);
    
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: buffer,
      encoding: 'binary',
      success: () => {
        wx.uploadFile({
          url: `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`,
          filePath: filePath,
          name: 'images',
          formData: {
            'organs': 'auto'
          },
          success: (res) => {
            console.log('📡 PlantNet 响应:', res.statusCode);
            
            if (res.statusCode === 200) {
              try {
                const data = JSON.parse(res.data);
                const bestMatch = data.results?.[0];
                
                if (bestMatch && bestMatch.score > 0.5) {
                  const species = bestMatch.species;
                  resolve({
                    success: true,
                    data: {
                      id: 'plant_' + Date.now(),
                      name: species.commonNames?.[0] || species.scientificNameWithoutAuthor,
                      scientificName: species.scientificNameWithoutAuthor,
                      family: species.family?.scientificNameWithoutAuthor || '未知',
                      confidence: Math.round(bestMatch.score * 100),
                      description: `识别置信度：${Math.round(bestMatch.score * 100)}%`
                    }
                  });
                } else {
                  resolve({ success: false, error: '置信度过低' });
                }
              } catch (e) {
                resolve({ success: false, error: '解析失败' });
              }
            } else {
              resolve({ success: false, error: 'API 错误' });
            }
          },
          fail: (err) => {
            console.log('❌ PlantNet 请求失败:', err);
            resolve({ success: false, error: '网络错误' });
          }
        });
      },
      fail: () => {
        resolve({ success: false, error: '文件写入失败' });
      }
    });
  });
}

/**
 * 用 Qwen-Turbo 获取养护建议（便宜）
 */
async function getCareGuideFromQwen(plantName) {
  return new Promise((resolve) => {
    wx.request({
      url: QWEN_API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-turbo',
        messages: [{
          role: 'user',
          content: `请为"${plantName}"提供简短的养护建议，包括光照、浇水、温度三个方面，每个方面一句话。`
        }]
      },
      success: (res) => {
        const content = res.data?.choices?.[0]?.message?.content || '';
        
        // 解析养护建议
        const careGuide = {
          light: '适中光照',
          water: '适量浇水',
          temperature: '室温'
        };
        
        const lightMatch = content.match(/光照[是为：:]*\s*([^\n，,。]+)/);
        if (lightMatch) careGuide.light = lightMatch[1].trim();
        
        const waterMatch = content.match(/浇水?[是为：:]*\s*([^\n，,。]+)/);
        if (waterMatch) careGuide.water = waterMatch[1].trim();
        
        const tempMatch = content.match(/温度[是为：:]*\s*([^\n，,。]+)/);
        if (tempMatch) careGuide.temperature = tempMatch[1].trim();
        
        resolve(careGuide);
      },
      fail: () => {
        resolve({ light: '适中光照', water: '适量浇水', temperature: '室温' });
      }
    });
  });
}

/**
 * Qwen-VL-Max 全能识别（降级方案）
 */
async function identifyWithQwenVL(imageBase64) {
  console.log('🤖 使用 Qwen-VL-Max 识别');
  
  return new Promise((resolve) => {
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    wx.request({
      url: QWEN_API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: '请识别这张图片中的植物，告诉我：1.植物名称 2.养护建议（光照、浇水、温度）' }
          ]
        }]
      },
      timeout: 60000,
      success: (res) => {
        if (res.statusCode === 200 && res.data?.choices?.[0]?.message?.content) {
          const content = res.data.choices[0].message.content;
          
          // 解析名称
          let plantName = '植物';
          const nameMatch = content.match(/植物[是为：:]\s*([^\n，,。]+)/) ||
                           content.match(/名称[是为：:]\s*([^\n，,。]+)/);
          if (nameMatch) plantName = nameMatch[1].trim();
          
          // 解析养护建议
          const careGuide = {
            light: '适中光照',
            water: '适量浇水',
            temperature: '室温'
          };
          
          const lightMatch = content.match(/光照[是为：:]*\s*([^\n，,。]+)/);
          if (lightMatch) careGuide.light = lightMatch[1].trim();
          
          const waterMatch = content.match(/浇水?[是为：:]*\s*([^\n，,。]+)/);
          if (waterMatch) careGuide.water = waterMatch[1].trim();
          
          const tempMatch = content.match(/温度[是为：:]*\s*([^\n，,。]+)/);
          if (tempMatch) careGuide.temperature = tempMatch[1].trim();
          
          resolve({
            success: true,
            data: {
              id: 'plant_' + Date.now(),
              name: plantName,
              scientificName: '',
              family: '未知',
              description: content,
              careGuide: careGuide,
              source: 'Qwen-VL-Max'
            }
          });
        } else {
          resolve({ success: false, error: '识别失败' });
        }
      },
      fail: () => {
        resolve({ success: false, error: '网络错误' });
      }
    });
  });
}

/**
 * 获取当前额度状态
 */
const getQuotaStatus = () => {
  checkDailyReset();
  return {
    plantnet: {
      used: plantnetDailyCount,
      limit: plantnetDailyLimit,
      remaining: plantnetDailyLimit - plantnetDailyCount
    }
  };
};

module.exports = { 
  identifyPlant,
  getQuotaStatus
};