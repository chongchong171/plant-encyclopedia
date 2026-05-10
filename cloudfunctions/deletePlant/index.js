/**
 * 云函数：删除植物
 * 
 * 参数：
 * {
 *   plantId: '植物 ID'
 * }
 * 
 * 返回：
 * {
 *   success: true/false,
 *   error: '错误信息'
 * }
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { plantId } = event
  
  const maskedOpenId = wxContext.OPENID ? wxContext.OPENID.substring(0, 4) + '****' + wxContext.OPENID.substring(wxContext.OPENID.length - 4) : '';
  
  // 检查用户是否登录
  if (!wxContext.OPENID) {
    console.error('用户未登录')
    return {
      success: false,
      error: 'PERMISSION_DENIED',
      message: '用户未登录'
    }
  }
  
  // 检查 plantId 是否存在
  if (!plantId) {
    console.error('plantId 为空')
    return {
      success: false,
      error: 'INVALID_PARAM',
      message: '植物 ID 不能为空'
    }
  }
  
  try {
    // 删除植物（同时验证 openid，确保只能删除自己的植物）
    const res = await db.collection('my_plants')
      .where({
        _id: plantId,
        _openid: wxContext.OPENID
      })
      .remove()
    
    
    return {
      success: true,
      removed: res.stats.removed
    }
    
  } catch (err) {
    console.error('删除植物失败:', err)
    return {
      success: false,
      error: 'DATABASE_ERROR',
      message: err.message
    }
  }
}
