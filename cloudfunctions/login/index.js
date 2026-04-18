/**
 * 云函数：login
 * 
 * 功能：用户登录，获取 openid 并检查是否已授权用户信息
 * 
 * 返回：
 * {
 *   success: true,
 *   openid: '用户 openid',
 *   hasUserInfo: true/false,  // 是否已授权用户信息（昵称、头像）
 *   userInfo: { nickName, avatarUrl } // 如果已授权
 * }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  console.log('[login] 用户登录:', openId);
  
  try {
    // 查询 user_stats 表，检查是否已有用户信息
    const statsRes = await db.collection('user_stats')
      .where({ _openid: openId })
      .limit(1)
      .get();
    
    let hasUserInfo = false;
    let userInfo = null;
    
    if (statsRes.data.length > 0) {
      const userStats = statsRes.data[0];
      // 检查是否有昵称和头像
      if (userStats.nickName && userStats.avatarUrl) {
        hasUserInfo = true;
        userInfo = {
          nickName: userStats.nickName,
          avatarUrl: userStats.avatarUrl,
          gender: userStats.gender,
          country: userStats.country,
          province: userStats.province,
          city: userStats.city
        };
      }
    }
    
    return {
      success: true,
      openid: openId,
      appid: wxContext.APPID,
      hasUserInfo,
      userInfo
    };
  } catch (err) {
    console.error('[login] 登录失败:', err);
    return {
      success: false,
      error: err.message,
      openid: openId
    };
  }
};