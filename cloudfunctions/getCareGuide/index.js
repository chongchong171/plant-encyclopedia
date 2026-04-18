/**
 * 云函数：getCareGuide
 * 
 * 职责：调用 GLM-4-Flash API 获取植物详细信息
 * 
 * 策略：
 * 1. 已知植物（在 plantCache.js 中）→ 直接返回缓存（秒开）
 * 2. 未知植物 → 文字秒出（固定模板）+ 图片异步（3-5 秒）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const fetch = require('node-fetch');

// 引入已知植物缓存
const PLANT_CACHE = require('./plantCache');

// 植物名称映射（别名 → 标准名称）
const PLANT_NAME_MAP = {
  '茉莉': '茉莉花',
  // 可以在这里添加更多别名映射
};

// 固定模板（极简版：更快响应）
const PROMPT_TEMPLATE = `植物专家，为"{plantName}"生成养护 JSON，严格按格式：
{"success":true,"name":"{plantName}","commonNames":"别名 1、别名 2","scientificName":"中文学名","scientificNameLatin":"拉丁学名","family":"科属","origin":"原产地及分布地区","plantProfile":"80-120 字，包含形态特征（叶片、花朵、株型）、观赏价值、原产地","growthHabit":"60-80 字，包含生长环境、生长速度、生命周期","mainValue":"50-70 字，包含观赏价值、净化空气、药用食用、寓意","careGuide":{"light":"25-35 字，每天几小时光照","water":"25-35 字，春夏几次、秋冬几次","temperature":"25-35 字，适宜温度范围","humidity":"25-35 字，喜干燥还是湿润","fertilizer":"25-35 字，生长期频率、肥料类型","soil":"25-35 字，土壤类型、配土","pruning":"25-35 字，什么时候剪、怎么剪","propagation":"25-35 字，繁殖方式、最佳时间"},"difficultyLevel":1-5,"difficultyText":"难度说明","quickTips":["养护要点 1","养护要点 2","养护要点 3","养护要点 4"],"commonProblems":["问题 1 及解决方法","问题 2 及解决方法","问题 3 及解决方法"]}
要求：1.只返回 JSON 2.不要解释 3.快速响应 4.拉丁学名准确 5.内容详细饱满`;

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_API_KEY = process.env.GLM_API_KEY;

// 百度 AI 图片搜索
const BAIDU_IMAGE_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v1/plant';
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

exports.main = async (event, context) => {
  const { plantName, scientificName, names, mode } = event;
  const startTime = Date.now();
  
  // 环境变量检查
  console.log('[getCareGuide] ========== 云函数启动 ==========');
  console.log('[getCareGuide] 环境变量检查:');
  console.log('[getCareGuide] - GLM_API_KEY:', process.env.GLM_API_KEY ? '已配置（长度:' + process.env.GLM_API_KEY.length + '）' : '❌ 未配置');
  console.log('[getCareGuide] - BAIDU_API_KEY:', process.env.BAIDU_API_KEY ? '已配置（长度:' + process.env.BAIDU_API_KEY.length + '）' : '❌ 未配置');
  console.log('[getCareGuide] - BAIDU_SECRET_KEY:', process.env.BAIDU_SECRET_KEY ? '已配置（长度:' + process.env.BAIDU_SECRET_KEY.length + '）' : '❌ 未配置');
  console.log('[getCareGuide] 请求参数:', JSON.stringify(event));
  
  if (!plantName) {
    return { success: false, error: '植物名称不能为空' };
  }
  
  // 优先使用传递过来的拉丁学名（前端已映射）
  let searchQuery = scientificName || '';
  if (searchQuery) {
    console.log('[getCareGuide] 使用前端传递的拉丁学名:', searchQuery);
  }
  
  // 名称标准化（别名转标准名）
  const standardPlantName = PLANT_NAME_MAP[plantName] || plantName;
  if (standardPlantName !== plantName) {
    console.log('[getCareGuide] 名称标准化:', plantName, '→', standardPlantName);
  }
  
  // 启用缓存（2026-04-16），已知植物直接返回完整数据（使用标准化名称）
    if (PLANT_CACHE[standardPlantName]) {
      console.log('[getCareGuide] ✅ 使用缓存数据:', standardPlantName);
      const cached = JSON.parse(JSON.stringify(PLANT_CACHE[standardPlantName])); // 深拷贝
      console.log('[getCareGuide] 缓存数据:', JSON.stringify(cached).substring(0, 200));
      
      // 埋点
      const wxContext = cloud.getWXContext();
      if (wxContext.OPENID) {
        db.collection('analytics_events').add({
          date: new Date().toISOString().split('T')[0],
          openId: wxContext.OPENID,
          event: 'get_care_guide',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          success: true,
          fromCache: true,
          extra: { plantName, standardPlantName, mode }
        }).catch(() => {});
      }
      
      // 添加字段映射，确保与前端期望的一致（保留原字段 + 添加新字段）
      cached.description = cached.plantProfile || '';
      cached.appearance = cached.appearance || cached.plantProfile || '';
      cached.origin = cached.origin || '';
      cached.growthHabit = cached.growthHabit || '';
      cached.mainValue = cached.mainValue || '';
      
      // 确保返回的名称是用户搜索的名称
      cached.name = plantName;
      
      console.log('[getCareGuide] 映射后的数据:', JSON.stringify({
        name: cached.name,
        description: cached.description?.substring(0, 50),
        growthHabit: cached.growthHabit?.substring(0, 50),
        mainValue: cached.mainValue?.substring(0, 50),
        careGuideKeys: Object.keys(cached.careGuide || {})
      }));
      
      return cached;
    }
  
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  // 模式 1：只获取图片（轻量模式，不调 AI）
  if (mode === 'image_only') {
    console.log('[getCareGuide] 图片专用模式，跳过 AI');
    let nameList = Array.isArray(names) ? names : (typeof names === 'string' ? names.split(/[,，、]/).map(s => s.trim()).filter(s => s) : []);
    
    const latinName = nameList.find(n => !/[\u4e00-\u9fa5]/.test(n));
    const chineseName = nameList.find(n => /[\u4e00-\u9fa5]/.test(n)) || plantName;
    const searchLatin = latinName || chineseName;
    
    console.log('[getCareGuide] 图片搜索 - 拉丁学名:', latinName || '无', '中文名:', chineseName);
    const imageUrl = await getPlantImageFromFreeSources(searchLatin, chineseName);
    return { success: !!imageUrl, imageUrl: imageUrl || '' };
  }
  
  // 模式 2：只获取文字（已知植物，快速返回）
  if (mode === 'text_only') {
    console.log('[getCareGuide] 文字专用模式，不获取图片');
  }
  
  if (!GLM_API_KEY) {
    console.error('[getCareGuide] GLM_API_KEY 未配置');
    return Object.assign({ success: false, error: '服务配置错误' }, getDefaultPlant());
  }
  
  console.log(`[getCareGuide] 开始获取植物信息：${standardPlantName}`);
  console.log(`[getCareGuide] ${Date.now() - startTime}ms - 开始调用 GLM API`);
  
  // 并行执行：AI 调用和图片搜索同时进行
  const aiStartTime = Date.now();
  const aiPromise = (async () => {
    let plantData = null;
    try {
      console.log('[getCareGuide] ========== AI 调用开始 ==========');
      console.log('[getCareGuide] GLM_API_KEY:', GLM_API_KEY ? '已配置' : '未配置');
      console.log('[getCareGuide] 请求 URL:', GLM_API_URL);
      console.log('[getCareGuide] 请求模型：glm-4-flash');
      console.log('[getCareGuide] 植物名称:', standardPlantName);
      
      const startTime = Date.now();
      const response = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GLM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',  // 免费模型
          messages: [{
            role: 'user',
            content: PROMPT_TEMPLATE.replace('{plantName}', standardPlantName)
          }],
          temperature: 0.1,  // 最低随机性，提高响应速度
          max_tokens: 1000,   // 增加 token 数量，支持更详细内容
          stream: false      // 不使用流式响应
        })
      });
      
      console.log('[getCareGuide] ⏱️ 网络请求耗时:', Date.now() - startTime, 'ms');
      console.log('[getCareGuide] AI 响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[getCareGuide] API 错误详情:', response.status, errorText);
        throw new Error(`API 响应失败：${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[getCareGuide] AI 响应完成，总耗时:', Date.now() - aiStartTime, 'ms');
      console.log('[getCareGuide] AI 返回数据:', JSON.stringify(data).substring(0, 500));
      
      const content = data.choices?.[0]?.message?.content || '';
      console.log('[getCareGuide] AI 返回内容长度:', content.length);
      
      const jsonStartTime = Date.now();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : '{}';
      
      try {
        plantData = JSON.parse(jsonStr);
        console.log('[getCareGuide] JSON 解析耗时:', Date.now() - jsonStartTime, 'ms');
        console.log('[getCareGuide] AI 总耗时:', Date.now() - aiStartTime, 'ms');
        console.log('[getCareGuide] 解析后的数据:', JSON.stringify(plantData).substring(0, 300));
      } catch (e) {
        console.error('[getCareGuide] JSON 解析失败:', e, '原始内容:', content);
        plantData = null;
      }
    } catch (err) {
      console.error('[getCareGuide] AI 调用失败:', err);
      console.error('[getCareGuide] 错误堆栈:', err.stack);
      plantData = null;
    }
    
    return plantData;
  })();
  
  // 图片搜索（同时进行，不等待 AI）
  const imageStartTime = Date.now();
  const imagePromise = (async () => {
    try {
      console.log(`[getCareGuide] ${Date.now() - startTime}ms - 开始搜索图片`);
      
      // 优先使用百度 AI 图片搜索（准确度高）
      console.log('[getCareGuide] 图片搜索关键词:', standardPlantName);
      
      // 1. 优先百度 AI
      let imageUrl = await getPlantImageFromBaidu(standardPlantName);
      
      // 2. 百度失败，降级维基百科
      if (!imageUrl) {
        const latinNameToUse = searchQuery || getOptimalSearchQuery(standardPlantName);
        imageUrl = await getPlantImageFromFreeSources(latinNameToUse);
      }
      
      console.log(`[getCareGuide] ⏱️ 图片搜索耗时：${Date.now() - imageStartTime}ms`);
      console.log(`[getCareGuide] ${Date.now() - startTime}ms - 图片搜索完成：${imageUrl ? '成功' : '失败'}`);
      return imageUrl;
    } catch (err) {
      console.error('[getCareGuide] 图片搜索失败:', err);
      return '';
    }
  })();
  
  // 等待两个任务都完成
  const [plantData, imageUrl] = await Promise.all([aiPromise, imagePromise]);
  
  console.log(`[getCareGuide] ⏱️ ️ ⏱️ 总耗时：${Date.now() - startTime}ms`);
  
  // 返回结果
  if (plantData && plantData.success) {
    // 埋点
    if (openId) {
      db.collection('analytics_events').add({
        date: new Date().toISOString().split('T')[0],
        openId: openId,
        event: 'get_care_guide',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        success: true,
        fromCache: false,
        extra: { plantName, hasImage: !!imageUrl }
      }).catch(() => {});
    }
    
    return {
      success: true,
      ...plantData,
      imageUrl: imageUrl || '',
      name: plantName  // 使用用户搜索的名称
    };
  } else {
    console.log('[getCareGuide] AI 返回失败，使用默认数据');
    return {
      success: false,
      error: '未能获取到详细信息',
      name: plantName,
      imageUrl: imageUrl || '',
      ...getDefaultPlant()
    };
  }
};

/**
 * 智能搜索策略：根据植物名称选择最佳搜索关键词
 * 
 * 策略：
 * 1. 特殊植物（容易误解的）→ 使用拉丁学名或英文
 * 2. 瓜果蔬菜 → 使用英文 + "plant"，避免返回果实/菜品
 * 3. 观赏植物 → 使用中文名 + "花"或"植物"
 * 4. 其他植物 → 使用中文名
 */
