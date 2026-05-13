/**
 * 云函数：getCareGuide
 * 
 * 职责：调用 GLM-4.5-Air API 获取植物详细信息
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

// 易混淆植物的拉丁学名映射（仅针对极易混淆的植物）
// 这些植物的中文名容易产生歧义，必须使用拉丁学名搜索图片
const LATIN_NAMES = {
  '天堂鸟': 'Strelitzia',      // 鹤望兰属，避免搜索到鸟类
  '鹤望兰': 'Strelitzia',
  '美人蕉': 'Canna',           // 美人蕉属
  '鸢尾': 'Iris',              // 鸢尾属
  '百合': 'Lilium',            // 百合属
  '玫瑰': 'Rosa',              // 蔷薇属
  '月季': 'Rosa chinensis',    // 使用完整学名
  '牡丹': 'Paeonia',           // 芍药属
  '菊花': 'Chrysanthemum',     // 菊属
  '兰花': 'Orchidaceae',       // 兰科
  '满天星': 'Gypsophila',      // 丝石竹属，避免搜索到星星
  '康乃馨': 'Dianthus caryophyllus', // 香石竹，避免搜索到"康乃"相关
  '向日葵': 'Helianthus annuus',     // 避免搜索到"向日"相关
  '郁金香': 'Tulipa',          // 避免搜索到"郁金"相关
  '薰衣草': 'Lavandula',       // 避免搜索到"衣草"相关
  '四叶草': 'Oxalis tetraphylla',    // 避免搜索到"四叶"相关
  '含羞草': 'Mimosa pudica',   // 避免搜索到"含羞"相关
  '猪笼草': 'Nepenthes',       // 避免搜索到"猪笼"相关
  '捕蝇草': 'Dionaea muscipula',     // 避免搜索到"捕蝇"相关
  '跳舞草': 'Codariocalyx motorius', // 避免搜索到"跳舞"相关
  '睡莲': 'Nymphaea',          // 避免搜索到"睡"相关
  '碗莲': 'Nelumbo nucifera',  // 避免搜索到"碗"相关
  '铁树': 'Cycas revoluta',    // 避免搜索到"铁"相关
  '铜钱草': 'Hydrocotyle vulgaris',  // 避免搜索到"铜钱"相关
  '金钱草': 'Lysimachia christinae', // 避免搜索到"金钱"相关
  '富贵竹': 'Dracaena sanderiana',   // 避免搜索到"富贵"相关
  '发财树': 'Pachira aquatica',      // 避免搜索到"发财"相关
  '幸福树': 'Radermachera sinica',   // 避免搜索到"幸福"相关
  '平安树': 'Cinnamomum kotoense',   // 避免搜索到"平安"相关
  '吉祥草': 'Reineckea carnea',      // 避免搜索到"吉祥"相关
  '万年青': 'Rohdea japonica',       // 避免搜索到"万年"相关
  '千年木': 'Dracaena marginata',    // 避免搜索到"千年"相关
  '龙血树': 'Dracaena cinnabari',    // 避免搜索到"龙血"相关
  '虎皮兰': 'Sansevieria trifasciata', // 避免搜索到"虎皮"相关
  '蜘蛛抱蛋': 'Aspidistra elatior',  // 避免搜索到"蜘蛛"相关
  '一帆风顺': 'Spathiphyllum',       // 白掌，避免搜索到"顺风"相关
  '滴水观音': 'Alocasia macrorrhiza', // 避免搜索到"观音"相关
  '文竹': 'Asparagus setaceus',      // 避免搜索到"文"相关
  '武竹': 'Asparagus densiflorus',   // 避免搜索到"武"相关
};

/**
 * 验证搜索词是否是植物名称
 * 策略：
 * 1. 如果在缓存中 → 是植物
 * 2. 如果在 LATIN_NAMES 中 → 是植物
 * 3. 如果包含常见植物特征词（花、草、树、叶、藤、竹、兰、菊、梅、兰、竹、菊等）→ 可能是植物
 * 4. 否则 → 需要进一步验证
 */
