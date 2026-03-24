/**
 * 历史记录页面
 */
const app = getApp();
const { formatRelativeTime } = require('../../utils/util');

Page({
  data: {
    history: []
  },

  onLoad() {
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  /**
   * 加载历史记录
   */
  loadHistory() {
    const history = app.globalData.history || [];
    
    // 格式化时间
    const formattedList = history.map(item => ({
      ...item,
      timeStr: formatRelativeTime(item.time)
    }));
    
    this.setData({
      history: formattedList
    });
  },

  /**
   * 跳转到详情
   */
  goToDetail(e) {
    const plant = e.currentTarget.dataset.plant;
    if (plant && plant.name) {
      wx.navigateTo({
        url: `/pages/search_result/search_result?search_text=${encodeURIComponent(plant.name)}`
      });
    }
  },

  /**
   * 清空历史
   */
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有识别历史吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.history = [];
          wx.setStorageSync('history', []);
          
          this.setData({
            history: []
          });
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 跳转到首页
   */
  goToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  }
});