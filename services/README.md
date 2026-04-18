# 服务层规范 (services/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

- 封装业务逻辑
- 纯函数（输入相同，输出相同）
- **不调用 API**（不直接调用云函数或网络请求）

---

## 二、文件结构

```
services/
├── index.js        # 统一入口
├── care.js         # 养护计算服务
└── dedup.js        # 去重服务
```

---

## 三、设计原则

### 3.1 纯函数原则

```javascript
// ✅ 正确：纯函数
function daysUntilWater(nextWatering) {
  if (!nextWatering) return null;
  return daysBetween(getToday(), nextWatering);
}

// 相同输入 → 相同输出
daysUntilWater('2026-03-30')  // 总是返回 2（假设今天是 2026-03-28）
```

### 3.2 不调用 API

```javascript
// ✅ 正确：只做计算
function processPlantList(plants) {
  return plants.map(plant => ({
    ...plant,
    daysUntilWater: daysUntilWater(plant.careInfo?.nextWatering)
  }));
}

// ❌ 错误：调用 API
async function getPlantWithStatus() {
  const plants = await api.getMyPlants();  // 禁止！
  return processPlantList(plants);
}
```

---

## 四、代码规范

### 4.1 care.js（养护计算）

```javascript
const { 
  WATERING_CYCLE_DEFAULT, 
  FERTILIZING_CYCLE_DEFAULT,
  WATERING_WARNING_DAYS 
} = require('../config/constants');

const { WATERING_STATUS, LIGHT_NEEDS } = require('../config/enums');

// ========== 日期计算 ==========

/**
 * 计算两个日期之间的天数差
 * @param {string|Date} date1 日期1
 * @param {string|Date} date2 日期2
 * @returns {number} 天数差
 */
function daysBetween(date1, date2) {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 在日期上增加天数
 * @param {string|Date} date 基础日期
 * @param {number} days 增加的天数
 * @returns {string} YYYY-MM-DD 格式
 */
function addDays(date, days) {
  const d = typeof date === 'string' ? new Date(date) : date;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ========== 浇水计算 ==========

/**
 * 计算浇水倒计时
 * @param {string} nextWatering 下次浇水日期
 * @returns {number|null} 剩余天数（负数表示已超期）
 */
function daysUntilWater(nextWatering) {
  if (!nextWatering) return null;
  return daysBetween(new Date().toISOString().split('T')[0], nextWatering);
}

/**
 * 获取浇水状态
 * @param {number|null} daysUntil 剩余天数
 * @returns {string} 状态
 */
function getWateringStatus(daysUntil) {
  if (daysUntil === null) return WATERING_STATUS.UNKNOWN;
  if (daysUntil <= 0) return WATERING_STATUS.NEEDS_WATER;
  if (daysUntil <= WATERING_WARNING_DAYS) return WATERING_STATUS.SOON;
  return WATERING_STATUS.OK;
}

// ========== 植物列表处理 ==========

/**
 * 处理植物列表，添加计算字段
 * @param {Array} plants 原始植物列表
 * @returns {Array} 处理后的列表
 */
function processPlantList(plants) {
  return plants.map(plant => {
    const daysUntilWater = daysUntilWater(plant.careInfo?.nextWatering);
    const wateringStatus = getWateringStatus(daysUntilWater);
    const lightNeed = extractLightNeed(plant.identifyResult?.careGuide);
    
    return {
      ...plant,
      daysUntilWater,
      wateringStatus,
      wateringText: getWateringText(daysUntilWater),
      lightNeed
    };
  });
}

/**
 * 分类植物（今天/即将/其他）
 * @param {Array} plants 处理后的植物列表
 * @returns {object} { todayPlants, soonPlants, otherPlants }
 */
function categorizePlants(plants) {
  const todayPlants = [];
  const soonPlants = [];
  const otherPlants = [];
  
  plants.forEach(plant => {
    switch (plant.wateringStatus) {
      case WATERING_STATUS.NEEDS_WATER:
        todayPlants.push(plant);
        break;
      case WATERING_STATUS.SOON:
        soonPlants.push(plant);
        break;
      default:
        otherPlants.push(plant);
    }
  });
  
  return { todayPlants, soonPlants, otherPlants };
}

module.exports = {
  daysBetween,
  addDays,
  daysUntilWater,
  getWateringStatus,
  processPlantList,
  categorizePlants
};
```

### 4.2 dedup.js（去重服务）

```javascript
/**
 * 按植物名称去重
 * @param {Array} plants 植物列表
 * @param {object} options 去重选项
 * @returns {Array} 去重后的列表
 */
function dedupByName(plants, options = {}) {
  const uniqueMap = new Map();
  
  plants.forEach(plant => {
    let key = plant.name || '';
    
    if (options.includeScientific && plant.scientificName) {
      key = `${plant.name}_${plant.scientificName}`;
    }
    
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, plant);
    }
  });
  
  return Array.from(uniqueMap.values());
}

/**
 * 按字段去重（通用）
 * @param {Array} list 任意列表
 * @param {string} field 用于去重的字段名
 * @returns {Array} 去重后的列表
 */
function dedupByField(list, field) {
  const uniqueMap = new Map();
  
  list.forEach(item => {
    const key = item[field];
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });
  
  return Array.from(uniqueMap.values());
}

module.exports = { dedupByName, dedupByField };
```

---

## 五、使用方式

```javascript
const services = require('../../services/index');

// 获取植物列表（API 层）
const result = await api.getMyPlants();

// 处理数据（services 层）
const processed = services.processPlantList(result.plants);
const { todayPlants, soonPlants } = services.categorizePlants(processed);
```

---

## 六、可测试性

```javascript
// 可以独立测试，不需要网络
const services = require('./services/care.js');

// 测试用例
assert(services.daysBetween('2026-03-28', '2026-03-30') === 2);
assert(services.getWateringStatus(0) === 'needs_water');
assert(services.getWateringStatus(1) === 'soon');
assert(services.getWateringStatus(5) === 'ok');
```

---

**文档版本：** v1.0