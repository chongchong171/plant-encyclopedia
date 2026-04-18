/**
 * 去重服务
 * 
 * 职责：消除重复数据
 */

/**
 * 按植物学名去重（主要方式）
 * 
 * 学名是唯一的，即使中文名不同，只要学名相同就是同一种植物
 * 
 * @param {Array} plants 植物列表
 * @returns {Array} 去重后的列表
 */
function dedupByScientificName(plants) {
  const uniqueMap = new Map();
  
  plants.forEach(plant => {
    const key = plant.scientificName || plant.name || '';
    
    // 只保留第一个出现的
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, plant);
    }
  });
  
  return Array.from(uniqueMap.values());
}

/**
 * 按植物名称去重
 * 
 * @param {Array} plants 植物列表
 * @param {object} options 去重选项
 * @param {boolean} options.includeScientific 是否包含学名作为 key
 * @returns {Array} 去重后的列表
 */
function dedupByName(plants, options = {}) {
  const uniqueMap = new Map();
  
  plants.forEach(plant => {
    // 构建 key
    let key = plant.name || '';
    
    if (options.includeScientific && plant.scientificName) {
      key = `${plant.name}_${plant.scientificName}`;
    }
    
    // 只保留第一个出现的
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, plant);
    }
  });
  
  return Array.from(uniqueMap.values());
}

/**
 * 按字段去重（通用）
 * 
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

/**
 * 按自定义 key 函数去重
 * 
 * @param {Array} list 任意列表
 * @param {function} keyFn 生成 key 的函数
 * @returns {Array} 去重后的列表
 */
function dedupByKeyFn(list, keyFn) {
  const uniqueMap = new Map();
  
  list.forEach(item => {
    const key = keyFn(item);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });
  
  return Array.from(uniqueMap.values());
}

module.exports = {
  dedupByName,
  dedupByScientificName,
  dedupByField,
  dedupByKeyFn
};