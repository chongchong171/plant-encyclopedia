/**
 * 养花助手 - 拍照页面
 */
Page({
  data: {
    hasCameraAuth: false
  },

  onLoad() {
    this.checkCameraAuth();
  },

  /**
   * 检查相机授权
   */
  checkCameraAuth() {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera']) {
          // 已授权
          this.setData({ hasCameraAuth: true });
        } else {
          // 未授权，尝试授权
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              this.setData({ hasCameraAuth: true });
            },
            fail: () => {
              // 用户拒绝授权
              this.setData({ hasCameraAuth: false });
            }
          });
        }
      },
      fail: () => {
        this.setData({ hasCameraAuth: false });
      }
    });
  },

  /**
   * 请求相机授权
   */
  requestCameraAuth() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.camera']) {
          this.setData({ hasCameraAuth: true });
          wx.showToast({
            title: '授权成功',
            icon: 'success'
          });
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
        const tempImagePath = res.tempImagePath;
        this.compressAndNavigate(tempImagePath);
      },
      fail: (err) => {
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
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
        const tempImagePath = res.tempFilePaths[0];
        this.compressAndNavigate(tempImagePath);
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
        console.log('压缩后路径:', res.tempFilePath);
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(res.tempFilePath)}`
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.log('压缩失败，使用原图:', err);
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(imagePath)}`
        });
      }
    });
  },

  /**
   * 返回
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 相机错误
   */
  onError(e) {
    console.error('相机错误', e.detail);
    wx.showToast({
      title: '相机打开失败',
      icon: 'none'
    });
  },

  /**
   * 相机停止
   */
  onStop() {
    console.log('相机已停止');
  }
});