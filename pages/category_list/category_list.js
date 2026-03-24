/**
 * 花草百科全书 - 分类列表页面
 */
const app = getApp();

// 常用植物分类数据
const CATEGORY_DATA = {
  '好养植物': {
    icon: '🌱',
    desc: '新手友好，不容易养死，适合刚开始养花的朋友',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '浇水就活，净化空气' },
      { name: '仙人掌', scientificName: 'Cactaceae', desc: '耐旱之王，一个月不浇水也没事' },
      { name: '虎皮兰', scientificName: 'Sansevieria', desc: '耐阴耐旱，净化空气好手' },
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '生长快，容易繁殖' },
      { name: '富贵竹', scientificName: 'Dracaena sanderiana', desc: '水培土培都行，寓意好' },
      { name: '芦荟', scientificName: 'Aloe vera', desc: '耐旱实用，还能护肤' }
    ]
  },
  '净化空气': {
    icon: '🌬️',
    desc: '吸收甲醛、苯等有害气体，改善室内空气质量',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '吸收甲醛首选' },
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '吸收一氧化碳、甲醛' },
      { name: '虎皮兰', scientificName: 'Sansevieria', desc: '夜间释放氧气' },
      { name: '常春藤', scientificName: 'Hedera helix', desc: '吸收苯、甲醛' },
      { name: '白掌', scientificName: 'Spathiphyllum', desc: '吸收废气，抑制氨气' },
      { name: '散尾葵', scientificName: 'Dypsis lutescens', desc: '增湿净化两不误' }
    ]
  },
  '开花植物': {
    icon: '🌸',
    desc: '花期时绚丽多彩，观赏价值高',
    plants: [
      { name: '蝴蝶兰', scientificName: 'Phalaenopsis aphrodite', desc: '高雅美丽，花期长达数月' },
      { name: '长寿花', scientificName: 'Kalanchoe blossfeldiana', desc: '花期长，寓意好' },
      { name: '栀子花', scientificName: 'Gardenia jasminoides', desc: '花香浓郁，洁白素雅' },
      { name: '茉莉花', scientificName: 'Jasminum sambac', desc: '香气怡人，四季常青' },
      { name: '绣球花', scientificName: 'Hydrangea', desc: '花团锦簇，色彩多变' },
      { name: '月季', scientificName: 'Rosa chinensis', desc: '花中皇后，四季开花' }
    ]
  },
  '多肉植物': {
    icon: '🪴',
    desc: '叶片肥厚多汁，形态可爱，耐旱易养',
    plants: [
      { name: '玉树', scientificName: 'Crassula ovata', desc: '叶片肥厚，寓意吉祥' },
      { name: '石莲花', scientificName: 'Echeveria', desc: '莲座状，色彩丰富' },
      { name: '熊童子', scientificName: 'Cotyledon tomentosa', desc: '毛茸茸像熊爪' },
      { name: '桃蛋', scientificName: 'Graptopetalum amethystinum', desc: '粉嫩圆润，超可爱' },
      { name: '黑王子', scientificName: 'Echeveria Black Prince', desc: '深紫色，独特美观' },
      { name: '乙女心', scientificName: 'Sedum pachyphyllum', desc: '翠绿色，尖端红润' }
    ]
  },
  '阳台花园': {
    icon: '🏡',
    desc: '适合阳台种植，喜光照，花量多',
    plants: [
      { name: '三角梅', scientificName: 'Bougainvillea', desc: '花期长，色彩鲜艳' },
      { name: '月季', scientificName: 'Rosa chinensis', desc: '阳台花园必备' },
      { name: '茉莉花', scientificName: 'Jasminum sambac', desc: '香气怡人，喜阳光' },
      { name: '太阳花', scientificName: 'Portulaca grandiflora', desc: '向阳而生，花期长' },
      { name: '矮牵牛', scientificName: 'Petunia', desc: '花量多，色彩丰富' },
      { name: '天竺葵', scientificName: 'Pelargonium', desc: '花期长，易养护' }
    ]
  },
  '办公室绿植': {
    icon: '🏢',
    desc: '耐阴耐旱，适合办公环境，好养护',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '耐阴性强，净化空气' },
      { name: '发财树', scientificName: 'Pachira aquatica', desc: '寓意好，耐阴' },
      { name: '虎皮兰', scientificName: 'Sansevieria', desc: '耐阴耐旱，夜间释放氧气' },
      { name: '富贵竹', scientificName: 'Dracaena sanderiana', desc: '水培方便，寓意好' },
      { name: '文竹', scientificName: 'Asparagus setaceus', desc: '文雅清秀，办公室佳品' },
      { name: '铜钱草', scientificName: 'Hydrocotyle vulgaris', desc: '圆润可爱，水培方便' }
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