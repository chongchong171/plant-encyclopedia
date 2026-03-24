/**
 * 花草百科全书 - 发现页面
 */
const app = getApp();

Page({
  data: {
    // 当季推荐植物（学名用于 GBIF 搜索）
    seasonPlants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '净化空气', image: '' },
      { name: '玉树', scientificName: 'Crassula ovata', desc: '萌萌可爱', image: '' },
      { name: '蝴蝶兰', scientificName: 'Phalaenopsis aphrodite', desc: '高雅美丽', image: '' }
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
    
    // 加载当季推荐图片
    this.loadSeasonPlantImages();
  },

  /**
   * 加载当季推荐植物图片（GBIF）
   */
  async loadSeasonPlantImages() {
    const plants = [...this.data.seasonPlants];
    
    for (let i = 0; i < plants.length; i++) {
      // 使用学名搜索（GBIF 不支持中文名）
      const imageUrl = await this.getPlantImageFromGBIF(plants[i].scientificName || plants[i].name);
      plants[i].image = imageUrl || '';
    }
    
    this.setData({ seasonPlants: plants });
  },

  /**
   * 从 GBIF 获取真实植物图片（与搜索结果页相同）
   */
  getPlantImageFromGBIF(keyword) {
    return new Promise((resolve) => {
      // 1. 在 GBIF 搜索物种
      wx.request({
        url: `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(keyword)}&strict=true`,
        success: (res) => {
          const speciesKey = res.data?.speciesKey;
          
          if (speciesKey) {
            // 2. 获取该物种的图片
            wx.request({
              url: `https://api.gbif.org/v1/occurrence/search?taxonKey=${speciesKey}&mediaType=StillImage&limit=5`,
              success: (mediaRes) => {
                const results = mediaRes.data?.results || [];
                
                if (results.length > 0 && results[0].media) {
                  const images = results[0].media;
                  // 找到第一张可用图片
                  for (const img of images) {
                    if (img.identifier && img.type === 'StillImage') {
                      resolve(img.identifier);
                      return;
                    }
                  }
                }
                resolve(null);
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
    const scientificName = e.currentTarget.dataset.scientificName || '';
    
    // 如果有学名，同时传递（用于 GBIF 图片搜索）
    const url = scientificName 
      ? `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}&scientific_name=${encodeURIComponent(scientificName)}`
      : `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}`;
    
    wx.navigateTo({ url });
  }
});