function isPlantName(name) {
  if (!name || typeof name !== 'string') return false;
  
  const lowerName = name.trim();
  if (!lowerName) return false;
  
  // 1. 检查是否在缓存中
  if (PLANT_CACHE[lowerName]) return true;
  
  // 2. 检查是否在 LATIN_NAMES 中
  if (LATIN_NAMES[lowerName]) return true;
  
  // 3. 检查是否包含植物特征词
  const plantKeywords = [
    '花', '草', '树', '叶', '藤', '竹', '兰', '菊', '梅', '荷', '莲', '葵',
    '萝', '蕨', '藓', '藻', '菌', '芝', '菇',
    '植', '苗', '株', '盆', '栽',
    '瓜', '果', '菜', '蔬', '茄', '椒', '豆', '薯', '芋',
    '茶', '药', '棉', '麻', '桑', '槐', '柳', '松', '柏', '杉', '枫', '杨', '榕', '樟', '桂', '桃', '杏', '梨', '柿', '枣', '桔', '柑', '柚', '橙', '柠', '芒', '蕉', '菠', '莓', '萄', '荔', '枝', '眼', '榴', '柿', '枇', '杷', '杨', '梅', '桑', '葚', '椰', '子', '木', '瓜', '果', '龙', '眼', '火', '龙', '果', '百', '香', '果', '人', '参', '果', '牛', '油', '果', '榴', '莲', '山', '竹', '红', '毛', '丹', '菠', '萝', '蜜', '芭', '乐', '释', '迦', '莲', '雾',
    '冬', '瓜', '南', '瓜', '黄', '瓜', '西', '瓜', '苦', '瓜', '丝', '瓜', '冬', '瓜',
    '番', '茄', '西', '红', '柿', '茄', '子', '辣', '椒', '青', '椒', '土', '豆', '马', '铃', '薯', '红', '薯', '地', '瓜', '萝', '卜', '胡', '萝', '卜', '白', '菜', '菠', '菜', '生', '菜', '芹', '菜', '香', '菜', '葱', '大', '蒜', '洋', '葱', '生', '姜', '莲', '藕', '豆', '角', '四', '季', '豆', '豌', '豆', '玉', '米', '水', '稻', '小', '麦', '大', '豆', '花', '生',
    '薄', '荷', '迷', '迭', '香', '薰', '衣', '草', '鼠', '尾', '草', '百', '里', '香', '罗', '勒', '牛', '至', '茴', '香', '八', '角', '桂', '皮', '花', '椒', '孜', '然', '胡', '椒', '姜', '黄', '肉', '桂', '丁', '香', '肉', '蔻', '香', '叶', '茶', '叶',
    '绿', '萝', '吊', '兰', '虎', '尾', '兰', '文', '竹', '富', '贵', '竹', '发', '财', '树', '金', '钱', '树', '君', '子', '兰', '多', '肉', '龟', '背', '竹', '蝴', '蝶', '兰', '天', '竺', '葵', '万', '年', '青', '波', '士', '顿', '蕨', '蜘', '蛛', '抱', '蛋', '圆', '叶', '椒', '草', '长', '寿', '花', '芦', '荟', '仙', '人', '掌', '栀', '子', '花', '茉', '莉', '月', '季', '矮', '牵', '牛',
    '橡', '皮', '树', '巴', '西', '木', '心', '叶', '蔓', '绿', '绒', '豆', '瓣', '绿', '竹', '芋', '空', '气', '凤', '梨',
    '海', '棠', '牡', '丹', '芍', '药', '杜', '鹃', '茶', '花', '桂', '花', '水', '仙', '百', '合', '郁', '金', '香', '康', '乃', '馨', '满', '天', '星', '向', '日', '葵', '罂', '粟', '虞', '美', '人', '鸢', '尾', '紫', '藤', '蔷', '薇', '月', '季', '玫', '瑰', '牡', '丹', '芍', '药',
    '银', '杏', '水', '杉', '红', '豆', '杉', '珙', '桐', '桫', '椤'
  ];
  
  // 检查是否包含植物特征词
  for (const keyword of plantKeywords) {
    if (lowerName.includes(keyword)) return true;
  }
  
  // 4. 检查是否是常见的非植物词（直接排除）
  const nonPlantKeywords = [
    '人', '狗', '猫', '鸟', '鱼', '虫', '鼠', '牛', '马', '羊', '猪', '鸡', '鸭', '鹅',
    '车', '房', '路', '桥', '山', '河', '海', '湖', '江', '城', '国', '省', '市', '县',
    '电', '脑', '手', '机', '书', '笔', '纸', '桌', '椅', '门', '窗', '墙', '地', '天',
    '星', '月', '日', '云', '风', '雨', '雪', '雷', '电', '火', '水', '土', '金', '木',
    '衣', '服', '鞋', '帽', '包', '食', '物', '饭', '菜', '肉', '蛋', '奶', '面', '米',
    '电', '影', '音', '乐', '游', '戏', '运', '动', '球', '跑', '跳', '走', '站', '坐',
    '爸', '妈', '爷', '奶', '哥', '姐', '弟', '妹', '老', '师', '医', '生', '警', '察'
  ];
  
  for (const keyword of nonPlantKeywords) {
    if (lowerName === keyword) return false;
  }
  
  // 默认需要进一步验证
  return 'needs_verification';
}

