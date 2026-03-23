/**
 * 养花助手 - 搜索页面
 */
Page({
  data: {
    hotPlants: [
      '绿萝', '多肉', '君子兰', '发财树',
      '蝴蝶兰', '吊兰', '龟背竹', '富贵竹'
    ],
    categories: [
      { id: 1, name: '观叶植物', icon: '🍃' },
      { id: 2, name: '开花植物', icon: '🌸' },
      { id: 3, name: '多肉植物', icon: '🪴' },
      { id: 4, name: '水培植物', icon: '💧' },
      { id: 5, name: '室内植物', icon: '🏠' },
      { id: 6, name: '阳台植物', icon: '☀️' }
    ]
  },

  goToSearchDetail() {
    wx.navigateTo({
      url: '/pages/search_detail/search_detail'
    });
  },

  searchPlant(e) {
    const text = e.currentTarget.dataset.text || e.currentTarget.dataset.category;
    wx.navigateTo({
      url: '/pages/search_result/seach_result?search_text=' + encodeURIComponent(text)
    });
  },

  onLoad() {},

  onShow() {}
});