/**
 * 花草百科全书 - 首页
 */
const app = getApp();

Page({
  data: {
    identifyCount: 0,
    identifyLimit: 500,
    vipUser: false
  },

  onLoad() {
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#4CAF50',
    });
  },

  onShow() {
    this.setData({
      identifyCount: app.globalData.identifyCount || 0,
      identifyLimit: app.globalData.identifyLimit || 500,
      vipUser: app.globalData.vipUser || false
    });
  },

  /**
   * 拍照识别
   */
  takePhoto() {
    wx.navigateTo({
      url: '/pages/camera/camera'
    });
  },

  /**
   * 相册选择回调 - 从 button open-type 触发
   */
  onChooseFromAlbum(e) {
    console.log('相册选择回调', e);
    if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
      const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath);
      if (imageFile) {
        wx.navigateTo({
          url: '/pages/result_swiper/result_swiper?tmp_filePath=' + encodeURIComponent(imageFile.tempFilePath)
        });
      }
    }
  },

  /**
   * 跳转到搜索页
   */
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search_page/search_page'
    });
  }
});