/**
 * Config 层统一入口
 */

const apiKeys = require('./api-keys');
const constants = require('./constants');
const enums = require('./enums');

module.exports = {
  apiKeys,
  constants,
  enums,
  
  // 快捷方式
  QWEN_API_KEY: apiKeys.QWEN_API_KEY,
  PLANTNET_API_KEY: apiKeys.PLANTNET_API_KEY,
  CLOUD_ENV_ID: constants.CLOUD_ENV_ID,
  ERROR_CODES: enums.ERROR_CODES,
  PROBLEM_TYPES: enums.PROBLEM_TYPES
};