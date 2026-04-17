/**
 * 社区花园页面（排行榜）
 * 
 * ⚠️ 模块化规范：
 * - 通过 api/ 层调用云函数
 * - 通过 config/enums 获取排行类型
 */

const api = require('../../api/index');
const { showLoading, hideLoading, showErrorToast } = require('../../utils/request');

Page({
  data: {
    activeTab: 'plantCount',  // 当前排行类型
    tabs: [
      { id: 'plantCount', name: '植物数量' },
      { id: 'survivalRate', name: '存活率' },
      { id: 'careDays', name: '养护天数' }
    ],
    ranking: [],
    myRank: null,
    loading: true
  },

  onLoad() {
    this.loadRanking();
  },

  onShow() {
    this.loadRanking();
  },

  /**
   * 切换排行类型
   */
  switchTab(e) {
    const tabId = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tabId, loading: true });
    this.loadRanking();
  },

  /**
   * 加载排行榜
   * 使用 api 层
   */
  async loadRanking() {
    showLoading('加载中...');
    
    // 调用 API 层
    const result = await api.getFriendsRanking({
      type: this.data.activeTab,
      limit: 20
    });
    
    hideLoading();
    
    if (!result.success) {
      showErrorToast(result);
      this.setData({ loading: false });
      return;
    }
    
    this.setData({
      ranking: result.rankings || [],  // 云函数返回的是 rankings（复数）
      myRank: result.myRank,
      loading: false
    });
  },

  /**
   * 跳转到用户详情
   */
  goToUserDetail(e) {
    const userId = e.currentTarget.dataset.id;
    // TODO: 用户详情页面
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onPullDownRefresh() {
    this.loadRanking().then(() => wx.stopPullDownRefresh());
  }
});