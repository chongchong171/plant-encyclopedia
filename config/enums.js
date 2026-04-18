/**
 * 枚举定义
 * 
 * 包含：问题类型、错误码、状态枚举等
 */

module.exports = {
  // ========== 植物问题类型 ==========
  
  PROBLEM_TYPES: [
    { id: 'yellow_leaves', name: '叶尖发黄', icon: '🍂' },
    { id: 'spots', name: '叶子有斑点', icon: '🔍' },
    { id: 'curling', name: '叶子卷曲', icon: '🌿' },
    { id: 'insects', name: '有虫子', icon: '🐛' },
    { id: 'drooping', name: '叶片萎蔫', icon: '😢' },
    { id: 'rot', name: '茎部发黑', icon: '⚠️' },
    { id: 'slow_growth', name: '生长缓慢', icon: '🐢' },
    { id: 'leaf_drop', name: '落叶严重', icon: '🍁' },
    { id: 'pale_leaves', name: '叶子发白/褪色', icon: '👻' },
    { id: 'dry_edges', name: '叶子干枯/焦边', icon: '🔥' },
    { id: 'no_flowers', name: '不开花', icon: '🥀' },
    { id: 'leggy', name: '徒长（茎细长）', icon: '📏' },
    { id: 'bud_die', name: '新芽枯萎', icon: '💀' },
    { id: 'small_leaves', name: '叶子变小', icon: '🔹' }
  ],
  
  // ========== 错误码 ==========
  
  ERROR_CODES: {
    SUCCESS: 0,
    NETWORK_ERROR: 1001,       // 网络错误
    API_ERROR: 1002,           // API 调用失败
    QUOTA_EXCEEDED: 1003,      // 额度用完
    INVALID_IMAGE: 1004,       // 图片格式错误
    NOT_FOUND: 1005,           // 数据不存在
    PERMISSION_DENIED: 1006,   // 权限不足
    VALIDATION_ERROR: 1007,    // 数据校验失败
    TIMEOUT: 1008              // 请求超时
  },
  
  /**
   * 错误码对应的提示消息
   */
  ERROR_MESSAGES: {
    1001: '网络错误，请检查连接',
    1002: '服务暂时不可用',
    1003: '今日次数已用完，请明天再试',
    1004: '图片格式不支持',
    1005: '数据不存在',
    1006: '权限不足',
    1007: '数据格式错误',
    1008: '请求超时，请重试'
  },
  
  // ========== 养护状态 ==========
  
  WATERING_STATUS: {
    NEEDS_WATER: 'needs_water',     // 需要浇水（今天）
    SOON: 'soon',                   // 即将浇水（≤2天）
    OK: 'ok',                       // 正常
    UNKNOWN: 'unknown'              // 未设置
  },
  
  // ========== 光照需求 ==========
  
  LIGHT_NEEDS: {
    FULL_SUN: { id: 'full_sun', text: '充足阳光，每天6小时+', color: '#FF9800' },
    BRIGHT_INDIRECT: { id: 'bright_indirect', text: '明亮散射光', color: '#4CAF50' },
    LOW_LIGHT: { id: 'low_light', text: '耐阴，可放北向房间', color: '#2196F3' },
    UNKNOWN: { id: 'unknown', text: '明亮散射光', color: '#9E9E9E' }
  },
  
  // ========== 日志级别 ==========
  
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  },
  
  // ========== 养护难度 ==========
  
  DIFFICULTY_LEVELS: {
    1: { text: '新手友好', stars: '⭐', color: '#4CAF50' },
    2: { text: '简单易养', stars: '⭐⭐', color: '#8BC34A' },
    3: { text: '中等难度', stars: '⭐⭐⭐', color: '#FFC107' },
    4: { text: '需要经验', stars: '⭐⭐⭐⭐', color: '#FF9800' },
    5: { text: '专业级', stars: '⭐⭐⭐⭐⭐', color: '#F44336' }
  },
  
  // ========== 养护日志动作 ==========
  
  CARE_ACTIONS: {
    WATER: 'water',       // 浇水
    FERTILIZE: 'fertilize', // 施肥
    DIAGNOSIS: 'diagnosis', // 诊断
    PRUNE: 'prune',       // 修剪
    REPOT: 'repot',       // 换盆
    MOVE: 'move',         // 移动位置
    PHOTO: 'photo'        // 拍照记录
  },
  
  // ========== 用户统计动作 ==========
  
  STATS_ACTIONS: {
    WATER: 'water',
    FERTILIZE: 'fertilize',
    ADD_PLANT: 'add_plant',
    REMOVE_PLANT: 'remove_plant',
    DIAGNOSIS: 'diagnosis'
  }
};