/**
 * 云函数：getAnalytics
 *
 * 职责：
 * 1. 校验管理员身份
 * 2. 读取 analytics_daily 最近 N 天数据
 * 3. 读取 analytics_users 聚合统计
 * 4. 读取 analytics_events 最近 20 条
 * 5. 返回结构化数据给前端
 *
 * 入参：{ type: 'overview' | 'trend' | 'funnel' | 'events' | 'all', days: 7 }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 默认管理员（兜底）
const DEFAULT_ADMIN_OPENIDS = ['oP55x3SPl1DkRUyTnV8sYpb7G2p4'];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  // 1. 校验管理员身份
  const isAdmin = await checkAdmin(openId);
  if (!isAdmin) {
    return { success: false, error: '无权访问' };
  }

  const { type = 'overview', days = 7 } = event;

  try {
    let result = { success: true };

    switch (type) {
      case 'overview':
        result.overview = await getOverview();
        result.funnel = await getFunnel();
        result.topFeatures = await getTopFeatures();
        break;
      case 'trend':
        result.trend = await getTrend(days);
        break;
      case 'events':
        result.recentEvents = await getRecentEvents(20);
        break;
      case 'all':
      default:
        result.overview = await getOverview();
        result.trend = await getTrend(days);
        result.funnel = await getFunnel();
        result.topFeatures = await getTopFeatures();
        result.recentEvents = await getRecentEvents(20);
        result.identifySuccessRate = await getIdentifySuccessRate();
        result.hotPlants = await getHotPlants(10);
        result.hourlyActivity = await getHourlyActivity();
        result.addPlantReturnRate = await getAddPlantReturnRate();
        break;
    }

    return result;
  } catch (err) {
    console.error('[getAnalytics] 失败:', err);
    return { success: false, error: err.message };
  }
};

/**
 * 校验管理员身份
 */
async function checkAdmin(openId) {
  if (!openId) return false;

  // 读取云端配置的管理员列表
  let cloudAdmins = [];
  try {
    const configRes = await db.collection('app_config').doc('global').get();
    if (configRes.data?.adminOpenids) {
      cloudAdmins = configRes.data.adminOpenids;
    }
  } catch (err) {
    // 忽略，使用默认
  }

  const allAdmins = [...new Set([...DEFAULT_ADMIN_OPENIDS, ...cloudAdmins])];
  return allAdmins.includes(openId);
}

/**
 * 安全读取 daily 文档（不存在时返回空对象）
 */
async function getDailyDoc(date) {
  try {
    const doc = await db.collection('analytics_daily').doc(date).get();
    return doc.data || {};
  } catch (err) {
    return {};
  }
}

/**
 * 分批获取所有用户（规避 100 条单页限制）
 */
async function getAllUsers() {
  const allUsers = [];
  let offset = 0;
  const batchSize = 100;
  while (true) {
    const batch = await db.collection('analytics_users').skip(offset).limit(batchSize).get();
    if (!batch.data || batch.data.length === 0) break;
    allUsers.push(...batch.data);
    if (batch.data.length < batchSize) break;
    offset += batchSize;
  }
  return allUsers;
}

/**
 * 获取今日概况
 */
async function getOverview() {
  const today = new Date().toISOString().split('T')[0];

  // 今日数据
  const daily = await getDailyDoc(today);

  // 总用户数
  let totalUsers = 0;
  try {
    const totalUsersRes = await db.collection('analytics_users').count();
    totalUsers = totalUsersRes.total || 0;
  } catch (err) {
    totalUsers = 0;
  }

  // 今日新客
  const todayNewUsers = daily.newUsers || 0;

  // 今日识别次数（从 apiCalls.identifyPlant 或 funnel.identify）
  const todayIdentify = daily.apiCalls?.identifyPlant || daily.funnel?.identify || 0;

  // 平均会话时长（秒 -> 分:秒）
  const avgSessionSeconds = daily.avgSession || 0;

  // 留存率 + 人均功能使用数（从用户表聚合）
  let retention1d = 0;
  let retention7d = 0;
  let avgFeatureUsage = 0;
  try {
    const users = await getAllUsers();

    const todayStr = today;
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const day7agoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    let yesterdayUsers = 0;
    let todayFromYesterday = 0;
    let day7agoUsers = 0;
    let todayFromDay7 = 0;
    let totalFeatureCount = 0;

    for (const user of users) {
      const dates = user.visitDates || [];
      // 次日留存
      if (dates.includes(yesterdayStr)) {
        yesterdayUsers++;
        if (dates.includes(todayStr)) todayFromYesterday++;
      }
      // 7日留存
      if (dates.includes(day7agoStr)) {
        day7agoUsers++;
        if (dates.includes(todayStr)) todayFromDay7++;
      }
      // 人均功能使用数
      const actions = user.actions || {};
      const used = Object.values(actions).filter(v => v > 0).length;
      totalFeatureCount += used;
    }

    retention1d = yesterdayUsers > 0 ? Math.round((todayFromYesterday / yesterdayUsers) * 100) : 0;
    retention7d = day7agoUsers > 0 ? Math.round((todayFromDay7 / day7agoUsers) * 100) : 0;
    avgFeatureUsage = users.length > 0 ? (totalFeatureCount / users.length).toFixed(1) : 0;
  } catch (err) {
  }

  return {
    todayVisits: daily.activeUsers || 0,
    todayNewUsers,
    todayIdentify,
    avgSession: formatDuration(avgSessionSeconds),
    avgSessionSeconds,
    totalUsers,
    retention1d,
    retention7d,
    avgFeatureUsage
  };
}

/**
 * 获取近 N 天趋势
 */
