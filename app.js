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
    // qwenApiKey: 云函数环境变量 QWEN_API_KEY
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
    
    // 先登录获取 openid
    await this.login();
    this.getUserInfo();
    this.loadLocalData();
    
    // 记录用户访问埋点
    this.trackAnalytics('user_visit');
    
    // 标记需要引导授权（在首页由用户点击触发）
    if (this.globalData.needUserInfoAuth) {
      console.log('[app] 需要引导用户授权信息');
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
        
        // 检查是否已有用户信息
        if (res.result.hasUserInfo && res.result.userInfo) {
          this.globalData.userInfo = res.result.userInfo;
          wx.setStorageSync('userInfo', res.result.userInfo);
          console.log('✅ 登录成功，OPENID:', openid, '用户信息已存在');
        } else {
          console.log('✅ 登录成功，OPENID:', openid, '需要引导用户授权信息');
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
   * 数据分析埋点
   */
  trackAnalytics(eventType, extraData = {}) {
    const openId = this.globalData.openId || wx.getStorageSync('openid');
    if (!openId) return;
    
    wx.cloud.callFunction({
      name: 'analytics_track',
      data: {
        event: eventType,
        openId,
        data: extraData
      },
      timeout: 5000  // 不阻塞，超时也不影响主流程
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
   */
  guideUserInfoAuth() {
    // 检查是否已经授权过
    const hasAuthed = wx.getStorageSync('hasUserInfoAuth');
    if (hasAuthed) return;
    
    // 弹窗引导
    wx.showModal({
      title: '完善个人信息',
      content: '授权后我们将保存您的昵称和头像，用于排行榜展示和会员服务～',
      confirmText: '立即授权',
      cancelText: '以后再说',
      success: (res) => {
        if (res.confirm) {
          this.getUserProfile();
        }
      }
    });
  },

  /**
   * 获取用户信息（微信授权）
   */
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员信息',
      success: (res) => {
        const userInfo = res.userInfo;

        // 存储到本地
        this.globalData.userInfo = userInfo;
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('hasUserInfoAuth', true);

        // 上传到云数据库
        wx.cloud.callFunction({
          name: 'updateUserInfo',
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender,
            country: userInfo.country,
            province: userInfo.province,
            city: userInfo.city
          },
          timeout: 10000
        }).then(() => {
          console.log('✅ 用户信息已保存');
          this.globalData.needUserInfoAuth = false;

          // 记录埋点
          this.trackAnalytics('user_info_auth', { success: true });

          // 关闭首页的授权提示条（如果在首页）
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          if (currentPage && currentPage.setData && currentPage.data.showAuthBar !== undefined) {
            currentPage.setData({ showAuthBar: false })
          }

          // 刷新当前页面数据
          if (currentPage && currentPage.setData) {
            currentPage.setData({ userInfo });
          }

          wx.showToast({ title: '授权成功', icon: 'success', duration: 2000 })
        }).catch(err => {
          console.warn('❌ 保存用户信息失败:', err);
          wx.showToast({ title: '保存失败', icon: 'none' });
        });
      },
      fail: (err) => {
        console.log('用户拒绝授权');
        this.trackAnalytics('user_info_auth', { success: false });
      }
    });
  }

});