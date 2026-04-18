/**
 * AI 植物管家 - 分类列表页面
 *
 * 图片方案：直接使用 HTTPS 图片服务器（与发现页一致）
 * 图片地址：https://plant.yg-crystal.com/plant-images/{filename}
 */
const app = getApp();

// 植物名称 → 云存储 fileID 映射（2026-04-15 更新虎皮兰、发财树）
const IMAGE_MAP = {
  '虎尾兰': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/hubilan.png',
  '长寿花': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/changshouhua.png',
  '芦荟': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/luhui.png',
  '富贵竹': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/fuguizhu.png',
  '吊兰': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/diaolan.png',
  '万年青': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/wannianqing.png',
  '绿萝': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/lvluo.png',
  '虎皮兰': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/hupilan.png',
  '文竹': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/wenzhu.png',
  '仙人掌': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/xianrenzhang.png',
  '竹芋': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhuyu.png',
  '空气凤梨': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/kongqifengli.png',
  '波士顿蕨': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/boshidunjue.png',
  '蜘蛛抱蛋': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhiwubaodan.png',
  '圆叶椒草': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/yuanyejiaocao.png',
  '金钱树': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/jinqianshu.png',
  '君子兰': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/junzilan.png',
  '蝴蝶兰': 'https://images.pexels.com/photos/11177712/pexels-photo-11177712.jpeg',  // 2026-04-16 新图
  '栀子花': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhizihua.png',
  '茉莉花': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/molihua.png',
  '茉莉': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/molihua.png',
  '天竺葵': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/tianzhukui.png',
  '矮牵牛': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/aiqianniu.png',
  '月季': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/yueji.png',
  '发财树': 'https://images.pexels.com/photos/29150327/pexels-photo-29150327.jpeg',  // 2026-04-16 新图
  '龟背竹': 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/guibeizhu.png'
};