async function getTrend(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const trend = [];

  for (const date of dates) {
    const data = await getDailyDoc(date);

    trend.push({
      date: date.slice(5), // "05-09"
      fullDate: date,
      visits: data.activeUsers || 0,
      newUsers: data.newUsers || 0,
      returningUsers: data.returningUsers || 0,
      identify: data.apiCalls?.identifyPlant || data.funnel?.identify || 0,
      diagnose: data.apiCalls?.diagnosePlant || 0,
      careGuide: data.apiCalls?.getCareGuide || 0
    });
  }

  return trend;
}

/**
 * 获取转化漏斗（取最近 7 天汇总）
 */
async function getFunnel() {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 7);

  const dates = [];
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  let visit = 0, identify = 0, addPlant = 0, favorite = 0;

  for (const date of dates) {
    const data = await getDailyDoc(date);
    visit += data.funnel?.visit || 0;
    identify += data.funnel?.identify || 0;
    addPlant += data.funnel?.addPlant || 0;
    favorite += data.funnel?.favorite || 0;
  }

  return { visit, identify, addPlant, favorite };
}

/**
 * 获取热门功能排行
 */
async function getTopFeatures() {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 7);

  const dates = [];
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  const counts = {
    '拍照识别': 0,
    '植物诊断': 0,
    '养护指南': 0,
    '添加植物': 0,
    '收藏植物': 0
  };

  for (const date of dates) {
    const data = await getDailyDoc(date);
    const api = data.apiCalls || {};
    const funnel = data.funnel || {};

    counts['拍照识别'] += api.identifyPlant || funnel.identify || 0;
    counts['植物诊断'] += api.diagnosePlant || 0;
    counts['养护指南'] += api.getCareGuide || 0;
    counts['添加植物'] += funnel.addPlant || 0;
    counts['收藏植物'] += funnel.favorite || 0;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取最近事件流
 */
async function getRecentEvents(limit = 20) {
  const eventsRes = await db.collection('analytics_events')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  const eventNames = {
    'user_visit': '访问了小程序',
    'session_end': '结束会话',
    'identify_plant': '识别了植物',
    'get_care_guide': '查看了养护指南',
    'diagnose_plant': '进行了植物诊断',
    'add_plant': '添加了植物',
    'favorite_plant': '收藏了植物'
  };

  return eventsRes.data.map(item => {
    const time = item.timestamp
      ? item.timestamp.split('T')[1]?.slice(0, 5) || '--:--'
      : '--:--';
    const maskedId = item.openId
      ? item.openId.substring(0, 4) + '****' + item.openId.substring(item.openId.length - 4)
      : '****';

    return {
      time,
      openId: maskedId,
      event: item.event,
      eventName: eventNames[item.event] || item.event,
      extra: item.extra || {}
    };
  });
}

/**
 * 识别成功率（近7天）
 */
async function getIdentifySuccessRate() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await db.collection('analytics_events')
      .where({ event: 'identify_plant', timestamp: _.gte(sevenDaysAgo) })
      .limit(500)
      .get();

    const list = res.data || [];
    if (list.length === 0) return { rate: 0, total: 0, success: 0 };

    const success = list.filter(item => item.success !== false).length;
    return {
      rate: Math.round((success / list.length) * 100),
      total: list.length,
      success
    };
  } catch (err) {
    return { rate: 0, total: 0, success: 0 };
  }
}

/**
 * 热门植物 TOP N（近7天识别）
 */
async function getHotPlants(limit = 10) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await db.collection('analytics_events')
      .where({ event: 'identify_plant', timestamp: _.gte(sevenDaysAgo) })
      .limit(500)
      .get();

    const counts = {};
    for (const item of res.data || []) {
      const name = item.extra?.plantName || item.extra?.result || '未知植物';
      counts[name] = (counts[name] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (err) {
    return [];
  }
}

/**
 * 活跃时段分布（近7天，0-23时）
 */
async function getHourlyActivity() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const res = await db.collection('analytics_events')
      .where({ timestamp: _.gte(sevenDaysAgo) })
      .limit(1000)
      .get();

    const hours = new Array(24).fill(0);
    for (const item of res.data || []) {
      if (item.timestamp) {
        const h = new Date(item.timestamp).getHours();
        hours[h]++;
      }
    }

    const max = Math.max(...hours, 1);
    return hours.map((count, hour) => ({
      hour: `${hour}`,
      count,
      percent: Math.round((count / max) * 100)
    }));
  } catch (err) {
    return new Array(24).fill(0).map((_, hour) => ({ hour: `${hour}`, count: 0, percent: 0 }));
  }
}

/**
 * 添加植物后的3日回访率
 */
async function getAddPlantReturnRate() {
  try {
    const users = await getAllUsers();

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const day2agoStr = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];

    let addPlantUsers = 0;
    let returnedUsers = 0;

    for (const user of users) {
      const actions = user.actions || {};
      if (actions.addPlant > 0) {
        addPlantUsers++;
        const dates = user.visitDates || [];
        if (dates.includes(todayStr) || dates.includes(yesterdayStr) || dates.includes(day2agoStr)) {
          returnedUsers++;
        }
      }
    }

    return {
      rate: addPlantUsers > 0 ? Math.round((returnedUsers / addPlantUsers) * 100) : 0,
      total: addPlantUsers,
      returned: returnedUsers
    };
  } catch (err) {
    return { rate: 0, total: 0, returned: 0 };
  }
}

/**
 * 格式化时长（秒 -> x分x秒 / xh xm）
 */
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0秒';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}时${rm}分`;
  }
  if (m === 0) return `${s}秒`;
  return `${m}分${s}秒`;
}
