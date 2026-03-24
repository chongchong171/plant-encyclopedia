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
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
    }
  },

  startTipRotation() {
    this.tipTimer = setInterval(() => {
      if (!this.data.showTips) return;
      let nextIndex = (this.data.currentIndex + 1) % 3;
      this.setData({
        currentIndex: nextIndex,
        currentTip: this.data.tips[nextIndex]
      });
    }, 3000);
  },

  hideTips() {
    this.setData({ showTips: false });
  },

  /**
   * 检查相机授权
   */
  checkCameraAuth() {
    const that = this;
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.camera']) {
          that.setData({ hasCameraAuth: true });
        } else {
          // 没有授权过，尝试授权
          wx.authorize({
            scope: 'scope.camera',
            success() {
              that.setData({ hasCameraAuth: true });
            },
            fail() {
              // 用户拒绝过，需要手动开启
              that.setData({ hasCameraAuth: false });
            }
          });
        }
      },
      fail() {
        that.setData({ hasCameraAuth: false });
      }
    });
  },

  /**
   * 手动授权
   */
  requestCameraAuth() {
    const that = this;
    wx.openSetting({
      success(res) {
        if (res.authSetting['scope.camera']) {
          that.setData({ hasCameraAuth: true });
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
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success(res) {
        that.compressAndNavigate(res.tempFiles[0].tempFilePath);
      },
      fail(err) {
        console.log('选择图片失败', err);
        if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限',
            confirmText: '去设置',
            success(modalRes) {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        }
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
    wx.showToast({ title: '相机打开失败，请检查权限', icon: 'none' });
  },

  onStop() {
    console.log('相机停止');
  }
});