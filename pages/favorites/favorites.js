/**
 * 收藏页面
 * 
 * ⚠️ 模块化规范：
 * - 通过 utils/storage 处理存储
 * - 通过 services/dedup 处理去重
 * - 通过 utils/time 格式化时间
 */

const { formatRelativeTime } = require('../../utils/time');
const { getFavorites, setFavorites, removeFavorite } = require('../../utils/storage');
const { dedupByName } = require('../../services/dedup');

Page({
  data: {
    loading: false,
    error: false,
    errorMessage: '',
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
   * 使用 utils/storage + services/dedup
   */
  loadFavorites() {
    // 使用 storage 工具获取
    let storedFavorites = getFavorites();
    
    // 使用 dedup 服务去重
    storedFavorites = dedupByName(storedFavorites);
    
    // 保存去重后的数据
    setFavorites(storedFavorites);
    
    // 更新全局数据
    const app = getApp();
    app.globalData.favorites = storedFavorites;
    
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
   * 使用 utils/storage
   */
  removeFavorite(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认移除',
      content: '确定要从收藏中移除吗？',
      success: (res) => {
        if (res.confirm) {
          // 使用 storage 工具移除
          const removed = removeFavorite(id);
          
          if (removed) {
            this.loadFavorites();
            wx.showToast({
              title: '已移除',
              icon: 'success'
            });
          }
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