// 精简模板（减少传输大小，提高响应速度）
const PROMPT_TEMPLATE = `请用JSON格式介绍植物"{plantName}"的养护方法。JSON结构如下，请填写实际内容：
{
  "success": true,
  "name": "{plantName}",
  "plantProfile": "描述外观特点",
  "growthHabit": "生长环境偏好",
  "mainValue": "观赏价值",
  "careGuide": {
    "light": "光照需求",
    "water": "浇水频率",
    "temperature": "适宜温度范围",
    "humidity": "湿度需求",
    "fertilizer": "施肥建议",
    "soil": "土壤要求"
  },
  "difficultyLevel": 3,
  "difficultyText": "养护难度评价",
  "quickTips": ["养护要点"],
  "commonProblems": ["常见问题"]
}
只返回JSON，不要其他文字。`;

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_API_KEY = process.env.GLM_API_KEY;

// 百度图片搜索（用 Wikipedia，因为百度没有公开的图片搜索 API）
const WIKIPEDIA_SUMMARY_URL = 'https://zh.wikipedia.org/api/rest_v1/page/summary/';

/**
 * 带超时的 fetch（node-fetch v2 不支持 timeout 选项）
 */
async function fetchWithTimeout(url, timeout = 3000, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

exports.main = async (event, context) => {
  const { plantName, scientificName, names, mode } = event;
  const startTime = Date.now();
  
  // 环境变量检查
  
  if (!plantName) {
    return { success: false, error: '植物名称不能为空' };
  }
  
  // 植物名称验证（仅对非 image_only 模式）
  if (mode !== 'image_only') {
    const plantValidation = isPlantName(plantName);
    
    if (plantValidation === false) {
      return {
        success: false,
        error: '请输入有效的植物名称',
        message: '"' + plantName + '" 似乎不是植物名称，请尝试搜索如：绿萝、月季、冬瓜、黄瓜等',
        isPlant: false
      };
    }
  }
  
  // 优先使用传递过来的拉丁学名（前端已映射）
  let searchQuery = scientificName || '';
  if (searchQuery) {
  }
  
  // 名称标准化（别名转标准名）
  const standardPlantName = PLANT_NAME_MAP[plantName] || plantName;
  if (standardPlantName !== plantName) {
  }
  
  // 启用缓存（2026-04-16），已知植物直接返回完整数据（使用标准化名称）
    if (PLANT_CACHE[standardPlantName]) {
      const cached = JSON.parse(JSON.stringify(PLANT_CACHE[standardPlantName])); // 深拷贝
      
      // 埋点（传入 openId）
      const wxContext = cloud.getWXContext();
      if (wxContext.OPENID) {
        cloud.callFunction({
          name: 'analytics_track',
          data: {
            openId: wxContext.OPENID,
            event: 'get_care_guide',
            data: {
              plantName,
              standardPlantName,
              mode,
              success: true,
              duration: Date.now() - startTime,
              fromCache: true
            }
          }
        }).catch(err => {
        });
      }
      
      // 添加字段映射，确保与前端期望的一致（保留原字段 + 添加新字段）
      cached.description = cached.plantProfile || '';
      cached.appearance = cached.appearance || cached.plantProfile || '';
      cached.origin = cached.origin || '';
      cached.growthHabit = cached.growthHabit || '';
      cached.mainValue = cached.mainValue || '';
      
      // 确保返回的名称是用户搜索的名称
      cached.name = plantName;
      
      // ===== 关键修复：缓存数据没有图片时，尝试搜索图片 =====
      if (!cached.imageUrl) {
        const optimalQuery = getOptimalSearchQuery(standardPlantName);
        let imageUrl = await getPlantImageFromWiki(standardPlantName);
        if (!imageUrl) {
          imageUrl = await getPlantImageFromWikiEn(optimalQuery);
        }
        if (!imageUrl) {
          imageUrl = await getPlantImageFromPexels(standardPlantName, optimalQuery);
        }
        cached.imageUrl = imageUrl || '';
      }

      return cached;
    }
  
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  // 模式 1：只获取图片（轻量模式，不调 AI）
  if (mode === 'image_only') {
    let nameList = Array.isArray(names) ? names : (typeof names === 'string' ? names.split(/[,，、]/).map(s => s.trim()).filter(s => s) : []);
    
    const latinName = nameList.find(n => !/[\u4e00-\u9fa5]/.test(n));
    const chineseName = nameList.find(n => /[\u4e00-\u9fa5]/.test(n)) || plantName;
    const searchLatin = latinName || chineseName;
    
    const imageUrl = await getPlantImageFromFreeSources(searchLatin, chineseName);
    return { success: !!imageUrl, imageUrl: imageUrl || '' };
  }
  
  // 模式 2：只获取文字（已知植物，快速返回）
  if (mode === 'text_only') {
  }
  
  if (!GLM_API_KEY) {
    console.error('[getCareGuide] GLM_API_KEY 未配置');
    return Object.assign({ success: false, error: '服务配置错误' }, getDefaultPlant(plantName));
  }
  

// 超精简备用模板（仅当主模板失败时使用）
const PROMPT_TEMPLATE_SIMPLE = `关于"{plantName}"，返回JSON：{"success":true,"name":"{plantName}","plantProfile":"简介","growthHabit":"习性","mainValue":"价值","careGuide":{"light":"光照","water":"浇水"},"difficultyLevel":3,"difficultyText":"难度"}`;

/**
 * 调用 GLM API（带重试机制）
 */
async function callGLMApi(plantName, retryCount = 0) {
  const startTime = Date.now();
  const timeout = retryCount > 0 ? 15000 : 20000; // 重试时缩短超时
  const prompt = retryCount > 0 ? PROMPT_TEMPLATE_SIMPLE : PROMPT_TEMPLATE;

  try {
    console.log(`[getCareGuide] GLM 调用开始 (重试: ${retryCount}), 植物: ${plantName}`);

    const response = await fetchWithTimeout(GLM_API_URL, timeout, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{
          role: 'user',
          content: prompt.replace('{plantName}', plantName)
        }],
        temperature: 0.1,
        max_tokens: retryCount > 0 ? 300 : 500,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getCareGuide] API 错误:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('[getCareGuide] GLM 返回长度:', content.length, '耗时:', Date.now() - startTime, 'ms');

    if (!content) {
      console.error('[getCareGuide] GLM 返回空内容');
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[getCareGuide] 未找到 JSON');
      return null;
    }

    const plantData = JSON.parse(jsonMatch[0]);
    if (plantData && plantData.success) {
      console.log('[getCareGuide] GLM 成功, 总耗时:', Date.now() - startTime, 'ms');
      return plantData;
    }
    return null;
  } catch (err) {
    console.error('[getCareGuide] GLM 调用异常:', err.message, '耗时:', Date.now() - startTime, 'ms');
    return null;
  }
}

  // 并行执行：AI 调用和图片搜索同时进行
  const aiStartTime = Date.now();
  const aiPromise = (async () => {
    // 第一次尝试
    let plantData = await callGLMApi(standardPlantName, 0);

    // 如果失败，使用简化模板重试一次
    if (!plantData) {
      console.log('[getCareGuide] 主模板失败，尝试简化模板...');
      plantData = await callGLMApi(standardPlantName, 1);
    }

    return plantData;
  })();
  
  // 图片搜索（同时进行，不等待 AI）
  const imageStartTime = Date.now();
  const imagePromise = (async () => {
    try {
      
      // 使用智能关键词优化搜索（如 "南瓜" → "Pumpkin plant"）
      const optimalQuery = getOptimalSearchQuery(standardPlantName);
      
      // 1. 优先中文维基百科（用原始中文名）
      let imageUrl = await getPlantImageFromWiki(standardPlantName);
      
      // 2. 中文维基百科失败，尝试英文维基百科（用智能关键词）
      if (!imageUrl) {
        imageUrl = await getPlantImageFromWikiEn(optimalQuery);
      }
      
      // 3. 维基百科全部失败，降级 Pexels（用智能英文关键词）
      if (!imageUrl) {
        imageUrl = await getPlantImageFromPexels(standardPlantName, optimalQuery);
      }
      
      return imageUrl;
    } catch (err) {
      console.error('[getCareGuide] 图片搜索失败:', err);
      return '';
    }
  })();
  
  // 等待两个任务都完成
  const [plantData, imageUrl] = await Promise.all([aiPromise, imagePromise]);

  // 返回结果
  if (plantData && plantData.success) {
    console.log('[getCareGuide] 总耗时:', Date.now() - startTime, 'ms, AI成功');
    return {
      success: true,
      ...plantData,
      description: plantData.description || plantData.plantProfile || '',
      imageUrl: imageUrl || '',
      name: plantName
    };
  } else {
    console.log('[getCareGuide] 总耗时:', Date.now() - startTime, 'ms, AI失败');
    const defaultPlant = getDefaultPlant(plantName);
    return {
      success: false,
      error: 'AI 服务暂时不可用',
      name: plantName,
      description: defaultPlant.plantProfile,
      imageUrl: imageUrl || '',
      ...defaultPlant
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
  // 0. 颜色敏感植物处理（如：黑玫瑰、红玫瑰、白百合等）
  // 这些植物需要保留颜色关键词，否则会返回错误颜色的图片
  const COLOR_SENSITIVE_PATTERNS = [
    // 玫瑰类（颜色敏感）
    { pattern: /^黑玫瑰$/, query: 'Black rose flower' },
    { pattern: /^红玫瑰$/, query: 'Red rose flower' },
    { pattern: /^白玫瑰$/, query: 'White rose flower' },
    { pattern: /^粉玫瑰$/, query: 'Pink rose flower' },
    { pattern: /^黄玫瑰$/, query: 'Yellow rose flower' },
    { pattern: /^蓝玫瑰$/, query: 'Blue rose flower' },
    { pattern: /^紫玫瑰$/, query: 'Purple rose flower' },
    // 百合类（颜色敏感）
    { pattern: /^白百合$/, query: 'White lily flower' },
    { pattern: /^红百合$/, query: 'Red lily flower' },
    { pattern: /^粉百合$/, query: 'Pink lily flower' },
    { pattern: /^黄百合$/, query: 'Yellow lily flower' },
    // 牡丹类（颜色敏感）
    { pattern: /^红牡丹$/, query: 'Red peony flower' },
    { pattern: /^白牡丹$/, query: 'White peony flower' },
    { pattern: /^粉牡丹$/, query: 'Pink peony flower' },
    // 郁金香类（颜色敏感）
    { pattern: /^红郁金香$/, query: 'Red tulip flower' },
    { pattern: /^白郁金香$/, query: 'White tulip flower' },
    { pattern: /^黄郁金香$/, query: 'Yellow tulip flower' },
    { pattern: /^紫郁金香$/, query: 'Purple tulip flower' },
    // 康乃馨类（颜色敏感）
    { pattern: /^红康乃馨$/, query: 'Red carnation flower' },
    { pattern: /^粉康乃馨$/, query: 'Pink carnation flower' },
    { pattern: /^白康乃馨$/, query: 'White carnation flower' },
  ];

  // 检查颜色敏感植物
  for (const item of COLOR_SENSITIVE_PATTERNS) {
    if (item.pattern.test(plantName)) {
      return item.query;
    }
  }

  // 1. 特殊植物列表（容易搜索到错误结果的）
  const SPECIAL_PLANTS = {
    // 观赏植物 - 使用拉丁学名或英文
    '虞美人': 'Papaver rhoeas flower',  // 避免搜索到历史人物/词牌名
    '美人蕉': 'Canna indica',  // 容易搜索到达摩娃娃
    '鸢尾': 'Iris flower',  // 容易搜索到日本达摩
    '百合': 'Lily flower',  // 避免搜索到百合网、百合食品
    '玫瑰': 'Rose flower',  // 避免搜索到玫瑰精油、玫瑰蛋糕
    '月季': 'Rosa chinensis',  // 使用拉丁学名
    '牡丹': 'Peony flower',  // 避免搜索到牡丹鹦鹉
    '菊花': 'Chrysanthemum flower',  // 避免搜索到菊花茶
    '天堂鸟': 'Strelitzia flower',  // 避免搜索到鸟类（天堂鸟/极乐鸟）
    '鹤望兰': 'Strelitzia flower',  // 天堂鸟的学名
    '满天星': 'Gypsophila flower',  // 避免搜索到星星（满天星是植物，但字面意思是满天的星星）
    '康乃馨': 'Carnation flower',  // 避免搜索到"康乃"相关
    '向日葵': 'Sunflower plant',  // 避免搜索到"向日"相关
    '郁金香': 'Tulip flower',  // 避免搜索到"郁金"相关
    '薰衣草': 'Lavender flower',  // 避免搜索到"衣草"相关
    '四叶草': 'Four leaf clover',  // 避免搜索到"四叶"相关
    '含羞草': 'Mimosa pudica plant',  // 避免搜索到"含羞"相关
    '猪笼草': 'Pitcher plant',  // 避免搜索到"猪笼"相关
    '捕蝇草': 'Venus flytrap',  // 避免搜索到"捕蝇"相关
    '跳舞草': 'Dancing grass plant',  // 避免搜索到"跳舞"相关
    '睡莲': 'Water lily flower',  // 避免搜索到"睡"相关
    '碗莲': 'Bowl lotus plant',  // 避免搜索到"碗"相关
    '铁树': 'Sago palm',  // 避免搜索到"铁"相关
    '铜钱草': 'Pennywort plant',  // 避免搜索到"铜钱"相关
    '金钱草': 'Moneywort plant',  // 避免搜索到"金钱"相关
    '富贵竹': 'Lucky bamboo',  // 避免搜索到"富贵"相关
    '发财树': 'Money tree plant',  // 避免搜索到"发财"相关
    '幸福树': 'Happiness tree plant',  // 避免搜索到"幸福"相关
    '平安树': 'Peace tree plant',  // 避免搜索到"平安"相关
    '吉祥草': 'Good luck grass',  // 避免搜索到"吉祥"相关
    '万年青': 'Evergreen plant',  // 避免搜索到"万年"相关
    '千年木': 'Dragon tree',  // 避免搜索到"千年"相关
    '龙血树': 'Dragon blood tree',  // 避免搜索到"龙血"相关
    '虎皮兰': 'Snake plant',  // 避免搜索到"虎皮"相关
    '蜘蛛抱蛋': 'Cast iron plant',  // 避免搜索到"蜘蛛"相关
    '一帆风顺': 'Peace lily',  // 白掌，避免搜索到"顺风"相关
    '滴水观音': 'Taro plant',  // 避免搜索到"观音"相关
    '文竹': 'Asparagus fern',  // 避免搜索到"文"相关
    '武竹': 'Foxtail fern',  // 避免搜索到"武"相关
    
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
    return SPECIAL_PLANTS[plantName];
  }
  
  // 2. 检查是否包含瓜果蔬菜相关字符
  const VEGETABLE_INDICATORS = ['瓜', '果', '菜', '豆', '薯', '葱', '蒜', '姜', '萝卜', '椒', '藕', '芋'];
  const hasVegetableIndicator = VEGETABLE_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasVegetableIndicator) {
    // 瓜果蔬菜：使用拼音或简单英文 + "plant"
    return plantName + ' plant';
  }
  
  // 3. 检查是否包含花卉相关字符
  const FLOWER_INDICATORS = ['花', '兰', '梅', '菊', '荷', '莲', '桂', '杏', '桃', '梨'];
  const hasFlowerIndicator = FLOWER_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasFlowerIndicator) {
    // 花卉：使用中文名 + "flower"
    return plantName + ' flower';
  }
  
  // 4. 检查是否包含树木相关字符
  const TREE_INDICATORS = ['树', '木', '松', '柏', '杉', '杨', '柳', '榆', '槐', '樟', '枫'];
  const hasTreeIndicator = TREE_INDICATORS.some(indicator => plantName.includes(indicator));
  
  if (hasTreeIndicator) {
    // 树木：使用中文名 + "tree"
    return plantName + ' tree';
  }
  
  // 5. 默认：直接使用中文名（由 getPlantImageFromFreeSources 处理）
  return plantName;
}

