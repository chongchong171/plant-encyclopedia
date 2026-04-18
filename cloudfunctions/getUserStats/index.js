/**
 * 云函数：获取用户统计数据
 * 
 * 返回当前用户的植物统计数据
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { targetOpenId } = event  // 可选，获取指定用户的统计
  
  const openId = targetOpenId || wxContext.OPENID
  
  try {
    const res = await db.collection('user_stats')
      .where({
        _openid: openId
      })
      .limit(1)
      .get()
    
    if (res.data.length > 0) {
      return {
        success: true,
        stats: res.data[0]
      }
    } else {
      return {
        success: true,
        stats: null,
        message: '用户暂无统计数据'
      }
    }
    
  } catch (err) {
    console.error('获取用户统计失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}