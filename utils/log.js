/**
 * 日志工具
 * 
 * 统一日志格式：[模块名] [级别] 消息
 */

const { LOG_LEVELS } = require('../config/enums');

const LOG_PREFIX = '[PlantApp]';

// 是否为开发环境
const isDev = typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop';

/**
 * 调试日志（仅开发环境）
 */
function logDebug(module, message, data) {
  if (isDev) {
    console.log(`${LOG_PREFIX} [${module}] [DEBUG] ${message}`, data || '');
  }
}

/**
 * 信息日志
 */
function logInfo(module, message, data) {
  console.log(`${LOG_PREFIX} [${module}] [INFO] ${message}`, data || '');
}

/**
 * 警告日志
 */
function logWarn(module, message, data) {
  console.warn(`${LOG_PREFIX} [${module}] [WARN] ${message}`, data || '');
}

/**
 * 错误日志
 */
function logError(module, message, data) {
  console.error(`${LOG_PREFIX} [${module}] [ERROR] ${message}`, data || '');
}

module.exports = {
  logDebug,
  logInfo,
  logWarn,
  logError
};