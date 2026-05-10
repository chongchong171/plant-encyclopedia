/**
 * 临时云函数：上传重编码后的视频到服务器
 */
const cloud = require('wx-server-sdk');
const http = require('http');
const https = require('https');
const fs = require('fs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 从 URL 下载文件
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const chunks = [];
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

exports.main = async (event, context) => {
  try {
    // 重编码后的视频 URL（临时存放）
    // 由于无法直接访问本地文件，需要从服务器下载
    const videoUrl = 'https://plant.yg-crystal.com/videos/home-intro.mp4';
    
    const buffer = await downloadFile(videoUrl);
    
    // 上传到云存储
    const cloudPath = 'videos/home-intro-fixed.mp4';
    
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    });
    
    
    return {
      success: true,
      fileID: uploadRes.fileID,
      fileURL: uploadRes.fileURL,
      cloudPath: cloudPath
    };
  } catch (err) {
    console.error('[失败]', err);
    return {
      success: false,
      error: err.message
    };
  }
};
