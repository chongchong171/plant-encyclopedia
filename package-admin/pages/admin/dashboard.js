/**
 * 数据看板页面（嵌入 admin 页面内通过 tab 切换显示）
 */

const { showLoading, hideLoading } = require('../../../utils/request');

Page({
  data: {
    loading: true,
    overview: {
      todayVisits: 0,              // 今日总访问次数（不去重）
      todayActiveUsers: 0,         // 今日活跃用户数（去重）
      todayNewUserVisitCount: 0,   // 今日新客访问次数（不去重）
      todayNewUserVisitUsers: 0,   // 今日新客访问人数（去重）
      todayOldUserVisitCount: 0,   // 今日老客访问次数（不去重）
      todayOldUserVisitUsers: 0,   // 今日老客访问人数（去重）
      todayNewUsers: 0,            // 今日新增用户数
      todayIdentify: 0,
      avgSession: '0秒'
    },
    trend: [],
    totalUniqueVisitors: 0,        // 近7天累计总访问人数（去重）
    lastDayActiveUsers: 0,         // 最近一天活跃用户数
    funnel: { visit: 0, identify: 0, addPlant: 0, favorite: 0 },
    topFeatures: [],
    recentEvents: []
  },

  async onLoad() {
    this.loadAnalytics();
  },

  async onShow() {
    this.loadAnalytics();
  },

  /**
   * 加载数据看板全部数据
   */
  async loadAnalytics() {
    showLoading('加载数据...');
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getAnalytics',
        data: { type: 'all', days: 7 }
      });

      if (result?.success) {
        // 计算最近一天活跃用户数
        const trend = result.trend || [];
        const lastDayActiveUsers = trend.length > 0 ? (trend[trend.length - 1].activeUsers || 0) : 0;

        this.setData({
          overview: result.overview || this.data.overview,
          trend: trend,
          totalUniqueVisitors: result.totalUniqueVisitors || 0,
          lastDayActiveUsers: lastDayActiveUsers,
          funnel: result.funnel || { visit: 0, identify: 0, addPlant: 0, favorite: 0 },
          topFeatures: result.topFeatures || [],
          recentEvents: result.recentEvents || [],
          loading: false
        });
      } else {
        wx.showToast({ title: result?.error || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Dashboard] 加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      hideLoading();
    }
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    await this.loadAnalytics();
    wx.stopPullDownRefresh();
  },

  /**
   * 计算漏斗百分比
   */
  funnelPercent(step) {
    const f = this.data.funnel;
    if (!f.visit || f.visit === 0) return '0%';
    const val = f[step] || 0;
    return Math.round((val / f.visit) * 100) + '%';
  }
});