/**
 * 个人中心页面
 */
const app = getApp();

Page({
  data: {
    userInfo: {},
    vipUser: false,
    todayCount: 0,
    totalCount: 0,
    favoriteCount: 0
  },

  onLoad() {
    this.loadUserData();
  },

  onShow() {
    this.loadUserData();
  },

  /**
   * 加载用户数据
   */
  loadUserData() {
    const userInfo = app.globalData.userInfo || {};
    const favorites = app.globalData.favorites || [];
    const history = app.globalData.history || [];
    
    this.setData({
      userInfo,
      vipUser: app.globalData.vipUser,
      todayCount: app.globalData.identifyCount || 0,
      totalCount: history.length,
      favoriteCount: favorites.length
    });
  },

  /**
   * 跳转到历史页面
   */
  goToHistory() {
    wx.switchTab({
      url: '/pages/history/history'
    });
  },

  /**
   * 跳转到收藏页面
   */
  goToFavorites() {
    wx.switchTab({
      url: '/pages/favorites/favorites'
    });
  },

  /**
   * 显示 VIP 信息
   */
  showVipInfo() {
    wx.showModal({
      title: 'VIP 会员',
      content: 'VIP会员享受：\n1. 无限次识别\n2. 无广告\n3. 养护提醒\n4. 专属客服\n\n价格：¥9.9/月 或 ¥99/年',
      confirmText: '立即开通',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 意见反馈
   */
  showFeedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系：\n\n邮箱：feedback@example.com',
      showCancel: false
    });
  },

  /**
   * 关于我们
   */
  showAbout() {
    wx.showModal({
      title: '花草百科全书',
      content: '版本：1.0.0\n\n拍照识别植物，一键获取养殖指南。\n\n让每个人都能养好花！',
      showCancel: false
    });
  }
});