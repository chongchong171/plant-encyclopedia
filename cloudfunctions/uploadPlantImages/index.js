/**
 * 云函数：上传 2 张植物图片到云存储（虎皮兰、发财树）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const fetch = require('node-fetch');

// 需要上传的图片（文件名要和代码中 IMAGE_MAP 一致）
const IMAGE_URLS = [
  { name: 'hupilan', url: 'https://images.pexels.com/photos/36503865/pexels-photo-36503865.jpeg' },  // 虎皮兰
  { name: 'facaishu', url: 'https://images.pexels.com/photos/29150327/pexels-photo-29150327.jpeg' },  // 发财树 - 新图
  { name: 'hudielan', url: 'https://images.pexels.com/photos/11177712/pexels-photo-11177712.jpeg' }  // 蝴蝶兰 - 新图：紫色蝴蝶兰
];

// 旧图片文件列表（删除这 3 张）
const OLD_FILES = [
  'plant-images/categories/hupilan.png',  // 虎皮兰
  'plant-images/categories/facaishu.png',  // 发财树
  'plant-images/categories/hudielan.png'  // 蝴蝶兰
];

exports.main = async (event, context) => {
  console.log('[uploadPlantImages] 开始上传 2 张植物图片...');
  
  const results = { upload: [], delete: [] };
  
  try {
    // 1. 先删除旧图片
    console.log('[uploadPlantImages] 删除旧图片...');
    const deleteRes = await cloud.deleteFile({ fileList: OLD_FILES });
    results.delete = deleteRes.fileList;
    console.log('[uploadPlantImages] 删除完成:', results.delete.length);
    
    // 2. 上传新图片（只上传 2 张）
    for (const img of IMAGE_URLS) {
      try {
        console.log('[uploadPlantImages] 上传', img.name, '...');
        
        const res = await fetch(img.url);
        const buffer = await res.buffer();
        
        const uploadRes = await cloud.uploadFile({
          cloudPath: `plant-images/categories/${img.name}.png`,
          fileContent: buffer
        });
        
        results.upload.push({
          name: img.name,
          success: true,
          fileID: uploadRes.fileID,
          fileURL: uploadRes.fileURL
        });
        
        console.log('[uploadPlantImages]', img.name, '上传成功:', uploadRes.fileID);
        
      } catch (err) {
        results.upload.push({
          name: img.name,
          success: false,
          error: err.message
        });
        console.error('[uploadPlantImages]', img.name, '上传失败:', err);
      }
    }
    
    const uploadSuccess = results.upload.filter(r => r.success).length;
    const deleteSuccess = results.delete.filter(f => f.status === 0).length;
    
    console.log('[uploadPlantImages] 执行完成');
    
    return {
      success: true,
      upload: `${uploadSuccess}/${results.upload.length}`,
      delete: `${deleteSuccess}/${results.delete.length}`,
      message: `成功上传 ${uploadSuccess} 张图片（虎皮兰、发财树）`,
      results
    };
    
  } catch (err) {
    console.error('[uploadPlantImages] 执行失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
