/**
 * 植物 API
 * 
 * 职责：封装植物相关的云函数调用
 * 
 * 包含：
 * - getMyPlants：获取我的植物列表
 * - addPlant：添加植物
 * - updatePlant：更新植物信息
 * - removePlant：删除植物
 * - recordWatering：记录浇水
 * - recordFertilizing：记录施肥
 */

const { callCloudFunction, getDisplayError } = require('./cloud');
const { ERROR_CODES } = require('../config/enums');
const { formatDate, addDays } = require('../utils/time');
const gardenService = require('../services/garden');

/**
 * 获取我的植物列表
 * 
 * @returns {Promise<{success: boolean, plants?: Array, error?: string}>}
 */
async function getMyPlants() {
  return callCloudFunction('getMyPlants');
}

/**
 * 获取我的植物列表（带缓存）
 * 
 * 优先从云端获取，如果失败则使用本地缓存
 * 
 * @returns {Promise<{success: boolean, plants?: Array, error?: string, fromCache?: boolean}>}
 */
async function getMyPlantsWithCache() {
  // 先尝试从云端获取
  const result = await callCloudFunction('getMyPlants');
  
  if (result.success && result.plants) {
    // 云端获取成功，更新缓存
    const processed = gardenService.processPlantData(result.plants);
    gardenService.savePlantsToCache(processed);
    return {
      success: true,
      plants: processed,
      fromCache: false
    };
  }
  
  // 云端失败，尝试从缓存获取
  console.log('[PlantAPI] 云端获取失败，尝试使用缓存');
  const cachedPlants = gardenService.getPlantsFromCache();
  
  if (cachedPlants && cachedPlants.length > 0) {
    return {
      success: true,
      plants: cachedPlants,
      fromCache: true,
      error: result.error || '使用缓存数据'
    };
  }
  
  // 缓存也没有，返回错误
  return {
    success: false,
    error: result.error || '无法获取植物数据',
    code: result.code || ERROR_CODES.API_ERROR
  };
}

