/**
 * 混合植物识别工具 v2.1
 * 
 * 策略：
 * 1. 优先使用 PlantNet API（精准识别植物名称）
 * 2. 用 Qwen-Turbo 补充养护建议（便宜）
 * 3. PlantNet 失败时自动切换到 Qwen-VL-Max
 * 4. 自动追踪每日额度
 * 
 * 更新：API Key 从 app.globalData 统一获取
 */

const app = getApp();

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 获取 API Key 的辅助函数
const getQwenApiKey = () => app.globalData?.qwenApiKey || '';
const getPlantnetApiKey = () => app.globalData?.plantnetApiKey || '';

// 额度追踪
let plantnetDailyCount = 0;
const PLANTNET_DAILY_LIMIT = 500;
let lastResetDate = new Date().toDateString();

// 微信小程序 storage key
const STORAGE_KEY = 'plantnet_quota';

/**
 * 检查并重置每日计数（持久化存储）
 */
function checkDailyReset() {
  const today = new Date().toDateString();
  
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && stored.date === today) {
      plantnetDailyCount = stored.count;
    } else {
      // 新的一天，重置计数
      plantnetDailyCount = 0;
      wx.setStorageSync(STORAGE_KEY, { date: today, count: 0 });
      console.log('📅 新的一天，PlantNet 计数已重置');
    }
  } catch (e) {
    console.log('⚠️ 读取存储失败，使用默认值');
  }
  
  lastResetDate = today;
}

/**
 * 保存当日计数
 */
function saveDailyCount() {
  try {
    wx.setStorageSync(STORAGE_KEY, {
      date: lastResetDate,
      count: plantnetDailyCount
    });
  } catch (e) {
    console.log('⚠️ 保存存储失败');
  }
}

/**
 * 主入口：混合识别
 */
const identifyPlant = async (imageBase64) => {
  checkDailyReset();
  
  console.log('🌿 ========== 开始混合识别 ==========');
  console.log(`📊 PlantNet 今日状态: ${plantnetDailyCount}/${PLANTNET_DAILY_LIMIT}`);
  
  // 计算图片大小
  const sizeKB = imageBase64.length * 0.75 / 1024;
  console.log(`📐 图片大小: ${sizeKB.toFixed(1)} KB`);
  
  if (sizeKB > 9500) {
    return { success: false, error: '图片太大(>9MB)，请选择较小的图片' };
  }
  
  // ========== 策略1: PlantNet + Qwen-Turbo ==========
  if (plantnetDailyCount < PLANTNET_DAILY_LIMIT) {
    console.log('🚀 策略1: PlantNet (精准识别) + Qwen-Turbo (养护建议)');
    
    const plantnetResult = await identifyWithPlantNet(imageBase64);
    
    if (plantnetResult.success) {
      // PlantNet 成功，更新计数
      plantnetDailyCount++;
      saveDailyCount();
      console.log(`✅ PlantNet 成功！今日已用: ${plantnetDailyCount}/${PLANTNET_DAILY_LIMIT}`);
      
      // 用 Qwen-Turbo 获取养护建议
      console.log('🤖 调用 Qwen-Turbo 获取养护建议...');
      const careGuide = await getCareGuideFromQwen(plantnetResult.data.name);
      
      console.log('🎉 混合识别完成！');
      return {
        success: true,
        data: {
          ...plantnetResult.data,
          careGuide: careGuide,
          source: 'PlantNet + Qwen-Turbo',
          quotaRemaining: PLANTNET_DAILY_LIMIT - plantnetDailyCount
        }
      };
    }
    
    console.log('⚠️ PlantNet 失败:', plantnetResult.error);
    console.log('🔄 自动切换到策略2...');
  } else {
    console.log('⚠️ PlantNet 今日额度已用完');
    console.log('🔄 自动切换到策略2...');
  }
  
  // ========== 策略2: Qwen-VL-Max（降级方案）==========
  console.log('🚀 策略2: Qwen-VL-Max (全能识别)');
  const qwenResult = await identifyWithQwenVL(imageBase64);
  
  if (qwenResult.success) {
    console.log('✅ Qwen-VL-Max 识别成功');
    return {
      success: true,
      data: {
        ...qwenResult.data,
        source: 'Qwen-VL-Max (降级)'
      }
    };
  }
  
  console.log('❌ 所有识别方案都失败');
  return { success: false, error: qwenResult.error || '识别失败，请重试' };
};

/**
 * PlantNet API 识别
 */
