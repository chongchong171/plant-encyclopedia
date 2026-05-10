/**
 * 全局常量配置
 *
 * 包含：额度限制、默认值、阈值等
 *
 * ⚠️ 配置化改造说明：
 * 易变配置（大模型、额度、文案、开关）已迁移到云数据库 app_config / feature_flags
 * 通过 getAppConfig 云函数动态读取，无需重新发版审核即可调整。
 * 本文件保留不易变的硬编码（AppID、缓存键名、存储键名等）。
 */

/**
 * 获取远程配置（带本地兜底）
 * @param {string} key 配置键，支持点路径如 'aiModel.name'
 * @param {*} defaultValue 默认值
 * @returns {*}
 */
function getConfig(key, defaultValue) {
  const app = getApp ? getApp() : null;
  const config = app?.globalData?.appConfig || {};
  const keys = key.split('.');
  let value = config;
  for (const k of keys) {
    if (value === null || value === undefined) break;
    value = value[k];
  }
  return value !== undefined ? value : defaultValue;
}

/**
 * 获取功能开关（带本地兜底）
 * @param {string} flag 开关名
 * @param {boolean} defaultValue 默认值
 * @returns {boolean}
 */
function isFeatureEnabled(flag, defaultValue = false) {
  const app = getApp ? getApp() : null;
  const flags = app?.globalData?.featureFlags || {};
  return flags[flag] !== undefined ? flags[flag] : defaultValue;
}

module.exports = {
  // 配置读取工具
  getConfig,
  isFeatureEnabled,
  // ========== API 额度限制 ==========

  /**
   * PlantNet 每日识别次数限制
   */
  PLANTNET_DAILY_LIMIT: 500,

  // ========== 养护默认值 ==========
  
  /**
   * 默认浇水周期（天）
   */
  WATERING_CYCLE_DEFAULT: 7,
  
  /**
   * 默认施肥周期（天）
   */
  FERTILIZING_CYCLE_DEFAULT: 30,
  
  /**
   * 浇水预警阈值（天）
   * 剩余天数 ≤ 此值时标记为"即将浇水"
   */
  WATERING_WARNING_DAYS: 2,
  
  // ========== 图片限制 ==========
  
  /**
   * 图片最大大小（KB）
   */
  IMAGE_MAX_SIZE_KB: 9500,  // ~9MB
  
  // ========== UI 卡片尺寸（用于 WXSS 变量）==========
  CARD_BORDER_RADIUS: 20,  // rpx
  CARD_PADDING: 30,  // rpx
  CARD_MARGIN: 24,  // rpx
  CARD_SHADOW: '0 8rpx 40rpx rgba(0, 0, 0, 0.08)',

  /**
   * PlantNet 置信度阈值
   * 低于此值判定为"无法确定"
   */
  PLANTNET_CONFIDENCE_THRESHOLD: 0.3,  // 30%

  // ========== UI 常量 ==========

  /**
   * 图片尺寸（rpx）
   */
  IMAGE_SIZE: 120,

  /**
   * 按钮尺寸（rpx）
   */
  BUTTON_SIZE: 80,
  
  // ========== 存储键名 ==========
  
  STORAGE_KEYS: {
    PLANTNET_QUOTA: 'plantnet_quota',
    FAVORITES: 'favorites',
    USER_STATS: 'user_stats',
    MY_PLANTS_CACHE: 'my_plants_cache'
  },
  
  // ========== 缓存配置 ==========
  
  CACHE_DURATION: {
    MY_PLANTS: 5 * 60 * 1000,    // 5 分钟
    USER_STATS: 10 * 60 * 1000   // 10 分钟
  },
  
  // ========== 云开发环境 ==========
  
  /**
   * 云开发环境 ID
   * 使用动态环境，自动适配当前部署环境
   */
  CLOUD_ENV_ID: 'DYNAMIC_CURRENT_ENV',
  
  /**
   * 小程序 AppID
   */
  APP_ID: 'wx3dc8f726e165ec0b',
  
  /**
   * 订阅消息模板 ID（浇水提醒）
   */
  SUBSCRIPTION_TEMPLATE_ID: 'XEGNQZUcsrWTE9JKZG088lSpQE2jjzR9JF0pAofOPgY'
};