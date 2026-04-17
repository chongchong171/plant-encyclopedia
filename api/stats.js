/**
 * 统计 API
 * 
 * 职责：封装用户统计相关的云函数调用
 */

const { callCloudFunction } = require('./cloud');

/**
 * 获取用户统计数据
 * 
 * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
 */
async function getUserStats() {
  // 直接返回云函数结果
  return callCloudFunction('getUserStats');
}

/**
 * 获取好友排行榜
 * 
 * @param {object} options 排行榜选项
 * @param {string} options.type 排行类型：plantCount, survivalRate, careDays
 * @param {number} options.limit 返回数量
 * @returns {Promise<{success: boolean, rankings?: Array, myRank?: object, error?: string}>}
 */
async function getFriendsRanking(options = {}) {
  // 直接返回云函数结果（已包含 rankings, myRank, total）
  return callCloudFunction('getFriendsRanking', {
    orderBy: options.type || 'plantCount',
    limit: options.limit || 20
  });
}

/**
 * 更新用户统计
 * 
 * @param {string} action 动作类型：water, fertilize, add_plant, remove_plant
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateUserStats(action) {
  return callCloudFunction('updateUserStats', { action });
}

module.exports = {
  getUserStats,
  getFriendsRanking,
  updateUserStats
};