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
    console.log('📋 收藏页面加载');
    this.loadFavorites();
  },

  onShow() {
    console.log('📋 收藏页面显示');
    // 每次显示时强制从 storage 重新加载
    this.loadFavorites();
  },

  /**
   * 加载收藏列表
   */
  loadFavorites() {
    // 强制从 storage 读取最新数据
    const storedFavorites = wx.getStorageSync('favorites') || [];
    app.globalData.favorites = storedFavorites;
    
    console.log('📋 加载收藏列表:', storedFavorites.length, '条');
    
    // 格式化时间
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