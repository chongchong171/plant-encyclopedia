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
      careGuide: {},
      difficulty: '',
      toxicity: false,
      features: []
    },
    isFavorite: false,
    identifyError: false,
    errorMessage: ''
  },

  onLoad(options) {
    console.log('结果页加载，参数:', options);
    
    const imagePath = decodeURIComponent(options.tmp_filePath || '');
    
    if (!imagePath) {
      this.setData({ 
        loading: false, 
        identifyError: true, 
        errorMessage: '未获取到图片' 
      });
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
        // 解析AI返回的内容
        const parsedData = this.parseAIContent(result.data.description);
        
        const plant = {
          id: 'plant_' + Date.now(),
          image: imagePath,
          ...parsedData
        };
        
        this.setData({
          loading: false,
          plant,
          isFavorite: app.isFavorite ? app.isFavorite(plant.id) : false
        });
        
        if (app.addHistory) app.addHistory(plant);
        if (app.recordIdentify) app.recordIdentify();
      } else {
        this.setData({
          loading: false,
          identifyError: true,
          errorMessage: result.error || '识别失败，请重试'
        });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({
        loading: false,
        identifyError: true,
        errorMessage: error.message || '识别出错'
      });
    }
  },

  /**
   * 解析AI返回的内容
   */
  parseAIContent(content) {
    console.log('📝 解析AI内容:', content);
    
    let plant = {
      name: '植物',
      scientificName: '',
      family: '未知',
      description: content,
      difficulty: '中等',
      toxicity: false,
      careGuide: {
        light: '适中光照',
        water: '适量浇水',
        temperature: '室温'
      },
      features: []
    };

    if (!content) return plant;

    // 尝试提取植物名称
    const namePatterns = [
      /植物[是为：:]\s*([^\n，,。]+)/,
      /名称[是为：:]\s*([^\n，,。]+)/,
      /这是([^\n，,。]+?)的图片/,
      /图片中[是为]\s*([^\n，,。]+)/,
      /这是一(株|棵|盆)\s*([^\n，,。]+)/
    ];

    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match) {
        plant.name = (match[2] || match[1]).trim();
        break;
      }
    }

    // 尝试提取科属
    const familyMatch = content.match(/科属?[是为：:]\s*([^\n，,。]+)/);
    if (familyMatch) {
      plant.family = familyMatch[1].trim();
    }

    // 尝试提取养护建议
    const lightMatch = content.match(/光照[是为：:]\s*([^\n，,。]+)/);
    if (lightMatch) plant.careGuide.light = lightMatch[1].trim();

    const waterMatch = content.match(/浇水?[是为：:]\s*([^\n，,。]+)/);
    if (waterMatch) plant.careGuide.water = waterMatch[1].trim();

    const tempMatch = content.match(/温度[是为：:]\s*([^\n，,。]+)/);
    if (tempMatch) plant.careGuide.temperature = tempMatch[1].trim();

    // 提取养护建议段落
    const careSection = content.match(/养护[^：:\n]*[：:]\s*([\s\S]+?)(?=\n\n|$)/);
    if (careSection) {
      plant.careGuide.tips = careSection[1].trim();
    }

    return plant;
  },

  readImageAsBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  },

  toggleFavorite() {
    const { plant, isFavorite } = this.data;
    if (isFavorite) {
      if (app.removeFavorite) app.removeFavorite(plant.id);
    } else {
      if (app.addFavorite) app.addFavorite(plant);
    }
    this.setData({ isFavorite: !isFavorite });
    wx.showToast({ title: isFavorite ? '已取消' : '已收藏', icon: 'success' });
  },

  retryIdentify() {
    wx.navigateBack();
  }
});