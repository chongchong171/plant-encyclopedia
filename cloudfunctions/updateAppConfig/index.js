/**
 * 云函数：更新应用配置（仅管理员可用）
 *
 * 入参：{ type: 'config' | 'flags', key: string, value: any }
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 管理员 openid 白名单（兜底）
const ADMIN_OPENIDS = ['oP55x3SPl1DkRUyTnV8sYpb7G2p4'];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    // 1. 校验管理员身份
    let isAdmin = ADMIN_OPENIDS.includes(openid);

    if (!isAdmin) {
      try {
        const configRes = await db.collection('app_config').doc('global').get();
        const cloudAdmins = configRes.data?.adminOpenids || [];
        isAdmin = cloudAdmins.includes(openid);
      } catch (err) {
        // 忽略
      }
    }

    if (!isAdmin) {
      return { success: false, error: '无权访问：你不是管理员' };
    }

    const { type, key, value } = event;
    if (!type || !key) {
      return { success: false, error: '参数错误：缺少 type 或 key' };
    }

    // 2. 写入配置
    if (type === 'flags') {
      await safeMergeWrite('feature_flags', 'default', { [key]: value });
    } else if (type === 'config') {
      const keys = key.split('.');
      if (keys.length === 1) {
        await safeMergeWrite('app_config', 'global', { [key]: value });
      } else {
        // 嵌套字段：展开为嵌套对象后合并写入
        const nested = {};
        let current = nested;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = {};
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        await safeMergeWrite('app_config', 'global', nested);
      }
    } else {
      return { success: false, error: '参数错误：type 必须是 config 或 flags' };
    }

    return { success: true, message: '更新成功' };

  } catch (err) {
    console.error('[updateAppConfig] 失败:', err);
    return { success: false, error: err.message || '更新失败' };
  }
};

/**
 * 安全合并写入：
 * 1. 先尝试获取现有文档（忽略不存在错误）
 * 2. 将 patch 深度合并到现有文档
 * 3. 用 set 写入（文档不存在则创建）
 * 4. 若集合也不存在，先 add 创建集合再 set
 */
async function safeMergeWrite(collection, docId, patch) {
  // 1. 获取现有文档
  let existing = {};
  try {
    const res = await db.collection(collection).doc(docId).get();
    existing = res.data || {};
  } catch (e) {
    // 文档或集合不存在，existing 保持 {}
  }

  // 2. 深度合并
  const merged = deepMerge(existing, patch);
  merged.updatedAt = new Date().toISOString();

  // 3. 删除云数据库内部字段（set 不允许写入 _id）
  delete merged._id;
  delete merged._openid;

  // 4. 尝试 set
  try {
    await db.collection(collection).doc(docId).set({ data: merged });
    return;
  } catch (err) {
    const msg = (err.errMsg || err.message || '').toLowerCase();
    if (!msg.includes('not exist') && !msg.includes('不存在')) {
      throw err;
    }
  }

  // 4. 集合不存在：先 add 创集合
  const addRes = await db.collection(collection).add({
    data: { _temp: true, updatedAt: new Date().toISOString() }
  });

  // 5. 再 set 写入目标文档
  await db.collection(collection).doc(docId).set({ data: merged });

  // 6. 清理临时文档
  if (addRes && addRes._id) {
    try {
      await db.collection(collection).doc(addRes._id).remove();
    } catch (e) { /* ignore */ }
  }
}

/**
 * 简单深度合并（两层足够）
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