/**
 * 默认植物信息（AI 调用失败时的兜底）
 * 修复：提供基本提示信息，而不是完全空白
 */
function getDefaultPlant(plantName) {
  return {
    commonNames: '',
    scientificName: plantName || '',
    scientificNameLatin: '',
    family: '',
    origin: '',
    plantProfile: `正在为您查找"${plantName}"的详细信息，请稍后再试或尝试其他植物名称。`,
    growthHabit: '',
    mainValue: '',
    careGuide: {
      light: '请稍后再试',
      water: '',
      temperature: '',
      humidity: '',
      fertilizer: '',
      soil: '',
      pruning: '',
      propagation: ''
    },
    difficultyLevel: 0,
    difficultyText: '信息加载中...',
    commonProblems: ['AI 服务暂时不可用，请稍后再试'],
    quickTips: ['可以尝试搜索其他植物', '如：绿萝、月季、龟背竹等'],
    funFacts: [],
    imageUrl: ''
  };
}

/**
 * 从免费来源获取植物图片（统一入口）
 * 策略：Wikipedia(中文+英文) → Pexels(英文)，使用智能关键词优化
 */
async function getPlantImageFromFreeSources(latinName, chineseName) {
  const startTime = Date.now();
  const searchName = chineseName || latinName;

  if (!searchName) {
    return '';
  }

  // 使用智能搜索策略生成最佳关键词（英文，如 "Pumpkin plant"）
  const optimalQuery = getOptimalSearchQuery(searchName);

  // 1. 优先维基百科中文（用原始中文名，更可能有中文词条）
  let imageUrl = await getPlantImageFromWiki(searchName);

  // 2. 中文维基百科失败，尝试英文维基百科（用智能关键词）
  if (!imageUrl) {
    imageUrl = await getPlantImageFromWikiEn(optimalQuery);
  }

  // 3. 维基百科全部失败，降级 Pexels（用智能英文关键词）
  if (!imageUrl) {
    imageUrl = await getPlantImageFromPexels(searchName, optimalQuery);
  }

  return imageUrl;
}

