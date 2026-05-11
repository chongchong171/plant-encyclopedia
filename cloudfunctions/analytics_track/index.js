/**
 * 云函数：analytics_track
 * 简化版本 - 直接写入数据库
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  console.log('[analytics] 开始处理, openId:', openId);

  if (!openId) {
    return { success: false, error: 'openId 为空' };
  }

  // 解析事件
  let events = [];
  if (event.events && Array.isArray(event.events)) {
    events = event.events;
  } else if (event.event) {
    events = [{ event: event.event, data: event.data }];
  } else {
    return { success: false, error: '参数格式错误' };
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const results = {
    user: null,
    daily: null,
    event: null
  };

  // 处理每个事件
  for (const evt of events) {
    const eventType = evt.event;
    const data = evt.data || {};

    console.log('[analytics] 处理事件:', eventType);

    // 1. 写入用户档案
    try {
      const userId = `user_${openId}`;
      const userRef = db.collection('analytics_users').doc(userId);

      // 尝试获取用户
      let userExists = false;
      try {
        const res = await userRef.get();
        userExists = !!res.data;
      } catch (e) {
        userExists = false;
      }

      if (!userExists) {
        // 创建新用户
        await userRef.set({
          data: {
            openId: openId,
            registerDate: today,
            firstVisit: now,
            lastVisit: now,
            totalVisits: 1,
            visitDates: [today],
            actions: {
              identifyPlant: 0,
              getCareGuide: 0,
              diagnosePlant: 0,
              addPlant: 0,
              favoritePlant: 0
            }
          }
        });
        console.log('[analytics] 用户创建成功');
        results.user = 'created';
      } else {
        // 更新用户
        await userRef.update({
          data: {
            lastVisit: now
          }
        });
        console.log('[analytics] 用户更新成功');
        results.user = 'updated';
      }
    } catch (err) {
      console.error('[analytics] 用户操作失败:', err);
      results.user = 'error: ' + err.message;
    }

    // 2. 写入每日统计
    try {
      const dailyRef = db.collection('analytics_daily').doc(today);

      // 尝试获取每日记录
      let dailyExists = false;
      try {
        const res = await dailyRef.get();
        dailyExists = !!res.data;
      } catch (e) {
        dailyExists = false;
      }

      if (!dailyExists) {
        // 创建每日记录
        await dailyRef.set({
          data: {
            date: today,
            newUsers: 1,
            activeUsers: 1,
            returningUsers: 0,
            visitOpenIds: [openId],
            apiCalls: {
              identifyPlant: 0,
              getCareGuide: 0,
              diagnosePlant: 0
            },
            funnel: {
              visit: 1,
              identify: 0,
              addPlant: 0,
              favorite: 0
            }
          }
        });
        console.log('[analytics] 每日记录创建成功');
        results.daily = 'created';
      } else {
        // 更新每日记录
        await dailyRef.update({
          data: {
            activeUsers: db.command.inc(1)
          }
        });
        console.log('[analytics] 每日记录更新成功');
        results.daily = 'updated';
      }
    } catch (err) {
      console.error('[analytics] 每日统计操作失败:', err);
      results.daily = 'error: ' + err.message;
    }

    // 3. 写入事件日志
    try {
      await db.collection('analytics_events').add({
        data: {
          date: today,
          openId: openId,
          event: eventType,
          timestamp: now,
          extra: data
        }
      });
      console.log('[analytics] 事件日志写入成功');
      results.event = 'created';
    } catch (err) {
      console.error('[analytics] 事件日志写入失败:', err);
      results.event = 'error: ' + err.message;
    }
  }

  return {
    success: true,
    processed: events.length,
    results: results
  };
};
