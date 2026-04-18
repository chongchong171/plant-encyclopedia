/**
 * 云函数：清理云存储中的旧图片文件
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  console.log('[cleanupOldImages] 开始清理旧图片...');
  
  // 需要删除的旧文件
  const oldFiles = [
    'plant-images/categories/hubilan.png',  // 旧文件名（拼写错误）
    'plant-images/categories/duorou.png',   // 旧多肉图片
    'plant-images/categories/junzilan.png', // 旧君子兰图片
    'plant-images/categories/xianrenzhang.png', // 旧仙人掌图片
    'plant-images/categories/zhuyu.png'     // 旧竹芋图片
  ];
  
  try {
    const deleteRes = await cloud.deleteFile({
      fileList: oldFiles
    });
    
    const results = [];
    deleteRes.fileList.forEach(file => {
      console.log(`[cleanupOldImages] 删除 ${file.filePath}: 状态 ${file.status}`);
      results.push({
        filePath: file.filePath,
        status: file.status,
        message: file.message || ''
      });
    });
    
    const successCount = results.filter(r => r.status === 0).length;
    
    return {
      success: true,
      message: `成功删除 ${successCount}/${oldFiles.length} 个旧文件`,
      results
    };
    
  } catch (err) {
    console.error('[cleanupOldImages] 清理失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
