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
   * 从相册选择
   */
  chooseFromAlbum() {
    console.log('首页点击相册选择');
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        console.log('选择成功', res);
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.navigateTo({
          url: '/pages/result_swiper/result_swiper?tmp_filePath=' + encodeURIComponent(tempFilePath)
        });
      },
      fail: (err) => {
        console.log('选择图片失败, 完整错误:', JSON.stringify(err));
        wx.showToast({ 
          title: '失败: ' + (err.errMsg || '未知'), 
          icon: 'none',
          duration: 3000
        });
        if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限',
            confirmText: '去设置',
            success: (modalRes) => {
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
   * 跳转到搜索页
   */
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search_page/search_page'
    });
  }
});