/**
 * 从中文维基百科获取植物图片
 * 增强验证：检查词条标题是否匹配，防止重定向到错误词条
 */
async function getPlantImageFromWiki(chineseName) {
  const startTime = Date.now();

  if (!chineseName) {
    return '';
  }

  try {
    // 定义搜索关键词优先级数组（从精确到宽泛）
    const searchTerms = [
      chineseName + '植物',
      chineseName + '花',
      chineseName
    ];


    // 依次尝试每个关键词
    for (const term of searchTerms) {

      const queryUrl = `${WIKIPEDIA_SUMMARY_URL}${encodeURIComponent(term)}`;

      const searchRes = await fetchWithTimeout(queryUrl);

      if (!searchRes.ok) {
        continue;
      }

      const searchData = await searchRes.json();

      // ===== 增强验证机制 =====
      // 1. 检查标题匹配度（防止重定向到错误词条）
      const pageTitle = searchData.title || '';
      const normalizedTerm = term.replace(/植物|花$/g, ''); // 去掉后缀用于匹配
      const titleContainsKeyword = pageTitle.includes(normalizedTerm) ||
                                    normalizedTerm.includes(pageTitle) ||
                                    pageTitle.includes(chineseName);


      // 2. 检查是否是消歧义页（disambiguation）
      const isDisambiguation = searchData.type === 'disambiguation' ||
                               (searchData.description || '').includes('消歧义') ||
                               (searchData.extract || '').includes('可能指');

      if (isDisambiguation) {
        continue;
      }

      // 3. 植物词条验证
      const extract = searchData.extract || '';
      const description = searchData.description || '';
      const hasPlantKeyword = extract.includes('植物') ||
                             extract.includes('科') ||
                             extract.includes('属') ||
                             extract.includes('种') ||
                             description.includes('植物');
      const hasPlantFeature = extract.includes('叶片') ||
                             extract.includes('花朵') ||
                             extract.includes('茎') ||
                             extract.includes('根') ||
                             extract.includes('果实') ||
                             extract.includes('种子');
      const isStandardType = searchData.type === 'standard';

      const isPlant = (hasPlantKeyword || hasPlantFeature || isStandardType) && titleContainsKeyword;


      if (!isPlant) {
        continue;
      }

      // 提取图片 URL
      const imageUrl = searchData.originalimage?.source || searchData.thumbnail?.source || '';

      if (imageUrl) {
        return imageUrl;
      } else {
      }
    }

  } catch (err) {
  }

  return '';
}