/**
 * 添加植物到我的花园
 * 
 * @param {object} plantData 植物数据
 * @param {object} options 可选配置
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function addPlant(plantData, options = {}) {
  // 数据校验
  if (!plantData || !plantData.name) {
    return {
      success: false,
      error: '植物名称不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  const result = await callCloudFunction('addPlant', {
    plantData: plantData,
    wateringDays: options.wateringDays || 7,
    fertilizingDays: options.fertilizingDays || 30
  });
  
  // 直接返回云函数结果（已包含 plantId, wateringDays, nextWatering）
  return result;
}

/**
 * 删除植物
 * 
 * @param {string} plantId 植物 ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
/**
 * 删除植物（包括数据库记录和云存储图片）
 * 
 * @param {string} plantId - 植物 ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function removePlant(plantId) {
  if (!plantId) {
    return {
      success: false,
      error: '植物 ID 不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  try {
    const db = wx.cloud.database();
    
    // 1. 先获取植物信息（包含图片 URL）
    const plantRes = await db.collection('my_plants').doc(plantId).get();
    const imageUrl = plantRes.data.imageUrl;
    
    console.log('[PlantAPI] 删除植物:', plantRes.data.name, '图片 URL:', imageUrl);
    
    // 2. 删除云存储图片（如果有）
    if (imageUrl && imageUrl.includes('cloud://')) {
      try {
        // 从云存储 URL 中提取 fileID
        const fileId = imageUrl;  // 云存储 URL 本身就是 fileID
        
        console.log('[PlantAPI] 删除云存储图片:', fileId);
        
        const deleteRes = await wx.cloud.deleteFile({
          fileList: [fileId]
        });
        
        console.log('[PlantAPI] 云存储图片删除结果:', deleteRes.fileList);
      } catch (imgErr) {
        console.error('[PlantAPI] 删除云存储图片失败:', imgErr);
        // 图片删除失败不影响数据库删除，继续执行
      }
    }
    
    // 3. 删除数据库记录
    await db.collection('my_plants').doc(plantId).remove();
    
    console.log('[PlantAPI] 数据库记录已删除');
    
    // 4. 更新统计
    await callCloudFunction('updateUserStats', { action: 'remove_plant' });
    
    console.log('[PlantAPI] 植物删除完成');
    
    return { success: true };
  } catch (err) {
    console.error('[PlantAPI] 删除植物失败:', err);
    return {
      success: false,
      error: '删除失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 记录浇水
 * 
 * @param {string} plantId 植物 ID
 * @param {number} wateringDays 下次浇水周期（天）
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
  
  try {
    const db = wx.cloud.database();
    
    // 计算下次浇水日期
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
    
    // 更新统计
    await callCloudFunction('updateUserStats', { action: 'water' });
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: '记录失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 记录施肥
 * 
 * @param {string} plantId 植物 ID
 * @param {number} fertilizingDays 下次施肥周期（天）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function recordFertilizing(plantId, fertilizingDays = 30) {
  if (!plantId) {
    return {
      success: false,
      error: '植物 ID 不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  try {
    const db = wx.cloud.database();
    
    const nextFertilizing = addDays(new Date(), fertilizingDays);
    
    await db.collection('my_plants').doc(plantId).update({
      data: {
        'careInfo.lastFertilized': formatDate(new Date()),
        'careInfo.nextFertilizing': nextFertilizing,
        'careLog': db.command.push({
          date: formatDate(new Date()),
          action: 'fertilize',
          notes: ''
        })
      }
    });
    
    // 更新统计
    await callCloudFunction('updateUserStats', { action: 'fertilize' });
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: '记录失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 更新植物信息
 * 
 * @param {string} plantId 植物 ID
 * @param {object} updates 更新的数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updatePlant(plantId, updates) {
  if (!plantId || !updates) {
    return {
      success: false,
      error: '参数不完整',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  try {
    const db = wx.cloud.database();
    await db.collection('my_plants').doc(plantId).update({
      data: updates
    });
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: '更新失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 植物识别
 * 
 * @param {string} imageBase64 图片 Base64
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
async function plantIdentify(imageBase64) {
  if (!imageBase64) {
    return {
      success: false,
      error: '图片不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  return callCloudFunction('identifyPlant', {
    imageBase64: imageBase64
  });
}

/**
 * 更新植物图片
 * 
 * @param {string} plantId 植物 ID
 * @param {string} imageUrl 图片 URL（云存储 fileID）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updatePlantImage(plantId, imageUrl) {
  if (!plantId || !imageUrl) {
    return {
      success: false,
      error: '植物 ID 和图片 URL 不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  try {
    const db = wx.cloud.database();
    await db.collection('my_plants').doc(plantId).update({
      data: {
        userImageUrl: imageUrl,
        updatedAt: db.serverDate()
      }
    });
    
    return { success: true };
  } catch (err) {
    console.error('[PlantAPI] 更新植物图片失败:', err);
    return {
      success: false,
      error: '更新图片失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 上传并更新植物图片（完整流程：上传到云存储 → 获取临时链接 → 更新数据库）
 *
 * @param {string} plantId 植物 ID
 * @param {string} tempFilePath 本地临时文件路径
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function uploadPlantImage(plantId, tempFilePath) {
  if (!plantId || !tempFilePath) {
    return {
      success: false,
      error: '植物 ID 和图片路径不能为空',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }

  try {
    const cloudPath = `plant-images/${plantId}/${Date.now()}.jpg`
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: tempFilePath
    })

    // 获取临时访问链接（避免 403）
    const tempUrlRes = await wx.cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    })
    const tempUrl = tempUrlRes.fileList[0].tempFileURL

    return updatePlantImage(plantId, tempUrl)
  } catch (err) {
    console.error('[PlantAPI] 上传植物图片失败:', err);
    return {
      success: false,
      error: '上传失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 检查植物是否已存在（同名 + 同图片）
 *
 * @param {object} db 数据库实例
 * @param {string} plantName 植物名称
 * @param {string} imageUrl 图片 URL（可选）
 * @returns {Promise<{nameCount: number, imageCount: number, needConfirm: boolean, reason: string}>}
 */
async function checkPlantExists(db, plantName, imageUrl) {
  const nameCountRes = await db.collection('my_plants').where({
    name: db.RegExp({ regexp: plantName, options: 'i' })
  }).count()
  const nameCount = nameCountRes.total

  let imageCount = 0
  if (imageUrl) {
    const imageCountRes = await db.collection('my_plants').where({ imageUrl }).count()
    imageCount = imageCountRes.total
  }

  const maxCount = nameCount > imageCount ? nameCount : imageCount
  let needConfirm = false
  let reason = ''

  if (nameCount > 0) {
    needConfirm = true
    reason = `您的花园中已有 ${nameCount} 盆「${plantName}」`
  }

  if (imageCount > 0 && nameCount === 0) {
    needConfirm = true
    reason = `您的花园中已有 ${imageCount} 盆相同图片的植物`
  }

  return { nameCount, imageCount, maxCount, needConfirm, reason }
}

/**
 * 获取中文序数词
 */
function getOrdinal(num) {
  const ordinals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return ordinals[num - 1] || num.toString()
}

module.exports = {
  getMyPlants,
  getMyPlantsWithCache,
  addPlant,
  removePlant,
  recordWatering,
  recordFertilizing,
  updatePlant,
  updatePlantImage,
  uploadPlantImage,
  plantIdentify,
  checkPlantExists,
  getOrdinal
};