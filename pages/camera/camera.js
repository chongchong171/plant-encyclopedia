/**
 * 花草百科全书 - 拍照页面
 */
Page({
  data: {
    // 状态（标准）
    loading: false,
    error: false,
    errorMessage: '',
    
    // UI 状态
    showTips: true,
    currentIndex: 0,
    currentTip: null,
    
    // 提示数据
    tips: [
      { icon: '🌿', title: '拍整株', desc: '拍一张植物整体照片，便于识别品种' },
      { icon: '🍃', title: '拍叶片', desc: '近距离拍摄叶子，可诊断黄叶、斑点等问题' },
      { icon: '🪴', title: '拍土壤', desc: '拍摄花盆和土壤，可判断浇水是否合理' }
    ]
  },

  onLoad() {
    this.setData({ currentTip: this.data.tips[0] });
    this.startTipRotation();
  },

  onUnload() {
    if (this.tipTimer) clearInterval(this.tipTimer);
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
    }, 3000);
  },

  /**
   * 隐藏提示
   */
  hideTips() {
    this.setData({ showTips: false });
  },

  /**
   * 拍照回调
   */
  onTakePhoto(e) {
    console.log('拍照回调', e);
    if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
      const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath);
      if (imageFile) {
        this.compressAndNavigate(imageFile.tempFilePath);
      }
    }
  },

  /**
   * 相册选择回调
   */
  onChooseFromAlbum(e) {
    console.log('相册选择回调', e);
    if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
      const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath);
      if (imageFile) {
        this.compressAndNavigate(imageFile.tempFilePath);
      }
    }
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

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});