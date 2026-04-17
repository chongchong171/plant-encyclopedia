/**
 * 存储工具
 * 
 * 职责：本地存储封装
 */

const { STORAGE_KEYS } = require('../config/constants');

/**
 * 获取存储数据
 * 
 * @param {string} key 存储键名
 * @returns {any} 存储的数据
 */
function getStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.warn('[Storage] 读取失败:', e);
    return null;
  }
}

/**
 * 设置存储数据
 * 
 * @param {string} key 存储键名
 * @param {any} value 数据
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.warn('[Storage] 写入失败:', e);
  }
}

/**
 * 移除存储数据
 * 
 * @param {string} key 存储键名
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    console.warn('[Storage] 删除失败:', e);
  }
}

// ========== 业务存储 ==========

/**
 * 获取收藏列表
 * 
 * @returns {Array}
 */
function getFavorites() {
  return getStorage(STORAGE_KEYS.FAVORITES) || [];
}

/**
 * 设置收藏列表
 * 
 * @param {Array} favorites 收藏列表
 */
function setFavorites(favorites) {
  setStorage(STORAGE_KEYS.FAVORITES, favorites);
}

/**
 * 添加收藏
 * 
 * @param {object} plant 植物数据
 * @returns {boolean} 是否添加成功（false 表示已存在）
 */
function addFavorite(plant) {
  const favorites = getFavorites();
  
  // 按名称去重检查
  const exists = favorites.some(f => 
    f.name === plant.name || 
    (plant.scientificName && f.scientificName === plant.scientificName)
  );
  
  if (!exists) {
    favorites.push({
      ...plant,
      id: plant.id || `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addTime: Date.now()
    });
    setFavorites(favorites);
  }
  
  return !exists;
}

/**
 * 移除收藏
 * 
 * @param {string} plantId 植物 ID
 */
function removeFavorite(plantId) {
  const favorites = getFavorites();
  const filtered = favorites.filter(f => f.id !== plantId);
  setFavorites(filtered);
  return favorites.length !== filtered.length;
}

/**
 * 获取 PlantNet 额度状态
 * 
 * @returns {object} { date, count }
 */
function getPlantnetQuota() {
  return getStorage(STORAGE_KEYS.PLANTNET_QUOTA) || { date: '', count: 0 };
}

/**
 * 设置 PlantNet 额度状态
 * 
 * @param {object} quota { date, count }
 */
function setPlantnetQuota(quota) {
  setStorage(STORAGE_KEYS.PLANTNET_QUOTA, quota);
}

module.exports = {
  getStorage,
  setStorage,
  removeStorage,
  
  // 业务存储
  getFavorites,
  setFavorites,
  addFavorite,
  removeFavorite,
  
  getPlantnetQuota,
  setPlantnetQuota
};