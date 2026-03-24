/**
 * 花草百科全书 - 主入口文件
 * 
 * @description 拍照识别植物，一键获取养护指南
 * @version 1.0.0
 * @date 2026-03-23
 */

App({
  globalData: {
    // 用户信息
    userInfo: null,
    hasLogin: false,
    openid: null,
    vipUser: false,
    
    // API Key 配置（统一管理）
    qwenApiKey: 'sk-d43b58a6d0dd486d89b69a38f305483a',
    plantnetApiKey: '2b10FL68fQYQN3rsOHf9xCrSe',
    
    // 热门植物配置（统一管理）
    hotPlants: [
      '绿萝', '多肉', '君子兰', '发财树',
      '蝴蝶兰', '吊兰', '龟背竹', '富贵竹',
      '仙人掌', '芦荟', '栀子花', '茉莉花'
    ],
    
    // 识别额度
    identifyCount: 0,
    identifyLimit: 500,  // PlantNet 免费 500次/天
    plantCache: {},
    
    // 用户数据
    favorites: [],
    history: []
  },

  onLaunch() {
    console.log('🌸 花草百科全书启动~');
    
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-0ga8zde717e08345',
        traceUser: true
      });
    }
    
    this.checkLoginStatus();
    this.getUserInfo();
    this.loadLocalData();
  },

  checkLoginStatus() {
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.globalData.openid = openid;
      this.globalData.hasLogin = true;
    }
  },

  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  loadLocalData() {
    const favorites = wx.getStorageSync('favorites') || [];
    this.globalData.favorites = favorites;
    
    const history = wx.getStorageSync('history') || [];
    this.globalData.history = history;
    
    const today = new Date().toDateString();
    const lastDate = wx.getStorageSync('lastIdentifyDate');
    if (lastDate === today) {
      this.globalData.identifyCount = wx.getStorageSync('identifyCount') || 0;
    } else {
      this.globalData.identifyCount = 0;
      wx.setStorageSync('lastIdentifyDate', today);
      wx.setStorageSync('identifyCount', 0);
    }
  },

  canIdentify() {
    if (this.globalData.identifyCount < this.globalData.identifyLimit) {
      return { canIdentify: true, message: `今日还可识别 ${this.globalData.identifyLimit - this.globalData.identifyCount} 次` };
    }
    return { canIdentify: false, message: '今日识别次数已用完' };
  },

  recordIdentify() {
    this.globalData.identifyCount++;
    wx.setStorageSync('identifyCount', this.globalData.identifyCount);
  },

  addFavorite(plant) {
    const favorites = this.globalData.favorites || [];
    const exists = favorites.find(f => f.id === plant.id);
    if (!exists) {
      favorites.unshift({ ...plant, addTime: Date.now() });
      this.globalData.favorites = favorites;
      wx.setStorageSync('favorites', favorites);
      return true;
    }
    return false;
  },

  removeFavorite(plantId) {
    let favorites = this.globalData.favorites || [];
    favorites = favorites.filter(f => f.id !== plantId);
    this.globalData.favorites = favorites;
    wx.setStorageSync('favorites', favorites);
  },

  isFavorite(plantId) {
    const favorites = this.globalData.favorites || [];
    return favorites.some(f => f.id === plantId);
  },

  addHistory(plant) {
    let history = this.globalData.history || [];
    history = history.filter(h => h.id !== plant.id);
    history.unshift({ ...plant, time: Date.now() });
    if (history.length > 50) history = history.slice(0, 50);
    this.globalData.history = history;
    wx.setStorageSync('history', history);
  }
});