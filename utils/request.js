/**
 * 请求工具
 * 
 * 职责：网络请求封装和错误处理
 */

const { ERROR_CODES, ERROR_MESSAGES } = require('../config/enums');

/**
 * 统一错误处理
 * 
 * @param {string} message 错误消息
 * @param {number} code 错误码
 * @returns {{success: false, error: string, code: number}}
 */
function handleApiError(message, code) {
  console.error(`[API Error ${code}] ${message}`);
  
  // 使用预定义的错误消息（更友好）
  const displayMessage = ERROR_MESSAGES[code] || message;
  
  return {
    success: false,
    error: displayMessage,
    code: code,
    rawMessage: message
  };
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
 * 发起 HTTP 请求（封装 wx.request）
 * 
 * @param {object} options 请求选项
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
function httpRequest(options) {
  return new Promise((resolve) => {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      header: options.header || {},
      data: options.data,
      timeout: options.timeout || 30000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            success: true,
            data: res.data
          });
        } else {
          resolve(handleApiError(`HTTP ${res.statusCode}`, ERROR_CODES.API_ERROR));
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('timeout')) {
          resolve(handleApiError('请求超时', ERROR_CODES.TIMEOUT));
        } else {
          resolve(handleApiError(err.errMsg || '网络错误', ERROR_CODES.NETWORK_ERROR));
        }
      }
    });
  });
}

/**
 * 显示错误提示
 * 
 * @param {object} errorResult 错误结果
 * @param {object} options Toast 选项
 */
function showErrorToast(errorResult, options = {}) {
  const message = getDisplayError(errorResult);
  
  wx.showToast({
    title: options.title || message,
    icon: options.icon || 'none',
    duration: options.duration || 2000
  });
}

/**
 * 显示成功提示
 * 
 * @param {string} message 成功消息
 * @param {object} options Toast 选项
 */
function showSuccessToast(message, options = {}) {
  wx.showToast({
    title: options.title || message,
    icon: options.icon || 'success',
    duration: options.duration || 1500
  });
}

/**
 * 显示加载中
 * 
 * @param {string} title 加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading();
}

module.exports = {
  handleApiError,
  getDisplayError,
  httpRequest,
  showErrorToast,
  showSuccessToast,
  showLoading,
  hideLoading
};