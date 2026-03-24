/**
 * 收藏页面
 */
const app = getApp();
const { formatRelativeTime } = require('../../utils/util');

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
    const storedFavorites = wx.getStorageSync('favorites') || [];
    app.globalData.favorites = storedFavorites;
    
    const formattedList = storedFavorites.map(item => ({
      ...item,
      addTimeStr: formatRelativeTime(item.addTime)
    }));
    
    this.setData({
      favorites: formattedList
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