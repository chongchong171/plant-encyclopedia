/**
 * 花草百科全书 - 搜索页面
 */
const app = getApp();

Page({
  data: {
    keyword: '',
    focus: false,
    showSuggest: false,
    showHistory: true,
    suggestList: [],
    historyList: [],
    hotPlants: [],
    categories: [
      { id: 1, name: '好养植物', icon: '🌱', desc: '新手友好，不易养死' },
      { id: 2, name: '净化空气', icon: '🌬️', desc: '吸收甲醛，净化室内空气' },
      { id: 3, name: '开花植物', icon: '🌸', desc: '花色艳丽，观赏性强' },
      { id: 4, name: '多肉植物', icon: '🪴', desc: '耐旱好养，造型可爱' },
      { id: 5, name: '阳台花园', icon: '🏡', desc: '适合阳台种植的花卉' },
      { id: 6, name: '办公室绿植', icon: '🏢', desc: '耐阴耐旱，适合办公环境' }
    ]
  },

  onLoad() {
    // 从全局配置获取热门植物
    this.setData({
      hotPlants: app.globalData.hotPlants || []
    });
    this.loadHistory();
  },

  onShow() {
    this.loadHistory();
  },

  /**
   * 加载搜索历史
   */
  loadHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyList: history.slice(0, 10) });
  },

  /**
   * 输入事件
   */
  onInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ keyword });
    
    if (keyword.length > 0) {
      const suggests = this.getSuggests(keyword);
      this.setData({
        showSuggest: suggests.length > 0,
        showHistory: false,
        suggestList: suggests
      });
    } else {
      this.setData({
        showSuggest: false,
        showHistory: true,
        suggestList: []
      });
    }
  },

  /**
   * 获取搜索建议
   */
  getSuggests(keyword) {
    return this.data.hotPlants.filter(p => p.includes(keyword)).slice(0, 5);
  },

  /**
   * 搜索
   */
  onSearch() {
    const { keyword } = this.data;
    if (!keyword) {
      wx.showToast({ title: '请输入植物名称', icon: 'none' });
      return;
    }
    
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 选择搜索建议
   */
  selectSuggest(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 选择历史记录
   */
  selectHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 点击热门植物
   */
  searchPlant(e) {
    const text = e.currentTarget.dataset.text;
    this.saveHistory(text);
    wx.navigateTo({
      url: '/pages/search_result/search_result?search_text=' + encodeURIComponent(text)
    });
  },

  /**
   * 点击植物分类
   */
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    // 分类跳转到分类列表页
    wx.navigateTo({
      url: '/pages/category_list/category_list?category=' + encodeURIComponent(category)
    });
  },

  /**
   * 保存搜索历史
   */
  saveHistory(keyword) {
    let history = wx.getStorageSync('searchHistory') || [];
    history = history.filter(h => h !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 20);
    wx.setStorageSync('searchHistory', history);
  },

  /**
   * 清空历史
   */
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('searchHistory');
          this.setData({ historyList: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});