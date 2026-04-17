/**
 * 云函数：updateUserInfo
 * 
 * 功能：更新用户信息（昵称、头像等）
 * 
 * 入参：
 * {
 *   nickName: '用户昵称',
 *   avatarUrl: '头像 URL',
 *   gender: 0|1|2,  // 0=未知，1=男，2=女
 *   country: '国家',
 *   province: '省份',
 *   city: '城市'
 * }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  if (!openId) {
    return { success: false, error: '获取用户信息失败' };
  }
  
  const { nickName, avatarUrl, gender, country, province, city } = event;
  
  console.log('[updateUserInfo] 更新用户信息:', { openId, nickName });
  
  try {
    // 检查 user_stats 表是否已有记录
    const statsRes = await db.collection('user_stats')
      .where({ _openid: openId })
      .limit(1)
      .get();
    
    const updateData = {
      nickName: nickName || '植物达人',
      avatarUrl: avatarUrl || '',
      updatedAt: new Date().toISOString()
    };
    
    if (gender !== undefined) updateData.gender = gender;
    if (country) updateData.country = country;
    if (province) updateData.province = province;
    if (city) updateData.city = city;
    
    if (statsRes.data.length > 0) {
      // 已有记录，更新
      await db.collection('user_stats')
        .where({ _openid: openId })
        .update(updateData);
      
      console.log('[updateUserInfo] 更新成功');
    } else {
      // 新用户，创建记录
      await db.collection('user_stats').add({
        data: {
          _openid: openId,
          ...updateData,
          stats: {
            plantCount: 0,
            aliveCount: 0,
            deadCount: 0,
            survivalRate: 0,
            totalCareDays: 0,
            wateringCount: 0,
            fertilizingCount: 0
          },
          featuredPlant: null,
          createdAt: new Date().toISOString()
        }
      });
      
      console.log('[updateUserInfo] 创建成功');
    }
    
    // 同时更新 analytics_users（用户档案）
    const analyticsRef = db.collection('analytics_users').doc(`user_${openId}`);
    const analyticsDoc = await analyticsRef.get();
    
    if (analyticsDoc.data) {
      await analyticsRef.update({
        nickName,
        avatarUrl,
        gender,
        country,
        province,
        city
      });
    }
    
    return { success: true };
  } catch (err) {
    console.error('[updateUserInfo] 失败:', err);
    return { success: false, error: err.message };
  }
};
