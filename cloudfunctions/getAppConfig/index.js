/**
 * 云函数：获取应用全局配置
 *
 * 职责：
 * 1. 从数据库读取 app_config（业务配置）
 * 2. 从数据库读取 feature_flags（功能开关）
 * 3. 若数据库无记录，返回硬编码默认配置（首次运行兜底）
 *
 * 前端调用方式：
 *   wx.cloud.callFunction({ name: 'getAppConfig' })
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 默认业务配置（首次运行兜底，无需提前创建集合）
const DEFAULT_APP_CONFIG = {
  updatedAt: new Date().toISOString(),

  // AI 大模型配置
  aiModel: {
    name: 'glm-4.5-air',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    maxTokens: 1500,
    temperature: 0.7
  },

  // PlantNet 识别配置
  plantnet: {
    dailyLimit: 500,
    confidenceThreshold: 0.3
  },

  // 养护默认值
  careDefaults: {
    wateringDays: 7,
    fertilizingDays: 30,
    warningDays: 2
  },

  // 文案配置
  ui: {
    homeBannerText: '拍照识别植物，一键获取养护指南',
    profileSubtitle: '每天认识一种植物 🌿',
    profileBio: 'AI 植物管家 v1.0.0',
    emptyPlantTip: '去首页识别植物，添加第一盆吧',

    // 我的花园页面
    gardenTitle: '我的花园',
    gardenSubtitle: '用心呵护每一株生命',
    gardenEmptyTitle: '你的花园还是空的',
    gardenEmptyTip: '去首页识别植物，添加第一盆吧',

    // 发现页面
    discoverTitle: '发现植物',
    discoverSubtitle: '探索植物知识，学习养护技巧'
  },

  // 订阅消息模板 ID
  subscriptionTemplateId: 'XEGNQZUcsrWTE9JKZG088lSpQE2jjzR9JF0pAofOPgY',

  // 管理员 openid 白名单
  adminOpenids: ['oP55x3SPl1DkRUyTnV8sYpb7G2p4']
};

// 默认功能开关（首次运行兜底）
const DEFAULT_FEATURE_FLAGS = {
  updatedAt: new Date().toISOString(),

  // 页面级开关
  shopEnabled: false,              // 植物养护商城
  rankingEnabled: false,           // 花友排行榜（社区花园）
  showAiReminder: true,            // AI 智能提醒
  showCommunityGarden: false,      // 社区花园入口

  // 功能级开关
  enableDiagnosis: true,           // 植物诊断
  enableCareGuide: true,           // 养护指南
  enableWateringReminder: true,    // 浇水提醒
  enableSubscriptionMsg: true,     // 订阅消息

  // 实验性功能
  newDiagnosisLayout: false,       // 新诊断页布局
  enableVoiceInput: false          // 语音输入
};

exports.main = async (event, context) => {
  try {
    // 获取当前用户 openid
    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;

    // 1. 读取业务配置
    let appConfig = DEFAULT_APP_CONFIG;
    try {
      const configRes = await db.collection('app_config').doc('global').get();
      if (configRes.data) {
        appConfig = { ...DEFAULT_APP_CONFIG, ...configRes.data };
      }
    } catch (err) {
      // 集合或文档不存在，使用默认配置
    }

    // 2. 读取功能开关
    let featureFlags = DEFAULT_FEATURE_FLAGS;
    try {
      const flagRes = await db.collection('feature_flags').doc('default').get();
      if (flagRes.data) {
        featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...flagRes.data };
      }
    } catch (err) {
      // doc('default') 不存在，尝试查询集合中的任意文档（兼容 add 创建的随机 _id）
      try {
        const flagList = await db.collection('feature_flags').limit(1).get();
        if (flagList.data.length > 0) {
          featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...flagList.data[0] };
        }
      } catch (listErr) {
      }
    }

    // 3. 判断是否为管理员
    const adminOpenids = appConfig.adminOpenids || [];
    const isAdmin = openId && adminOpenids.includes(openId);

    // 4. 脱敏返回（移除内部字段）
    const safeConfig = { ...appConfig };
    delete safeConfig._openid;
    delete safeConfig._id;

    // 非管理员不返回敏感字段
    if (!isAdmin) {
      delete safeConfig.adminOpenids;
    }

    const safeFlags = { ...featureFlags };
    delete safeFlags._id;

    return {
      success: true,
      config: safeConfig,
      flags: safeFlags
    };

  } catch (err) {
    console.error('[getAppConfig] 失败:', err);
    // 兜底返回：去掉敏感字段
    const fallbackConfig = { ...DEFAULT_APP_CONFIG };
    delete fallbackConfig.adminOpenids;
    return {
      success: false,
      error: err.message,
      config: fallbackConfig,
      flags: DEFAULT_FEATURE_FLAGS
    };
  }
};
