/**
 * 缓存工具
 * 
 * 提供带过期时间的缓存功能
 */

const { STORAGE_KEYS, CACHE_DURATION } = require('../config/constants');

/**
 * 获取缓存数据
 * @param {string} key 缓存键名
 * @returns {any|null} 缓存数据或 null（已过期/不存在）
 */
function getCache(key) {
  try {
    const cached = wx.getStorageSync(key);
    
    if (!cached) return null;
    
    // 检查是否过期
    if (cached.expireAt && Date.now() > cached.expireAt) {
      wx.removeStorageSync(key);
      return null;
    }
    
    return cached.data;
  } catch (e) {
    return null;
  }
}

/**
 * 设置缓存数据
 * @param {string} key 缓存键名
 * @param {any} data 数据
 * @param {number} duration 缓存时长（毫秒）
 */
function setCache(key, data, duration) {
  try {
    wx.setStorageSync(key, {
      data: data,
      expireAt: Date.now() + duration,
      updatedAt: Date.now()
    });
    return true;
  } catch (e) {
    console.warn('[Cache] 写入失败:', e);
    return false;
  }
}

/**
 * 清除缓存
 * @param {string} key 缓存键名
 */
function clearCache(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取我的植物缓存
 */
function getMyPlantsCache() {
  return getCache(STORAGE_KEYS.MY_PLANTS_CACHE);
}

/**
 * 设置我的植物缓存
 */
function setMyPlantsCache(data) {
  return setCache(STORAGE_KEYS.MY_PLANTS_CACHE, data, CACHE_DURATION.MY_PLANTS);
}

/**
 * 获取用户统计缓存
 */
function getUserStatsCache() {
  return getCache(STORAGE_KEYS.USER_STATS);
}

/**
 * 设置用户统计缓存
 */
function setUserStatsCache(data) {
  return setCache(STORAGE_KEYS.USER_STATS, data, CACHE_DURATION.USER_STATS);
}

module.exports = {
  getCache,
  setCache,
  clearCache,
  getMyPlantsCache,
  setMyPlantsCache,
  getUserStatsCache,
  setUserStatsCache
};