function getOptimalSearchQuery(plantName) {
  // 1. 特殊植物列表（容易搜索到错误结果的）
  const SPECIAL_PLANTS = {
    // 观赏植物 - 使用拉丁学名或英文
    '美人蕉': 'Canna indica',  // 容易搜索到达摩娃娃
    '鸢尾': 'Iris flower',  // 容易搜索到日本达摩
    '百合': 'Lily flower',  // 避免搜索到百合网、百合食品
    '玫瑰': 'Rose flower',  // 避免搜索到玫瑰精油、玫瑰蛋糕
    '月季': 'Rosa chinensis',  // 使用拉丁学名
    '牡丹': 'Peony flower',  // 避免搜索到牡丹鹦鹉
    '菊花': 'Chrysanthemum flower',  // 避免搜索到菊花茶
    
    // 瓜果蔬菜 - 使用英文 + "plant"，强调是植物而非果实
    '冬瓜': 'Wax gourd plant',  // 使用更常见的英文名
    '西瓜': 'Watermelon plant',
    '南瓜': 'Pumpkin plant',
    '黄瓜': 'Cucumber plant',
    '番茄': 'Tomato plant',
    '西红柿': 'Tomato plant',
    '茄子': 'Eggplant plant',
    '辣椒': 'Chili pepper plant',
    '青椒': 'Bell pepper plant',
    '土豆': 'Potato plant',
    '马铃薯': 'Potato plant',
    '红薯': 'Sweet potato plant',
    '地瓜': 'Sweet potato plant',
    '萝卜': 'Radish plant',
    '胡萝卜': 'Carrot plant',
    '白菜': 'Chinese cabbage plant',
    '青菜': 'Green vegetable plant',
    '菠菜': 'Spinach plant',
    '生菜': 'Lettuce plant',
    '芹菜': 'Celery plant',
    '香菜': 'Coriander plant',
    '葱': 'Green onion plant',
    '大蒜': 'Garlic plant',
    '洋葱': 'Onion plant',
    '生姜': 'Ginger plant',
    '莲藕': 'Lotus root plant',
    '豆角': 'Bean plant',
    '四季豆': 'Green bean plant',
    '豌豆': 'Pea plant',
    '玉米': 'Corn plant',
    '水稻': 'Rice plant',
    '小麦': 'Wheat plant',
    '大豆': 'Soybean plant',
    '花生': 'Peanut plant',
    '芝麻': 'Sesame plant',
    '棉花': 'Cotton plant',
    '茶树': 'Tea plant',
    '咖啡': 'Coffee plant',
    '可可': 'Cocoa plant',
    '香蕉': 'Banana plant',
    '苹果': 'Apple tree',
    '梨': 'Pear tree',
    '桃': 'Peach tree',
    '李子': 'Plum tree',
    '杏': 'Apricot tree',
    '葡萄': 'Grape vine',
    '草莓': 'Strawberry plant',
    '蓝莓': 'Blueberry plant',
    '柠檬': 'Lemon tree',
    '橙子': 'Orange tree',
    '柚子': 'Pomelo tree',
    '芒果': 'Mango tree',
    '菠萝': 'Pineapple plant',
    '榴莲': 'Durian tree',
    '椰子': 'Coconut tree',
    '木瓜': 'Papaya tree',
    '石榴': 'Pomegranate tree',
    '无花果': 'Fig tree',
    '柿子': 'Persimmon tree',
    '枣': 'Date tree',
    '樱桃': 'Cherry tree',
    '猕猴桃': 'Kiwi vine',
    '火龙果': 'Dragon fruit plant',
    '百香果': 'Passion fruit vine'
  };
  
  // 检查是否是特殊植物
  if (SPECIAL_PLANTS[plantName]) {
    console.log('[SearchStrategy] 特殊植物，使用预定义关键词:', plantName, '→', SPECIAL_PLANTS[plantName]);
    return SPECIAL_PLANTS[plantName];
  }
  
  // 2. 检查是否包含瓜果蔬菜相关字符
  const VEGETABLE_INDICATORS = ['瓜', '果', '菜', '豆', '薯', '葱', '蒜', '姜', '萝卜', '椒', '藕', '芋'];
  const hasVegetableIndicator = VEGETABLE_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasVegetableIndicator) {
    // 瓜果蔬菜：使用拼音或简单英文 + "plant"
    console.log('[SearchStrategy] 瓜果蔬菜，添加"plant"后缀:', plantName);
    return plantName + ' plant';
  }
  
  // 3. 检查是否包含花卉相关字符
  const FLOWER_INDICATORS = ['花', '兰', '梅', '菊', '荷', '莲', '桂', '杏', '桃', '梨'];
  const hasFlowerIndicator = FLOWER_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasFlowerIndicator) {
    // 花卉：使用中文名 + "flower"
    console.log('[SearchStrategy] 花卉植物，添加"flower"后缀:', plantName);
    return plantName + ' flower';
  }
  
  // 4. 检查是否包含树木相关字符
  const TREE_INDICATORS = ['树', '木', '松', '柏', '杉', '杨', '柳', '榆', '槐', '樟', '枫'];
  const hasTreeIndicator = TREE_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasTreeIndicator) {
    // 树木：使用中文名 + "tree"
    console.log('[SearchStrategy] 树木植物，添加"tree"后缀:', plantName);
    return plantName + ' tree';
  }
  
  // 5. 默认：直接使用中文名（由 getPlantImageFromFreeSources 处理）
  console.log('[SearchStrategy] 普通植物，使用中文名:', plantName);
  return plantName;
}

