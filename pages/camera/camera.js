/**
 * AI 植物管家 - 拍照页面
 */
const api = require('../../api/index')

Page({
  data: {
    hasCameraAuth: false,
    showTips: true,
    currentIndex: 0,
    mode: 'identify',  // identify 或 diagnosis
    plantId: null,     // 从我的花园来的植物ID
    // 不同入口的拍摄指导
    tipsConfig: {
      identify: [
        { icon: '🌿', title: '拍整株', desc: '拍一张植物整体照片，清晰展示植物特征' },
        { icon: '📸', title: '光线充足', desc: '选择明亮的地方，避免背光或阴影' },
        { icon: '🎯', title: '对焦清晰', desc: '保持相机稳定，确保植物清晰对焦' }
      ],
      garden: [
        { icon: '🪴', title: '拍植物', desc: '拍摄植物的正面，展示植物的全貌' },
        { icon: '📐', title: '构图美观', desc: '将植物放在画面中央，背景简洁' },
        { icon: '💡', title: '光线自然', desc: '选择自然光，避免强烈反光' }
      ],
      diagnosis: [
        { icon: '🌿', title: '拍整株', desc: '拍一张植物整体照片，便于识别问题' },
        { icon: '🍃', title: '拍叶片', desc: '近距离拍摄叶子，可诊断黄叶、斑点等问题' },
        { icon: '🪴', title: '拍土壤', desc: '拍摄花盆和土壤，可判断浇水是否合理' }
      ]
    },
    currentTip: null
  },

  onLoad(options) {
    const mode = options.mode || 'identify';
    const plantId = options.plantId;
    
    // 确定提示类型
    let tipsType = 'identify';
    if (plantId) {
      tipsType = 'garden';  // 我的花园添加头图
    } else if (mode === 'diagnosis') {
      tipsType = 'diagnosis';  // 诊断功能
    }
    
    const tips = this.data.tipsConfig[tipsType];
    
    this.setData({ 
      currentTip: tips[0],
      mode: mode,
      plantId: plantId,
      plantName: options.plantName,
      showTips: true,
      currentTips: tips
    });
    this.checkCameraAuth();
    this.startTipRotation();
  },

  onUnload() {
    if (this.tipTimer) clearInterval(this.tipTimer);
  },

  startTipRotation() {
    this.tipTimer = setInterval(() => {
      if (!this.data.showTips) return;
      const tips = this.data.currentTips;
      let nextIndex = (this.data.currentIndex + 1) % tips.length;
      this.setData({
        currentIndex: nextIndex,
        currentTip: tips[nextIndex]
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
          wx.authorize({
            scope: 'scope.camera',
            success() {
              that.setData({ hasCameraAuth: true });
            },
            fail() {
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
   * 从相册选择（小按钮，不影响主要体验）
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
              if (modalRes.confirm) wx.openSetting();
            }
          });
        }
      }
    });
  },

  /**
   * 压缩图片并处理
   */
  compressAndNavigate(imagePath) {
    const mode = this.data.mode;
    const plantId = this.data.plantId;
    
    wx.showLoading({ title: '处理中...' });
    wx.compressImage({
      src: imagePath,
      quality: 50,
      success: (res) => {
        wx.hideLoading();
        
        if (plantId) {
          // 从我的花园页面来的，直接上传图片并更新植物
          this.uploadPlantPhoto(plantId, res.tempFilePath);
        } else if (mode === 'diagnosis') {
          // 诊断模式：返回上一页并传递图片路径
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage) {
            prevPage.setData({
              problemImage: res.tempFilePath,
              aiDetectedDiseases: []
            });
          }
          wx.navigateBack();
        } else {
          // 识别模式：跳转到识别结果页
          wx.navigateTo({
            url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(res.tempFilePath)}`
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        
        if (plantId) {
          // 从我的花园页面来的，直接上传图片并更新植物
          this.uploadPlantPhoto(plantId, imagePath);
        } else if (mode === 'diagnosis') {
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage) {
            prevPage.setData({
              problemImage: imagePath,
              aiDetectedDiseases: []
            });
          }
          wx.navigateBack();
        } else {
          wx.navigateTo({
            url: `/pages/result_swiper/result_swiper?tmp_filePath=${encodeURIComponent(imagePath)}`
          });
        }
      }
    });
  },

  /**
   * 上传植物照片
   */
  async uploadPlantPhoto(plantId, imagePath) {
    wx.showLoading({ title: '上传中...' });

    try {
      const result = await api.plant.uploadPlantImage(plantId, imagePath)

      wx.hideLoading();

      if (result.success) {
        wx.showToast({
          title: '照片已更新',
          icon: 'success'
        });

        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      } else {
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[Camera] 上传照片失败:', err);
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      });
    }
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