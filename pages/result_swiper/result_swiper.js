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
    console.log('结果页加载，参数:', options);
    
    // 解码文件路径
    const imagePath = decodeURIComponent(options.tmp_filePath || '');
    
    if (!imagePath) {
      console.error('未获取到图片路径');
      this.setData({ 
        loading: false, 
        identifyError: true, 
        errorMessage: '未获取到图片' 
      });
      return;
    }
    
    console.log('图片路径:', imagePath);
    this.setData({ imagePath });
    this.identifyPlant(imagePath);
  },

  async identifyPlant(imagePath) {
    wx.showLoading({ title: '识别中...' });
    
    try {
      console.log('开始读取图片...');
      const base64 = await this.readImageAsBase64(imagePath);
      console.log('图片读取成功，长度:', base64.length);
      
      console.log('调用识别API...');
      const result = await plantIdentify.identifyPlant(base64);
      console.log('识别结果:', result);
      
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
        
        console.log('识别成功:', plant.name);
      } else {
        console.error('识别失败:', result.error);
        this.setData({
          loading: false,
          identifyError: true,
          errorMessage: result.error || '识别失败，请重试'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('识别出错:', error);
      this.setData({
        loading: false,
        identifyError: true,
        errorMessage: error.message || '识别出错，请重试'
      });
    }
  },

  readImageAsBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          console.log('Base64读取成功');
          resolve(res.data);
        },
        fail: (err) => {
          console.error('Base64读取失败:', err);
          reject(err);
        }
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
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
  },

  retryIdentify() {
    wx.navigateBack();
  }
});