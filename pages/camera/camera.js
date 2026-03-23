/**
 * 植物百科大全 - 拍照页面
 */
Page({
  data: {},

  /**
   * 拍照
   */
  takePhoto() {
    const ctx = wx.createCameraContext();
    
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        const tempImagePath = res.tempImagePath;
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(tempImagePath)}`
        });
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
        wx.navigateTo({
          url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(tempImagePath)}`
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