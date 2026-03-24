/**
 * 混合植物识别工具 v3.0
 * 
 * 策略：
 * 1. 优先使用 PlantNet API（精准识别植物名称）
 * 2. 用 Qwen-Turbo 补充养护建议（便宜）
 * 3. PlantNet 失败时自动切换到百度 AI 植物识别（免费3万次）
 * 4. 自动追踪每日额度
 * 
 * 更新：降级方案从 Qwen-VL-Max（付费）改为百度 AI（免费）
 */

const app = getApp();

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_PLANT_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v1/plant';

// 获取 API Key 的辅助函数
const getQwenApiKey = () => app.globalData?.qwenApiKey || '';
const getPlantnetApiKey = () => app.globalData?.plantnetApiKey || '';
const getBaiduApiKey = () => app.globalData?.baiduApiKey || '';
const getBaiduSecretKey = () => app.globalData?.baiduSecretKey || '';

// 百度 access_token 缓存
let baiduAccessToken = null;
let baiduTokenExpireTime = 0;

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
      const detailInfo = await getCareGuideFromQwen(plantnetResult.data.name);
      
      console.log('🎉 混合识别完成！');
      return {
        success: true,
        data: {
          id: plantnetResult.data.id,
          name: plantnetResult.data.name,
          scientificName: plantnetResult.data.scientificName,
          family: plantnetResult.data.family,
          confidence: plantnetResult.data.confidence,
          description: plantnetResult.data.description,
          imageUrl: plantnetResult.data.imageUrl || '',  // PlantNet 提供的真实图片
          // Qwen 返回的详细信息
          commonNames: detailInfo.commonNames,
          plantProfile: detailInfo.plantProfile,
          growthHabit: detailInfo.growthHabit,
          distribution: detailInfo.distribution,
          mainValue: detailInfo.mainValue,
          careGuide: detailInfo.careGuide,
          difficultyLevel: detailInfo.difficultyLevel,
          difficultyText: detailInfo.difficultyText,
          quickTips: detailInfo.quickTips,
          // 元数据
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
  
  // ========== 策略2: 百度 AI 植物识别（降级方案，免费3万次）==========
  console.log('🚀 策略2: 百度 AI 植物识别');
  const baiduResult = await identifyWithBaiduAI(imageBase64);
  
  if (baiduResult.success) {
    console.log('✅ 百度 AI 识别成功');
    return {
      success: true,
      data: {
        ...baiduResult.data,
        source: '百度 AI + Qwen-Turbo（降级）'
      }
    };
  }
  
  console.log('❌ 所有识别方案都失败');
  return { success: false, error: baiduResult.error || '识别失败，请重试' };
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
                    
                    // 提取图片（PlantNet 返回的示例图片）
                    let imageUrl = '';
                    if (bestMatch.images && bestMatch.images.length > 0) {
                      imageUrl = bestMatch.images[0].url?.m || bestMatch.images[0].url?.o || '';
                      console.log('📸 找到 PlantNet 图片:', imageUrl ? '是' : '否');
                    }
                    
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
                          description: `识别置信度：${Math.round(score * 100)}%\n学名：${species.scientificNameWithoutAuthor}`,
                          imageUrl: imageUrl  // PlantNet 提供的真实植物图片
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
 * Qwen-Turbo 获取养护建议（返回完整数据结构）
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
          content: `请为"${plantName}"提供详细的植物信息，格式如下：

【常用名】老百姓日常叫法
【植物档案】茎叶花种子特点（50字内）
【生长习性】一句话描述
【分布范围】一句话描述
【主要价值】一句话描述
【光照】具体需求
【浇水】具体方法
【温度】适宜范围
【养护难度】1-5星
【快速要点】3个关键词，用顿号分隔

每项一句话即可，简洁明了。`
        }]
      },
      timeout: 30000,
      success: (res) => {
        const content = res.data?.choices?.[0]?.message?.content || '';
        console.log('📝 Qwen-Turbo 返回:', content.substring(0, 100));
        
        // 解析内容，返回符合设计规范的数据结构
        const result = {
          commonNames: '',
          plantProfile: '',
          growthHabit: '',
          distribution: '',
          mainValue: '',
          careGuide: {
            light: '适中光照',
            water: '适量浇水',
            temperature: '室温',
            humidity: '',
            fertilizer: '',
            tips: ''
          },
          difficultyLevel: 3,
          difficultyText: '适合有一定经验的养护者',
          quickTips: []
        };
        
        // 解析各项
        const commonMatch = content.match(/【常用名】\s*([^\n【]+)/);
        if (commonMatch) result.commonNames = commonMatch[1].trim();
        
        const profileMatch = content.match(/【植物档案】\s*([^\n【]+)/);
        if (profileMatch) result.plantProfile = profileMatch[1].trim();
        
        const habitMatch = content.match(/【生长习性】\s*([^\n【]+)/);
        if (habitMatch) result.growthHabit = habitMatch[1].trim();
        
        const distMatch = content.match(/【分布范围】\s*([^\n【]+)/);
        if (distMatch) result.distribution = distMatch[1].trim();
        
        const valueMatch = content.match(/【主要价值】\s*([^\n【]+)/);
        if (valueMatch) result.mainValue = valueMatch[1].trim();
        
        const lightMatch = content.match(/【光照】\s*([^\n【]+)/);
        if (lightMatch) result.careGuide.light = lightMatch[1].trim();
        
        const waterMatch = content.match(/【浇水】\s*([^\n【]+)/);
        if (waterMatch) result.careGuide.water = waterMatch[1].trim();
        
        const tempMatch = content.match(/【温度】\s*([^\n【]+)/);
        if (tempMatch) result.careGuide.temperature = tempMatch[1].trim();
        
        const diffMatch = content.match(/【养护难度】\s*(\d)/);
        if (diffMatch) result.difficultyLevel = parseInt(diffMatch[1]);
        
        const tipsMatch = content.match(/【快速要点】\s*([^\n【]+)/);
        if (tipsMatch) {
          result.quickTips = tipsMatch[1].trim().split(/[、，,]/).slice(0, 3);
        }
        
        resolve(result);
      },
      fail: (err) => {
        console.log('⚠️ Qwen-Turbo 调用失败，使用默认建议');
        resolve({
          commonNames: '',
          plantProfile: '',
          growthHabit: '',
          distribution: '',
          mainValue: '',
          careGuide: {
            light: '适中光照',
            water: '适量浇水',
            temperature: '室温',
            humidity: '',
            fertilizer: '',
            tips: ''
          },
          difficultyLevel: 3,
          difficultyText: '适合有一定经验的养护者',
          quickTips: []
        });
      }
    });
  });
}

