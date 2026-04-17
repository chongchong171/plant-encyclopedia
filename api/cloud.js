/**
 * 云函数通用封装
 * 
 * 职责：
 * 1. 统一调用云函数
 * 2. 统一错误处理
 * 3. 统一日志记录
 */

const { ERROR_CODES, ERROR_MESSAGES } = require('../config/enums');

/**
 * 调用云函数
 * 
 * @param {string} name 云函数名称
 * @param {object} data 传入数据
 * @param {object} options 可选配置（timeout 等）
 * @returns {Promise<{success: boolean, data?: any, error?: string, code?: number}>}
 */
async function callCloudFunction(name, data = {}, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log('[CloudAPI] Calling ' + name + '...', data);
    
    const res = await wx.cloud.callFunction({
      name: name,
      data: data,
      timeout: options.timeout || 30000
    });
    
    const elapsed = Date.now() - startTime;
    console.log('[CloudAPI] ' + name + ' completed in ' + elapsed + 'ms');
    
    // 直接返回云函数的结果，不要再包一层
    if (res.result) {
      return res.result;
    }
    
    // 云函数返回失败
    return {
      success: false,
      error: '云函数执行失败',
      code: ERROR_CODES.API_ERROR
    };
    
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error('[CloudAPI] ' + name + ' failed in ' + elapsed + 'ms:', err);
    
    // 根据错误类型返回不同错误码
    if (err.errMsg && err.errMsg.includes('timeout')) {
      return {
        success: false,
        error: '请求超时',
        code: ERROR_CODES.TIMEOUT
      };
    }
    
    if (err.errMsg && err.errMsg.includes('network')) {
      return {
        success: false,
        error: '网络错误',
        code: ERROR_CODES.NETWORK_ERROR
      };
    }
    
    // 权限错误特殊处理
    if (err.errMsg && err.errMsg.includes('permission denied')) {
      console.error('[CloudAPI] 权限错误，请检查云函数权限配置');
      return {
        success: false,
        error: '权限不足，请检查云开发控制台权限设置',
        code: ERROR_CODES.PERMISSION_DENIED
      };
    }
    
    return {
      success: false,
      error: err.message || '未知错误',
      code: ERROR_CODES.API_ERROR
    };
  }
}

/**
 * 获取用户友好的错误提示
 * 
 * @param {object} errorResult 错误结果对象
 * @returns {string} 用户可见的错误提示
 */
function getDisplayError(errorResult) {
  if (!errorResult) return '操作失败';
  
  if (errorResult.code && ERROR_MESSAGES[errorResult.code]) {
    return ERROR_MESSAGES[errorResult.code];
  }
  
  return errorResult.error || '操作失败，请重试';
}

/**
 * 初始化云开发
 * 在 app.js 中调用
 */
function initCloud() {
  wx.cloud.init({
    env: wx.cloud.DYNAMIC_CURRENT_ENV,
    traceUser: true
  });
  
  console.log('[CloudAPI] Cloud initialized');
}

module.exports = {
  callCloudFunction,
  getDisplayError,
  initCloud
};