/**
 * 默认植物信息
 */
function getDefaultPlant() {
  return {
    commonNames: '',
    scientificName: '',
    scientificNameLatin: '',
    family: '',
    origin: '',
    plantProfile: '',
    growthHabit: '',
    mainValue: '',
    careGuide: {
      light: '适中光照',
      water: '适量浇水',
      temperature: '室温',
      humidity: '',
      fertilizer: '',
      soil: '',
      pruning: '',
      propagation: ''
    },
    difficultyLevel: 3,
    difficultyText: '适合有一定经验的养护者',
    commonProblems: [],
    quickTips: [],
    funFacts: [],
    imageUrl: ''
  };
}

/**
 * 获取百度 AI 访问 token
 */
async function getBaiduAccessToken() {
  try {
    const tokenRes = await fetch(`${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`, {
      method: 'POST',
      timeout: 5000
    });
    
    if (!tokenRes.ok) {
      console.error('[BaiduToken] 获取 token 失败:', tokenRes.status);
      return null;
    }
    
    const tokenData = await tokenRes.json();
    console.log('[BaiduToken] ✅ 获取 token 成功');
    return tokenData.access_token;
  } catch (err) {
    console.error('[BaiduToken] 获取 token 失败:', err.message);
    return null;
  }
}

/**
 * 从百度 AI 获取植物图片（AI 识别，准确度高）
 */
