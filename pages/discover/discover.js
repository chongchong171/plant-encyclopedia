/**
 * 养花助手 - 发现页面
 */
const app = getApp();

Page({
  data: {
    // 当季推荐植物（使用本地默认图，emoji 作为视觉标识）
    seasonPlants: [
      { name: '绿萝', desc: '净化空气', icon: '🌿' },
      { name: '多肉', desc: '萌萌可爱', icon: '🌵' },
      { name: '蝴蝶兰', desc: '高雅美丽', icon: '🌸' }
    ],
    
    // 养护小贴士
    careTips: [
      { icon: '💧', title: '浇水原则', desc: '见干见湿，不干不浇，浇则浇透' },
      { icon: '☀️', title: '光照管理', desc: '大多数植物喜欢散射光，避免强烈直射' },
      { icon: '🌡️', title: '温度控制', desc: '室内植物适宜温度15-25°C' }
    ],
    
    // 热门搜索
    hotSearches: [],
    
    // 新手友好植物
    beginnerPlants: [
      { name: '绿萝', icon: '🌿', difficulty: '极易养' },
      { name: '仙人掌', icon: '🌵', difficulty: '极易养' },
      { name: '吊兰', icon: '🌱', difficulty: '极易养' },
      { name: '富贵竹', icon: '🎋', difficulty: '简单' }
    ]
  },

  onLoad() {
    // 从全局配置获取热门植物
    if (app.globalData && app.globalData.hotPlants) {
      this.setData({ hotSearches: app.globalData.hotPlants });
    }
  },

  /**
   * 跳转到搜索结果页
   */
  goToSearch(e) {
    const name = e.currentTarget.dataset.name;
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}`
    });
  }
});