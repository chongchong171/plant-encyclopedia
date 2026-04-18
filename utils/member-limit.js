/**
 * 植物数量限制检查工具
 * 
 * 所有功能免费开放：
 * - 花园植物：无限制
 * - 每日识别：无限制
 */

const app = getApp()

/**
 * 检查是否可以添加植物
 */
function canAddPlant() {
  return new Promise(async (resolve) => {
    // 全部用户无限制
    resolve({ canAdd: true })
  })
}

/**
 * 检查是否可以识别植物
 */
function canIdentify() {
  return new Promise((resolve) => {
    // 全部用户无限制
    resolve({ canIdentify: true })
  })
}

/**
 * 记录识别次数（用于统计）
 */
function recordIdentify(success = true) {
  // 不再限制识别次数，只记录统计
  if (!app.globalData.identifyHistory) {
    app.globalData.identifyHistory = []
  }
  
  app.globalData.identifyHistory.push({
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    success: success
  })
}

/**
 * 显示提示（保留函数，防止调用出错）
 */
function showLimitAlert(type) {
  console.log('[member-limit] showLimitAlert called but not implemented:', type)
}

module.exports = {
  canAddPlant,
  canIdentify,
  recordIdentify,
  showLimitAlert
}