async function getPlantImageFromBaidu(chineseName) {
  const startTime = Date.now();
  console.log('[PlantImage-Baidu] 开始获取图片:', chineseName || '无中文名');
  
  if (!chineseName) {
    console.log('[PlantImage-Baidu] ❌ 没有植物名称');
    return '';
  }
  
  try {
    // 1. 获取 access_token
    console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - 获取 access_token...`);
    const accessToken = await getBaiduAccessToken();
    
    if (!accessToken) {
      console.log('[PlantImage-Baidu] ❌ 获取 token 失败');
      return '';
    }
    
    // 2. 调用百度植物识别 API 获取图片
    console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - 调用植物识别 API...`);
    const queryUrl = `${BAIDU_IMAGE_URL}?image=${encodeURIComponent(chineseName)}`;
    
    const searchRes = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `access_token=${accessToken}`,
      timeout: 5000  // 5 秒超时
    });
    
    console.log('[PlantImage-Baidu] 响应状态:', searchRes.status);
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      console.log('[PlantImage-Baidu] 完整返回数据:', JSON.stringify(searchData).substring(0, 500));
      
      // 提取图片 URL
      const imageUrl = searchData.image_url || searchData.img_url || '';
      console.log('[PlantImage-Baidu] 提取的图片 URL:', imageUrl);
      
      if (imageUrl) {
        console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - ✅ 百度找到图片`);
        console.log('[PlantImage-Baidu] 图片 URL:', imageUrl);
        return imageUrl;
      } else {
        console.log('[PlantImage-Baidu] ❌ 返回数据中没有图片 URL');
      }
    } else {
      const errorText = await searchRes.text();
      console.error('[PlantImage-Baidu] API 错误:', searchRes.status, errorText);
    }
    
    console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - ❌ 百度未找到图片`);
  } catch (err) {
    console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - ❌ 查询失败:`, err.message);
  }
  
  // 返回失败
  console.log(`[PlantImage-Baidu] ${Date.now() - startTime}ms - ❌ 图片搜索失败`);
  return '';
}

/**
 * 从免费公开源获取植物图片（降级方案：维基百科）
 */
async function getPlantImageFromFreeSources(chineseName) {
  const startTime = Date.now();
  console.log('[PlantImage-Wiki] 开始获取图片（降级方案）:', chineseName || '无中文名');
  
  if (!chineseName) {
    return '';
  }
  
  // 尝试维基百科（2.5 秒超时）
  try {
    console.log(`[PlantImage-Wiki] ${Date.now() - startTime}ms - 开始维基百科查询...`);
    const queryUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(chineseName)}`;
    
    const searchRes = await fetch(queryUrl, {
      timeout: 2500  // 2.5 秒超时
    });
    
    console.log('[PlantImage-Wiki] 响应状态:', searchRes.status);
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const imageUrl = searchData.originalimage?.source || searchData.thumbnail?.source || '';
      
      if (imageUrl) {
        console.log(`[PlantImage-Wiki] ${Date.now() - startTime}ms - ✅ 维基百科找到图片`);
        return imageUrl;
      }
    }
    
    console.log(`[PlantImage-Wiki] ${Date.now() - startTime}ms - ❌ 维基百科未找到图片`);
  } catch (err) {
    console.log(`[PlantImage-Wiki] ${Date.now() - startTime}ms - ❌ 维基百科查询失败:`, err.message);
  }
  
  return '';
}
