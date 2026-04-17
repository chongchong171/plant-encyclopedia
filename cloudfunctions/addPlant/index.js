/**
 * 云函数：添加植物到我的花园
 * 
 * 入参：
 * {
 *   plantData: {
 *     name: '绿萝',
 *     scientificName: 'Epipremnum aureum',
 *     imageUrl: '...',
 *     identifyResult: {...}
 *   }
 * }
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { plantData } = event
  
  try {
    // 第一版免费版：移除植物数量限制，用户可以无限添加
    // 不再检查同种植物数量限制
    // 第二版更新时恢复以下代码：
    // const countRes = await db.collection('my_plants')
    //   .where({ _openid: wxContext.OPENID })
    //   .count()
    // const plantCount = countRes.total
    // if (plantCount >= 5) {
    //   return { success: false, error: 'PLANT_LIMIT_EXCEEDED', message: '花园已满（最多 5 盆）', currentCount: plantCount, needVip: true }
    // }
    
    // 判断植物类型，计算浇水周期
    const wateringDays = calculateWateringDays(plantData.scientificName)
    
    // 计算下次浇水日期
    const today = new Date()
    const nextWatering = addDays(today, wateringDays)
    
    // 创建植物档案
    const newPlant = {
      _openid: wxContext.OPENID,
      name: plantData.name,
      scientificName: plantData.scientificName,
      imageUrl: plantData.imageUrl || '',
      location: '',  // 用户后续可设置
      city: '',      // 用户授权后设置
      addTime: today.toISOString(),
      identifyResult: plantData.identifyResult || {},
      
      // 养护信息
      careInfo: {
        wateringDays: wateringDays,
        lastWatered: today.toISOString().split('T')[0],  // 添加时算作浇过水
        nextWatering: nextWatering,
        lastFertilized: '',
        fertilizingDays: 30,  // 默认 30 天施肥
        nextFertilizing: addDays(today, 30)  // 下次施肥日期
      },
      
      // 养护日志
      careLog: [{
        date: today.toISOString().split('T')[0],
        action: 'add',
        notes: '添加到我的花园'
      }]
    }
    
    // 写入数据库
    const result = await db.collection('my_plants').add({
      data: newPlant
    })
    
    // 更新用户统计数据（同步执行，确保成功）
    try {
      const statsRes = await cloud.callFunction({
        name: 'updateUserStats',
        data: { action: 'add_plant' }
      })
      console.log('更新统计结果:', statsRes.result)
    } catch (err) {
      console.error('更新统计数据失败:', err)
      // 统计失败不影响添加植物，但记录错误
    }
    
    return {
      success: true,
      plantId: result._id,
      message: '添加成功',
      wateringDays: wateringDays,
      nextWatering: nextWatering
    }
    
  } catch (err) {
    console.error('添加植物失败:', err)
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: err.message
    }
  }
}

/**
 * 根据植物学名判断浇水周期
 */
function calculateWateringDays(scientificName) {
  // 多肉植物
  const succulents = ['Crassulaceae', 'Sedum', 'Echeveria', 'Aloe', 'Haworthia', 'Cactaceae']
  // 热带植物
  const tropicals = ['Epipremnum', 'Monstera', 'Philodendron', 'Pothos', 'Dieffenbachia']
  // 开花植物
  const flowering = ['Rosa', 'Jasminum', 'Orchidaceae', 'Hibiscus']
  
  const name = scientificName?.toLowerCase() || ''
  
  // 多肉：10-14 天
  if (succulents.some(s => name.includes(s.toLowerCase()))) {
    return 14
  }
  
  // 热带植物：5-7 天
  if (tropicals.some(s => name.includes(s.toLowerCase()))) {
    return 5
  }
  
  // 开花植物：5-7 天
  if (flowering.some(s => name.includes(s.toLowerCase()))) {
    return 5
  }
  
  // 默认：7 天
  return 7
}

/**
 * 添加天数
 */
function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split('T')[0]
}
