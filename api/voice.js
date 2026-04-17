/**
 * 语音 API
 * 
 * 职责：封装语音相关云函数调用
 */

const { callCloudFunction } = require('./cloud');

/**
 * 语音转文字
 * 
 * @param {string} audioPath 语音文件路径
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function speechToText(audioPath) {
  return callCloudFunction('speechToText', {
    audioPath: audioPath
  });
}

module.exports = {
  speechToText
};
