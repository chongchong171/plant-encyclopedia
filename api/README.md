# API 层规范 (api/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

- 封装云函数调用
- 统一错误处理
- 统一日志记录
- **不包含业务逻辑**

---

## 二、文件结构

```
api/
├── index.js        # 统一入口
├── cloud.js        # 云函数通用封装
├── plant.js        # 植物 API
├── diagnosis.js    # 诊断 API
└── stats.js        # 统计 API
```

---

## 三、函数签名规范

```javascript
/**
 * 函数说明
 * @param {type} paramName 参数说明
 * @returns {Promise<{success: boolean, data?: any, error?: string, code?: number}>}
 */
```

---

## 四、代码规范

### 4.1 cloud.js（通用封装）

```javascript
const { ERROR_CODES, ERROR_MESSAGES } = require('../config/enums');

/**
 * 调用云函数
 */
async function callCloudFunction(name, data = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log(`[CloudAPI] Calling ${name}...`, data);
    
    const res = await wx.cloud.callFunction({
      name: name,
      data: data,
      timeout: options.timeout || 30000
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[CloudAPI] ${name} completed in ${elapsed}ms`);
    
    if (res.result && res.result.success) {
      return { success: true, data: res.result };
    }
    
    return handleError(res.result?.message || '执行失败', ERROR_CODES.API_ERROR);
    
  } catch (err) {
    console.error(`[CloudAPI] ${name} failed:`, err);
    
    if (err.errMsg?.includes('timeout')) {
      return handleError('请求超时', ERROR_CODES.TIMEOUT);
    }
    
    return handleError(err.message, ERROR_CODES.API_ERROR);
  }
}

/**
 * 统一错误处理
 */
function handleError(message, code) {
  const displayMessage = ERROR_MESSAGES[code] || message;
  return {
    success: false,
    error: displayMessage,
    code: code,
    rawMessage: message
  };
}

module.exports = { callCloudFunction, handleError };
```

### 4.2 plant.js（业务 API）

```javascript
const { callCloudFunction } = require('./cloud');
const { ERROR_CODES } = require('../config/enums');

/**
 * 获取我的植物列表
 * @returns {Promise<{success: boolean, plants?: Array, error?: string}>}
 */
async function getMyPlants() {
  const result = await callCloudFunction('getMyPlants');
  
  if (result.success) {
    return { success: true, plants: result.data.plants };
  }
  
  return result;
}

/**
 * 添加植物
 * @param {Object} plantData 植物数据
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function addPlant(plantData) {
  // 参数校验
  if (!plantData || !plantData.name) {
    return {
      success: false,
      error: '植物名称不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  const result = await callCloudFunction('addPlant', { plant: plantData });
  
  if (result.success) {
    return { success: true, id: result.data.id };
  }
  
  return result;
}

/**
 * 记录浇水
 * @param {string} plantId 植物 ID
 * @param {number} wateringDays 浇水周期
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function recordWatering(plantId, wateringDays = 7) {
  if (!plantId) {
    return {
      success: false,
      error: '植物 ID 不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  // 直接操作数据库（避免云函数开销）
  try {
    const db = wx.cloud.database();
    const nextWatering = addDays(new Date(), wateringDays);
    
    await db.collection('my_plants').doc(plantId).update({
      data: {
        'careInfo.lastWatered': formatDate(new Date()),
        'careInfo.nextWatering': nextWatering,
        'careLog': db.command.push({
          date: formatDate(new Date()),
          action: 'water',
          notes: ''
        })
      }
    });
    
    // 更新统计（异步，不等待）
    callCloudFunction('updateUserStats', { action: 'water' }).catch(() => {});
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: '记录失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

module.exports = { getMyPlants, addPlant, recordWatering };
```

---

## 五、使用方式

```javascript
// 页面中导入
const api = require('../../api/index');

// 调用 API
const result = await api.getMyPlants();

// 处理结果
if (!result.success) {
  showErrorToast(result);
  return;
}

console.log(result.plants);
```

---

## 六、错误处理规范

```javascript
// ✅ 正确：统一返回格式
return {
  success: false,
  error: '用户友好的错误提示',
  code: ERROR_CODES.XXX,
  rawMessage: '原始错误信息（调试用）'
};

// ✅ 正确：使用预定义错误码
if (err.errMsg?.includes('timeout')) {
  return handleError('请求超时', ERROR_CODES.TIMEOUT);
}

// ❌ 错误：直接抛出异常
throw new Error('xxx');  // 会让调用方难以处理
```

---

## 七、性能优化

1. **简单操作直接操作数据库**（避免云函数开销）
2. **统计更新异步执行**（不阻塞主流程）
3. **日志记录耗时**（便于性能监控）

---

**文档版本：** v1.0