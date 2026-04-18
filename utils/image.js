/**
 * 图片工具
 * 
 * 职责：图片处理相关
 */

const { IMAGE_MAX_SIZE_KB } = require('../config/constants');

/**
 * 图片转 Base64
 * 
 * @param {string} filePath 图片路径
 * @returns {Promise<string>} Base64 字符串
 */
function imageToBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    });
  });
}

/**
 * Base64 转 ArrayBuffer
 * 
 * @param {string} base64 Base64 字符串
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
  return wx.base64ToArrayBuffer(base64);
}

/**
 * 计算图片大小（KB）
 * 
 * @param {string} base64 Base64 字符串
 * @returns {number} KB
 */
function calculateImageSize(base64) {
  return base64.length * 0.75 / 1024;
}

/**
 * 检查图片大小是否合法
 * 
 * @param {string} base64 Base64 字符串
 * @returns {boolean}
 */
function validateImageSize(base64) {
  const sizeKB = calculateImageSize(base64);
  return sizeKB <= IMAGE_MAX_SIZE_KB;
}

/**
 * 选择图片（相册）
 * 
 * @param {object} options 选项
 * @returns {Promise<string>} 图片临时路径
 */
function chooseImageFromAlbum(options = {}) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        resolve(res.tempFiles[0].tempFilePath);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 选择图片（拍照）
 * 
 * @param {object} options 选项
 * @returns {Promise<string>} 图片临时路径
 */
function chooseImageFromCamera(options = {}) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        resolve(res.tempFiles[0].tempFilePath);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 保存图片到相册
 * 
 * @param {string} filePath 图片路径
 * @returns {Promise<void>}
 */
function saveImageToPhotosAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => resolve(),
      fail: (err) => reject(err)
    });
  });
}

module.exports = {
  imageToBase64,
  base64ToArrayBuffer,
  calculateImageSize,
  validateImageSize,
  chooseImageFromAlbum,
  chooseImageFromCamera,
  saveImageToPhotosAlbum
};