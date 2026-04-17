/**
 * 云函数：获取视频临时链接
 * 用于绕过域名白名单限制
 */
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  try {
    // 从服务器下载视频并上传到云存储
    const https = require('https');
    const http = require('http');
    
    const videoUrl = 'https://plant.yg-crystal.com/videos/home-intro.mp4';
    
    console.log('[下载] 从服务器下载视频...');
    
    const buffer = await new Promise((resolve, reject) => {
      const client = videoUrl.startsWith('https') ? https : http;
      const chunks = [];
      
      client.get(videoUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
    
    console.log(`[下载完成] 大小：${(buffer.length/1024).toFixed(1)}KB`);
    
    // 上传到云存储
    const cloudPath = 'videos/home-intro.mp4';
    console.log('[上传] 上传到云存储...');
    
    const uploadRes = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: buffer
    });
    
    console.log('[上传成功]', uploadRes);
    
    // 获取临时链接（有效期 24 小时）
    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID]
    });
    
    const tempUrl = tempUrlRes.fileList[0].tempFileURL;
    
    return {
      success: true,
      videoUrl: tempUrl,
      fileID: uploadRes.fileID,
      expires: '24 小时'
    };
  } catch (err) {
    console.error('[失败]', err);
    return {
      success: false,
      error: err.message
    };
  }
};
