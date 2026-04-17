# 配置层规范 (config/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

存放所有全局配置：
- API Key
- 常量（额度、周期、阈值）
- 枚举（错误码、问题类型、状态）

---

## 二、文件结构

```
config/
├── index.js        # 统一入口
├── api-keys.js     # API Key 管理
├── constants.js    # 常量定义
└── enums.js        # 枚举定义
```

---

## 三、命名规范

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 文件名 | kebab-case | api-keys.js |
| 常量 | UPPER_SNAKE_CASE | PLANTNET_DAILY_LIMIT |
| 函数 | camelCase | getQwenKey() |
| 对象属性 | camelCase | errorMessages |

---

## 四、代码规范

### 4.1 api-keys.js

```javascript
/**
 * API Key 配置
 * 
 * ⚠️ 安全原则：
 * 1. 不硬编码在生产环境
 * 2. 从环境变量或安全存储读取
 * 3. 客户端不存储敏感 Key
 */

module.exports = {
  // ========== 外部 API Key ==========
  
  /**
   * Qwen-Turbo API Key
   * 用途：养护建议、诊断报告
   */
  QWEN_API_KEY: process.env.QWEN_API_KEY || '',
  
  /**
   * PlantNet API Key
   * 用途：识别植物品种
   */
  PLANTNET_API_KEY: process.env.PLANTNET_API_KEY || '',
  
  // ========== 获取函数 ==========
  
  /**
   * 获取 Qwen API Key（云函数用）
   */
  getQwenKey(envKey = '') {
    return process.env.QWEN_API_KEY || envKey || '';
  },
  
  /**
   * 获取 PlantNet API Key（前端用）
   */
  getPlantnetKey(envKey = '') {
    return process.env.PLANTNET_API_KEY || envKey || 'default-key';
  }
};
```

### 4.2 constants.js

```javascript
/**
 * 全局常量配置
 */

module.exports = {
  // ========== API 额度限制 ==========
  PLANTNET_DAILY_LIMIT: 500,
  QWEN_FREE_LIMIT: 1000000,
  QWEN_WARNING_THRESHOLD: 100000,
  
  // ========== 养护默认值 ==========
  WATERING_CYCLE_DEFAULT: 7,
  FERTILIZING_CYCLE_DEFAULT: 30,
  WATERING_WARNING_DAYS: 2,
  
  // ========== 图片限制 ==========
  IMAGE_MAX_SIZE_KB: 9500,
  PLANTNET_CONFIDENCE_THRESHOLD: 0.3,
  
  // ========== UI 常量 ==========
  CARD_BORDER_RADIUS: 20,
  CARD_PADDING: 20,
  IMAGE_SIZE: 120,
  BUTTON_SIZE: 80,
  
  // ========== 存储键名 ==========
  STORAGE_KEYS: {
    PLANTNET_QUOTA: 'plantnet_quota',
    QWEN_TOKEN_USED: 'qwen_token_used',
    FAVORITES: 'favorites',
    USER_STATS: 'user_stats'
  },
  
  // ========== 云开发配置 ==========
  CLOUD_ENV_ID: 'cloud1-xxx',
  APP_ID: 'wx123xxx',
  SUBSCRIPTION_TEMPLATE_ID: 'xxx'
};
```

### 4.3 enums.js

```javascript
/**
 * 枚举定义
 */

module.exports = {
  // ========== 错误码 ==========
  ERROR_CODES: {
    SUCCESS: 0,
    NETWORK_ERROR: 1001,
    API_ERROR: 1002,
    QUOTA_EXCEEDED: 1003,
    INVALID_IMAGE: 1004,
    NOT_FOUND: 1005,
    PERMISSION_DENIED: 1006,
    VALIDATION_ERROR: 1007,
    TIMEOUT: 1008
  },
  
  // ========== 错误消息 ==========
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
  
  // ========== 植物问题类型 ==========
  PROBLEM_TYPES: [
    { id: 'yellow_leaves', name: '叶尖发黄', icon: '🍂' },
    { id: 'spots', name: '叶子有斑点', icon: '🔍' },
    // ...
  ],
  
  // ========== 浇水状态 ==========
  WATERING_STATUS: {
    NEEDS_WATER: 'needs_water',
    SOON: 'soon',
    OK: 'ok',
    UNKNOWN: 'unknown'
  }
};
```

---

## 五、使用方式

```javascript
// ✅ 正确：从统一入口导入
const config = require('../../config/index');
const { QWEN_API_KEY, ERROR_CODES } = config;

// ✅ 正确：直接导入子模块
const { PLANTNET_DAILY_LIMIT } = require('../../config/constants');
```

---

## 六、安全原则

1. **禁止硬编码 API Key**
2. **敏感 Key 只在云函数使用**
3. **前端可暴露的 Key（如 PlantNet）单独管理**
4. **环境变量在云开发控制台配置**

---

**文档版本：** v1.0