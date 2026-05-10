/**
 * 云函数：修复已有植物的 imageUrl
 * 
 * 用途：一次性运行，批量更新数据库中 imageUrl 为空的植物记录
 * 
 * 使用方法：
 * 1. 在微信开发者工具中右键此文件夹 → "上传并部署：云端安装依赖"
 * 2. 在云开发控制台 → 云函数 → fixPlantImages → 测试
 * 3. 查看日志确认修复结果
 */

const cloud = require('wx-server-sdk')
const fetch = require('node-fetch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 中文名 → 英文名映射（Wikipedia 搜索用）
const PLANT_NAME_MAP = {
  '向日葵': 'Sunflower',
  '玫瑰': 'Rose',
  '百合': 'Lily',
  '菊花': 'Chrysanthemum',
  '牡丹': 'Paeonia suffruticosa',
  '兰花': 'Orchid',
  '郁金香': 'Tulip',
  '荷花': 'Nelumbo nucifera',
  '月季': 'Rosa chinensis',
  '茉莉': 'Jasmine',
  '栀子花': 'Gardenia jasminoides',
  '桂花': 'Osmanthus fragrans',
  '仙人掌': 'Cactus',
  '芦荟': 'Aloe vera',
  '多肉植物': 'Succulent plant',
  '发财树': 'Pachira aquatica',
  '绿萝': 'Epipremnum aureum',
  '吊兰': 'Chlorophytum comosum',
  '虎尾兰': 'Sansevieria trifasciata',
  '龟背竹': 'Monstera deliciosa',
  '君子兰': 'Clivia miniata',
  '蝴蝶兰': 'Phalaenopsis',
  '文竹': 'Asparagus setaceus',
  '富贵竹': 'Dracaena sanderiana'
}

/**
 * 从 Wikipedia 获取植物图片
 */
async function fetchWithTimeout(url, timeout = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPlantImage(plantName) {
  // 策略 1：如果有英文名映射，优先用英文名搜索
  const englishName = PLANT_NAME_MAP[plantName]
  if (englishName) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(englishName)}`
      const res = await fetchWithTimeout(url)
      if (res.ok) {
        const data = await res.json()
        if (data.thumbnail?.source) {
          return data.thumbnail.source.replace(/\/\d+px-/, '/400px-')
        }
      }
    } catch (e) {
    }
  }

  // 策略 2：尝试中文名搜索
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`
    const res = await fetchWithTimeout(url)
    if (res.ok) {
      const data = await res.json()
      if (data.thumbnail?.source) {
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-')
      }
    }
  } catch (e) {
  }
  
  return null
}

exports.main = async (event, context) => {
  
  try {
    // 查询所有 imageUrl 为空或 null 的植物
    const plantsRes = await db.collection('my_plants')
      .where({
        imageUrl: db.command.or([
          db.command.eq(''),
          db.command.eq(null),
          db.command.exists(false)
        ])
      })
      .get()
    
    const plants = plantsRes.data
    
    let successCount = 0
    let failCount = 0
    
    // 逐个修复
    for (const plant of plants) {
      
      // 从 Wikipedia 获取图片
      const imageUrl = await fetchPlantImage(plant.name)
      
      if (imageUrl) {
        // 更新数据库
        await db.collection('my_plants').doc(plant._id).update({
          data: { imageUrl }
        })
        successCount++
      } else {
        failCount++
      }
      
      // 避免请求过快，等待 500ms
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return {
      success: true,
      total: plants.length,
      successCount,
      failCount,
      message: `修复完成：成功 ${successCount} 株，失败 ${failCount} 株`
    }
    
  } catch (e) {
    console.error('[fixPlantImages] 修复失败:', e)
    return {
      success: false,
      error: e.message
    }
  }
}
