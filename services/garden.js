/**
 * 花园服务层
 * 
 * 职责：
 * - 处理植物数据的本地缓存
 * - 提供植物位置计算
 * - 处理浇水状态逻辑
 * 
 * @module services/garden
 */

const CACHE_KEY = 'my_garden_plants';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

/**
 * 从本地缓存获取植物列表
 * @returns {Array} 植物列表
 */
function getPlantsFromCache() {
  try {
    const cache = wx.getStorageSync(CACHE_KEY);
    if (!cache) return [];
    
    // 检查缓存是否过期
    if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
      console.log('[GardenService] 缓存已过期');
      return [];
    }
    
    console.log('[GardenService] 从缓存获取', cache.data.length, '盆植物');
    return cache.data || [];
  } catch (err) {
    console.error('[GardenService] 读取缓存失败:', err);
    return [];
  }
}

/**
 * 保存植物列表到本地缓存
 * @param {Array} plants 植物列表
 */
function savePlantsToCache(plants) {
  try {
    wx.setStorageSync(CACHE_KEY, {
      data: plants,
      timestamp: Date.now()
    });
    console.log('[GardenService] 已缓存', plants.length, '盆植物');
  } catch (err) {
    console.error('[GardenService] 保存缓存失败:', err);
  }
}

/**
 * 计算植物在博古架上的位置
 * @param {Array} plants 植物列表
 * @returns {Array} 分层后的植物列表
 */
function calculateShelfPositions(plants) {
  const levels = [[], [], []]; // 三层博古架
  const positionsPerLevel = 3; // 每层最多3盆
  
  // 预定义位置（百分比）- 自然分布
  const positionMap = [
    { left: '8%', top: '15%' },   // 左侧
    { left: '38%', top: '10%' },  // 中间偏左
    { left: '68%', top: '15%' }   // 右侧
  ];
  
  plants.forEach((plant, index) => {
    const levelIndex = Math.floor(index / positionsPerLevel);
    const positionIndex = index % positionsPerLevel;
    
    if (levelIndex < 3) {
      levels[levelIndex].push({
        ...plant,
        position: positionMap[positionIndex]
      });
    }
  });
  
  return levels;
}

/**
 * 处理植物数据，添加计算字段
 * @param {Array} plants 原始植物数据
 * @returns {Array} 处理后的植物数据
 */
function processPlantData(plants) {
  return plants.map(plant => {
    // 计算浇水状态
    const daysUntilWater = plant.careInfo?.nextWatering 
      ? Math.ceil((new Date(plant.careInfo.nextWatering) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      ...plant,
      daysUntilWater,
      // 保留原始图片字段，不设置默认值（让页面自己处理无图情况）
      imageUrl: plant.imageUrl || plant.identifyResult?.imageUrl || ''
    };
  });
}

/**
 * 分类植物（今天浇水/即将浇水/其他）
 * @param {Array} plants 植物列表
 * @returns {Object} 分类后的植物
 */
function categorizePlants(plants) {
  const today = [];
  const soon = [];
  const others = [];
  
  plants.forEach(plant => {
    if (plant.daysUntilWater <= 0) {
      today.push(plant);
    } else if (plant.daysUntilWater <= 2) {
      soon.push(plant);
    } else {
      others.push(plant);
    }
  });
  
  return { today, soon, others };
}

/**
 * 获取状态指示器类型
 * @param {number} daysUntilWater 距离浇水天数
 * @returns {string} 'water' | 'sun'
 */
function getStatusIndicator(daysUntilWater) {
  return daysUntilWater <= 0 ? 'water' : 'sun';
}

/**
 * 计算浇水状态
 * @param {object} plant 植物数据
 * @returns {{daysSinceWater: number, needsWater: boolean, statusText: string}}
 */
function calculateWaterStatus(plant) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)  // 设置为今天零点，便于日期比较
  
  // 优先使用下次浇水日期判断
  const nextWatering = plant.careInfo?.nextWatering ? new Date(plant.careInfo.nextWatering) : null
  
  if (nextWatering) {
    nextWatering.setHours(0, 0, 0, 0)  // 设置为零点
    const daysUntilWater = Math.ceil((nextWatering - today) / (1000 * 60 * 60 * 24))
    
    // 如果下次浇水日期是今天或之前，说明需要浇水
    const needsWater = daysUntilWater <= 0
    
    let statusText = '✅状态良好'
    if (needsWater) {
      statusText = '💧需要浇水'
    } else if (daysUntilWater <= 2) {
      statusText = '即将浇水'
    }
    
    return { 
      daysSinceWater: -daysUntilWater,  // 负数表示距离下次浇水的天数
      needsWater, 
      statusText 
    }
  }
  
  // 如果没有 nextWatering，使用上次浇水日期判断
  const lastWater = plant.lastWateringDate || plant.careInfo?.lastWatered
    ? new Date(plant.lastWateringDate || plant.careInfo?.lastWatered)
    : null
  const daysSinceWater = lastWater
    ? Math.floor((today - lastWater) / (1000 * 60 * 60 * 24))
    : 999

  let statusText = '✅状态良好'
  if (daysSinceWater >= 7) statusText = '💧需要浇水'  // 改为 >=
  else if (daysSinceWater >= 4) statusText = '⏰即将浇水'
  else if (daysSinceWater > 0) statusText = '🌱状态良好'
  else statusText = '✅刚浇过水'

  return { daysSinceWater, needsWater: daysSinceWater >= 7, statusText }  // 改为 >=
}

module.exports = {
  getPlantsFromCache,
  savePlantsToCache,
  calculateShelfPositions,
  processPlantData,
  categorizePlants,
  getStatusIndicator,
  calculateWaterStatus
};
