/**
 * 养花助手 - 拍照页面
 */
Page({
  data: {},

  /**
   * 拍照
   */
  takePhoto() {
    const ctx = wx.createCameraContext();
    
    ctx.takePhoto({
      quality: 'low',
      success: (res) => {
        const tempImagePath = res.tempImagePath;
        // 压缩图片
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
        // 压缩图片
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
        // 压缩失败就直接用原图
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
  }
});