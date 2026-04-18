/**
 * 错误码定义
 * 
 * 规范：
 * - 0: 成功
 * - 1000-1999: 客户端错误
 * - 2000-2999: 服务端错误
 * - 3000-3999: 业务错误
 * 
 * 更新日期：2026-03-29
 */

const ERROR_CODES = {
  // 成功
  SUCCESS: 0,
  
  // ========== 客户端错误 (1000-1999) ==========
  INVALID_PARAMS: 1001,      // 参数错误
  MISSING_OPENID: 1002,      // 缺少 openid
  NETWORK_ERROR: 1003,       // 网络错误
  TIMEOUT: 1004,             // 请求超时
  UNAUTHORIZED: 1005,        // 未授权
  FORBIDDEN: 1006,           // 权限不足
  NOT_FOUND: 1007,           // 资源不存在
  
  // ========== 服务端错误 (2000-2999) ==========
  SERVER_ERROR: 2001,        // 服务器错误
  DATABASE_ERROR: 2002,      // 数据库错误
  CLOUD_FUNCTION_ERROR: 2003, // 云函数错误
  AI_API_ERROR: 2004,        // AI API 错误
  
  // ========== 业务错误 (3000-3999) ==========
  PLANT_NOT_FOUND: 3001,     // 植物不存在
  CONVERSATION_EXPIRED: 3002, // 对话已过期
  MAX_RETRY_EXCEEDED: 3003,  // 超过最大追问次数
  INTENT_UNKNOWN: 3004,      // 意图无法识别
  OPERATION_FAILED: 3005     // 操作失败
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES = {
  [ERROR_CODES.SUCCESS]: '成功',
  [ERROR_CODES.INVALID_PARAMS]: '参数错误',
  [ERROR_CODES.MISSING_OPENID]: '缺少用户标识',
  [ERROR_CODES.NETWORK_ERROR]: '网络错误',
  [ERROR_CODES.TIMEOUT]: '请求超时',
  [ERROR_CODES.UNAUTHORIZED]: '未授权',
  [ERROR_CODES.FORBIDDEN]: '权限不足',
  [ERROR_CODES.NOT_FOUND]: '资源不存在',
  [ERROR_CODES.SERVER_ERROR]: '服务器错误',
  [ERROR_CODES.DATABASE_ERROR]: '数据库错误',
  [ERROR_CODES.CLOUD_FUNCTION_ERROR]: '云函数执行失败',
  [ERROR_CODES.AI_API_ERROR]: 'AI 服务暂时不可用',
  [ERROR_CODES.PLANT_NOT_FOUND]: '植物不存在',
  [ERROR_CODES.CONVERSATION_EXPIRED]: '对话已过期',
  [ERROR_CODES.MAX_RETRY_EXCEEDED]: '操作超时，请重新开始',
  [ERROR_CODES.INTENT_UNKNOWN]: '无法理解您的意图',
  [ERROR_CODES.OPERATION_FAILED]: '操作失败'
}

/**
 * 构建成功响应
 */
function success(data = {}) {
  return {
    success: true,
    code: ERROR_CODES.SUCCESS,
    ...data
  }
}

/**
 * 构建失败响应
 */
function error(code, message = null, rawError = null) {
  return {
    success: false,
    code: code,
    message: message || ERROR_MESSAGES[code] || '未知错误',
    ...(rawError ? { rawError } : {})
  }
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  success,
  error
}