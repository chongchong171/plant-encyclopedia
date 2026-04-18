/**
 * API 层：对话相关接口封装
 *
 * 职责：统一调用入口，透传云函数结果
 *
 * 更新日期：2026-04-04
 */

const { callCloudFunction } = require('./cloud')

/**
 * 意图识别（AI Function Calling）
 * @param {string} userMessage 用户消息
 * @param {string} openid 用户 openid
 * @param {object} contextInfo 上下文信息（可选）
 * @returns {object} 识别结果
 */
async function classifyIntent(userMessage, openid, contextInfo = null) {
  return callCloudFunction('intentClassify', {
    userMessage,
    openid,
    contextInfo
  }, { timeout: 60000 })
}

module.exports = {
  classifyIntent
}
