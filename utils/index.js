/**
 * Utils 层统一入口
 */

const time = require('./time');
const format = require('./format');
const storage = require('./storage');
const image = require('./image');
const request = require('./request');
const log = require('./log');
const cache = require('./cache');

module.exports = {
  time,
  format,
  storage,
  image,
  request,
  log,
  cache,
  
  // 快捷方式
  formatTime: time.formatTime,
  formatRelativeTime: time.formatRelativeTime,
  logInfo: log.logInfo,
  logError: log.logError,
  getCache: cache.getCache,
  setCache: cache.setCache
};