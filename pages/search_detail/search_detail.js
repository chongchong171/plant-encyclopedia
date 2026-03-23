/**
 * 植物百科大全 - 搜索详情页面
 */
const app = getApp();

Page({
  data: {
    keyword: '',
    focus: true,
    showSuggest: false,
    showHistory: true,
    suggestList: [],
    historyList: [],
    hotPlants: [
      '绿萝', '多肉', '君子兰', '发财树',
      '蝴蝶兰', '吊兰', '龟背竹', '富贵竹',
      '仙人掌', '芦荟', '栀子花', '茉莉花'
    ]
  },

  onLoad() {
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
    const allPlants = [...this.data.hotPlants];
    return allPlants.filter(p => p.includes(keyword)).slice(0, 5);
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
      url: `/pages/search_result/seach_result?search_text=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 选择搜索建议
   */
  selectSuggest(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/seach_result?search_text=${encodeURIComponent(keyword)}`
    });
  },

  /**
   * 选择历史记录
   */
  selectHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/seach_result?search_text=${encodeURIComponent(keyword)}`
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