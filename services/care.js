/**
 * 养护计算服务
 * 
 * 职责：
 * 1. 计算浇水倒计时
 * 2. 计算施肥倒计时
 * 3. 提供光照需求
 * 4. 分类植物（今天/即将/正常）
 * 
 * ⚠️ 纯业务逻辑，不调用 API
 */

const { 
  WATERING_CYCLE_DEFAULT, 
  FERTILIZING_CYCLE_DEFAULT,
  WATERING_WARNING_DAYS 
} = require('../config/constants');

const { WATERING_STATUS, LIGHT_NEEDS } = require('../config/enums');

const { formatDate, getToday, addDays, daysBetween } = require('../utils/time');

// ========== 浇水计算 ==========

/**
 * 计算浇水倒计时
 * 
 * @param {string} nextWatering 下次浇水日期（YYYY-MM-DD）
 * @returns {number|null} 剩余天数（负数表示已超期），null 表示未设置
 */
function daysUntilWater(nextWatering) {
  if (!nextWatering) return null;
  return daysBetween(getToday(), nextWatering);
}

/**
 * 计算下次浇水日期
 * 
 * @param {number} cycle 浇水周期（天）
 * @returns {string} YYYY-MM-DD
 */
function calculateNextWatering(cycle) {
  cycle = cycle || WATERING_CYCLE_DEFAULT;
  return addDays(new Date(), cycle);
}

/**
 * 获取浇水状态
 * 
 * @param {number|null} daysUntil 剩余天数
 * @returns {string} 状态：needs_water, soon, ok, unknown
 */
function getWateringStatus(daysUntil) {
  if (daysUntil === null) return WATERING_STATUS.UNKNOWN;
  if (daysUntil <= 0) return WATERING_STATUS.NEEDS_WATER;
  if (daysUntil <= WATERING_WARNING_DAYS) return WATERING_STATUS.SOON;
  return WATERING_STATUS.OK;
}

/**
 * 获取浇水状态文案
 * 
 * @param {number|null} daysUntil 剩余天数
 * @returns {string} 用户可见的文案
 */
function getWateringText(daysUntil) {
  const status = getWateringStatus(daysUntil);
  
  switch (status) {
    case WATERING_STATUS.NEEDS_WATER:
      return '今天需要浇水';
    case WATERING_STATUS.SOON:
      return daysUntil + '天后浇水';
    case WATERING_STATUS.OK:
      return daysUntil + '天后浇水';
    case WATERING_STATUS.UNKNOWN:
      return '未设置浇水周期';
    default:
      return '';
  }
}

// ========== 施肥计算 ==========

/**
 * 计算施肥倒计时
 * 
 * @param {string} nextFertilizing 下次施肥日期
 * @returns {number|null} 剩余天数
 */
function daysUntilFertilizeCalc(nextFertilizing) {
  if (!nextFertilizing) return null;
  return daysBetween(getToday(), nextFertilizing);
}

/**
 * 计算下次施肥日期
 * 
 * @param {number} cycle 施肥周期（天）
 * @returns {string} YYYY-MM-DD
 */
function calculateNextFertilizing(cycle) {
  cycle = cycle || FERTILIZING_CYCLE_DEFAULT;
  return addDays(new Date(), cycle);
}

// ========== 光照需求提取 ==========

/**
 * 从养护指南中提取光照需求
 * 
 * @param {object|string} careGuide 养护指南（对象或字符串）
 * @returns {object} LIGHT_NEEDS 中的某一项
 */
function extractLightNeed(careGuide) {
  if (!careGuide) return LIGHT_NEEDS.UNKNOWN;
  
  var text = typeof careGuide === 'string' ? careGuide : (careGuide.light || '');
  text = text.toLowerCase();
  
  if (text.includes('充足阳光') || text.includes('全日照') || text.includes('直射')) {
    return LIGHT_NEEDS.FULL_SUN;
  }
  
  if (text.includes('半阴') || text.includes('散射光') || text.includes('明亮') || text.includes('间接')) {
    return LIGHT_NEEDS.BRIGHT_INDIRECT;
  }
  
  if (text.includes('耐阴') || text.includes('阴暗') || text.includes('低光')) {
    return LIGHT_NEEDS.LOW_LIGHT;
  }
  
  return LIGHT_NEEDS.UNKNOWN;
}

// ========== 植物列表处理 ==========

/**
 * 处理植物列表，添加计算字段
 * 
 * @param {Array} plants 原始植物列表
 * @returns {Array} 处理后的列表（含 daysUntilWater, wateringStatus, lightNeed）
 */
function processPlantList(plants) {
  return plants.map(function(plant) {
    // 计算浇水倒计时
    var nextWatering = plant.careInfo && plant.careInfo.nextWatering;
    var waterDays = daysUntilWater(nextWatering);
    var wateringStatus = getWateringStatus(waterDays);
    
    // 计算施肥倒计时
    var nextFertilizing = plant.careInfo && plant.careInfo.nextFertilizing;
    var fertilizeDays = daysUntilFertilizeCalc(nextFertilizing);
    
    // 提取光照需求
    var lightNeed = extractLightNeed(plant.identifyResult && plant.identifyResult.careGuide);
    
    return Object.assign({}, plant, {
      daysUntilWater: waterDays,
      wateringStatus: wateringStatus,
      wateringText: getWateringText(waterDays),
      daysUntilFertilize: fertilizeDays,
      lightNeed: lightNeed
    });
  });
}

/**
 * 分类植物（今天/即将/其他）
 * 
 * @param {Array} plants 处理后的植物列表
 * @returns {object} { todayPlants, soonPlants, otherPlants }
 */
function categorizePlants(plants) {
  var todayPlants = [];
  var soonPlants = [];
  var otherPlants = [];
  
  plants.forEach(function(plant) {
    var status = plant.wateringStatus;
    
    switch (status) {
      case WATERING_STATUS.NEEDS_WATER:
        todayPlants.push(plant);
        break;
      case WATERING_STATUS.SOON:
        soonPlants.push(plant);
        break;
      case WATERING_STATUS.OK:
        otherPlants.push(plant);
        break;
      case WATERING_STATUS.UNKNOWN:
        otherPlants.push(plant);
        break;
    }
  });
  
  return { todayPlants: todayPlants, soonPlants: soonPlants, otherPlants: otherPlants };
}

module.exports = {
  // 浇水计算
  daysUntilWater: daysUntilWater,
  calculateNextWatering: calculateNextWatering,
  getWateringStatus: getWateringStatus,
  getWateringText: getWateringText,
  
  // 施肥计算
  daysUntilFertilizeCalc: daysUntilFertilizeCalc,
  calculateNextFertilizing: calculateNextFertilizing,
  
  // 光照需求
  extractLightNeed: extractLightNeed,
  
  // 植物列表处理
  processPlantList: processPlantList,
  categorizePlants: categorizePlants
};