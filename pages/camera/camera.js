/**
 * 花草百科全书 - 拍照页面
 */
Page({
  data: {
    hasCameraAuth: false,
    showTips: true,
    currentIndex: 0,
    tips: [
      {
        icon: '🌿',
        title: '拍整株',
        desc: '拍一张植物整体照片，便于识别品种'
      },
      {
        icon: '🍃',
        title: '拍叶片',
        desc: '近距离拍摄叶子，可诊断黄叶、斑点等问题'
      },
      {
        icon: '🪴',
        title: '拍土壤',
        desc: '拍摄花盆和土壤，可判断浇水是否合理'
      }
    ],
    currentTip: null
  },

  onLoad() {
    this.setData({ currentTip: this.data.tips[0] });
    this.checkCameraAuth();
    this.startTipRotation();
  },

  onUnload() {
    // 清除定时器
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
    }
  },

  /**
   * 自动切换提示
   */
  startTipRotation() {
    this.tipTimer = setInterval(() => {
      if (!this.data.showTips) return;
      
      let nextIndex = (this.data.currentIndex + 1) % 3;
      this.setData({
        currentIndex: nextIndex,
        currentTip: this.data.tips[nextIndex]
      });
    }, 3000); // 每3秒切换
  },

  /**
   * 隐藏提示
   */
  hideTips() {
    this.setData({ showTips: false });
  },

  /**
   * 检查相机授权
   */
  checkCameraAuth() {
    // 直接设置为 true，让 camera 组件自己处理授权
    // 如果用户拒绝，camera 组件会触发 binderror 事件
    this.setData({ hasCameraAuth: true });
  },

  /**
   * 请求相机授权
   */
  requestCameraAuth() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.camera']) {
          this.setData({ hasCameraAuth: true });
          wx.showToast({ title: '授权成功', icon: 'success' });
        }
      }
    });
  },

  /**
   * 拍照
   */
  takePhoto() {
    const ctx = wx.createCameraContext();
    
    ctx.takePhoto({
      quality: 'low',
      success: (res) => {
        this.compressAndNavigate(res.tempImagePath);
      },
      fail: (err) => {
        wx.showToast({ title: '拍照失败', icon: 'none' });
        console.error('拍照失败', err);
      }
    });
  },

  /**
   * 从相册选择
   */
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.compressAndNavigate(res.tempFilePaths[0]);
      }
    });
  },

  /**
   * 压缩图片并跳转
   */
  compressAndNavigate(imagePath) {
    wx.showLoading({ title: '处理中...' });
    
    wx.compressImage({
      src: imagePath,
      quality: 50,
      success: (res) => {
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(res.tempFilePath)}`
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(imagePath)}`
        });
      }
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onError(e) {
    console.error('相机错误', e.detail);
    wx.showToast({ title: '相机打开失败', icon: 'none' });
  },

  onStop() {
  }
});