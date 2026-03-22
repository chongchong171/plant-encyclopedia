// pages/result_swiper/result_swiper.js
// 植物百科大全 - 识别结果页面

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
    const imagePath = options.tmp_filePath;
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
        const plant = result.data;
        plant.id = 'plant_' + Date.now();
        plant.image = imagePath;
        
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
          errorMessage: result.error || '识别失败'
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

  readImageAsBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: reject
      });
    });
  },

  toggleFavorite() {
    const { plant, isFavorite } = this.data;
    if (app.removeFavorite) app.removeFavorite(plant.id);
    else if (app.addFavorite) app.addFavorite(plant);
    this.setData({ isFavorite: !isFavorite });
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
  },

  retryIdentify() {
    wx.navigateBack();
  }
});