/**
 * 植物百科大全 - 首页
 */
const app = getApp();

Page({
  data: {
    identifyCount: 0,
    identifyLimit: 3,
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
      identifyLimit: app.globalData.identifyLimit || 3,
      vipUser: app.globalData.vipUser || false
    });
  },

  /**
   * 拍照识别
   */
  takePhoto() {
    const result = app.canIdentify();
    if (!result.canIdentify) {
      wx.showModal({
        title: '提示',
        content: result.message,
        confirmText: '开通VIP',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({ title: '功能开发中', icon: 'none' });
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/camera/camera'
    });
  },

  /**
   * 从相册选择
   */
  chooseFromAlbum() {
    const result = app.canIdentify();
    if (!result.canIdentify) {
      wx.showModal({
        title: '提示',
        content: result.message,
        confirmText: '开通VIP',
        success: (res) => {
          if (res.confirm) {
            wx.showToast({ title: '功能开发中', icon: 'none' });
          }
        }
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        wx.navigateTo({
          url: '/pages/result_swiper/result_swiper?tmp_filePath=' + tempFilePaths[0]
        });
      },
      fail: (err) => {
        console.log('选择图片失败', err);
      }
    });
  },

  /**
   * 跳转到搜索页
   */
  goToSearch() {
    wx.switchTab({
      url: '/pages/search_page/search_page'
    });
  }
});