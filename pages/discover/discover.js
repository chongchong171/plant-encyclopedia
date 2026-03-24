/**
 * 养花助手 - 发现页面
 * 全部静态内容，无费用
 */
const app = getApp();

Page({
  data: {
    // 当季推荐植物（静态数据）
    seasonPlants: [
      { name: '绿萝', desc: '净化空气小能手' },
      { name: '多肉', desc: '萌萌惹人爱' },
      { name: '蝴蝶兰', desc: '高雅又美丽' },
      { name: '栀子花', desc: '清香满房间' }
    ],
    
    // 养护小贴士（静态数据）
    careTips: [
      { icon: '💧', title: '浇水原则', desc: '见干见湿，不干不浇，浇则浇透' },
      { icon: '☀️', title: '光照管理', desc: '大多数植物喜欢散射光，避免强烈直射' },
      { icon: '🌡️', title: '温度控制', desc: '室内植物适宜温度15-25°C' }
    ],
    
    // 热门搜索（从全局配置获取）
    hotSearches: [],
    
    // 新手友好植物（静态数据）
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
    } else {
      this.setData({ 
        hotSearches: ['绿萝', '多肉', '发财树', '君子兰', '吊兰', '龟背竹']
      });
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