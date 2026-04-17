/**
 * 云函数：analytics_track
 * 
 * 功能：记录用户行为数据，用于后续数据分析
 * 
 * 入参：
 * {
 *   event: "user_visit" | "session_end" | "identify_plant" | "get_care_guide" | "diagnose_plant" | "add_plant" | "favorite_plant",
 *   openId: "用户 openId",
 *   data: { ... }  // 额外数据
 * }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = event.openId || wxContext.OPENID;
  
  if (!openId) {
    console.error('[analytics] openId 为空');
    return { success: false, error: 'openId 为空' };
  }
  
  const { event: eventType, data } = event;
  const today = new Date().toISOString().split('T')[0];  // "2026-04-13"
  const now = new Date().toISOString();
  
  console.log(`[analytics] 收到事件：${eventType}, openId: ${openId}, date: ${today}`);
  
  try {
    // 1. 更新用户档案 (analytics_users)
    await updateUserProfile(openId, eventType, data, today, now);
    
    // 2. 更新每日汇总 (analytics_daily)
    await updateDailyStats(eventType, openId, data, today, now);
    
    // 3. 记录事件日志 (analytics_events)
    await logEvent(openId, eventType, data, now);
    
    return { success: true };
  } catch (err) {
    console.error('[analytics] 处理失败:', err);
    return { success: false, error: err.message };
  }
};

/**
 * 更新用户档案
 */
async function updateUserProfile(openId, eventType, data, today, now) {
  const userRef = db.collection('analytics_users').doc(`user_${openId}`);
  const userDoc = await userRef.get();
  
  if (!userDoc.data) {
    // 新用户，创建档案
    console.log(`[analytics] 新用户：${openId}`);
    await userRef.set({
      openId,
      registerDate: today,
      isVip: false,
      vipLevel: 0,
      firstVisit: now,
      lastVisit: now,
      totalVisits: eventType === 'user_visit' ? 1 : 0,
      visitDates: [today],
      actions: {
        identifyPlant: 0,
        getCareGuide: 0,
        diagnosePlant: 0,
        addPlant: 0,
        favoritePlant: 0
      },
      totalSessions: 0,
      avgSession: 0
    });
  } else {
    // 老用户，更新档案
    const updateData = {
      lastVisit: now
    };
    
    if (eventType === 'user_visit') {
      // 检查是否是新的一天
      const lastVisitDate = userDoc.data.lastVisit?.split('T')[0];
      if (lastVisitDate !== today) {
        updateData.totalVisits = _.inc(1);
        updateData.visitDates = _.push(today);
      }
    }
    
    // 更新行为计数
    const actionMap = {
      'identify_plant': 'identifyPlant',
      'get_care_guide': 'getCareGuide',
      'diagnose_plant': 'diagnosePlant',
      'add_plant': 'addPlant',
      'favorite_plant': 'favoritePlant'
    };
    
    if (actionMap[eventType]) {
      updateData[`actions.${actionMap[eventType]}`] = _.inc(1);
    }
    
    // 更新会话时长
    if (eventType === 'session_end' && data?.duration) {
      const totalSessions = (userDoc.data.totalSessions || 0) + data.duration;
      const totalVisits = userDoc.data.totalVisits || 1;
      updateData.totalSessions = totalSessions;
      updateData.avgSession = Math.round(totalSessions / totalVisits);
    }
    
    await userRef.update(updateData);
  }
}

/**
 * 更新每日汇总
 */
async function updateDailyStats(eventType, openId, data, today, now) {
  const dailyRef = db.collection('analytics_daily').doc(today);
  const dailyDoc = await dailyRef.get();
  
  const updateData = {};
  
  // 用户统计
  if (eventType === 'user_visit') {
    const isNewUser = !dailyDoc.data || !dailyDoc.data.visitOpenIds?.includes(openId);
    
    if (isNewUser) {
      updateData.newUsers = _.inc(1);
      updateData.visitOpenIds = _.push(openId);
    }
    
    updateData.activeUsers = _.inc(1);
    if (!isNewUser) {
      updateData.returningUsers = _.inc(1);
    }
  }
  
  // API 调用统计
  const apiMap = {
    'identify_plant': 'identifyPlant',
    'get_care_guide': 'getCareGuide',
    'diagnose_plant': 'diagnosePlant'
  };
  
  if (apiMap[eventType]) {
    updateData[`apiCalls.${apiMap[eventType]}`] = _.inc(1);
  }
  
  // 转化漏斗
  const funnelMap = {
    'user_visit': 'visit',
    'identify_plant': 'identify',
    'add_plant': 'addPlant',
    'favorite_plant': 'favorite'
  };
  
  if (funnelMap[eventType]) {
    updateData[`funnel.${funnelMap[eventType]}`] = _.inc(1);
  }
  
  // 会话时长
  if (eventType === 'session_end' && data?.duration) {
    updateData.totalSessions = _.inc(data.duration);
  }
  
  if (Object.keys(updateData).length > 0) {
    if (!dailyDoc.data) {
      // 创建新记录
      await dailyRef.set({
        date: today,
        newUsers: 0,
        activeUsers: 0,
        returningUsers: 0,
        apiCalls: {
          identifyPlant: 0,
          getCareGuide: 0,
          diagnosePlant: 0
        },
        funnel: {
          visit: 0,
          identify: 0,
          addPlant: 0,
          favorite: 0
        },
        totalSessions: 0,
        avgSession: 0,
        visitOpenIds: [],
        ...updateData
      });
    } else {
      await dailyRef.update(updateData);
    }
  }
}

/**
 * 记录事件日志
 */
async function logEvent(openId, eventType, data, now) {
  await db.collection('analytics_events').add({
    date: now.split('T')[0],
    openId,
    event: eventType,
    timestamp: now,
    duration: data?.duration || 0,
    success: data?.success !== false,
    extra: data || {}
  });
}
