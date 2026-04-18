/**
 * 云函数：获取我的花园植物列表
 * 
 * 返回：
 * {
 *   success: true,
 *   plants: [...]
 * }
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  console.log('getMyPlants 被调用')
  console.log('OPENID:', wxContext.OPENID)
  console.log('APPID:', wxContext.APPID)
  
  // 检查用户是否登录
  if (!wxContext.OPENID) {
    console.error('用户未登录')
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: '用户未登录',
      plants: []
    }
  }
  
  try {
    // 查询当前用户的所有植物
    const res = await db.collection('my_plants')
      .where({
        _openid: wxContext.OPENID
      })
      .orderBy('careInfo.nextWatering', 'asc')
      .get()
    
    console.log('查询成功，找到', res.data.length, '盆植物')
    
    return {
      success: true,
      plants: res.data,
      count: res.data.length
    }
    
  } catch (err) {
    console.error('查询植物失败:', err)
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: err.message,
      plants: []
    }
  }
}