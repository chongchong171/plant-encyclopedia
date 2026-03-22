/**
 * 收藏页面
 */
const app = getApp();

Page({
  data: {
    favorites: []
  },

  onLoad() {
    this.loadFavorites();
  },

  onShow() {
    this.loadFavorites();
  },

  /**
   * 加载收藏列表
   */
  loadFavorites() {
    const favorites = app.globalData.favorites || [];
    
    // 格式化时间
    const formattedList = favorites.map(item => ({
      ...item,
      addTimeStr: this.formatTime(item.addTime)
    }));
    
    this.setData({
      favorites: formattedList
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
   * 移除收藏
   */
  removeFavorite(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认移除',
      content: '确定要从收藏中移除吗？',
      success: (res) => {
        if (res.confirm) {
          app.removeFavorite(id);
          this.loadFavorites();
          
          wx.showToast({
            title: '已移除',
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