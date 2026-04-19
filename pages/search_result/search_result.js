/**
 * AI 植物管家 - 搜索结果页面
 */
const app = getApp();

Page({
  data: {
    searchText: '',
    scientificName: '',  // 优先使用的学名（来自发现页面）
    loading: true,
    error: false,
    errorMessage: '',
    plant: null,
    isFavorite: false,
    collapsedSections: {
      seasonalCare: true,
      funFacts: true
    },
    difficultyStars: '⭐⭐⭐',
  },

  onLoad(options) {
    const searchText = decodeURIComponent(options.search_text || '');
    const scientificName = decodeURIComponent(options.scientific_name || '');
    const imageUrl = decodeURIComponent(options.image_url || '');  // 接收传递的缩略图
    const identifyDataStr = options.identify_data ? decodeURIComponent(options.identify_data) : '';  // 识别结果数据
    const identifyData = identifyDataStr ? JSON.parse(identifyDataStr) : null;
    
    const hasImage = !!imageUrl;  // 是否有传递的缩略图（已知植物）
    const hasIdentifyData = !!identifyData;  // 是否有识别结果数据（从 search_page 传来）
    
    // 所有植物都显示加载动画（放大镜）
    this.setData({ 
      searchText, 
      scientificName,
      headerImage: imageUrl,
      hasImage,
      identifyData,
      hasIdentifyData,
      loading: true
    });
    
    if (searchText) {
      this.searchPlant(searchText, scientificName, hasImage, hasIdentifyData, identifyData);
    } else {
      this.setData({ loading: false, error: true });
    }
  },

  /**
   * 切换收藏状态
   */
  toggleFavorite() {
    const { plant, isFavorite } = this.data;
    
    if (!plant) return;
    
    this.setData({ isFavorite: !isFavorite });
    
    if (!isFavorite && app.addFavorite) {
      // 确保有 id
      if (!plant.id) {
        plant.id = 'search_' + Date.now();
      }
      app.addFavorite(plant);
    } else if (isFavorite && app.removeFavorite) {
      app.removeFavorite(plant.id);
    }
    
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
  },

  /**
   * 检查是否已收藏
   */
  checkFavorite() {
    const { plant } = this.data;
    if (plant && plant.id && app.isFavorite) {
      this.setData({ isFavorite: app.isFavorite(plant.id) });
    }
  },

  /**
   * 搜索植物信息
   * @param {string} keyword - 植物名称
   * @param {string} providedScientificName - 传入学名
   * @param {boolean} hasImage - 是否有传递的缩略图（已知植物）
   * @param {boolean} hasIdentifyData - 是否有识别结果数据
   * @param {object} identifyData - 识别结果数据（从 search_page 传来）
   */
  async searchPlant(keyword, providedScientificName, hasImage, hasIdentifyData, identifyData) {
    // 有识别结果数据：直接使用（从 search_page 传来）
    if (hasIdentifyData && identifyData) {
      console.log('[search_result] 使用识别结果数据:', keyword);
      const plant = this.formatIdentifyData(identifyData);
      const stars = this.generateDifficultyStars(plant.difficultyLevel);
      this.setData({ 
        loading: false, 
        error: false, 
        plant: plant,
        difficultyStars: stars
      });
      this.checkFavorite();
      return;
    }
    
    // 已知植物（有图片）：直接使用预设数据，不调用云函数（速度最快）
    if (hasImage) {
      console.log('[search_result] 已知植物，使用预设数据:', keyword);
      const presetPlant = this.getPresetPlant(keyword);
      const stars = this.generateDifficultyStars(presetPlant.difficultyLevel);
      this.setData({ 
        loading: false, 
        error: false, 
        plant: presetPlant,
        difficultyStars: stars
      });
      this.checkFavorite();
      return;
    }
    
    // 未知植物：调用云函数获取信息（文字 + 图片）
    console.log('[search_result] 未知植物，调用云函数:', keyword);
    wx.showLoading({ title: '查询中...' });
    
    try {
      // 优化：使用 setTimeout 防止 UI 阻塞
      const aiResult = await Promise.race([
        this.getPlantInfoFromCloud(keyword),
        new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 30000))
      ]);
      wx.hideLoading();
      
      console.log('[search_result] 云函数返回结果:', aiResult ? '有数据' : 'null');
      
      if (!aiResult || !aiResult.success) {
        console.log('[search_result] 云函数返回失败，使用备用数据');
        const fallbackPlant = this.getFallbackPlant(keyword);
        const stars = this.generateDifficultyStars(fallbackPlant.difficultyLevel);
        this.setData({ loading: false, error: false, plant: fallbackPlant, difficultyStars: stars });
        this.checkFavorite();
        return;
      }
      
      const scientificNameToUse = providedScientificName || aiResult.scientificName || '';
      const imageUrlFromCloud = aiResult.imageUrl || '';
      const plant = {
        id: 'search_' + Date.now(),
        name: keyword,
        ...aiResult,
        scientificName: scientificNameToUse,
        imageUrl: imageUrlFromCloud
      };
      
      const stars = this.generateDifficultyStars(plant.difficultyLevel);
      // 未知植物直接使用云函数返回的图片作为头图
      this.setData({ 
        loading: false, 
        error: false, 
        plant, 
        difficultyStars: stars,
        headerImage: imageUrlFromCloud  // 直接使用云函数返回的图片
      });
      this.checkFavorite();
      
    } catch (err) {
      console.error('[search_result] 搜索异常:', err);
      wx.hideLoading();
      const fallbackPlant = this.getFallbackPlant(keyword);
      const stars = this.generateDifficultyStars(fallbackPlant.difficultyLevel);
      this.setData({ loading: false, error: false, plant: fallbackPlant, difficultyStars: stars });
      this.checkFavorite();
    }
  },



  /**
   * 格式化识别结果数据
   */
  formatIdentifyData(data) {
    return {
      id: data.id || 'identify_' + Date.now(),
      name: data.name || '未知植物',
      scientificName: data.scientificName || '',
      scientificNameLatin: data.scientificNameLatin || '',
      commonNames: data.commonNames || '',
      family: data.family || '',
      description: data.plantProfile || data.description || '',
      growthHabit: data.growthHabit || '',
      mainValue: data.mainValue || '',
      careGuide: data.careGuide || {},
      difficultyLevel: data.difficultyLevel || 3,
      difficultyText: data.difficultyText || '中等难度',
      quickTips: data.quickTips || [],
      commonProblems: data.commonProblems || [],
      confidence: data.confidence || 0,
      source: data.source || 'AI 识别',
      imageUrl: data.imageUrl || ''
    };
  },

  /**
   * 获取预设植物数据（已知植物，秒开）
   */
  getPresetPlant(keyword) {
    // 使用 plantCache.js 的完整数据（26+ 植物）
    // 这样所有发现页的植物都能秒开
    const PLANT_CACHE = {
      '绿萝': {
        id: 'preset_lvluo',
        name: '绿萝',
        scientificName: '绿萝',
        scientificNameLatin: 'Epipremnum aureum',
        description: '绿萝叶片呈心形，翠绿光亮，藤蔓柔软下垂，生长迅速。新叶嫩绿，老叶深绿有光泽，叶面光滑，叶脉清晰。植株可攀爬或垂吊，极具观赏性。',
        growthHabit: '绿萝原产于热带雨林，喜欢温暖湿润、半阴的环境。生长适温 15-25℃，冬季不低于 10℃。耐阴性强，适合室内养护。生长速度快，一年可长 1-2 米。',
        mainValue: '绿萝观赏价值高，叶片翠绿美观，可垂吊或攀爬。净化空气能力强，能有效吸收甲醛、苯等有害气体。寓意坚韧善良，生命力顽强。',
        careGuide: { light: '喜明亮散射光，避免阳光直射，耐阴性强，适合室内养护', water: '保持土壤湿润，春夏每周 2-3 次，秋冬每周 1-2 次，见干见湿', temperature: '适宜 15-25℃，冬季不低于 10℃，夏季避免高温', humidity: '喜湿润环境，定期喷水增湿，保持空气湿度 60-70%', fertilizer: '生长期每月施 1 次稀薄液肥，冬季停止施肥', soil: '疏松肥沃、排水良好的腐叶土或泥炭土', pruning: '及时修剪黄叶和过长藤蔓，促进分枝', propagation: '扦插繁殖，水培或土培皆可，成活率高' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['遇水即活，新手首选', '净化空气能力强', '耐阴好养，适合室内', '吸收甲醛，健康卫士'],
        commonProblems: ['叶片发黄：浇水过多或光照不足', '烂根：积水导致，需控制浇水'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/lvluo.png'
      },
      '多肉': {
        id: 'preset_duorou',
        name: '多肉',
        scientificName: '多肉植物',
        scientificNameLatin: 'Succulent',
        description: '多肉植物叶片肥厚多汁，形态多样，有莲座状、柱状、球状等。色彩丰富，从翠绿到紫红，部分品种叶面有白粉或绒毛。花朵小巧精致，色彩艳丽。',
        growthHabit: '多肉植物原产于干旱地区，喜欢阳光充足、干燥通风的环境。生长适温 15-25℃，冬季不低于 5℃。耐旱性强，生长速度较慢。',
        mainValue: '多肉植物观赏价值高，品种丰富，形态各异。易于养护，适合新手。部分品种可食用或药用。寓意坚强勇敢，生命力顽强。',
        careGuide: { light: '喜充足阳光，每天 4-6 小时，夏季适当遮阴', water: '土壤干透再浇，春夏每周 1 次，秋冬每月 1-2 次', temperature: '适宜 15-25℃，冬季不低于 5℃，夏季避免高温', humidity: '喜干燥环境，保持通风，避免潮湿', fertilizer: '生长期每月施 1 次多肉专用肥', soil: '颗粒土或多肉专用土，排水良好', pruning: '及时清理枯叶和徒长枝条', propagation: '叶插繁殖，成活率高，春秋最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['多晒太阳少浇水', '土壤干透再浇，宁干勿湿', '夏季遮阴，避免暴晒', '冬季保暖，防冻害'],
        commonProblems: ['叶片化水：浇水过多，需控水', '徒长：光照不足，需增加光照'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/duorou.png'
      },
      '龟背竹': {
        id: 'preset_guibeizhu',
        name: '龟背竹',
        scientificName: '龟背竹',
        scientificNameLatin: 'Monstera deliciosa',
        description: '龟背竹叶片巨大，呈心形，有独特的孔裂和深裂，形似龟背。叶片深绿有光泽，叶脉清晰。茎干粗壮，气根发达。植株可攀爬生长，高度可达 2-3 米。',
        growthHabit: '龟背竹原产于墨西哥，喜欢温暖湿润、半阴的环境。生长适温 20-30℃，冬季不低于 10℃。生长速度中等，寿命长。',
        mainValue: '龟背竹观赏价值高，叶片独特美观，极具热带风情。净化空气能力强，能吸收甲醛。寓意健康长寿，深受喜爱。',
        careGuide: { light: '喜明亮散射光，避免阳光直射，耐阴性较强', water: '保持土壤湿润，春夏每周 2-3 次，秋冬每周 1-2 次', temperature: '适宜 20-30℃，冬季不低于 10℃，夏季避免高温', humidity: '喜高湿环境，定期喷水增湿，保持空气湿度 70-80%', fertilizer: '生长期每月施 1-2 次复合肥', soil: '腐叶土或泥炭土，疏松肥沃', pruning: '及时修剪黄叶和老叶', propagation: '扦插繁殖，春秋最佳，成活率高' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['避免阳光直射，防灼伤', '保持土壤湿润，勿积水', '定期喷水增湿，叶片更绿', '叶片大而美观，热带风情'],
        commonProblems: ['叶片发黄：浇水过多或光照不足', '烂根：积水导致，需控制浇水'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/guibeizhu.png'
      },
      '茉莉花': {
        id: 'preset_moli',
        name: '茉莉花',
        scientificName: '茉莉花',
        scientificNameLatin: 'Jasminum sambac',
        description: '茉莉花花朵洁白如玉，花瓣多层，香气袭人，芬芳迷人。叶片对生，椭圆形，翠绿光亮。植株分枝多，株型紧凑。花期 5-10 月，盛花期夏季。',
        growthHabit: '茉莉花原产于印度，喜欢温暖湿润、阳光充足的环境。生长适温 20-30℃，冬季不低于 5℃。生长速度快，花期长。',
        mainValue: '茉莉花观赏价值高，花朵洁白芳香。花香浓郁，可提取香精。花朵可泡茶，有清热解毒功效。寓意纯洁美丽，深受喜爱。',
        careGuide: { light: '喜充足阳光，每天 6 小时以上，光照足花香浓', water: '保持土壤湿润，春夏每天 1 次，秋冬每周 2-3 次', temperature: '适宜 20-30℃，冬季不低于 5℃，夏季避免高温', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每半月施 1 次磷钾肥，促开花', soil: '微酸性土壤，pH 值 5.5-6.5', pruning: '花后及时修剪，促发新枝', propagation: '扦插繁殖，春夏最佳，成活率高' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['多晒太阳，花香更浓', '保持土壤湿润，勿干旱', '花前施磷钾肥，促开花', '花香浓郁可泡茶，清香怡人'],
        commonProblems: ['只长叶不开花：光照不足或施肥不当', '叶片发黄：土壤碱性，需调酸'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/molihua.png'
      },
      '发财树': {
        id: 'preset_facaishu',
        name: '发财树',
        scientificName: '发财树',
        scientificNameLatin: 'Pachira aquatica',
        description: '发财树树干挺拔，基部膨大，叶片掌状复叶，5-9 片小叶，翠绿光亮。株型优美，可编织造型。植株高大，室内可达 2-3 米。',
        growthHabit: '发财树原产于中美洲，喜欢温暖湿润、阳光充足的环境。生长适温 20-30℃，冬季不低于 10℃。生长速度中等，寿命长。',
        mainValue: '发财树观赏价值高，株型优美，寓意财源广进。净化空气能力强，能吸收有害气体。适合办公室和家居摆放。',
        careGuide: { light: '喜充足散射光，避免强光直射，耐阴性较强', water: '保持土壤微湿，春夏每周 1-2 次，秋冬每周 1 次', temperature: '适宜 20-30℃，冬季不低于 10℃，夏季避免高温', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1 次复合肥', soil: '沙质土壤，排水良好', pruning: '定期修剪，保持株型', propagation: '扦插繁殖，春夏最佳' },
        difficultyLevel: 2,
        difficultyText: '适合新手养护',
        quickTips: ['避免强光直射，防灼伤', '冬季保暖，防冻害', '定期修剪，保持株型美观', '寓意财源广进，招财进宝'],
        commonProblems: ['叶片发黄：浇水过多或光照不足', '树干发软：烂根，需控制浇水'],
        imageUrl: 'https://images.pexels.com/photos/29150327/pexels-photo-29150327.jpeg'
      },
      '吊兰': {
        id: 'preset_diaolan',
        name: '吊兰',
        scientificName: '吊兰',
        scientificNameLatin: 'Chlorophytum comosum',
        description: '吊兰叶片细长柔软，呈带状，翠绿有光泽，边缘有白色或黄色条纹。花茎从叶丛中抽出，开白色小花。植株可垂吊生长，匍匐茎上生小植株。',
        growthHabit: '吊兰原产于南非，喜欢温暖湿润、半阴的环境。生长适温 15-25℃，冬季不低于 5℃。生长速度快，繁殖容易。',
        mainValue: '吊兰观赏价值高，叶片优美，可垂吊观赏。净化空气能力极强，被称为"空气净化器"。繁殖简单，一盆变多盆。',
        careGuide: { light: '喜明亮散射光，避免阳光直射，耐阴性强', water: '保持土壤湿润，春夏每周 2-3 次，秋冬每周 1-2 次', temperature: '适宜 15-25℃，冬季不低于 5℃，夏季避免高温', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '腐叶土或泥炭土，疏松肥沃', pruning: '及时修剪黄叶和老叶', propagation: '分株繁殖，剪取匍匐茎上的小植株即可' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['耐阴好养，适合室内', '净化空气能力强', '生长迅速，一盆变多盆', '繁殖简单，剪下即活'],
        commonProblems: ['叶尖发黄：空气干燥，需增湿', '叶片发黄：光照过强或浇水过多'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/diaolan.png'
      },
      '虎皮兰': {
        id: 'preset_hupilan',
        name: '虎皮兰',
        scientificName: '虎皮兰',
        scientificNameLatin: 'Sansevieria trifasciata',
        description: '虎皮兰叶片挺拔直立，剑形，深绿色，有虎纹斑纹和黄色边缘。株型紧凑，高度 30-100 厘米。根状茎粗壮，叶片从基部抽出。',
        growthHabit: '虎皮兰原产于非洲，喜欢温暖干燥、阳光充足的环境。生长适温 18-30℃，冬季不低于 10℃。耐旱性强，生长速度较慢。',
        mainValue: '虎皮兰观赏价值高，叶片挺拔美观。夜间释放氧气，有助睡眠。净化空气能力强，能吸收甲醛。寓意坚强勇敢。',
        careGuide: { light: '喜充足阳光，耐半阴，适应性强', water: '土壤干透再浇，春夏每 2 周 1 次，秋冬每月 1 次', temperature: '适宜 18-30℃，冬季不低于 10℃', humidity: '喜干燥环境，保持通风', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '沙质土壤，排水良好', pruning: '及时修剪黄叶和老叶', propagation: '分株繁殖，春秋最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['晚上释放氧气，助眠', '耐旱耐贫瘠，好养', '净化空气能力强', '一个月浇 1-2 次即可'],
        commonProblems: ['叶片发软：浇水过多，需控水', '叶片倒伏：光照不足，需增加光照'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/hupilan.png'
      },
      '文竹': {
        id: 'preset_wenzhu',
        name: '文竹',
        scientificName: '文竹',
        scientificNameLatin: 'Asparagus setaceus',
        description: '文竹枝叶纤细，如云片般轻盈，翠绿雅致。叶片呈羽毛状，层次分明。株型优美，高度 30-100 厘米。茎干细长，有攀援性。',
        growthHabit: '文竹原产于非洲，喜欢温暖湿润、半阴的环境。生长适温 15-25℃，冬季不低于 5℃。生长速度中等，寿命长。',
        mainValue: '文竹观赏价值高，枝叶纤细优雅，书香气息浓厚。可提升家居气质，适合书房摆放。寓意永恒纯洁。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '保持土壤湿润，春夏每周 2-3 次，秋冬每周 1-2 次', temperature: '适宜 15-25℃，冬季不低于 5℃', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '腐叶土或泥炭土，疏松肥沃', pruning: '及时修剪黄叶和过长枝条', propagation: '播种繁殖，春季最佳' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['书香气息，文雅高贵', '优雅美观，适合书房', '喜湿润环境，定期喷水', '避免强光，防叶片发黄'],
        commonProblems: ['叶片发黄：空气干燥或光照过强', '徒长：光照不足，需增加散射光'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/wenzhu.png'
      },
      '君子兰': {
        id: 'preset_junzilan',
        name: '君子兰',
        scientificName: '君子兰',
        scientificNameLatin: 'Clivia miniata',
        description: '君子兰叶片宽厚，呈扇形排列，深绿有光泽。花朵伞形花序，橙红色或黄色，花型优美。株型端庄，高度 30-50 厘米。',
        growthHabit: '君子兰原产于南非，喜欢温暖湿润、半阴的环境。生长适温 15-25℃，冬季不低于 10℃。生长速度慢，寿命长。',
        mainValue: '君子兰观赏价值高，叶片端庄，花朵艳丽。象征高尚品格，花期长。净化空气能力强。寓意高贵典雅。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '保持土壤微湿，春夏每周 2 次，秋冬每周 1 次', temperature: '适宜 15-25℃，冬季不低于 10℃', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1-2 次复合肥', soil: '腐叶土或泥炭土，疏松肥沃', pruning: '及时修剪黄叶和残花', propagation: '分株繁殖，春秋最佳' },
        difficultyLevel: 3,
        difficultyText: '需要一定养护经验',
        quickTips: ['高贵典雅，君子之风', '花期长，观赏价值高', '避免强光，防叶片灼伤', '定期施肥，促开花'],
        commonProblems: ['叶片发黄：浇水过多或光照不足', '不开花：光照不足或温度不适'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/junzilan.png'
      },
      '栀子花': {
        id: 'preset_zhizihua',
        name: '栀子花',
        scientificName: '栀子花',
        scientificNameLatin: 'Gardenia jasminoides',
        description: '栀子花花朵洁白如玉，花瓣多层，花香浓郁，清香四溢。叶片对生，椭圆形，深绿有光泽。株型紧凑，高度 1-2 米。花期 5-7 月。',
        growthHabit: '栀子花原产于中国，喜欢温暖湿润、阳光充足的环境。生长适温 18-28℃，冬季不低于 0℃。生长速度中等。',
        mainValue: '栀子花观赏价值高，花朵洁白芳香。花香浓郁，可提取香精。寓意纯洁美丽，永恒的爱。',
        careGuide: { light: '喜充足阳光，每天 4-6 小时', water: '保持土壤湿润，春夏每天 1 次，秋冬每周 2-3 次', temperature: '适宜 18-28℃，冬季不低于 0℃', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1-2 次磷钾肥', soil: '酸性土壤，pH 值 5.0-6.0', pruning: '花后及时修剪，促发新枝', propagation: '扦插繁殖，春夏最佳' },
        difficultyLevel: 3,
        difficultyText: '需要一定养护经验',
        quickTips: ['花香浓郁，清香四溢', '喜酸性土壤，定期调酸', '多晒太阳，促开花', '花后修剪，保持株型'],
        commonProblems: ['叶片发黄：土壤碱性，需调酸', '只长叶不开花：光照不足或施肥不当'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhizihua.png'
      },
      '蝴蝶兰': {
        id: 'preset_hudielan',
        name: '蝴蝶兰',
        scientificName: '蝴蝶兰',
        scientificNameLatin: 'Phalaenopsis aphrodite',
        description: '蝴蝶兰花姿优美，如蝴蝶飞舞，花色丰富，有白、粉、紫等。花朵大而艳丽，花期长达 2-3 个月。叶片宽厚，深绿有光泽。',
        growthHabit: '蝴蝶兰原产于东南亚，喜欢温暖湿润、半阴的环境。生长适温 18-28℃，冬季不低于 15℃。生长速度慢，花期长。',
        mainValue: '蝴蝶兰观赏价值极高，花姿优美，被誉为"花中皇后"。花期长，可达数月。寓意幸福向你飞来。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '保持介质微湿，每周 1-2 次', temperature: '适宜 18-28℃，冬季不低于 15℃', humidity: '喜高湿环境，保持空气湿度 70-80%', fertilizer: '生长期每月施 1-2 次兰花专用肥', soil: '水苔或树皮，透气性好', pruning: '花后剪去花梗，促发新花', propagation: '分株繁殖，春秋最佳' },
        difficultyLevel: 4,
        difficultyText: '需要较高养护技巧',
        quickTips: ['花中皇后，花姿优美', '花期长达 2-3 个月', '避免强光，防灼伤', '保持高湿，定期喷水'],
        commonProblems: ['叶片发黄：浇水过多或介质不透气', '不开花：温度不足或光照不当'],
        imageUrl: 'https://images.pexels.com/photos/11177712/pexels-photo-11177712.jpeg'
      },
      '芦荟': {
        id: 'preset_luhui',
        name: '芦荟',
        scientificName: '芦荟',
        scientificNameLatin: 'Aloe vera',
        description: '芦荟叶片肥厚多汁，呈剑形，边缘有刺状齿，绿色或灰绿色。株型紧凑，高度 30-60 厘米。叶片内含透明凝胶。',
        growthHabit: '芦荟原产于非洲，喜欢阳光充足、干燥通风的环境。生长适温 15-30℃，冬季不低于 5℃。耐旱性强，生长速度中等。',
        mainValue: '芦荟观赏价值高，形态独特。叶片凝胶可护肤美容，有消炎杀菌功效。可食用，有保健作用。寓意健康和爱。',
        careGuide: { light: '喜充足阳光，每天 4-6 小时', water: '土壤干透再浇，春夏每 2 周 1 次，秋冬每月 1 次', temperature: '适宜 15-30℃，冬季不低于 5℃', humidity: '喜干燥环境，保持通风', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '沙质土壤，排水良好', pruning: '及时清理枯叶', propagation: '分株繁殖，春秋最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['耐旱好养，一个月浇一次', '叶片凝胶可护肤美容', '消炎杀菌，保健功效', '美容养颜，天然护肤品'],
        commonProblems: ['叶片发软：浇水过多，需控水', '叶片发红：光照过强，需遮阴'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/luhui.png'
      },
      '富贵竹': {
        id: 'preset_fuguizhu',
        name: '富贵竹',
        scientificName: '富贵竹',
        scientificNameLatin: 'Dracaena sanderiana',
        description: '富贵竹茎秆挺拔，有节，叶片翠绿，披针形。可水培或土培。株型优美，高度 30-100 厘米。茎秆可弯曲造型。',
        growthHabit: '富贵竹原产于非洲，喜欢温暖湿润、半阴的环境。生长适温 18-28℃，冬季不低于 10℃。生长速度中等。',
        mainValue: '富贵竹观赏价值高，株型优美。寓意吉祥，招财进宝。可水培，干净卫生。适合办公室和家居摆放。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '保持土壤湿润或水培，春夏每周 2-3 次', temperature: '适宜 18-28℃，冬季不低于 10℃', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '土壤或水培皆可', pruning: '及时修剪黄叶', propagation: '扦插繁殖，春夏最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['寓意吉祥，招财进宝', '水培土培皆可，干净卫生', '开运竹，带来好运', '耐阴好养，适合室内'],
        commonProblems: ['叶片发黄：浇水过多或光照不足', '茎秆发软：烂根，需控制浇水'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/fuguizhu.png'
      },
      '仙人掌': {
        id: 'preset_xianrenzhang',
        name: '仙人掌',
        scientificName: '仙人掌',
        scientificNameLatin: 'Cactaceae',
        description: '仙人掌形态独特，有刺，耐旱好养。防辐射。',
        growthHabit: '喜阳光充足、干燥通风的环境。生长适温 15-30℃。',
        mainValue: '观赏价值高，防辐射，生命力顽强。',
        careGuide: { light: '喜充足阳光', water: '土壤干透再浇', temperature: '适宜 15-30℃', humidity: '喜干燥环境', fertilizer: '每月施 1 次肥', soil: '沙质土壤', pruning: '清理枯死部分', propagation: '扦插繁殖' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['防辐射', '耐旱好养', '生命力强', '适合上班族'],
        commonProblems: ['茎部发软：浇水过多', '徒长：光照不足'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/xianrenzhang.png'
      },
      '金钱树': {
        id: 'preset_jinqianshu',
        name: '金钱树',
        scientificName: '金钱树',
        scientificNameLatin: 'Zamioculcas zamiifolia',
        description: '金钱树叶片厚实光亮，形似铜钱，寓意财源广进。',
        growthHabit: '喜温暖湿润、半阴的环境。生长适温 20-30℃。',
        mainValue: '观赏价值高，寓意财源广进。',
        careGuide: { light: '喜明亮散射光', water: '土壤干透再浇', temperature: '适宜 20-30℃', humidity: '喜湿润环境', fertilizer: '每月施 1 次肥', soil: '腐叶土', pruning: '修剪黄叶', propagation: '分株繁殖' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['寓意财源广进', '耐旱耐阴', '几乎不用管', '叶片厚实'],
        commonProblems: ['叶片发黄：浇水过多', '烂根：积水导致'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/jinqianshu.png'
      },
      '万年青': {
        id: 'preset_wannianqing',
        name: '万年青',
        scientificName: '万年青',
        scientificNameLatin: 'Rohdea japonica',
        description: '万年青叶片宽厚，四季常青，果实红色喜庆。',
        growthHabit: '喜温暖湿润、半阴的环境。生长适温 15-25℃。',
        mainValue: '观赏价值高，寓意吉祥，四季常青。',
        careGuide: { light: '喜明亮散射光', water: '保持土壤湿润', temperature: '适宜 15-25℃', humidity: '喜湿润环境', fertilizer: '每月施 1 次肥', soil: '腐叶土', pruning: '修剪黄叶', propagation: '分株繁殖' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['健康长寿', '四季常青', '寓意吉祥', '果实红色'],
        commonProblems: ['叶片发黄：浇水过多', '烂根：积水导致'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/wannianqing.png'
      },
      '竹芋': {
        id: 'preset_zhuyu',
        name: '竹芋',
        scientificName: '竹芋',
        scientificNameLatin: 'Calathea',
        description: '竹芋叶片宽大，色彩斑斓，叶面有美丽的斑纹和光泽。叶片夜间闭合，白天展开，非常有趣。对宠物安全无毒。',
        growthHabit: '竹芋原产于美洲热带地区，喜欢温暖湿润的半阴环境。生长适温 18-25℃，冬季不低于 15℃。生长速度中等。',
        mainValue: '竹芋观赏价值高，叶片美观，对宠物安全。适合多宠家庭。净化空气能力强。',
        careGuide: { light: '喜散射光，避免阳光直射', water: '保持土壤湿润，夏季每天浇水', temperature: '适宜 18-25℃，冬季保持 15℃以上', humidity: '喜高湿环境，经常向叶面喷水', fertilizer: '生长期每月施 1-2 次稀薄液肥', soil: '疏松肥沃、排水良好的腐叶土', pruning: '及时剪除枯黄叶片', propagation: '分株繁殖，春季换盆时进行' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['保持高湿度', '避免阳光直射', '对宠物安全', '叶片夜间闭合'],
        commonProblems: ['叶缘焦枯：空气干燥', '叶片卷曲：光照过强', '叶色变淡：缺肥'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhuyu.png'
      },
      '空气凤梨': {
        id: 'preset_kongqifengli',
        name: '空气凤梨',
        scientificName: '空气凤梨',
        scientificNameLatin: 'Tillandsia',
        description: '空气凤梨无需土壤，直接从空气中吸收水分和养分。形态独特，品种多样。可悬挂装饰，干净卫生。',
        growthHabit: '空气凤梨原产于美洲，喜欢温暖干燥、通风良好的环境。生长适温 15-30℃。耐旱性强。',
        mainValue: '观赏价值高，无需土壤，干净卫生。造型独特，可创意装饰。对宠物安全。',
        careGuide: { light: '喜明亮散射光，避免强光直射', water: '每周喷水 2-3 次，或浸泡 5-10 分钟', temperature: '适宜 15-30℃，冬季保持 10℃以上', humidity: '喜通风环境，定期喷水增湿', fertilizer: '每月喷 1 次稀薄液肥', soil: '无需土壤，可悬挂或放在透气的容器', pruning: '及时清理枯叶', propagation: '分株繁殖，母株会生出小芽' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['无需土壤', '每周喷水', '通风良好', '可悬挂装饰'],
        commonProblems: ['叶片发干：湿度不足', '腐烂：通风不良'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/kongqifengli.png'
      },
      '波士顿蕨': {
        id: 'preset_boshidunjue',
        name: '波士顿蕨',
        scientificName: '波士顿蕨',
        scientificNameLatin: 'Nephrolepis exaltata',
        description: '波士顿蕨叶片茂盛，呈羽状分裂，翠绿欲滴。生长迅速，可垂吊观赏。天然加湿器，能增加空气湿度。',
        growthHabit: '波士顿蕨原产于热带地区，喜欢温暖湿润的半阴环境。生长适温 15-25℃。生长速度快。',
        mainValue: '观赏价值高，叶片茂盛。天然加湿器，净化空气。对宠物安全。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '保持土壤湿润，夏季每天浇水', temperature: '适宜 15-25℃，冬季保持 10℃以上', humidity: '喜高湿环境，经常喷水增湿', fertilizer: '生长期每月施 1-2 次稀薄液肥', soil: '疏松肥沃、排水良好的腐叶土', pruning: '及时修剪枯黄叶片', propagation: '分株繁殖，极易成活' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['保持高湿度', '叶片茂盛', '对宠物安全', '天然加湿器'],
        commonProblems: ['叶片发黄：空气干燥', '生长缓慢：缺肥'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/boshidunjue.png'
      },
      '蜘蛛抱蛋': {
        id: 'preset_zhiwubaodan',
        name: '蜘蛛抱蛋',
        scientificName: '蜘蛛抱蛋',
        scientificNameLatin: 'Aspidistra elatior',
        description: '蜘蛛抱蛋叶片宽大，深绿有光泽，四季常青。生命力极强，耐阴耐旱。又名一叶兰。',
        growthHabit: '蜘蛛抱蛋原产于中国，喜欢温暖湿润的半阴环境。生长适温 15-25℃。生长速度慢，寿命长。',
        mainValue: '观赏价值高，叶片美观。耐阴易养护，适合室内。对宠物安全。',
        careGuide: { light: '喜散射光，耐阴性强', water: '保持土壤湿润，每周 2-3 次', temperature: '适宜 15-25℃，冬季保持 5℃以上', humidity: '喜湿润环境，定期喷水', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '疏松肥沃、排水良好的腐叶土', pruning: '及时清理枯黄叶片', propagation: '分株繁殖，春季最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['耐阴易养', '四季常青', '对宠物安全', '生命力强'],
        commonProblems: ['叶片发黄：浇水过多', '生长缓慢：正常现象'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/zhiwubaodan.png'
      },
      '圆叶椒草': {
        id: 'preset_yuanyejiaocao',
        name: '圆叶椒草',
        scientificName: '圆叶椒草',
        scientificNameLatin: 'Peperomia obtusifolia',
        description: '圆叶椒草叶片圆润可爱，深绿有光泽。植株小巧，适合桌面摆放。对宠物安全无毒。',
        growthHabit: '圆叶椒草原产于美洲热带地区，喜欢温暖湿润的半阴环境。生长适温 18-25℃。生长速度慢。',
        mainValue: '观赏价值高，叶片可爱。小巧不占空间。对宠物安全。',
        careGuide: { light: '喜明亮散射光，避免阳光直射', water: '土壤干透再浇水，每周 1-2 次', temperature: '适宜 18-25℃，冬季保持 10℃以上', humidity: '喜湿润环境，定期喷水', fertilizer: '生长期每月施 1 次稀薄液肥', soil: '疏松肥沃、排水良好的腐叶土', pruning: '及时修剪过长枝条', propagation: '扦插繁殖，春秋最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['叶片圆润', '对宠物安全', '小巧可爱', '适合桌面'],
        commonProblems: ['叶片发黄：浇水过多', '徒长：光照不足'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/yuanyejiaocao.png'
      },
      '长寿花': {
        id: 'preset_changshouhua',
        name: '长寿花',
        scientificName: '长寿花',
        scientificNameLatin: 'Kalanchoe blossfeldiana',
        description: '长寿花叶片肥厚，深绿有光泽，花朵密集，色彩丰富，有红、粉、黄、橙等色。花期超长，从冬季开到春季。寓意健康长寿。',
        growthHabit: '长寿花原产于非洲，喜欢温暖干燥、阳光充足的环境。生长适温 15-25℃，冬季不低于 10℃。生长速度中等，花期长。',
        mainValue: '观赏价值高，花期超长，花色丰富。寓意吉祥，适合送长辈。耐旱易养，适合新手。',
        careGuide: { light: '喜充足阳光，每天 4-6 小时，光照足开花多', water: '土壤干透再浇，春夏每周 1 次，秋冬每 2 周 1 次', temperature: '适宜 15-25℃，冬季保持 10℃以上', humidity: '喜干燥环境，保持通风', fertilizer: '生长期每月施 1 次磷钾肥，促开花', soil: '疏松透气、排水良好的沙质土壤', pruning: '花后及时修剪残花，促发新枝', propagation: '扦插繁殖，极易成活，春秋最佳' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['多晒太阳，开花更多', '耐旱好养，少浇水', '花期超长，冬季开花', '寓意吉祥，适合送长辈'],
        commonProblems: ['只长叶不开花：光照不足', '叶片发软：浇水过多'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/changshouhua.png'
      },
      '天竺葵': {
        id: 'preset_tianzhukui',
        name: '天竺葵',
        scientificName: '天竺葵',
        scientificNameLatin: 'Pelargonium',
        description: '天竺葵花朵美丽，色彩丰富，有红、粉、白等色。花期长，几乎全年开花。叶片有香气，能驱蚊。适合阳台种植。',
        growthHabit: '天竺葵原产于非洲，喜欢温暖干燥、阳光充足的环境。生长适温 15-25℃，冬季不低于 5℃。生长速度快，花期长。',
        mainValue: '观赏价值高，花期超长，色彩丰富。叶片香气能驱蚊。适合阳台和庭院种植。',
        careGuide: { light: '喜充足阳光，每天 6 小时以上，光照足开花多', water: '土壤表面干了再浇，春夏每周 2-3 次，秋冬每周 1 次', temperature: '适宜 15-25℃，冬季保持 5℃以上', humidity: '喜干燥环境，保持通风良好', fertilizer: '生长期每半月施 1 次磷钾肥，促开花', soil: '疏松肥沃、排水良好的沙质土壤', pruning: '花后及时修剪残花，促发新枝', propagation: '扦插繁殖，春秋最佳，极易成活' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['多晒太阳，开花不断', '叶片香气能驱蚊', '花期超长，几乎全年', '适合阳台种植'],
        commonProblems: ['只长叶不开花：光照不足', '叶片发黄：浇水过多'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/tianzhukui.png'
      },
      '矮牵牛': {
        id: 'preset_aiqianniu',
        name: '矮牵牛',
        scientificName: '矮牵牛',
        scientificNameLatin: 'Petunia',
        description: '矮牵牛花朵大而美丽，色彩斑斓，有红、粉、紫、白等色。花量超大，花期长。适合悬挂种植，装饰阳台和庭院。',
        growthHabit: '矮牵牛原产于美洲，喜欢温暖湿润、阳光充足的环境。生长适温 15-25℃，冬季不低于 5℃。生长速度快，花期长。',
        mainValue: '观赏价值高，花量大，色彩丰富。花期长，装饰性强。适合悬挂和盆栽。',
        careGuide: { light: '喜充足阳光，每天 6 小时以上，光照足开花多', water: '保持土壤湿润，春夏每天 1 次，秋冬每周 2-3 次', temperature: '适宜 15-25℃，冬季保持 5℃以上', humidity: '喜湿润环境，定期喷水增湿', fertilizer: '生长期每周施 1 次稀薄磷钾肥，促开花', soil: '疏松肥沃、排水良好的沙质土壤', pruning: '花后及时修剪残花，促发新枝', propagation: '播种繁殖，春季最佳，易发芽' },
        difficultyLevel: 1,
        difficultyText: '非常适合新手养护',
        quickTips: ['多晒太阳，开花更多', '花量超大，色彩斑斓', '花期长，装饰性强', '适合悬挂种植'],
        commonProblems: ['只长叶不开花：光照不足', '花朵小：缺肥，需定期施肥'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/aiqianniu.png'
      },
      '月季': {
        id: 'preset_yueji',
        name: '月季',
        scientificName: '月季',
        scientificNameLatin: 'Rosa chinensis',
        description: '月季花朵大而美丽，色彩丰富，有红、粉、黄、白等色。花期长，几乎月月开花。品种繁多，观赏价值极高。',
        growthHabit: '月季原产于中国，喜欢温暖湿润、阳光充足的环境。生长适温 15-25℃，冬季不低于 5℃。生长速度快，花期长。',
        mainValue: '观赏价值极高，花姿优美，品种繁多。花期长，几乎全年有花。适合庭院和阳台种植。',
        careGuide: { light: '喜充足阳光，每天 6 小时以上，光照足开花多', water: '保持土壤湿润，春夏每天 1 次，秋冬每周 2-3 次', temperature: '适宜 15-25℃，冬季保持 5℃以上', humidity: '喜湿润环境，保持通风良好', fertilizer: '生长期每半月施 1 次复合肥，促开花', soil: '疏松肥沃、排水良好的沙质土壤', pruning: '花后及时修剪残花，冬季重剪', propagation: '扦插或嫁接繁殖，春秋最佳' },
        difficultyLevel: 2,
        difficultyText: '适合有一定经验的养护者',
        quickTips: ['多晒太阳，开花不断', '花后修剪，促发新枝', '定期施肥，花大色艳', '品种繁多，选择多样'],
        commonProblems: ['只长叶不开花：光照不足', '病虫害：通风不良，需定期防治'],
        imageUrl: 'cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/yueji.png'
      }
    };
    
    // 名称映射（别名 → 标准名）
    const nameMap = {
      '茉莉': '茉莉花'
    };
    
    // 如果有别名，转换为标准名
    const standardName = nameMap[keyword] || keyword;
    
    return PLANT_CACHE[standardName] || {
      id: 'preset_' + keyword,
      name: keyword,
      description: keyword + '是一种常见的观赏植物。',
      growthHabit: '喜欢温暖湿润的环境。',
      mainValue: '观赏价值高，适合室内养护。',
      careGuide: {},
      difficultyLevel: 2,
      difficultyText: '适合有一定经验的养护者',
      quickTips: ['适合室内养护'],
      commonProblems: [],
      imageUrl: ''
    };
  },

  /**
   * 获取备用植物数据（当 API 失败时）
   */
  getFallbackPlant(keyword) {
    // 即使云函数失败，也要显示基础信息
    return {
      id: 'fallback_' + Date.now(),
      name: keyword,
      commonNames: '',
      scientificName: '',
      scientificNameLatin: '',
      family: '',
      origin: '',
      description: keyword + '是一种常见的观赏植物。由于数据加载失败，显示基础信息。建议稍后重试。',
      appearance: '',
      growthHabit: '喜欢温暖湿润的环境，适合室内养护。',
      mainValue: '具有观赏价值，能美化环境，净化空气。',
      careGuide: {
        light: '喜明亮散射光，避免强光直射',
        water: '保持土壤湿润，见干见湿',
        temperature: '适宜温度 15-25℃',
        humidity: '喜湿润环境',
        fertilizer: '生长期每月施肥 1 次',
        soil: '疏松肥沃、排水良好的土壤',
        pruning: '及时修剪枯黄叶片',
        propagation: '扦插或播种繁殖'
      },
      difficultyLevel: 2,
      difficultyText: '适合有一定经验的养护者',
      quickTips: ['保持土壤湿润', '避免阳光直射', '定期施肥', '注意通风'],
      commonProblems: ['叶片发黄：可能是浇水过多', '生长缓慢：可能需要施肥'],
      taboos: '',
      imageUrl: ''
    };
  },

  /**
   * 从云函数获取植物详细信息（调用 getCareGuide，同时获取文字和图片）
   */
  async getPlantInfoFromCloud(keyword) {
    return new Promise((resolve) => {
      console.log('[search_result] 开始调用云函数 getCareGuide, plantName:', keyword);
      console.log('[search_result] 传递的拉丁学名:', this.data.scientificName);
      wx.cloud.callFunction({
        name: 'getCareGuide',
        data: {
          plantName: keyword,
          scientificName: this.data.scientificName || ''  // 传递拉丁学名
          // 不传 mode 参数，让云函数同时返回文字和图片
        },
        timeout: 60000,  // 60 秒超时（云函数配置已改为 60 秒）
        success: (res) => {
          console.log('[search_result] 云函数调用成功，完整返回:', JSON.stringify(res));
          console.log('[search_result] res.result:', JSON.stringify(res.result));
          
          // 检查图片 URL
          if (res.result && res.result.imageUrl) {
            console.log('[search_result] ✅ 云函数返回了图片:', res.result.imageUrl);
          } else {
            console.log('[search_result] ❌ 云函数没有返回图片');
          }
          
          console.log('[search_result] 云函数完整返回:', JSON.stringify(res.result));
          
          if (res.result && res.result.success) {
            // 完整映射所有字段（确保 WXML 需要的字段都存在）
            const result = {
              success: true,
              id: 'plant_' + Date.now(),
              name: res.result.name || keyword,
              commonNames: res.result.commonNames || '',
              scientificName: res.result.scientificName || '',
              scientificNameLatin: res.result.scientificNameLatin || '',
              family: res.result.family || '',
              origin: res.result.origin || res.result.origin || '',
              // 优先使用 description，如果没有则使用 plantProfile
              description: res.result.description || res.result.plantProfile || '',
              // 不再重复使用 plantProfile，让 WXML 只使用 description
              appearance: res.result.appearance || '',
              growthHabit: res.result.growthHabit || '',
              mainValue: res.result.mainValue || '',
              careGuide: res.result.careGuide || {},
              difficultyLevel: res.result.difficultyLevel || 3,
              difficultyText: res.result.difficultyText || '',
              quickTips: res.result.quickTips || [],
              commonProblems: res.result.commonProblems || [],
              imageUrl: res.result.imageUrl || '',
              taboos: res.result.taboos || ''
            };
            console.log('[search_result] ✅ 解析后的数据:', JSON.stringify(result, null, 2).substring(0, 500));
            console.log('[search_result] 关键字段检查:', {
              hasDescription: !!result.description,
              hasGrowthHabit: !!result.growthHabit,
              hasMainValue: !!result.mainValue,
              hasCareGuide: !!Object.keys(result.careGuide).length,
              descriptionLength: result.description?.length,
              growthHabitLength: result.growthHabit?.length,
              mainValueLength: result.mainValue?.length
            });
            resolve(result);
          } else {
            console.log('[search_result] ❌ 云函数返回失败:', res.result);
            resolve(null);
          }
        },
        fail: (err) => {
          console.error('[search_result] 云函数调用失败，完整错误:', JSON.stringify(err));
          console.error('[search_result] err.errMsg:', err.errMsg);
          console.error('[search_result] err.errCode:', err.errCode);
          resolve(null);
        }
      });
    });
  },

  // 已废弃：不再需要异步加载图片，已知植物直接传递 headerImage

  /**
   * 返回搜索
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: `AI 植物管家 - ${this.data.searchText}`,
      path: `/pages/search_result/search_result?search_text=${encodeURIComponent(this.data.searchText)}`
    };
  },

  /**
   * 预览图片
   */
  previewImage() {
    const { headerImage, plant } = this.data;
    const imageUrl = headerImage || plant?.imageUrl;
    
    if (imageUrl) {
      wx.previewImage({
        current: imageUrl,
        urls: [imageUrl],
        success: function(res) {
          console.log('图片预览成功');
        },
        fail: function(res) {
          console.error('图片预览失败:', res);
        }
      });
    }
  },



  /**
   * 根据难度等级生成星级
   */
  generateDifficultyStars(level) {
    if (!level) return '⭐⭐⭐';
    const starCount = Math.min(5, Math.max(1, level));
    return '⭐'.repeat(starCount);
  },

  /**
   * 切换折叠/展开状态
   */
  toggleCollapse(e) {
    const { target } = e.currentTarget.dataset;
    const { collapsedSections } = this.data;
    
    this.setData({
      collapsedSections: {
        ...collapsedSections,
        [target]: !collapsedSections[target]
      }
    });
  },


});