// 英文维基百科 API 地址
const WIKIPEDIA_EN_SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

/**
 * 从英文维基百科获取植物图片
 * 使用英文关键词（如 "Pumpkin plant"）搜索，准确率更高
 */
async function getPlantImageFromWikiEn(englishQuery) {
  const startTime = Date.now();

  if (!englishQuery) {
    return '';
  }

  try {
    // 英文搜索策略：从精确到宽泛
    const searchTerms = [
      englishQuery,
      englishQuery.replace(' plant', '').replace(' flower', '').replace(' tree', '')
    ];


    for (const term of searchTerms) {
      if (!term.trim()) continue;


      const queryUrl = `${WIKIPEDIA_EN_SUMMARY_URL}${encodeURIComponent(term)}`;

      const searchRes = await fetchWithTimeout(queryUrl, 4000);

      if (!searchRes.ok) {
        continue;
      }

      const searchData = await searchRes.json();

      // 检查是否是消歧义页
      const isDisambiguation = searchData.type === 'disambiguation';
      if (isDisambiguation) {
        continue;
      }

      // 验证是否是植物词条
      const extract = searchData.extract || '';
      const description = searchData.description || '';
      const hasPlantKeyword = extract.includes('plant') ||
                             extract.includes('flower') ||
                             extract.includes('species') ||
                             extract.includes('genus') ||
                             extract.includes('family') ||
                             description.includes('plant');
      const isStandardType = searchData.type === 'standard';

      // 标题匹配检查
      const pageTitle = searchData.title || '';
      const searchBase = term.toLowerCase().replace(' plant', '').replace(' flower', '').replace(' tree', '');
      const titleMatch = pageTitle.toLowerCase().includes(searchBase) ||
                         searchBase.includes(pageTitle.toLowerCase());

      const isPlant = (hasPlantKeyword || isStandardType) && titleMatch;


      if (!isPlant) {
        continue;
      }

      const imageUrl = searchData.originalimage?.source || searchData.thumbnail?.source || '';

      if (imageUrl) {
        return imageUrl;
      }
    }

  } catch (err) {
  }

  return '';
}

