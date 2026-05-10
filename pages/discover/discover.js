/**
 * AI 植物管家 - 发现页面
 */
const app = getApp();
const api = require('../../api/index');
const { IMAGE_MAP } = require('../../utils/plantImages');

Page({
  data: {
    // 统计数据
    plantCount: 0,
    favoriteCount: 0,

    // 搜索相关
    searchText: '',
    isSearching: false,

    // 热门搜索（带图片，从缓存加载）
    hotSearches: [],

    // 养护小贴士
    careTips: [
      { icon: '💧', title: '浇水原则', desc: '见干见湿，不干不浇，浇则浇透' },
      { icon: '☀️', title: '光照管理', desc: '大多数植物喜欢散射光，避免强烈直射' },
      { icon: '🌡️', title: '温度控制', desc: '室内植物适宜温度 15-25°C' }
    ],

    // 新手友好植物 - 按场景分类（4 个）
    // 注：植物列表在二级页面（分类页）显示，这里只显示分类信息
    plantCategories: [
      {
        id: 'office',
        name: '职场办公',
        icon: '💼',
        desc: '适合放电脑桌旁的植物',
        tags: ['净化空气', '防辐射', '耐阴', '低维护'],
        features: ['吸收甲醛', '缓解眼疲劳', '提升工作效率', '无需强光']
      },
      {
        id: 'pet',
        name: '宠物友好',
        icon: '🐱',
        desc: '对猫狗无害的植物',
        tags: ['无毒', '安全', '宠物友好', '安心养护'],
        features: ['ASPCA 认证', '误食无害', '多宠家庭', '安心摆放']
      },
      {
        id: 'elderly',
        name: '老人适合',
        icon: '👴',
        desc: '低维护、好照料的植物',
        tags: ['易养护', '少浇水', '生命力强', '寓意好'],
        features: ['耐旱耐贫瘠', '病虫害少', '寓意吉祥', '养护简单']
      },
      {
        id: 'flowering',
        name: '开花植物',
        icon: '🌸',
        desc: '能开出美丽花朵的植物',
        tags: ['花期长', '花色美', '芳香', '观赏性强'],
        features: ['四季有花', '香气宜人', '色彩丰富', '装饰性强']
      }
    ],

    uiConfig: {}
  },

  onShow() {
    this.refreshConfig()
    this.loadStats()
    this.loadFavorites()
    this.initHotSearches()  // 初始化热门搜索图片
  },

  /**
   * 重新拉取远程配置（管理后台修改后立即生效）
   */
  refreshConfig() {
    const app = getApp()
    app.loadAppConfig().then(() => {
      this.loadUIConfig()
    }).catch(() => {
      this.loadUIConfig()
    })
  },

  /**
   * 读取 UI 文案配置
   */
  loadUIConfig() {
    const app = getApp();
    const config = app?.globalData?.appConfig?.ui || {};
    this.setData({ uiConfig: config });
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    wx.cloud.callFunction({
      name: 'getCareGuide',
      data: {
        action: 'getStats'
      }
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({
          plantCount: res.result.plantCount || 0,
          careTipsCount: res.result.careTipsCount || 0
        })
      }
    }).catch(err => {
      console.error('[discover] 加载统计失败:', err)
    })
  },

  /**
   * 加载收藏数量
   */
  loadFavorites() {
    const favorites = wx.getStorageSync('favorites') || []
    this.setData({
      favoriteCount: favorites.length
    })
  },

  // 热门搜索植物列表（用于初始化）
  HOT_SEARCH_NAMES: [
    '绿萝', '多肉', '发财树', '吊兰',
    '龟背竹', '虎皮兰', '文竹', '君子兰',
    '茉莉', '栀子花', '蝴蝶兰', '芦荟'
  ],

  /**
   * 初始化热门搜索图片（云存储 fileID）
   */
  initHotSearches() {
    const updatedHotSearches = this.HOT_SEARCH_NAMES.map(name => ({
      name: name,
      imageUrl: IMAGE_MAP[name] || ''
    }))

    this.setData({
      hotSearches: updatedHotSearches
    })

  },

  /**
   * 跳转搜索（传递植物名称和缩略图）
   */
  goToSearch(e) {
    const { name } = e.currentTarget.dataset
    const imageUrl = IMAGE_MAP[name] || ''
    
    wx.navigateTo({
      url: `/package-plant/pages/search_result/search_result?search_text=${encodeURIComponent(name)}&image_url=${encodeURIComponent(imageUrl)}`
    })
  },

  /**
   * 聚焦搜索框 - 让输入框获得焦点（文字搜索）
   */
  focusSearch() {
    // 文字搜索，不需要特殊处理，用户直接输入即可
  },

  /**
   * 搜索输入（保留兼容）
   */
  onSearchInput(e) {
    const { value } = e.detail
    this.setData({
      searchText: value
    })
  },

  /**
   * 搜索确认 - 文字搜索，跳转到搜索结果页
   */
  onSearchConfirm(e) {
    const { value } = e.detail
    if (!value || !value.trim()) {
      wx.showToast({
        title: '请输入植物名称',
        icon: 'none'
      })
      return
    }

    const searchText = value.trim()
    const knownImage = IMAGE_MAP[searchText]

    // 已知植物：直接传递缩略图，秒开
    if (knownImage) {
      wx.navigateTo({
        url: `/package-plant/pages/search_result/search_result?search_text=${encodeURIComponent(searchText)}&image_url=${encodeURIComponent(knownImage)}`
      })
      return
    }

    // 未知植物：跳转搜索，显示放大镜加载动画
    wx.navigateTo({
      url: `/package-plant/pages/search_result/search_result?search_text=${encodeURIComponent(searchText)}`
    })
  },

  /**
   * 跳转分类
   */
  goToCategory(e) {
    const { category } = e.currentTarget.dataset
    // 映射分类名称到 category_list.js 的 key
    const categoryMap = {
      '职场办公': '办公室绿植',
      '宠物友好': '宠物友好',
      '老人适合': '老人适合',
      '开花植物': '开花植物'
    }
    const targetCategory = categoryMap[category.name] || category.name
    wx.navigateTo({
      url: `/package-plant/pages/category_list/category_list?category=${encodeURIComponent(targetCategory)}`
    })
  },

  /**
   * 跳转单个植物（从分类卡片点击）
   * 已知植物：传递缩略图，秒开
   */
  goToPlant(e) {
    const { name } = e.currentTarget.dataset
    const imageUrl = IMAGE_MAP[name] || ''
    wx.navigateTo({
      url: `/package-plant/pages/search_result/search_result?search_text=${encodeURIComponent(name)}&image_url=${encodeURIComponent(imageUrl)}`
    })
  },

  /**
   * 跳转收藏页
   */
  goToFavorites() {
    wx.navigateTo({
      url: '/package-user/pages/favorites/favorites'
    })
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  }
})
