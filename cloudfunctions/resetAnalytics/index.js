/**
 * 云函数：重置分析数据（仅管理员）
 *
 * 功能：清空 analytics_events、analytics_daily、analytics_users 集合
 * 用于上线前清理测试数据
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 默认管理员
const DEFAULT_ADMIN_OPENIDS = ['oP55x3SPl1DkRUyTnV8sYpb7G2p4'];

// 需要清空的集合
const COLLECTIONS = ['analytics_events', 'analytics_daily', 'analytics_users'];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  // 1. 校验管理员身份
  const isAdmin = await checkAdmin(openId);
  if (!isAdmin) {
    return { success: false, error: '无权访问' };
  }

  const result = {
    success: true,
    cleared: {},
    errors: []
  };

  // 2. 逐个清空集合
  for (const collectionName of COLLECTIONS) {
    try {
      const count = await clearCollection(collectionName);
      result.cleared[collectionName] = count;
    } catch (err) {
      console.error(`[resetAnalytics] 清空 ${collectionName} 失败:`, err);
      result.errors.push({ collection: collectionName, error: err.message });
    }
  }

  return result;
};

/**
 * 校验管理员身份
 */
async function checkAdmin(openId) {
  if (!openId) return false;

  let cloudAdmins = [];
  try {
    const configRes = await db.collection('app_config').doc('global').get();
    if (configRes.data?.adminOpenids) {
      cloudAdmins = configRes.data.adminOpenids;
    }
  } catch (err) {
    // 忽略
  }

  const allAdmins = [...new Set([...DEFAULT_ADMIN_OPENIDS, ...cloudAdmins])];
  return allAdmins.includes(openId);
}

/**
 * 清空集合（分批删除）
 * 微信云数据库单次查询最多 100 条，循环直到清空
 */
async function clearCollection(collectionName) {
  let totalDeleted = 0;
  const collection = db.collection(collectionName);

  while (true) {
    // 查询一批文档
    const res = await collection.limit(100).get();
    const docs = res.data || [];

    if (docs.length === 0) break;

    // 批量删除（使用 _id 列表）
    const ids = docs.map(doc => doc._id);

    // 小程序云数据库不支持批量 delete，只能逐个删除
    // 使用 Promise.all 并行删除提高效率
    const deletePromises = ids.map(id => {
      return collection.doc(id).remove().catch(err => {
        console.error(`[resetAnalytics] 删除 ${collectionName}/${id} 失败:`, err);
        return null;
      });
    });

    await Promise.all(deletePromises);
    totalDeleted += ids.length;

    // 如果这一批不足 100 条，说明已经删完了
    if (docs.length < 100) break;
  }

  console.log(`[resetAnalytics] ${collectionName} 已清空 ${totalDeleted} 条`);
  return totalDeleted;
}
