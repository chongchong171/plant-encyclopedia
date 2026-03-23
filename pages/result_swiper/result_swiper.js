/**
 * 植物百科大全 - 识别结果页面
 */
const app = getApp();
const plantIdentify = require('../../utils/plantIdentify');

Page({
  data: {
    loading: true,
    imagePath: '',
    plant: {
      name: '',
      scientificName: '',
      family: '',
      description: '',
      descriptionLines: [],
      careGuide: {},
      difficulty: '中等',
      toxicity: false
    },
    isFavorite: false,
    identifyError: false,
    errorMessage: ''
  },

  onLoad(options) {
    const imagePath = decodeURIComponent(options.tmp_filePath || '');
    if (!imagePath) {
      this.setData({ loading: false, identifyError: true, errorMessage: '未获取到图片' });
      return;
    }
    this.setData({ imagePath });
    this.identifyPlant(imagePath);
  },

  async identifyPlant(imagePath) {
    wx.showLoading({ title: '识别中...' });
    try {
      const base64 = await this.readImageAsBase64(imagePath);
      const result = await plantIdentify.identifyPlant(base64);
      wx.hideLoading();
      
      if (result.success && result.data) {
        const parsedData = this.parseAIContent(result.data.description);
        const plant = { id: 'plant_' + Date.now(), image: imagePath, ...parsedData };
        this.setData({ loading: false, plant });
      } else {
        this.setData({ loading: false, identifyError: true, errorMessage: result.error || '识别失败' });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false, identifyError: true, errorMessage: '识别出错' });
    }
  },

  /**
   * 解析AI内容并拆分成易读格式
   */
  parseAIContent(content) {
    if (!content) {
      return {
        name: '植物',
        description: '',
        descriptionLines: [],
        family: '未知',
        difficulty: '中等',
        toxicity: false,
        careGuide: { light: '适中', water: '适量', temperature: '室温' }
      };
    }

    let plant = {
      name: '植物',
      description: content,
      descriptionLines: [],
      family: '未知',
      difficulty: '中等',
      toxicity: false,
      careGuide: { light: '适中', water: '适量', temperature: '室温' }
    };

    // 提取植物名称
    const namePatterns = [
      /植物[是为：:]\s*([^\n，,。]+)/,
      /名称[是为：:]\s*([^\n，,。]+)/,
      /这是([^\n，,。]+?)的图片/,
      /图片中[是为]\s*([^\n，,。]+)/
    ];
    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match) {
        plant.name = match[1].trim();
        break;
      }
    }

    // 拆分描述内容为多行
    const lines = content.split(/[。\n]/).filter(line => line.trim());
    plant.descriptionLines = lines.map(line => {
      const trimmed = line.trim();
      // 判断是否是养护相关的行
      if (trimmed.includes('光照') || trimmed.includes('浇水') || trimmed.includes('温度') || 
          trimmed.includes('养护') || trimmed.includes('施肥') || trimmed.includes('湿度')) {
        return { type: 'care', text: trimmed };
      }
      return { type: 'info', text: trimmed };
    });

    // 提取养护信息
    const lightMatch = content.match(/光照[是为：:]*\s*([^\n，,。]+)/);
    if (lightMatch) plant.careGuide.light = lightMatch[1].trim();

    const waterMatch = content.match(/浇水?[是为：:]*\s*([^\n，,。]+)/);
    if (waterMatch) plant.careGuide.water = waterMatch[1].trim();

    const tempMatch = content.match(/温度[是为：:]*\s*([^\n，,。]+)/);
    if (tempMatch) plant.careGuide.temperature = tempMatch[1].trim();

    return plant;
  },

  readImageAsBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath, encoding: 'base64',
        success: (res) => resolve(res.data), fail: (err) => reject(err)
      });
    });
  },

  toggleFavorite() {
    this.setData({ isFavorite: !this.data.isFavorite });
    wx.showToast({ title: this.data.isFavorite ? '已收藏' : '已取消', icon: 'success' });
  },

  retryIdentify() { wx.navigateBack(); }
});