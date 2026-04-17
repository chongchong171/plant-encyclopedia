/**
 * 云函数：更新用户统计数据
 * 
 * 功能：当用户添加/删除植物、浇水、施肥时，更新统计数据
 * 
 * 入参：
 * {
 *   action: 'add_plant' | 'remove_plant' | 'water' | 'fertilize' | 'plant_dead',
 *   plantId: '植物ID' (可选)
 * }
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 检查 openid 是否有效
  if (!openid) {
    console.error('获取用户 openid 失败')
    return {
      success: false,
      error: '获取用户信息失败，请重新登录'
    }
  }
  
  const { action, plantId } = event
  
  console.log('更新用户统计:', { action, openid })
  
  try {
    // 获取用户当前所有植物
    const plantsRes = await db.collection('my_plants')
      .where({
        _openid: openid
      })
      .get()
    
    const plants = plantsRes.data
    console.log('用户植物数量:', plants.length)
    
    // 计算统计数据
    const plantCount = plants.length
    const aliveCount = plants.filter(p => p.status !== 'dead').length
    const deadCount = plants.filter(p => p.status === 'dead').length
    const survivalRate = plantCount > 0 ? Math.round((aliveCount / plantCount) * 100) : 0
    
    // 计算累计养护天数（取所有植物养护天数的总和）
    const totalCareDays = plants.reduce((sum, p) => {
      if (p.careLog && p.careLog.length > 0) {
        return sum + p.careLog.length
      }
      return sum
    }, 0)
    
    // 计算浇水次数
    const wateringCount = plants.reduce((sum, p) => {
      if (p.careLog) {
        return sum + p.careLog.filter(log => log.action === 'water').length
      }
      return sum
    }, 0)
    
    // 计算施肥次数
    const fertilizingCount = plants.reduce((sum, p) => {
      if (p.careLog) {
        return sum + p.careLog.filter(log => log.action === 'fertilize').length
      }
      return sum
    }, 0)
    
    // 找出养护时间最长的植物作为代表植物
    let featuredPlant = null
    if (plants.length > 0) {
      const sortedPlants = [...plants].sort((a, b) => {
        const daysA = a.careLog ? a.careLog.length : 0
        const daysB = b.careLog ? b.careLog.length : 0
        return daysB - daysA
      })
      const topPlant = sortedPlants[0]
      featuredPlant = {
        name: topPlant.name,
        imageUrl: topPlant.imageUrl,
        careDays: topPlant.careLog ? topPlant.careLog.length : 0
      }
    }
    
    // 准备统计数据
    const statsData = {
      _openid: openid,
      stats: {
        plantCount,
        aliveCount,
        deadCount,
        survivalRate,
        totalCareDays,
        wateringCount,
        fertilizingCount
      },
      featuredPlant,
      updatedAt: new Date().toISOString()
    }
    
    console.log('统计数据:', statsData.stats)
    
    // 检查是否已存在记录
    const existingRes = await db.collection('user_stats')
      .where({
        _openid: openid
      })
      .limit(1)
      .get()
    
    if (existingRes.data.length > 0) {
      // 更新现有记录
      await db.collection('user_stats')
        .doc(existingRes.data[0]._id)
        .update({
          data: statsData
        })
      console.log('更新统计记录成功')
    } else {
      // 创建新记录
      statsData.createdAt = new Date().toISOString()
      await db.collection('user_stats').add({
        data: statsData
      })
      console.log('创建统计记录成功')
    }
    
    return {
      success: true,
      stats: statsData.stats
    }
    
  } catch (err) {
    console.error('更新用户统计失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}