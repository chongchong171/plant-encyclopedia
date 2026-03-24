/**
 * 养花助手 - 发现页面
 * 当季推荐使用真实植物图片（GBIF 免费 API）
 */
const app = getApp();

Page({
  data: {
    // 当季推荐植物（一行三个）
    seasonPlants: [
      { name: '绿萝', desc: '净化空气' },
      { name: '多肉', desc: '萌萌可爱' },
      { name: '蝴蝶兰', desc: '高雅美丽' }
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
    } else {
      this.setData({ 
        hotSearches: ['绿萝', '多肉', '发财树', '君子兰', '吊兰', '龟背竹']
      });
    }
    
    // 获取当季推荐植物的真实图片
    this.loadPlantImages();
  },

  /**
   * 加载植物真实图片（GBIF 免费 API）
   */
  async loadPlantImages() {
    const plants = this.data.seasonPlants;
    
    for (let i = 0; i < plants.length; i++) {
      const imageUrl = await this.getPlantImage(plants[i].name);
      if (imageUrl) {
        plants[i].image = imageUrl;
      }
    }
    
    this.setData({ seasonPlants: plants });
  },

  /**
   * 从 GBIF 获取植物图片（免费）
   */
  getPlantImage(plantName) {
    return new Promise((resolve) => {
      // GBIF species match API
      wx.request({
        url: `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(plantName)}&strict=true`,
        success: (res) => {
          const speciesKey = res.data?.speciesKey;
          
          if (speciesKey) {
            // 获取该物种的图片
            wx.request({
              url: `https://api.gbif.org/v1/occurrence/search?taxonKey=${speciesKey}&mediaType=StillImage&limit=1`,
              success: (mediaRes) => {
                const results = mediaRes.data?.results || [];
                if (results.length > 0 && results[0].media && results[0].media.length > 0) {
                  resolve(results[0].media[0].identifier);
                } else {
                  resolve(null);
                }
              },
              fail: () => resolve(null)
            });
          } else {
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
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