/**
 * 从 Pexels 获取植物图片（降级方案）
 * 优先使用英文关键词搜索，准确率更高
 */
async function getPlantImageFromPexels(chineseName, englishQuery) {
  const startTime = Date.now();

  if (!chineseName) {
    return '';
  }

  // 智能关键词策略：英文优先（准确率更高）
  const searchStrategies = [];

  // 策略 1: 使用智能英文关键词（如 "Pumpkin plant"）
  if (englishQuery) {
    searchStrategies.push({
      query: englishQuery,
      source: 'english_smart'
    });
    // 去掉后缀再试一次
    const baseQuery = englishQuery.replace(' plant', '').replace(' flower', '').replace(' tree', '');
    if (baseQuery !== englishQuery) {
      searchStrategies.push({
        query: baseQuery,
        source: 'english_base'
      });
    }
  }

  // 策略 2: 如果有拉丁学名映射，优先使用（最准确）
  if (LATIN_NAMES[chineseName]) {
    const latinName = LATIN_NAMES[chineseName];
    searchStrategies.push({
      query: latinName + ' plant',
      source: 'latin'
    });
    searchStrategies.push({
      query: latinName,
      source: 'latin_base'
    });
  }

  // 策略 3: 中文关键词（仅当英文搜索失败时最后尝试，且不使用混合语言）
  // Pexels 对中英文混合搜索支持差，容易返回错误结果

  // 尝试每个策略
  for (const strategy of searchStrategies) {
    try {

      const queryUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(strategy.query)}&per_page=3`;

      const searchRes = await fetchWithTimeout(queryUrl, 3000, {
        headers: { Authorization: process.env.PEXELS_API_KEY || '' }
      });

      if (!searchRes.ok) {
        continue;
      }

      const searchData = await searchRes.json();
      const photos = searchData.photos || [];

      if (photos.length === 0) {
        continue;
      }

      // 验证图片是否是植物：检查图片 alt 文本和摄影师描述
      // Pexels 返回的图片包含 alt 和 photographer 字段，可以用来验证
      const validPlantKeywords = ['plant', 'flower', 'leaf', 'garden', 'nature', 'botanical', 'floral', 'bloom', 'blossom', 'petal', 'stem', 'green', 'foliage'];
      const invalidKeywords = ['star', 'sky', 'night', 'space', 'galaxy', 'person', 'people', 'man', 'woman', 'child', 'animal', 'dog', 'cat', 'bird', 'food', 'meal', 'dish', 'cake', 'drink'];
      
      let selectedPhoto = null;
      
      for (const photo of photos) {
        const alt = (photo.alt || '').toLowerCase();
        const photographer = (photo.photographer || '').toLowerCase();
        const combinedText = alt + ' ' + photographer;
        
        // 检查是否包含植物关键词
        const hasPlantKeyword = validPlantKeywords.some(kw => combinedText.includes(kw));
        // 检查是否包含非植物关键词
        const hasInvalidKeyword = invalidKeywords.some(kw => combinedText.includes(kw));
        
        
        // 优先选择包含植物关键词且不包含非植物关键词的图片
        if (hasPlantKeyword && !hasInvalidKeyword) {
          selectedPhoto = photo;
          break;
        }
        
        // 如果没有找到完美的匹配，选择不包含非植物关键词的
        if (!hasInvalidKeyword && !selectedPhoto) {
          selectedPhoto = photo;
        }
      }
      
      // 如果所有图片都包含非植物关键词，放弃这个策略
      if (!selectedPhoto) {
        continue;
      }
      
      const imageUrl = selectedPhoto.src?.large || selectedPhoto.src?.original || '';

      if (imageUrl) {
        return imageUrl;
      }
    } catch (err) {
      continue;
    }
  }

  return '';
}
