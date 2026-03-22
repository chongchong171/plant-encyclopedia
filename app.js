/**
 * 植物百科大全 - 主入口文件
 * 
 * @description 拍照识别植物，一键获取养殖指南
 * @version 1.0.0
 * @date 2026-03-23
 */

App({
  /**
   * 全局数据
   */
  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: null,
    
    // API 配置
    apiKey: 'sk-d43b58a6d0dd486d89b69a38f305483a', // 通义千问 API Key
    
    // 用户数据
    identifyCount: 0,      // 今日识别次数
    identifyLimit: 3,      // 免费用户每日限制
    vipUser: false,        // 是否 VIP
    
    // 植物数据缓存
    plantCache: {}
  },

  /**
   * 小程序启动
   */
  onLaunch() {
    console.log('🌱 植物百科大全启动~');
    
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-0ga8zde717e08345',
        traceUser: true
      });
      console.log('☁️ 云开发已初始化');
    }
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取用户信息
    this.getUserInfo();
    
    // 加载本地数据
    this.loadLocalData();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const openid = wx.getStorageSync('openid');
    if (openid) {
      this.globalData.openid = openid;
      this.globalData.hasLogin = true;
    }
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  /**
   * 加载本地数据
   */
  loadLocalData() {
    // 加载收藏
    const favorites = wx.getStorageSync('favorites') || [];
    this.globalData.favorites = favorites;
    
    // 加载历史
    const history = wx.getStorageSync('history') || [];
    this.globalData.history = history;
    
    // 加载今日识别次数
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

  /**
   * 检查是否可以识别
   */
  canIdentify() {
    if (this.globalData.vipUser) {
      return { canIdentify: true, message: 'VIP 用户无限识别' };
    }
    
    if (this.globalData.identifyCount < this.globalData.identifyLimit) {
      return { canIdentify: true, message: `今日还可识别 ${this.globalData.identifyLimit - this.globalData.identifyCount} 次` };
    }
    
    return { canIdentify: false, message: '今日识别次数已用完，升级 VIP 解锁无限识别' };
  },

  /**
   * 记录识别次数
   */
  recordIdentify() {
    if (!this.globalData.vipUser) {
      this.globalData.identifyCount++;
      wx.setStorageSync('identifyCount', this.globalData.identifyCount);
    }
  },

  /**
   * 添加收藏
   */
  addFavorite(plant) {
    const favorites = this.globalData.favorites || [];
    const exists = favorites.find(f => f.id === plant.id);
    
    if (!exists) {
      favorites.unshift({
        ...plant,
        addTime: Date.now()
      });
      this.globalData.favorites = favorites;
      wx.setStorageSync('favorites', favorites);
      return true;
    }
    
    return false;
  },

  /**
   * 移除收藏
   */
  removeFavorite(plantId) {
    let favorites = this.globalData.favorites || [];
    favorites = favorites.filter(f => f.id !== plantId);
    this.globalData.favorites = favorites;
    wx.setStorageSync('favorites', favorites);
  },

  /**
   * 检查是否已收藏
   */
  isFavorite(plantId) {
    const favorites = this.globalData.favorites || [];
    return favorites.some(f => f.id === plantId);
  },

  /**
   * 添加历史记录
   */
  addHistory(plant) {
    let history = this.globalData.history || [];
    
    // 移除旧记录
    history = history.filter(h => h.id !== plant.id);
    
    // 添加到最前面
    history.unshift({
      ...plant,
      time: Date.now()
    });
    
    // 只保留最近 50 条
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    this.globalData.history = history;
    wx.setStorageSync('history', history);
  }
});