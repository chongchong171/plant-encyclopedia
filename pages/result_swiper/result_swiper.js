/**
 * 养花助手 - 识别结果页面
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
      confidence: 0,
      source: ''
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
        const plant = {
          id: result.data.id || 'plant_' + Date.now(),
          image: imagePath,
          name: result.data.name || '植物',
          scientificName: result.data.scientificName || '',
          family: result.data.family || '未知',
          description: result.data.description || '',
          careGuide: result.data.careGuide || { light: '适中', water: '适量', temperature: '室温' },
          confidence: result.data.confidence || 0,
          source: result.data.source || '未知',
          quotaRemaining: result.data.quotaRemaining
        };
        
        // 拆分描述为多行
        plant.descriptionLines = this.splitDescription(plant.description);
        
        console.log('✅ 识别成功:', plant.name);
        console.log('📊 来源:', plant.source);
        console.log('📊 置信度:', plant.confidence);
        
        this.setData({ loading: false, plant });
        
        // 保存历史
        if (app.addHistory) app.addHistory(plant);
        
      } else {
        this.setData({ 
          loading: false, 
          identifyError: true, 
          errorMessage: result.error || '识别失败' 
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('识别出错:', error);
      this.setData({ 
        loading: false, 
        identifyError: true, 
        errorMessage: error.message || '识别出错' 
      });
    }
  },

  /**
   * 拆分描述为多行
   */
  splitDescription(description) {
    if (!description) return [];
    
    const lines = description.split(/[。\n]/).filter(line => line.trim());
    
    return lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.includes('光照') || trimmed.includes('浇水') || 
          trimmed.includes('温度') || trimmed.includes('养护')) {
        return { type: 'care', text: trimmed };
      }
      return { type: 'info', text: trimmed };
    });
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
    this.setData({ isFavorite: !isFavorite });
    
    if (!isFavorite && app.addFavorite) {
      app.addFavorite(plant);
    } else if (isFavorite && app.removeFavorite) {
      app.removeFavorite(plant.id);
    }
    
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
  },

  retryIdentify() {
    wx.navigateBack();
  }
});