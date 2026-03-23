/**
 * 植物识别工具
 * 使用 Qwen-VL 多模态模型识别植物
 */

const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

/**
 * 压缩图片
 */
const compressImage = (imageBase64, maxSizeKB = 800) => {
  return new Promise((resolve) => {
    const sizeKB = imageBase64.length * 0.75 / 1024;
    console.log('📐 原始图片大小:', sizeKB.toFixed(1), 'KB');
    
    // 如果已经小于目标大小，直接返回
    if (sizeKB <= maxSizeKB) {
      console.log('✅ 图片大小合适，无需压缩');
      resolve(imageBase64);
      return;
    }
    
    // 需要压缩 - 使用 Canvas 压缩
    const fsm = wx.getFileSystemManager();
    const tempPath = `${wx.env.USER_DATA_PATH}/temp_compress_${Date.now()}.jpg`;
    
    // 将 base64 写入临时文件
    const buffer = wx.base64ToArrayBuffer(imageBase64);
    fsm.writeFileSync(tempPath, buffer);
    
    // 获取图片信息
    wx.getImageInfo({
      src: tempPath,
      success: (info) => {
        console.log('📐 原始尺寸:', info.width, 'x', info.height);
        
        // 计算压缩比例
        const targetSize = maxSizeKB * 1024;
        const ratio = Math.sqrt(targetSize / (sizeKB * 1024));
        const newWidth = Math.floor(info.width * Math.min(ratio, 0.7));
        const newHeight = Math.floor(info.height * Math.min(ratio, 0.7));
        
        console.log('📐 目标尺寸:', newWidth, 'x', newHeight);
        
        // 创建 canvas 压缩
        const canvas = wx.createOffscreenCanvas({
          type: '2d',
          width: newWidth,
          height: newHeight
        });
        const ctx = canvas.getContext('2d');
        
        const img = canvas.createImage();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          
          wx.canvasToTempFilePath({
            canvas: canvas,
            quality: 0.8,
            fileType: 'jpg',
            success: (res) => {
              // 读取压缩后的文件
              const compressedData = fsm.readFileSync(res.tempFilePath);
              const compressedBase64 = wx.arrayBufferToBase64(compressedData);
              const newSizeKB = compressedBase64.length * 0.75 / 1024;
              console.log('✅ 压缩后大小:', newSizeKB.toFixed(1), 'KB');
              
              // 清理临时文件
              fsm.unlinkSync(tempPath);
              
              resolve(compressedBase64);
            },
            fail: () => {
              console.log('⚠️ Canvas压缩失败，使用原始图片');
              fsm.unlinkSync(tempPath);
              resolve(imageBase64);
            }
          });
        };
        img.onerror = () => {
          console.log('⚠️ 图片加载失败，使用原始图片');
          fsm.unlinkSync(tempPath);
          resolve(imageBase64);
        };
        img.src = tempPath;
      },
      fail: () => {
        console.log('⚠️ 获取图片信息失败，使用原始图片');
        fsm.unlinkSync(tempPath);
        resolve(imageBase64);
      }
    });
  });
};

/**
 * 识别植物
 */
const identifyPlant = async (imageBase64) => {
  console.log('🌿 收到图片，Base64长度:', imageBase64.length);
  
  // 检查大小
  if (imageBase64.length > 5500000) {
    // 尝试压缩
    console.log('⚠️ 图片较大，尝试压缩...');
    imageBase64 = await compressImage(imageBase64, 800);
  }
  
  if (imageBase64.length < 1000) {
    return { success: false, error: '图片太小，请重新拍摄' };
  }
  
  // 压缩后的最终大小检查
  const finalSizeKB = imageBase64.length * 0.75 / 1024;
  console.log('📐 最终图片大小:', finalSizeKB.toFixed(1), 'KB');
  
  if (finalSizeKB > 9500) {  // 接近 10MB 限制
    return { success: false, error: '图片太大，请选择较小的图片' };
  }
  
  return new Promise((resolve) => {
    const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    
    console.log('🚀 发送识别请求...');
    
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: '请识别这张图片中的植物，告诉我：1.植物名称 2.简单养护建议'
              }
            ]
          }
        ]
      },
      timeout: 60000,
      success: (res) => {
        console.log('📡 API状态码:', res.statusCode);
        console.log('📡 API响应:', JSON.stringify(res.data));
        
        if (res.statusCode === 200 && res.data) {
          const content = res.data.choices?.[0]?.message?.content;
          
          if (content) {
            const plant = {
              id: 'plant_' + Date.now(),
              name: '识别结果',
              description: content,
              scientificName: '',
              family: '未知',
              difficulty: '中等',
              toxicity: false,
              careGuide: {
                light: '适中光照',
                water: '适量浇水',
                temperature: '常温'
              }
            };
            
            console.log('✅ 识别成功');
            resolve({ success: true, data: plant });
          } else if (res.data.code === 'InvalidParameter') {
            resolve({ success: false, error: '图片格式不支持，请换一张' });
          } else {
            resolve({ success: false, error: '识别失败，请重试' });
          }
        } else {
          resolve({ success: false, error: '网络错误(' + res.statusCode + ')' });
        }
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
        resolve({ success: false, error: '网络错误，请检查网络' });
      }
    });
  });
};

module.exports = { identifyPlant };