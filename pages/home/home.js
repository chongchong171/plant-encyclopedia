/**
 * 养花助手 - 首页
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
   * 从相册选择
   */
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        wx.navigateTo({
          url: '/pages/result_swiper/result_swiper?tmp_filePath=' + encodeURIComponent(tempFilePaths[0])
        });
      },
      fail: (err) => {
      }
    });
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