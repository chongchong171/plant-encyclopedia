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
    plantCount: 0,
    featureFlags: {},  // 远程功能开关
    isAdmin: false,    // 是否管理员
    showProfileGuide: false,
    profileModalMode: 'view',
    tempAvatarUrl: '',
    tempNickname: ''
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
    let storedUserInfo = wx.getStorageSync('userInfo') || {};
    let userInfo = app.globalData.userInfo || storedUserInfo || {};

    // 过滤掉微信强制返回的默认信息（灰色头像 + "微信用户"）
    if (userInfo.nickName === '微信用户') {
      userInfo = { nickName: '', avatarUrl: '' };
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
    }

    const favorites = app.globalData.favorites || [];
    const history = app.globalData.history || [];

    // 读取远程功能开关（配置化改造）
    const featureFlags = app.globalData.featureFlags || {};

    // 检查管理员身份
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    const adminOpenids = app.globalData.appConfig?.adminOpenids || [];
    const isAdmin = adminOpenids.includes(openid);

    this.setData({
      userInfo,
      todayCount: app.globalData.identifyCount || 0,
      totalCount: history.length,
      favoriteCount: favorites.length,
      featureFlags,
      isAdmin
    });

    // 获取植物数量
    try {
      const db = wx.cloud.database()
      const countRes = await db.collection('my_plants').count()
      this.setData({ plantCount: countRes.total })
    } catch (err) {
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
      url: '/package-user/pages/favorites/favorites'
    });
  },

  /**
   * 跳转到历史记录
   */
  goToHistory() {
    wx.navigateTo({
      url: '/package-user/pages/history/history'
    });
  },

  /**
   * 跳转到花友排行榜
   */
  goToRanking() {
    wx.navigateTo({
      url: '/package-user/pages/community-garden/community-garden'
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
   * 打开个人信息弹窗
   * 新用户（未设置头像/昵称）直接进入编辑模式，展示引导文案
   * 老用户先进入展示模式，可点击查看/修改
   */
  getUserProfile() {
    const hasNickname = this.data.userInfo.nickName && this.data.userInfo.nickName !== '微信用户' && this.data.userInfo.nickName !== '植物达人';
    const hasAvatar = this.data.userInfo.avatarUrl && this.data.userInfo.avatarUrl !== '';
    const isNewUser = !hasNickname && !hasAvatar;

    this.setData({
      showProfileGuide: true,
      profileModalMode: isNewUser ? 'edit' : 'view',
      isNewUser,
      tempAvatarUrl: this.data.userInfo.avatarUrl || '',
      tempNickname: this.data.userInfo.nickName || ''
    });
  },

  /**
   * 进入编辑模式
   */
  enterEditMode() {
    this.setData({
      profileModalMode: 'edit'
    });
  },

  /**
   * 关闭完善资料弹窗
   */
  closeProfileGuide() {
    this.setData({
      showProfileGuide: false,
      profileModalMode: 'view',
      tempAvatarUrl: '',
      tempNickname: ''
    });
  },

  /**
   * 选择头像
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ tempAvatarUrl: avatarUrl });
  },

  /**
   * 输入昵称
   */
  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  /**
   * 保存个人信息
   */
  async saveProfile() {
    const { tempNickname, tempAvatarUrl } = this.data;
    const nickname = tempNickname.trim();

    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 如果有本地头像，先上传到云存储
      let avatarUrl = tempAvatarUrl;
      if (tempAvatarUrl && (tempAvatarUrl.startsWith('http://tmp') || tempAvatarUrl.startsWith('wxfile://'))) {
        const cloudPath = `user-avatars/${Date.now()}.jpg`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: tempAvatarUrl
        });
        const tempUrlRes = await wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        });
        avatarUrl = tempUrlRes.fileList[0].tempFileURL;
      }

      // 调用云函数保存
      await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          nickName: nickname,
          avatarUrl: avatarUrl || ''
        }
      });

      // 更新本地缓存
      const userInfo = { nickName: nickname, avatarUrl: avatarUrl || '' };
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      wx.setStorageSync('hasUserInfoAuth', true);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });

      this.setData({
        showProfileGuide: false,
        userInfo
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[Profile] 保存个人信息失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * 跳转到管理控制台（仅管理员）
   */
  goToAdmin() {
    wx.navigateTo({
      url: '/package-admin/pages/admin/admin'
    });
  },

  /**
   * 阻止事件冒泡
   */
  preventBubble() {
    // 空函数，用于 catchtap 阻止冒泡
  },

  /**
   * 头像加载失败处理
   */
  onAvatarError() {
    // 头像加载失败时，清空头像显示花朵emoji
    this.setData({
      'userInfo.avatarUrl': ''
    });
  }
});
