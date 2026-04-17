/**
 * 个人中心页面
 */
const app = getApp();

Page({
  data: {
    userInfo: {},
    todayCount: 0,
    totalCount: 0,
    favoriteCount: 0,
    plantCount: 0
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    // 更新自定义 tabBar
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, homePage: false })
    }
    this.loadUserData();
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    // 优先从本地存储获取用户信息
    const storedUserInfo = wx.getStorageSync('userInfo') || {};
    const userInfo = app.globalData.userInfo || storedUserInfo || {};
    const favorites = app.globalData.favorites || [];
    const history = app.globalData.history || [];
    
    this.setData({
      userInfo,
      todayCount: app.globalData.identifyCount || 0,
      totalCount: history.length,
      favoriteCount: favorites.length
    });
    
    // 获取植物数量
    try {
      const db = wx.cloud.database()
      const countRes = await db.collection('my_plants').count()
      this.setData({ plantCount: countRes.total })
    } catch (err) {
      console.log('获取植物数量失败:', err)
    }
  },

  /**
   * 跳转到我的花园
   */
  goToMyPlants() {
    wx.switchTab({
      url: '/pages/my-plants/my-plants'
    });
  },

  /**
   * 跳转到收藏
   */
  goToFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  },

  /**
   * 跳转到历史记录
   */
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  /**
   * 意见反馈
   */
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系：\n\n邮箱：joyce.wang@dorblecapital.com\n\n我们会在 24 小时内回复！',
      showCancel: false
    });
  },

  /**
   * 关于我们
   */
  showAbout() {
    wx.showModal({
      title: 'AI 植物管家',
      content: '版本：1.0.0\n\n拍照识别植物，一键获取养殖指南。\n\n让每个人都能养好花！',
      showCancel: false
    });
  },

  /**
   * 获取/更新用户信息
   */
  getUserProfile() {
    const app = getApp();
    
    // 检查是否已经授权
    const hasAuthed = wx.getStorageSync('hasUserInfoAuth');
    if (hasAuthed && app.globalData.userInfo?.nickName) {
      wx.showModal({
        title: '个人信息',
        content: `当前昵称：${app.globalData.userInfo.nickName}\n\n点击确定可重新授权更新`,
        success: (res) => {
          if (res.confirm) {
            app.getUserProfile();
          }
        }
      });
      return;
    }
    
    // 引导授权
    app.getUserProfile();
  },

  /**
   * 头像加载失败处理
   */
  onAvatarError() {
    // 头像加载失败时，使用本地默认图标
    this.setData({
      'userInfo.avatarUrl': '/image/unknow_icon.png'
    });
  }
});
