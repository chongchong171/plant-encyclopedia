/**
 * 历史记录页面
 */
const app = getApp();

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
      timeStr: this.formatTime(item.time)
    }));
    
    this.setData({
      history: formattedList
    });
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return `${date.getMonth() + 1}-${date.getDate()}`;
  },

  /**
   * 跳转到详情
   */
  goToDetail(e) {
    const plant = e.currentTarget.dataset.plant;
    // TODO: 跳转到详情页
    wx.showToast({
      title: '详情页开发中',
      icon: 'none'
    });
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