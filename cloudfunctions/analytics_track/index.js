/**
 * 云函数：analytics_track
 * 统计埋点 - 写入用户档案、每日统计、事件日志
 *
 * 支持的事件类型：
 * - user_visit: 访问小程序
 * - identify_plant: 拍照识别
 * - add_plant: 添加植物
 * - favorite_plant: 收藏植物
 * - get_care_guide: 查看养护指南
 * - diagnose_plant: 植物诊断
 * - session_end: 会话结束
 *
 * 统计规则：
 * - 今日访问次数：不去重，每次打开都计数
 * - 今日活跃用户：去重，同一用户多次打开只算 1 人
 * - 今日新客访问次数：不去重，新客每次打开都计数
 * - 今日新客访问人数：去重，新客打开过的人数
 * - 今日老客访问次数：不去重，老客每次打开都计数
 * - 今日老客访问人数：去重，老客打开过的人数
 * - 平均停留：累计会话时长 / 会话数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 事件类型到统计字段的映射
const EVENT_FIELD_MAP = {
  'user_visit': { field: 'funnel.visit', userAction: null },
  'identify_plant': { field: 'funnel.identify', userAction: 'identifyPlant' },
  'add_plant': { field: 'funnel.addPlant', userAction: 'addPlant' },
  'favorite_plant': { field: 'funnel.favorite', userAction: 'favoritePlant' },
  'get_care_guide': { field: 'apiCalls.getCareGuide', userAction: 'getCareGuide' },
  'diagnose_plant': { field: 'apiCalls.diagnosePlant', userAction: 'diagnosePlant' }
};

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  // 支持传入 openId（云函数调用云函数时需要传入）
  // 优先使用传入的 openId，否则使用 wxContext.OPENID
  const openId = event.openId || wxContext.OPENID;

  console.log('[analytics] 开始处理, openId:', openId, '来源:', event.openId ? '传入' : 'wxContext');

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
    event: null,
    isNewUser: false
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
      let userData = null;
      try {
        const res = await userRef.get();
        userExists = !!res.data;
        userData = res.data;
      } catch (e) {
        userExists = false;
      }

      // 判断是否为"今天新注册的用户"（新客定义：registerDate 是今天）
      const isTodayNewUser = userExists && userData?.registerDate === today;

      if (!userExists) {
        // 创建新用户（首次访问小程序）
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
        console.log('[analytics] 用户创建成功（新客）');
        results.user = 'created';
        results.isNewUser = true;  // 今天新注册的用户
        results.isTodayFirstVisit = true;  // 今天首次访问
      } else {
        // 更新用户：更新最后访问时间 + 增加对应行为计数
        const updateData = {
          lastVisit: now,
          totalVisits: _.inc(1)
        };

        // 判断今天是否首次访问（visitDates 中不包含今天）
        const existingDates = userData?.visitDates || [];
        const isTodayFirstVisit = !existingDates.includes(today);
        results.isTodayFirstVisit = isTodayFirstVisit;

        // 如果今天还没访问过，添加访问日期
        if (isTodayFirstVisit) {
          updateData.visitDates = _.push(today);
        }

        // 新客定义：registerDate 是今天（今天新注册的用户）
        results.isNewUser = isTodayNewUser;

        // 根据事件类型更新用户行为计数
        const eventMapping = EVENT_FIELD_MAP[eventType];
        if (eventMapping?.userAction) {
          updateData[`actions.${eventMapping.userAction}`] = _.inc(1);
        }

        await userRef.update({ data: updateData });
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
      let dailyData = null;
      try {
        const res = await dailyRef.get();
        dailyExists = !!res.data;
        dailyData = res.data;
      } catch (e) {
        dailyExists = false;
      }

      if (!dailyExists) {
        // 创建每日记录（首次访问时创建）
        const initialData = {
          date: today,
          // 访问统计
          totalVisits: 1,              // 今日总访问次数（不去重）
          activeUsers: 1,              // 今日活跃用户数（去重）
          newUserVisitCount: results.isNewUser ? 1 : 0,  // 今日新客访问次数（不去重）
          newUserVisitUsers: results.isNewUser ? 1 : 0,  // 今日新客访问人数（去重）
          oldUserVisitCount: results.isNewUser ? 0 : 1,  // 今日老客访问次数（不去重）
          oldUserVisitUsers: results.isNewUser ? 0 : 1,  // 今日老客访问人数（去重）
          newUsers: results.isNewUser ? 1 : 0,           // 今日新增用户数
          returningUsers: 0,
          visitOpenIds: [openId],      // 今日访问过的用户列表（用于去重）
          newUserOpenIds: results.isNewUser ? [openId] : [],  // 今日新客列表（去重用）
          oldUserOpenIds: results.isNewUser ? [] : [openId],  // 今日老客列表（去重用）
          // 会话统计
          totalSessionTime: 0,         // 累计会话时长（秒）
          sessionCount: 0,             // 会话数
          // API 调用统计
          apiCalls: {
            identifyPlant: 0,
            getCareGuide: 0,
            diagnosePlant: 0
          },
          // 漏斗统计
          funnel: {
            visit: eventType === 'user_visit' ? 1 : 0,
            identify: 0,
            addPlant: 0,
            favorite: 0
          }
        };

        // 如果是其他事件，也要计入对应的统计
        const eventMapping = EVENT_FIELD_MAP[eventType];
        if (eventMapping) {
          if (eventMapping.field.startsWith('funnel.')) {
            const key = eventMapping.field.split('.')[1];
            initialData.funnel[key] = 1;
          } else if (eventMapping.field.startsWith('apiCalls.')) {
            const key = eventMapping.field.split('.')[1];
            initialData.apiCalls[key] = 1;
          }
        }

        await dailyRef.set({ data: initialData });
        console.log('[analytics] 每日记录创建成功');
        results.daily = 'created';
      } else {
        // 更新每日记录：根据事件类型更新对应字段
        const updateData = {};

        // 访问事件：更新访问统计
        if (eventType === 'user_visit') {
          // 今日总访问次数 +1（不去重）
          updateData.totalVisits = _.inc(1);

          // 今日活跃用户数（去重）
          const existingOpenIds = dailyData?.visitOpenIds || [];
          const isFirstVisitToday = !existingOpenIds.includes(openId);

          if (isFirstVisitToday) {
            // 当天首次访问：增加活跃用户数
            updateData.activeUsers = _.inc(1);
            updateData.visitOpenIds = _.push(openId);

            // 根据用户是否为"今天新注册"来区分新客/老客人数（只在当天首次访问时记录人数）
            if (results.isNewUser) {
              // 新客（今天新注册的用户）首次访问
              updateData.newUserVisitCount = _.inc(1);
              updateData.newUserVisitUsers = _.inc(1);
              updateData.newUserOpenIds = _.push(openId);
              updateData.newUsers = _.inc(1);
            } else {
              // 老客（之前注册的用户）首次访问
              updateData.oldUserVisitCount = _.inc(1);
              updateData.oldUserVisitUsers = _.inc(1);
              updateData.oldUserOpenIds = _.push(openId);
            }
          } else {
            // 当天非首次访问：只增加访问次数，不增加人数
            // 访问次数仍然按新客/老客区分（不去重）
            if (results.isNewUser) {
              updateData.newUserVisitCount = _.inc(1);
            } else {
              updateData.oldUserVisitCount = _.inc(1);
            }
          }
        }

        // 根据事件类型更新对应的统计字段
        const eventMapping = EVENT_FIELD_MAP[eventType];
        if (eventMapping) {
          if (eventMapping.field.startsWith('funnel.')) {
            const key = eventMapping.field.split('.')[1];
            updateData[`funnel.${key}`] = _.inc(1);
          } else if (eventMapping.field.startsWith('apiCalls.')) {
            const key = eventMapping.field.split('.')[1];
            updateData[`apiCalls.${key}`] = _.inc(1);
          }
        }

        // 会话结束时累计会话时长（过滤异常值：超过 24 小时的视为脏数据）
        if (eventType === 'session_end' && data.duration) {
          const durationSeconds = Math.floor(data.duration / 1000);
          // 会话时长超过 24 小时（86400 秒）视为异常，不记录
          if (durationSeconds > 0 && durationSeconds < 86400) {
            updateData.totalSessionTime = _.inc(durationSeconds);
            updateData.sessionCount = _.inc(1);
          }
        }

        if (Object.keys(updateData).length > 0) {
          await dailyRef.update({ data: updateData });
          console.log('[analytics] 每日记录更新成功:', JSON.stringify(updateData));
          results.daily = 'updated';
        } else {
          results.daily = 'skipped';
        }
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
          isNewUser: results.isNewUser,
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