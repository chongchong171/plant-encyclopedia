/**
 * 植物商城页面
 * 未来用于电商导流、CPS 合作等
 */

Page({
  data: {
    loading: true,
    categories: [
      { id: 'indoor', name: '室内植物', icon: '🏠' },
      { id: 'outdoor', name: '户外植物', icon: '🌳' },
      { id: 'succulent', name: '多肉植物', icon: '🌵' },
      { id: 'flowering', name: '开花植物', icon: '🌸' }
    ],
    products: []
  },

  onLoad() {
    this.loadProducts()
  },

  /**
   * 加载商品列表（占位）
   */
  async loadProducts() {
    // TODO: 对接电商平台 API
    this.setData({
      loading: false,
      products: []
    })
  },

  /**
   * 跳转到商品详情
   */
  goToProduct(e) {
    const { id } = e.currentTarget.dataset
    // TODO: 跳转到商品详情或外部链接
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const { id } = e.currentTarget.dataset
    // TODO: 按分类筛选
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})