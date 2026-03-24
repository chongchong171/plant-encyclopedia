/**
 * 养花助手 - 发现页面
 */
const app = getApp();

Page({
  data: {
    // 当季推荐植物
    seasonPlants: [
      { name: '绿萝', desc: '净化空气', image: 'https://picsum.photos/200/150?random=1' },
      { name: '多肉', desc: '萌萌可爱', image: 'https://picsum.photos/200/150?random=2' },
      { name: '蝴蝶兰', desc: '高雅美丽', image: 'https://picsum.photos/200/150?random=3' },
      { name: '栀子花', desc: '清香怡人', image: 'https://picsum.photos/200/150?random=4' }
    ],
    
    // 养护小贴士
    careTips: [
      { icon: '💧', title: '浇水原则', desc: '见干见湿，不干不浇，浇则浇透' },
      { icon: '☀️', title: '光照管理', desc: '大多数植物喜欢散射光，避免强烈直射' },
      { icon: '🌡️', title: '温度控制', desc: '室内植物适宜温度15-25°C' }
    ],
    
    // 热门搜索
    hotSearches: ['绿萝', '多肉', '发财树', '君子兰', '吊兰', '龟背竹', '富贵竹', '仙人掌'],
    
    // 新手友好植物
    beginnerPlants: [
      { name: '绿萝', icon: '🌿', difficulty: '⭐ 极易养' },
      { name: '仙人掌', icon: '🌵', difficulty: '⭐ 极易养' },
      { name: '吊兰', icon: '🌱', difficulty: '⭐ 极易养' },
      { name: '富贵竹', icon: '🎋', difficulty: '⭐⭐ 简单' }
    ]
  },

  onLoad() {
    // 使用全局热门植物
    if (app.globalData.hotPlants) {
      this.setData({ hotSearches: app.globalData.hotPlants });
    }
  },

  /**
   * 跳转到搜索
   */
  goToSearch(e) {
    const name = e.currentTarget.dataset.name;
    wx.switchTab({
      url: '/pages/search_page/search_page'
    });
    // 延迟后触发搜索
    setTimeout(() => {
      const pages = getCurrentPages();
      const searchPage = pages[pages.length - 1];
      if (searchPage && searchPage.selectComponent) {
        // 触发搜索
        wx.navigateTo({
          url: `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}`
        });
      }
    }, 300);
  }
});