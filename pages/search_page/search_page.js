/**
 * AI 植物管家 - 搜索页面
 */
const app = getApp();
const plantIdentify = require('../../utils/plantIdentify');
const { imageToBase64 } = require('../../utils/image');
const memberLimit = require('../../utils/member-limit');

// 中文到拉丁学名的映射（和云函数保持一致）
const PLANT_NAME_MAPPING = {
  // 常见观叶植物
  '绿萝': 'Epipremnum aureum',
  '金钱树': 'Zamioculcas zamiifolia',
  '虎尾兰': 'Sansevieria trifasciata',
  '白掌': 'Spathiphyllum wallisii',
  '吊兰': 'Chlorophytum comosum',
  '巴西木': 'Dracaena fragrans',
  '橡皮树': 'Ficus elastica',
  '龟背竹': 'Monstera deliciosa',
  '心叶蔓绿绒': 'Philodendron hederaceum',
  '豆瓣绿': 'Peperomia obtusifolia',
  
  // 常见花卉
  '月季': 'Rosa chinensis',
  '四季海棠': 'Begonia semperflorens',
  '凤仙花': 'Impatiens walleriana',
  '矮牵牛': 'Petunia hybrida',
  '天竺葵': 'Geranium hortorum',
  '茉莉花': 'Jasminum sambac',
  '发财树': 'Pachira aquatica',
  '虎皮兰': 'Sansevieria trifasciata',
  '文竹': 'Asparagus setaceus',
  '君子兰': 'Clivia miniata',
  '栀子花': 'Gardenia jasminoides',
  '蝴蝶兰': 'Phalaenopsis aphrodite',
  '多肉': 'Succulent',
  
  // 瓜果蔬菜
  '冬瓜': 'Benincasa hispida',
  '西瓜': 'Citrullus lanatus',
  '南瓜': 'Cucurbita moschata',
  '黄瓜': 'Cucumis sativus',
  '番茄': 'Solanum lycopersicum',
  '西红柿': 'Solanum lycopersicum',
  '茄子': 'Solanum melongena',
  '辣椒': 'Capsicum annuum',
  '青椒': 'Capsicum annuum',
  '土豆': 'Solanum tuberosum',
  '马铃薯': 'Solanum tuberosum',
  '红薯': 'Ipomoea batatas',
  '地瓜': 'Ipomoea batatas',
  '萝卜': 'Raphanus sativus',
  '胡萝卜': 'Daucus carota',
  '白菜': 'Brassica rapa',
  '菠菜': 'Spinacia oleracea',
  '生菜': 'Lactuca sativa',
  '芹菜': 'Apium graveolens',
  '香菜': 'Coriandrum sativum',
  '葱': 'Allium fistulosum',
  '大蒜': 'Allium sativum',
  '洋葱': 'Allium cepa',
  '生姜': 'Zingiber officinale',
  '莲藕': 'Nelumbo nucifera',
  '豆角': 'Vigna unguiculata',
  '四季豆': 'Phaseolus vulgaris',
  '豌豆': 'Pisum sativum',
  '玉米': 'Zea mays',
  '水稻': 'Oryza sativa',
  '小麦': 'Triticum aestivum',
  '大豆': 'Glycine max',
  '花生': 'Arachis hypogaea',
  '香蕉': 'Musa acuminata',
  '苹果': 'Malus domestica',
  '梨': 'Pyrus pyrifolia',
  '桃': 'Prunus persica',
  '李': 'Prunus salicina',
  '杏': 'Prunus armeniaca',
  '葡萄': 'Vitis vinifera',
  '柠檬': 'Citrus limon',
  '橙子': 'Citrus sinensis',
  '柚子': 'Citrus maxima',
  '荔枝': 'Litchi chinensis',
  '龙眼': 'Dimocarpus longan',
  '芒果': 'Mangifera indica',
  '菠萝': 'Ananas comosus',
  '草莓': 'Fragaria × ananassa',
  '蓝莓': 'Vaccinium corymbosum',
  '猕猴桃': 'Actinidia chinensis',
  '石榴': 'Punica granatum',
  '无花果': 'Ficus carica',
  '枣': 'Ziziphus jujuba',
  '柿子': 'Diospyros kaki',
  '枇杷': 'Eriobotrya japonica',
  '杨梅': 'Myrica rubra',
  '桑葚': 'Morus alba',
  '椰子': 'Cocos nucifera',
  '木瓜': 'Carica papaya',
  '火龙果': 'Hylocereus undatus',
  '百香果': 'Passiflora edulis',
  '莲雾': 'Syzygium samarangense',
  '释迦': 'Annona squamosa',
  '人参果': 'Solanum muricatum',
  '牛油果': 'Persea americana',
  '榴莲': 'Durio zibethinus',
  '山竹': 'Garcinia mangostana',
  '红毛丹': 'Nephelium lappaceum',
  '菠萝蜜': 'Artocarpus heterophyllus',
  '芭乐': 'Psidium guajava',
  '薄荷': 'Mentha spicata'
};

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

  onLoad(options) {
    // 从全局配置获取热门植物
    this.setData({
      hotPlants: app.globalData.hotPlants || []
    });
    this.loadHistory();
    
    // 检查是否有传递过来的图片路径（从发现页面）
    const imagePath = options.imagePath ? decodeURIComponent(options.imagePath) : '';
    if (imagePath) {
      console.log('[search_page] 接收到图片，开始识别:', imagePath);
      // 延迟一下，确保页面已渲染
      setTimeout(() => {
        this.identifyPlantFromImage(imagePath);
      }, 300);
    }
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
    
    // 获取拉丁学名（如果有映射）
    const scientificName = PLANT_NAME_MAPPING[keyword] || '';
    
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(keyword)}&scientific_name=${encodeURIComponent(scientificName)}`
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
    
    // 获取拉丁学名（如果有映射）
    const scientificName = PLANT_NAME_MAPPING[keyword] || '';
    
    this.saveHistory(keyword);
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(keyword)}&scientific_name=${encodeURIComponent(scientificName)}`
    });
  },

  /**
   * 点击热门植物
   */
  searchPlant(e) {
    const text = e.currentTarget.dataset.text;
    
    // 获取拉丁学名（如果有映射）
    const scientificName = PLANT_NAME_MAPPING[text] || '';
    
    this.saveHistory(text);
    wx.navigateTo({
      url: '/pages/search_result/search_result?search_text=' + encodeURIComponent(text) + '&scientific_name=' + encodeURIComponent(scientificName)
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
  },

  /**
   * 识别植物（从图片）
   */
  async identifyPlantFromImage(imagePath) {
    // 显示加载提示
    wx.showLoading({ title: '识别中...', mask: true });
    
    try {
      // 检查会员识别限制
      const identifyCheck = await memberLimit.canIdentify();
      
      if (!identifyCheck.canIdentify) {
        wx.hideLoading();
        memberLimit.showLimitAlert('identify');
        return;
      }
      
      // 转换为 base64
      const base64 = await imageToBase64(imagePath);
      
      // 使用前端直接调用 PlantNet
      const res = await plantIdentify.identifyPlant(base64);
      
      wx.hideLoading();
      
      if (res.success && res.data) {
        // 识别成功，跳转到搜索结果页显示结果
        const plantName = res.data.name;
        const scientificName = res.data.scientificName || '';
        
        // 保存搜索历史
        this.saveHistory(plantName);
        
        // 跳转到搜索结果页（带完整数据）
        wx.navigateTo({
          url: `/pages/search_result/search_result?search_text=${encodeURIComponent(plantName)}&scientific_name=${encodeURIComponent(scientificName)}&identify_data=${encodeURIComponent(JSON.stringify(res.data))}`
        });
      } else {
        wx.showModal({
          title: '识别失败',
          content: res.error || '无法识别该植物，请重试',
          showCancel: false
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[search_page] 识别失败:', e);
      wx.showModal({
        title: '识别失败',
        content: '网络错误，请稍后重试',
        showCancel: false
      });
    }
  }
});