async function identifyWithPlantNet(imageBase64) {
  console.log('📡 调用 PlantNet API...');
  
  const apiKey = getPlantnetApiKey();
  
  return new Promise((resolve) => {
    // 创建临时文件
    const filePath = `${wx.env.USER_DATA_PATH}/plantnet_temp_${Date.now()}.jpg`;
    
    try {
      const buffer = wx.base64ToArrayBuffer(imageBase64);
      
      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: buffer,
        encoding: 'binary',
        success: () => {
          // 上传到 PlantNet
          wx.uploadFile({
            url: `${PLANTNET_API_URL}?api-key=${apiKey}`,
            filePath: filePath,
            name: 'images',
            formData: {
              organs: 'auto'  // 自动识别器官（叶、花、果实等）
            },
            timeout: 60000,
            success: (res) => {
              console.log('📡 PlantNet HTTP 状态:', res.statusCode);
              
              // 清理临时文件
              wx.getFileSystemManager().unlink({ filePath, fail: () => {} });
              
              if (res.statusCode === 200) {
                try {
                  const data = JSON.parse(res.data);
                  console.log('📡 PlantNet 返回:', JSON.stringify(data).substring(0, 200));
                  
                  if (data.results && data.results.length > 0) {
                    const bestMatch = data.results[0];
                    const score = bestMatch.score || 0;
                    
                    console.log(`🎯 最佳匹配: ${bestMatch.species?.scientificNameWithoutAuthor}`);
                    console.log(`📊 置信度: ${Math.round(score * 100)}%`);
                    
                    if (score > 0.3) {  // 置信度阈值 30%
                      const species = bestMatch.species;
                      resolve({
                        success: true,
                        data: {
                          id: 'plant_' + Date.now(),
                          name: species.commonNames?.[0] || species.scientificNameWithoutAuthor,
                          scientificName: species.scientificNameWithoutAuthor,
                          family: species.family?.scientificNameWithoutAuthor || '未知',
                          confidence: Math.round(score * 100),
                          description: `识别置信度：${Math.round(score * 100)}%\n学名：${species.scientificNameWithoutAuthor}`
                        }
                      });
                    } else {
                      resolve({ success: false, error: '置信度过低，无法确定植物种类' });
                    }
                  } else {
                    resolve({ success: false, error: '未识别到植物' });
                  }
                } catch (e) {
                  console.log('❌ 解析 PlantNet 响应失败:', e);
                  resolve({ success: false, error: '响应解析失败' });
                }
              } else if (res.statusCode === 429) {
                resolve({ success: false, error: 'PlantNet 额度已用完' });
              } else {
                resolve({ success: false, error: `PlantNet 错误 (${res.statusCode})` });
              }
            },
            fail: (err) => {
              wx.getFileSystemManager().unlink({ filePath, fail: () => {} });
              console.log('❌ PlantNet 网络错误:', err);
              resolve({ success: false, error: '网络错误，请检查网络连接' });
            }
          });
        },
        fail: (err) => {
          console.log('❌ 写入临时文件失败:', err);
          resolve({ success: false, error: '图片处理失败' });
        }
      });
    } catch (e) {
      console.log('❌ Base64 转换失败:', e);
      resolve({ success: false, error: '图片格式错误' });
    }
  });
}

/**
 * Qwen-Turbo 获取养护建议（便宜）
 */
async function getCareGuideFromQwen(plantName) {
  console.log('🤖 调用 Qwen-Turbo 获取养护建议...');
  
  const apiKey = getQwenApiKey();
  
  return new Promise((resolve) => {
    wx.request({
      url: QWEN_API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-turbo',
        messages: [{
          role: 'user',
          content: `请为"${plantName}"提供简短的养护建议，格式如下：
光照：xxx
浇水：xxx
温度：xxx
每种建议一句话即可。`
        }]
      },
      timeout: 30000,
      success: (res) => {
        const content = res.data?.choices?.[0]?.message?.content || '';
        console.log('📝 Qwen-Turbo 返回:', content.substring(0, 100));
        
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
      fail: (err) => {
        console.log('⚠️ Qwen-Turbo 调用失败，使用默认建议');
        resolve({ light: '适中光照', water: '适量浇水', temperature: '室温' });
      }
    });
  });
}

/**
 * Qwen-VL-Max 全能识别（降级方案）
 */
async function identifyWithQwenVL(imageBase64) {
  console.log('🤖 调用 Qwen-VL-Max...');
  
  const apiKey = getQwenApiKey();
  const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
  
  return new Promise((resolve) => {
    wx.request({
      url: QWEN_API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            },
            {
              type: 'text',
              text: `请识别这张图片中的植物，并提供以下信息：
1. 植物名称
2. 养护建议（光照、浇水、温度）

请按以下格式回答：
名称：xxx
光照：xxx
浇水：xxx
温度：xxx`
            }
          ]
        }]
      },
      timeout: 60000,
      success: (res) => {
        console.log('📡 Qwen-VL HTTP 状态:', res.statusCode);
        
        if (res.statusCode === 200 && res.data?.choices?.[0]?.message?.content) {
          const content = res.data.choices[0].message.content;
          console.log('📝 Qwen-VL 返回:', content.substring(0, 100));
          
          // 解析植物名称
          let plantName = '植物';
          const nameMatch = content.match(/名称[是为：:]\s*([^\n，,。]+)/) ||
                           content.match(/植物[是为：:]\s*([^\n，,。]+)/);
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
              careGuide: careGuide
            }
          });
        } else {
          resolve({ success: false, error: '识别失败' });
        }
      },
      fail: (err) => {
        console.log('❌ Qwen-VL 网络错误:', err);
        resolve({ success: false, error: '网络错误，请检查网络连接' });
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
      limit: PLANTNET_DAILY_LIMIT,
      remaining: PLANTNET_DAILY_LIMIT - plantnetDailyCount,
      resetTime: '每天 00:00 UTC'
    },
    qwen: {
      note: '100万 Token / 90天'
    }
  };
};

module.exports = {
  identifyPlant,
  getQuotaStatus
};