/**
 * 获取百度 AI access_token
 */
async function getBaiduAccessToken() {
  // 如果 token 还有效，直接返回
  if (baiduAccessToken && Date.now() < baiduTokenExpireTime) {
    return baiduAccessToken;
  }
  
  const apiKey = getBaiduApiKey();
  const secretKey = getBaiduSecretKey();
  
  if (!apiKey || !secretKey) {
    console.log('⚠️ 百度 AI API Key 未配置');
    return null;
  }
  
  return new Promise((resolve) => {
    wx.request({
      url: `${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      method: 'POST',
      success: (res) => {
        if (res.data?.access_token) {
          baiduAccessToken = res.data.access_token;
          // token 有效期 30 天，提前 1 天刷新
          baiduTokenExpireTime = Date.now() + (res.data.expires_in - 86400) * 1000;
          console.log('✅ 百度 AI access_token 获取成功');
          resolve(baiduAccessToken);
        } else {
          console.log('❌ 百度 AI access_token 获取失败:', res.data);
          resolve(null);
        }
      },
      fail: (err) => {
        console.log('❌ 百度 AI 网络错误:', err);
        resolve(null);
      }
    });
  });
}

/**
 * 百度 AI 植物识别（降级方案，免费3万次）
 */
async function identifyWithBaiduAI(imageBase64) {
  console.log('🤖 调用百度 AI 植物识别（降级方案）...');
  
  const accessToken = await getBaiduAccessToken();
  
  if (!accessToken) {
    return { success: false, error: '百度 AI 未配置或获取 token 失败' };
  }
  
  return new Promise((resolve) => {
    wx.request({
      url: `${BAIDU_PLANT_URL}?access_token=${accessToken}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `image=${encodeURIComponent(imageBase64)}&baike_num=1`,
      timeout: 30000,
      success: async (res) => {
        console.log('📡 百度 AI HTTP 状态:', res.statusCode);
        
        if (res.statusCode === 200 && res.data?.result?.length > 0) {
          const bestMatch = res.data.result[0];
          const score = bestMatch.score || 0;
          
          console.log(`🎯 百度 AI 最佳匹配: ${bestMatch.name}`);
          console.log(`📊 置信度: ${Math.round(score * 100)}%`);
          
          // 获取百科信息
          const baikeInfo = bestMatch.baike_info || {};
          
          // 用 Qwen-Turbo 获取养护建议
          console.log('🤖 调用 Qwen-Turbo 获取养护建议...');
          const detailInfo = await getCareGuideFromQwen(bestMatch.name);
          
          resolve({
            success: true,
            data: {
              id: 'plant_' + Date.now(),
              name: bestMatch.name,
              scientificName: baikeInfo.baike_url?.split('/').pop() || '',
              family: '未知',
              confidence: Math.round(score * 100),
              description: baikeInfo.description || '',
              imageUrl: baikeInfo.image_url || '',
              // Qwen 返回的详细信息
              commonNames: detailInfo.commonNames,
              plantProfile: detailInfo.plantProfile,
              growthHabit: detailInfo.growthHabit,
              distribution: detailInfo.distribution,
              mainValue: detailInfo.mainValue,
              careGuide: detailInfo.careGuide,
              difficultyLevel: detailInfo.difficultyLevel,
              difficultyText: detailInfo.difficultyText,
              quickTips: detailInfo.quickTips,
              source: '百度 AI + Qwen-Turbo（降级）'
            }
          });
        } else if (res.data?.error_code) {
          console.log('❌ 百度 AI 错误:', res.data.error_msg);
          resolve({ success: false, error: res.data.error_msg || '识别失败' });
        } else {
          resolve({ success: false, error: '未识别到植物' });
        }
      },
      fail: (err) => {
        console.log('❌ 百度 AI 网络错误:', err);
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
    },
    baidu: {
      limit: '3万次总额度（企业认证）',
      note: '每天500次限制'
    }
  };
};

module.exports = {
  identifyPlant,
  getQuotaStatus
};