/**
 * 时间工具
 * 
 * 职责：时间格式化和计算
 */

/**
 * 格式化时间（完整格式）
 * 
 * @param {Date} date 日期对象
 * @returns {string} YYYY/MM/DD HH:MM:SS
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':');
}

/**
 * 格式化数字（补零）
 * 
 * @param {number} n 数字
 * @returns {string} 补零后的字符串
 */
function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : '0' + n;
}

/**
 * 格式化相对时间
 * 
 * @param {number} timestamp 时间戳（毫秒）
 * @returns {string} 如：刚刚、5分钟前、2天前
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  
  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前';
  } else {
    const date = new Date(timestamp);
    return (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 * 
 * @param {Date|string} date 日期
 * @returns {string}
 */
function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 获取今天的日期字符串
 * 
 * @returns {string} YYYY-MM-DD
 */
function getToday() {
  return formatDate(new Date());
}

/**
 * 在日期上增加天数
 * 
 * @param {string|Date} date 基础日期
 * @param {number} days 增加的天数
 * @returns {string} YYYY-MM-DD 格式
 */
function addDays(date, days) {
  const d = typeof date === 'string' ? new Date(date) : date;
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * 计算两个日期之间的天数差
 * 
 * @param {string|Date} date1 日期1
 * @param {string|Date} date2 日期2
 * @returns {number} 天数差（date2 - date1）
 */
function daysBetween(date1, date2) {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

module.exports = {
  formatTime,
  formatNumber,
  formatRelativeTime,
  formatDate,
  getToday,
  addDays,
  daysBetween
};