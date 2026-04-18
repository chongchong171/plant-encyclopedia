/**
 * API Key 辅助函数
 * 
 * ⚠️ 此文件仅用于云函数，前端不要引用
 * 
 * 用途：
 * - 从云函数环境变量获取敏感 API Key
 * - 统一 Key 获取方式
 * - 方便日后迁移到密钥管理服务
 */

/**
 * 获取 Qwen API Key
 * @returns {string} API Key 或空字符串
 */
function getQwenApiKey() {
  const key = process.env.QWEN_API_KEY || '';
  
  if (!key) {
    console.error('[API-Keys] QWEN_API_KEY 未配置，请在云开发控制台设置环境变量');
  }
  
  return key;
}

module.exports = {
  getQwenApiKey
};