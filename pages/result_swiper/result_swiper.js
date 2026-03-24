/**
 * 养花助手 - 识别结果页面
 */
const app = getApp();
const plantIdentify = require('../../utils/plantIdentify');

Page({
  data: {
    loading: true,
    imagePath: '',
    plant: null,
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
        // 使用符合设计规范的数据结构
        const plant = {
          // 基本信息
          id: result.data.id || 'plant_' + Date.now(),
          name: result.data.name || '植物',
          commonNames: result.data.commonNames || '',
          scientificName: result.data.scientificName || '',
          family: result.data.family || '未知',
          
          // 详细信息
          plantProfile: result.data.plantProfile || '',
          growthHabit: result.data.growthHabit || '',
          distribution: result.data.distribution || '',
          mainValue: result.data.mainValue || '',
          description: result.data.description || '',
          
          // 养护指南
          careGuide: result.data.careGuide || {
            light: '适中光照',
            water: '适量浇水',
            temperature: '室温'
          },
          
          // 难度评估
          difficultyLevel: result.data.difficultyLevel || 3,
          difficultyText: result.data.difficultyText || '适合有一定经验的养护者',
          
          // 快速信息
          quickTips: result.data.quickTips || [],
          
          // 健康诊断
          healthStatus: result.data.healthStatus || '健康',
          issues: result.data.issues || [],
          overallAdvice: result.data.overallAdvice || '',
          
          // 元数据
          image: imagePath,
          confidence: result.data.confidence || 0,
          source: result.data.source || 'AI识别',
          quotaRemaining: result.data.quotaRemaining
        };
        
        console.log('✅ 识别成功:', plant.name);
        console.log('📊 来源:', plant.source);
        console.log('📊 置信度:', plant.confidence);
        
        this.setData({ loading: false, plant });
        
        // 记录识别次数
        if (app.recordIdentify) app.recordIdentify();
        
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