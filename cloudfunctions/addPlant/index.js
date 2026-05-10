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
    const wateringDays = calculateWateringDays(plantData)

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
 * 根据植物信息判断浇水周期
 * 同时检查中文名、拉丁学名和科属信息
 */
function calculateWateringDays(plantData) {
  const identifyResult = plantData.identifyResult || {}

  // 收集所有可能的名称来源
  const names = [
    plantData.scientificName,           // 中文学名
    identifyResult.scientificName,      // 识别结果中文学名
    identifyResult.scientificNameLatin, // 拉丁学名
    identifyResult.family,              // 科属
    plantData.name                      // 植物名称
  ].filter(Boolean).map(n => n.toLowerCase())

  // 多肉/仙人掌类：14天
  const succulents = [
    'cactaceae', 'crassulaceae', 'sedum', 'echeveria', 'aloe',
    'haworthia', 'cactus', 'succulent', '多肉', '仙人掌', '芦荟',
    '石莲花', '景天', '虎尾兰', '龙舌兰'
  ]
  if (names.some(name => succulents.some(keyword => name.includes(keyword)))) {
    return 14
  }

  // 热带植物：5天
  const tropicals = [
    'epipremnum', 'monstera', 'philodendron', 'pothos', 'dieffenbachia',
    '绿萝', '龟背竹', '喜林芋', '万年青', '竹芋', '蕨类', '吊兰'
  ]
  if (names.some(name => tropicals.some(keyword => name.includes(keyword)))) {
    return 5
  }

  // 开花植物：5天
  const flowering = [
    'rosa', 'jasminum', 'orchidaceae', 'hibiscus', '百合', '玫瑰',
    '月季', '茉莉', '兰花', '杜鹃', '栀子', '绣球', '茶花'
  ]
  if (names.some(name => flowering.some(keyword => name.includes(keyword)))) {
    return 5
  }

  // 水生/湿生植物：3天
  const aquatic = ['荷花', '睡莲', '水培', '铜钱草', '菖蒲']
  if (names.some(name => aquatic.some(keyword => name.includes(keyword)))) {
    return 3
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
