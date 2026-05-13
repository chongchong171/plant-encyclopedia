/**
 * 首页视频配置 - 模块化设计
 * 
 * 替换视频只需修改此文件的 ID
 * 
 * 视频号视频格式：
 * - feedId: 从视频号助手复制的视频 ID
 * - finderUserName: 视频号 ID（sph 开头）
 * - 使用 channel-video 组件播放（微信原生，速度最优）
 * 
 * 注意：
 * - 视频格式：MP4 (H.264)
 * - 推荐分辨率：540×900 或 720×1280
 * - 推荐码率：1500-2000kbps
 * - 文件大小：< 5MB
 */

const VIDEO_CONFIG = {
  // 首页视频配置（微信云存储 - 原生支持，播放稳定）
  videoUrl: 'cloud://plant-encyclopedia-d-d1af4e84f48.706c-plant-encyclopedia-d-d1af4e84f48-1416656727/优化版H2.65 harmonyos.mp4',
  
  // 备用地址（空）
  backupUrl: '',
  
  duration: 12,
  resolution: '720x1280',
  localPath: '/home-intro.mp4'
}

module.exports = VIDEO_CONFIG
