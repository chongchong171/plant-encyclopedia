/**
 * AI 植物管家 - 主入口文件
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
    needUserInfoAuth: false,
    
    // 会话时长统计
    launchTime: Date.now(),
    
    // API Key 配置 - 建议从云函数环境变量获取
    // 本地开发时可临时配置以下值（生产环境请移除）
    // plantnetApiKey: 云函数环境变量 PLANTNET_API_KEY
    // baiduApiKey: 云函数环境变量 BAIDU_API_KEY
    // baiduSecretKey: 云函数环境变量 BAIDU_SECRET_KEY
    
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

  async onLaunch() {
    console.log('🌸 AI 植物管家启动~');

    // 记录启动时间
    this.globalData.launchTime = Date.now();

    if (wx.cloud) {
      wx.cloud.init({
        env: 'plant-encyclopedia-8d9x10139590b',
        traceUser: true
      });
    }

    // 并行执行独立的初始化任务，减少串行阻塞
    await Promise.all([
      this.loadAppConfig().catch(err => {
        console.warn('[app] 配置加载失败:', err);
      }),
      this.login().catch(err => {
        console.warn('[app] 登录失败:', err);
      })
    ]);

    // 本地操作不阻塞
    this.getUserInfo();
    this.loadLocalData();

    // 埋点不阻塞主流程
    this.trackAnalytics('user_visit');

    // 标记需要引导授权（在首页由用户点击触发）
    if (this.globalData.needUserInfoAuth) {
      console.log('[app] 需要引导用户授权信息');
    }
  },

  /**
   * 加载远程配置（云数据库）
   * 配置化改造核心：把会变的东西放到云端，无需重新发版审核
   */
  async loadAppConfig() {
    const now = Date.now();
    const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

    // 如果缓存有效，直接返回
    if (this.globalData._configCacheTime &&
        now - this.globalData._configCacheTime < CACHE_TTL) {
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'getAppConfig',
        timeout: 5000 // 缩短超时，避免阻塞
      });

      if (res.result && res.result.success) {
        this.globalData.appConfig = res.result.config || {};
        this.globalData.featureFlags = res.result.flags || {};
        this.globalData._configCacheTime = now;
        console.log('[app] 远程配置加载成功', this.globalData.featureFlags);
      } else {
        console.warn('[app] 远程配置加载失败，使用本地默认');
      }
    } catch (err) {
      console.error('[app] 加载远程配置出错:', err);
      // 出错时不覆盖已有缓存，避免功能开关突然失效
      if (!this.globalData._configCacheTime) {
        this.globalData.appConfig = {};
        this.globalData.featureFlags = {};
      }
    }
  },

  async login() {
    try {
      // 调用云函数获取 openid + 检查用户信息
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {},
        timeout: 10000
      });
      
      if (res.result && res.result.openid) {
        const openid = res.result.openid;
        this.globalData.openid = openid;
        this.globalData.hasLogin = true;
        wx.setStorageSync('openid', openid);

        const maskedOpenId = openid.substring(0, 4) + '****' + openid.substring(openid.length - 4);

        // 检查是否已有用户信息
        if (res.result.hasUserInfo && res.result.userInfo) {
          this.globalData.userInfo = res.result.userInfo;
          wx.setStorageSync('userInfo', res.result.userInfo);
          console.log('✅ 登录成功，OPENID:', maskedOpenId, '用户信息已存在');
          console.log('📋 完整 OPENID（复制到管理员白名单）:', openid);
        } else {
          console.log('✅ 登录成功，OPENID:', maskedOpenId, '需要引导用户授权信息');
          console.log('📋 完整 OPENID（复制到管理员白名单）:', openid);
          // 标记需要引导授权
          this.globalData.needUserInfoAuth = true;
        }
      } else {
        console.error('❌ 登录失败:', res.result);
      }
    } catch (err) {
      console.error('❌ 登录出错:', err);
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
      // 埋点：收藏植物
      this.trackAnalytics('favorite_plant', { plantName: plant.name || plant.plantName });
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
  },

  /**
   * 数据分析埋点（批量合并，2秒内的事件合并发送）
   */
  trackAnalytics(eventType, extraData = {}) {
    this._analyticsQueue = this._analyticsQueue || [];
    this._analyticsQueue.push({ event: eventType, data: extraData, time: Date.now() });

    // 防抖：2 秒内的事件合并发送
    clearTimeout(this._analyticsTimer);
    this._analyticsTimer = setTimeout(() => this._flushAnalytics(), 2000);
  },

  _flushAnalytics() {
    if (!this._analyticsQueue || this._analyticsQueue.length === 0) return;

    const events = this._analyticsQueue.splice(0, this._analyticsQueue.length);

    wx.cloud.callFunction({
      name: 'analytics_track',
      data: { events },
      timeout: 5000
    }).catch(err => {
      console.warn('[analytics] 埋点失败:', err);
    });
  },

  /**
   * 小程序隐藏时记录会话结束
   */
  onHide() {
    const duration = Date.now() - this.globalData.launchTime;
    this.trackAnalytics('session_end', { duration });
  },

  /**
   * 小程序销毁时记录会话结束
   */
  onDestroy() {
    const duration = Date.now() - this.globalData.launchTime;
    this.trackAnalytics('session_end', { duration });
  },

  /**
   * 引导用户授权获取用户信息（昵称、头像）
   * ⚠️ wx.getUserProfile 已于 2022 年 10 月废弃，不再返回真实用户信息
   */
  guideUserInfoAuth() {
    // 检查是否已经响应过引导
    const hasAuthed = wx.getStorageSync('hasUserInfoAuth');
    if (hasAuthed) return;

    // 弹窗引导（文案已更新，不再承诺获取真实微信信息）
    wx.showModal({
      title: '完善个人信息',
      content: '微信已调整用户信息获取规则，自动获取昵称和头像功能已不可用。如需展示在排行榜中，请前往个人中心手动设置。',
      confirmText: '知道了',
      showCancel: false,
      success: () => {
        wx.setStorageSync('hasUserInfoAuth', true);
        this.globalData.needUserInfoAuth = false;
      }
    });
  },

  /**
   * 获取用户信息（微信授权）
   * ⚠️ wx.getUserProfile 已废弃，调用只会返回固定昵称"微信用户"和默认灰色头像
   * 此方法保留供兼容，实际不再调用微信 API
   */
  getUserProfile() {
    wx.showModal({
      title: '提示',
      content: '微信已调整用户信息获取规则，自动获取昵称头像功能已不可用。如需设置个人信息，请使用编辑资料功能。',
      showCancel: false,
      confirmText: '知道了'
    });

    // 记录已响应，避免重复弹窗
    wx.setStorageSync('hasUserInfoAuth', true);
    this.globalData.needUserInfoAuth = false;
    this.trackAnalytics('user_info_auth', { success: false, reason: 'deprecated_api' });
  }

});