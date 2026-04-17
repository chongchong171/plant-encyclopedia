/**
 * 脚本：更新 plantCache.js 的图片 URL
 * 
 * 使用方法：
 * 1. 在微信开发者工具中右键运行此云函数
 * 2. 或在终端运行：node updatePlantImages.js
 */

// 植物名称到文件名的映射
const IMAGE_MAP = {
  '绿萝': 'lvluo.png',
  '多肉': 'duorou.png',
  '发财树': 'facaishu.png',
  '吊兰': 'diaolan.png',
  '龟背竹': 'guibeizhu.png',
  '虎皮兰': 'hupilan.png',
  '文竹': 'wenzhu.png',
  '君子兰': 'junzilan.png',
  '茉莉花': 'molihua.png',
  '栀子花': 'zhizihua.png',
  '蝴蝶兰': 'hudielan.png',  // 需要上传
  '芦荟': 'luhui.png',
  '富贵竹': 'fuguizhu.png',
  '仙人掌': 'xianrenzhang.png',
  '金钱树': 'jinqianshu.png',
  '万年青': 'wannianqing.png',
  '竹芋': 'zhuyu.png',
  '空气凤梨': 'kongqifengli.png',
  '波士顿蕨': 'boshidunjue.png',
  '蜘蛛抱蛋': 'zhiwubaodan.png',
  '圆叶椒草': 'yuanyejiaocao.png',
  '长寿花': 'changshouhua.png',
  '天竺葵': 'tianzhukui.png',
  '矮牵牛': 'aiqianniu.png',
  '月季': 'yueji.png'
};

// 云存储基础路径
const CLOUD_BASE_PATH = 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/';

// 生成完整的云存储 URL
function getImageUrl(plantName) {
  const filename = IMAGE_MAP[plantName];
  if (!filename) {
    console.log(`警告：${plantName} 没有配置图片`);
    return '';
  }
  return CLOUD_BASE_PATH + filename;
}

// 测试所有植物
console.log('植物图片 URL 列表：');
console.log('================');
Object.keys(IMAGE_MAP).forEach(plantName => {
  const url = getImageUrl(plantName);
  console.log(`${plantName}: ${url}`);
});

module.exports = {
  IMAGE_MAP,
  CLOUD_BASE_PATH,
  getImageUrl
};