// 常用植物分类数据（对应发现页 4 个分类）
// imageUrl 由页面加载时从云存储直接获取
const CATEGORY_DATA = {
  '办公室绿植': {
    icon: '🏢',
    desc: '适合放电脑桌旁的植物',
    plants: [
      { name: '绿萝', scientificName: 'Epipremnum aureum', desc: '强力吸收甲醛，净化空气，耐阴易养，遇水即活，适合新手' },
      { name: '虎皮兰', scientificName: 'Sansevieria trifasciata', desc: '晚上释放氧气，夜间释氧，助眠，耐旱耐贫瘠，净化空气能力强' },
      { name: '文竹', scientificName: 'Asparagus setaceus', desc: '书香气息浓厚，优雅美观，提升气质，喜温暖湿润环境' },
      { name: '仙人掌', scientificName: 'Cactaceae', desc: '减少电脑辐射，防辐射，耐旱好养，生命力顽强，适合忙碌的上班族' },
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '天然空气净化器，吸收甲醛，生长快，繁殖简单，四季常青' },
      { name: '富贵竹', scientificName: 'Dracaena sanderiana', desc: '水培土培皆可，耐阴好养，寓意好，招财进宝，开运竹' }
    ]
  },
  '宠物友好': {
    icon: '🐱',
    desc: '对猫狗无害的植物，ASPCA 认证安全植物',
    plants: [
      { name: '吊兰', scientificName: 'Chlorophytum comosum', desc: '猫咪啃食安全，完全无毒，净化空气，生长迅速，繁殖简单' },
      { name: '竹芋', scientificName: 'Calathea', desc: '对猫狗无毒，宠物安全，叶片美观，花纹独特，喜温暖湿润' },
      { name: '空气凤梨', scientificName: 'Tillandsia', desc: '无需土壤，无毒无害，干净卫生，可悬挂装饰，造型独特' },
      { name: '波士顿蕨', scientificName: 'Nephrolepis exaltata', desc: '天然加湿器，宠物友好，增湿净化，叶片茂盛，喜阴湿环境' },
      { name: '蜘蛛抱蛋', scientificName: 'Aspidistra elatior', desc: '耐阴易养护，安全无毒，生命力强，一叶兰，四季常青' },
      { name: '圆叶椒草', scientificName: 'Peperomia obtusifolia', desc: '对宠物无毒，小巧可爱，耐旱好养，叶片圆润，适合桌面摆放' }
    ]
  },
  '老人适合': {
    icon: '👴',
    desc: '低维护、好照料、寓意好的植物',
    plants: [
      { name: '长寿花', scientificName: 'Kalanchoe blossfeldiana', desc: '四季开花不断，花期超长，寓意健康长寿，花色丰富，易养护' },
      { name: '芦荟', scientificName: 'Aloe vera', desc: '耐旱好养，一个月浇一次，还能护肤，美容养颜，实用价值高' },
      { name: '富贵竹', scientificName: 'Dracaena sanderiana', desc: '寓意吉祥，招财进宝，水培土培皆可，开运竹，平安竹' },
      { name: '君子兰', scientificName: 'Clivia miniata', desc: '高贵典雅，象征高尚品格，花期长，花大色艳，观赏价值高' },
      { name: '金钱树', scientificName: 'Zamioculcas zamiifolia', desc: '寓意财源广进，耐旱耐阴，几乎不用管，叶片厚实光亮' },
      { name: '万年青', scientificName: 'Rohdea japonica', desc: '健康长寿，四季常青，寓意吉祥，果实红色喜庆，观赏期长' }
    ]
  },
  '开花植物': {
    icon: '🌸',
    desc: '能开出美丽花朵的植物',
    plants: [
      { name: '蝴蝶兰', scientificName: 'Phalaenopsis aphrodite', desc: '花中皇后，高雅华贵，花期长达数月，花色丰富，适合室内摆放' },
      { name: '栀子花', scientificName: 'Gardenia jasminoides', desc: '花香浓郁，清香四溢，洁白素雅，夏季开花，香气袭人' },
      { name: '茉莉花', scientificName: 'Jasminum sambac', desc: '香气袭人，芬芳迷人，四季常青，可泡茶，花香持久' },
      { name: '天竺葵', scientificName: 'Pelargonium', desc: '全年有花，四季开花，色彩丰富，驱蚊效果好，适合阳台种植' },
      { name: '矮牵牛', scientificName: 'Petunia', desc: '花色丰富，花量超大，色彩斑斓，花期长，易养护，适合悬挂种植' },
      { name: '月季', scientificName: 'Rosa chinensis', desc: '月月开花，花期持久，花中皇后，品种繁多，观赏价值高' }
    ]
  }
};

Page({
  data: {
    // 状态（标准）
    loading: true,
    error: false,
    errorMessage: '',

    // 数据
    category: '',
    categoryInfo: null
  },

  onLoad(options) {
    const category = decodeURIComponent(options.category || '');
    this.setData({ category });

    if (category && CATEGORY_DATA[category]) {
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: category
      });

      // 加载植物图片（从云存储缓存）
      this.loadPlantImages(CATEGORY_DATA[category]);
    } else {
      this.setData({ loading: false });
    }
  },

  /**
   * 从云存储 fileID 获取植物图片（与发现页一致）
   */
  loadPlantImages(categoryData) {
    const plants = [...categoryData.plants];

    // 直接使用云存储 fileID
    plants.forEach(plant => {
      plant.imageUrl = IMAGE_MAP[plant.name] || '';
    });

    this.setData({
      categoryInfo: {
        ...categoryData,
        plants: plants
      },
      loading: false
    });

    console.log('[category_list] 加载了', plants.length, '张植物图片（云存储 fileID）');
  },

  /**
   * 点击植物，跳转到详情（传递缩略图）
   */
  goToDetail(e) {
    const { name, scientificName, imageUrl } = e.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/search_result/search_result?search_text=${encodeURIComponent(name)}&scientific_name=${encodeURIComponent(scientificName)}&image_url=${encodeURIComponent(imageUrl)}`
    });
  },

  /**
   * 图片加载失败，清除 URL 显示占位符
   */
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const plants = this.data.categoryInfo.plants.map((p, i) => {
      if (i === index) p.imageUrl = '';
      return p;
    });
    this.setData({ 'categoryInfo.plants': plants });
  }
});
