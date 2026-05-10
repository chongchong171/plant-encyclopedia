/**
 * 管理控制台（仅管理员可见）
 *
 * 功能：
 * 1. 查看/切换功能开关（feature_flags）
 * 2. 查看/修改业务配置（app_config）
 */

const { showLoading, hideLoading } = require('../../../utils/request');

// 管理员 openid 白名单（上线前务必替换为真实 openid）
const ADMIN_OPENIDS = [
  'oP55x3SPl1DkRUyTnV8sYpb7G2p4'
];

Page({
  data: {
    isAdmin: false,
    flags: {},
    config: {},
    loading: true,
    currentTab: 'config', // 'config' | 'dashboard'
    // 数据看板
    dashboardLoading: true,
    overview: {
      todayVisits: 0,
      todayNewUsers: 0,
      todayIdentify: 0,
      avgSession: '0秒',
      retention1d: 0,
      retention7d: 0,
      avgFeatureUsage: 0
    },
    trend: [],
    funnel: { visit: 0, identify: 0, addPlant: 0, favorite: 0 },
    topFeatures: [],
    recentEvents: [],
    identifySuccessRate: { rate: 0, total: 0, success: 0 },
    hotPlants: [],
    hourlyActivity: [],
    addPlantReturnRate: { rate: 0, total: 0, returned: 0 }
  },

  async onLoad() {
    await this.checkAdmin();
  },

  async onShow() {
    if (this.data.isAdmin) {
      this.loadConfig();
      if (this.data.currentTab === 'dashboard') {
        this.loadDashboard();
      }
    }
  },

  /**
   * 校验管理员身份
   */
  async checkAdmin() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getAppConfig' });
      // 从云端配置读取管理员白名单（更灵活）
      const cloudAdmins = result?.config?.adminOpenids || [];
      const allAdmins = [...new Set([...ADMIN_OPENIDS, ...cloudAdmins])];

      const app = getApp();
      const openid = app?.globalData?.openid || wx.getStorageSync('openid');

      const isAdmin = allAdmins.includes(openid);
      this.setData({ isAdmin });

      if (!isAdmin) {
        wx.showModal({
          title: '无权访问',
          content: '你没有管理员权限',
          showCancel: false,
          success: () => wx.navigateBack()
        });
        return;
      }

      this.loadConfig();
    } catch (err) {
      console.error('[Admin] 校验失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /**
   * 加载当前配置
   */
  async loadConfig() {
    showLoading('加载配置...');
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getAppConfig' });
      if (result?.success) {
        this.setData({
          flags: result.flags || {},
          config: result.config || {},
          loading: false
        });
      }
    } catch (err) {
      console.error('[Admin] 加载配置失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      hideLoading();
    }
  },

  /**
   * 切换功能开关
   */
  async toggleFlag(e) {
    const key = e.currentTarget.dataset.key;
    const value = e.detail.value;

    wx.showLoading({ title: '更新中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateAppConfig',
        data: {
          type: 'flags',
          key,
          value
        }
      });

      if (result?.success) {
        wx.showToast({ title: '已更新', icon: 'success' });
        // 同步更新本地 data
        this.setData({ [`flags.${key}`]: value });
        // 同步更新 globalData，让其他页面即时生效
        const app = getApp();
        if (app?.globalData?.featureFlags) {
          app.globalData.featureFlags[key] = value;
        }
      } else {
        wx.showToast({ title: result?.error || '失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Admin] 更新失败:', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 切换 Tab
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    if (tab === 'dashboard') {
      this.loadDashboard();
    }
  },

  /**
   * 加载数据看板
   */
  async loadDashboard() {
    this.setData({ dashboardLoading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getAnalytics',
        data: { type: 'all', days: 7 }
      });

      if (result?.success) {
        this.setData({
          overview: result.overview || this.data.overview,
          trend: result.trend || [],
          funnel: result.funnel || { visit: 0, identify: 0, addPlant: 0, favorite: 0 },
          topFeatures: result.topFeatures || [],
          recentEvents: result.recentEvents || [],
          identifySuccessRate: result.identifySuccessRate || { rate: 0, total: 0, success: 0 },
          hotPlants: result.hotPlants || [],
          hourlyActivity: result.hourlyActivity || [],
          addPlantReturnRate: result.addPlantReturnRate || { rate: 0, total: 0, returned: 0 },
          dashboardLoading: false
        });
      } else {
        wx.showToast({ title: result?.error || '加载失败', icon: 'none' });
        this.setData({ dashboardLoading: false });
      }
    } catch (err) {
      console.error('[Admin] 数据看板加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ dashboardLoading: false });
    }
  },

  /**
   * 重置分析数据（清空测试数据）
   */
  async resetAnalyticsData() {
    const { confirm } = await wx.showModal({
      title: '确认清空',
      content: '这将删除 analytics_events、analytics_daily、analytics_users 中的所有数据，不可恢复。确定吗？',
      confirmText: '确定清空',
      confirmColor: '#ff4d4f'
    });
    if (!confirm) return;

    wx.showLoading({ title: '清空中...' });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'resetAnalytics' });
      wx.hideLoading();
      if (result?.success) {
        const cleared = Object.entries(result.cleared)
          .map(([k, v]) => `${k}: ${v}条`)
          .join('\n');
        wx.showModal({
          title: '已清空',
          content: cleared,
          showCancel: false,
          success: () => this.loadDashboard()
        });
      } else {
        wx.showToast({ title: result?.error || '失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '清空失败', icon: 'none' });
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});
