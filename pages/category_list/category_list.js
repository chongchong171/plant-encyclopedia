/**
 * 养花助手 - 分类列表页面
 */
const app = getApp();

// 分类数据（预设）
const CATEGORY_DATA = {
  '观叶植物': {
    icon: '🍃',
    desc: '以观赏叶片为主的植物，叶片形态各异，色彩丰富',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '净化空气，极易养护' },
      { name: '龟背竹', scientificName: 'Monstera deliciosa', desc: '热带风情，大叶造型' },
      { name: '虎皮兰', scientificName: 'Sansevieria', desc: '耐旱好养，净化空气' },
      { name: '发财树', scientificName: 'Pachira aquatica', desc: '寓意美好，净化空气' },
      { name: '散尾葵', scientificName: 'Dypsis lutescens', desc: '热带风情，增湿效果好' },
      { name: '琴叶榕', scientificName: 'Ficus lyrata', desc: '大叶网红，北欧风格' }
    ]
  },
  '开花植物': {
    icon: '🌸',
    desc: '以观赏花朵为主的植物，花期时绚丽多彩',
    plants: [
      { name: '蝴蝶兰', scientificName: 'Phalaenopsis aphrodite', desc: '高雅美丽，花期长' },
      { name: '茉莉花', scientificName: 'Jasminum sambac', desc: '香气怡人，洁白素雅' },
      { name: '栀子花', scientificName: 'Gardenia jasminoides', desc: '花香浓郁，四季常青' },
      { name: '月季', scientificName: 'Rosa chinensis', desc: '花中皇后，四季开花' },
      { name: '绣球花', scientificName: 'Hydrangea', desc: '花团锦簇，色彩多变' },
      { name: '长寿花', scientificName: 'Kalanchoe blossfeldiana', desc: '花期长，寓意美好' }
    ]
  },
  '多肉植物': {
    icon: '🪴',
    desc: '叶片肥厚多汁，形态可爱，耐旱易养',
    plants: [
      { name: '玉树', scientificName: 'Crassula ovata', desc: '肉质叶片，寓意吉祥' },
      { name: '熊童子', scientificName: 'Cotyledon tomentosa', desc: '毛茸茸像熊爪' },
      { name: '石莲花', scientificName: 'Echeveria', desc: '莲座状，色彩丰富' },
      { name: '黑王子', scientificName: 'Echeveria Black Prince', desc: '深紫色，独特美观' },
      { name: '桃蛋', scientificName: 'Graptopetalum amethystinum', desc: '粉嫩圆润，超可爱' },
      { name: '乙女心', scientificName: 'Sedum pachyphyllum', desc: '翠绿色，尖端红润' }
    ]
  },
  '水培植物': {
    icon: '💧',
    desc: '可在水中生长的植物，干净卫生，养护简单',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '水培首选，净化空气' },
      { name: '富贵竹', scientificName: 'Dracaena sanderiana', desc: '寓意美好，水培常见' },
      { name: '铜钱草', scientificName: 'Hydrocotyle vulgaris', desc: '圆润可爱，生长快速' },
      { name: '白掌', scientificName: 'Spathiphyllum', desc: '一帆风顺，净化空气' },
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '净化空气，容易繁殖' },
      { name: '水仙', scientificName: 'Narcissus', desc: '清香淡雅，春节花卉' }
    ]
  },
  '室内植物': {
    icon: '🏠',
    desc: '适合室内养殖的植物，耐阴性强，净化空气',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '耐阴性强，净化空气' },
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '空气净化器' },
      { name: '常春藤', scientificName: 'Hedera helix', desc: '吸收甲醛，四季常青' },
      { name: '虎皮兰', scientificName: 'Sansevieria', desc: '夜间释放氧气' },
      { name: '芦荟', scientificName: 'Aloe vera', desc: '美容护肤，净化空气' },
      { name: '文竹', scientificName: 'Asparagus setaceus', desc: '文雅清秀，书房佳品' }
    ]
  },
  '阳台植物': {
    icon: '☀️',
    desc: '适合阳台养殖的植物，喜光照，开花艳丽',
    plants: [
      { name: '月季', scientificName: 'Rosa chinensis', desc: '阳台花园必备' },
      { name: '三角梅', scientificName: 'Bougainvillea', desc: '花期长，色彩鲜艳' },
      { name: '茉莉花', scientificName: 'Jasminum sambac', desc: '香气怡人，喜阳光' },
      { name: '太阳花', scientificName: 'Portulaca grandiflora', desc: '向阳而生，花期长' },
      { name: '矮牵牛', scientificName: 'Petunia', desc: '花量多，色彩丰富' },
      { name: '天竺葵', scientificName: 'Pelargonium', desc: '花期长，易养护' }
    ]
  }
};

Page({
  data: {
    category: '',
    categoryInfo: null,
    loading: true
  },

  onLoad(options) {
    const category = decodeURIComponent(options.category || '');
    this.setData({ category });
    
    if (category && CATEGORY_DATA[category]) {
      this.setData({ 
        categoryInfo: CATEGORY_DATA[category],
        loading: false 
      });
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: category
      });
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 点击植物，跳转到详情
   */
  goToDetail(e) {
    const { name, scientificName } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}&scientific_name=${encodeURIComponent(scientificName)}`
    });
  }
});