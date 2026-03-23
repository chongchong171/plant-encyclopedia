/**
 * 养花助手 - 首页
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
        console.log('选择图片失败', err);
      }
    });
  },

  /**
   * 测试API连接
   */
  testAPI() {
    wx.showLoading({ title: '测试中...' });
    
    wx.request({
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      method: 'POST',
      header: {
        'Authorization': 'Bearer sk-d43b58a6d0dd486d89b69a38f305483a',
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: '你好，请回复"API测试成功"'
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        console.log('API测试响应:', res);
        
        if (res.statusCode === 200 && res.data?.choices?.[0]?.message?.content) {
          const content = res.data.choices[0].message.content;
          wx.showModal({
            title: '✅ API测试成功',
            content: `响应: ${content}\n\nAPI连接正常，请检查:\n1. 图片格式是否正确\n2. 是否已勾选"不校验域名"`,
            showCancel: false
          });
        } else {
          wx.showModal({
            title: '❌ API响应异常',
            content: `状态码: ${res.statusCode}\n响应: ${JSON.stringify(res.data).substring(0, 200)}`,
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('API测试失败:', err);
        wx.showModal({
          title: '❌ 网络请求失败',
          content: `错误: ${err.errMsg}\n\n请检查:\n1. 网络是否连接\n2. 是否已勾选"不校验域名"\n3. 防火墙是否拦截`,
          showCancel: false
        });
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