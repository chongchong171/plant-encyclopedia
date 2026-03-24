/**
 * 养花助手 - 搜索结果页面
 */
const app = getApp();

Page({
  data: {
    searchText: '',
    loading: true,
    error: false,
    plant: null
  },

  onLoad(options) {
    const searchText = decodeURIComponent(options.search_text || '');
    this.setData({ searchText });
    
    if (searchText) {
      this.searchPlant(searchText);
    } else {
      this.setData({ loading: false, error: true });
    }
  },

  /**
   * 搜索植物信息（AI 文字 + 真实图片）
   */
  async searchPlant(keyword) {
    wx.showLoading({ title: '查询中...' });
    
    const apiKey = app.globalData.qwenApiKey;
    
    // 先获取 AI 信息
    const aiResult = await this.getPlantInfoFromAI(keyword, apiKey);
    
    if (!aiResult) {
      wx.hideLoading();
      this.setData({ loading: false, error: true });
      return;
    }
    
    // 使用学名搜索图片（更准确）
    const imageUrl = await this.getPlantImageFromWikimedia(keyword, aiResult.scientificName);
    
    wx.hideLoading();
    
    const plant = {
      ...aiResult,
      imageUrl: imageUrl || ''
    };
    
    this.setData({ loading: false, error: false, plant });
  },

  /**
   * 从 AI 获取植物详细信息
   */
  getPlantInfoFromAI(keyword, apiKey) {
    return new Promise((resolve) => {
      wx.request({
        url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'qwen-turbo',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一位专业的植物百科专家，请用通俗易懂的语言介绍植物。'
              },
              {
                role: 'user',
                content: `请详细介绍"${keyword}"这种植物，以JSON格式返回：
{
  "name": "植物名称",
  "commonNames": "老百姓日常叫法",
  "scientificName": "学名",
  "family": "科属",
  "origin": "原产地",
  "description": "详细介绍（100字以上）：外观特点、生长习性、主要用途",
  "appearance": "外观描述（50字）：茎、叶、花的特点",
  "growthHabit": "生长习性（50字）",
  "mainValue": "主要价值（50字）：观赏、净化空气等",
  "careGuide": {
    "light": "光照需求（具体说明）",
    "water": "浇水方法（频率和方法）",
    "temperature": "适宜温度范围",
    "humidity": "湿度要求",
    "fertilizer": "施肥建议"
  },
  "difficultyLevel": 3,
  "difficultyText": "养护难度说明",
  "quickTips": ["要点1", "要点2", "要点3"],
  "taboos": "养护禁忌（如不能暴晒、不能积水等）"
}`
              }
            ]
          }
        },
        success: (res) => {
          const content = res.data?.output?.text || res.data?.output?.choices?.[0]?.message?.content;
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const plant = JSON.parse(jsonMatch[0]);
                // 设置默认值
                plant.difficultyLevel = plant.difficultyLevel || 3;
                plant.difficultyText = plant.difficultyText || '适合有一定经验的养护者';
                plant.quickTips = plant.quickTips || [];
                resolve(plant);
              } else {
                resolve(null);
              }
            } catch (e) {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  },

  /**
   * 从 Wikimedia Commons 获取真实植物图片（免费）
   * 改进：多次搜索确保找到图片
   */
  async getPlantImageFromWikimedia(keyword, scientificName) {
    // 搜索策略：依次尝试
    const searchTerms = [
      scientificName,           // 1. 学名（最准确）
      keyword + ' plant',       // 2. 关键词 + plant
      keyword + ' flower',      // 3. 关键词 + flower
      keyword                   // 4. 纯关键词
    ].filter(Boolean);

    for (const term of searchTerms) {
      const imageUrl = await this.searchWikimediaImage(term);
      if (imageUrl) {
        console.log('✅ 找到图片:', term, imageUrl);
        return imageUrl;
      }
    }
    
    console.log('⚠️ 未找到图片:', keyword);
    return null;
  },

  /**
   * 单次 Wikimedia 图片搜索
   */
  searchWikimediaImage(searchTerm) {
    return new Promise((resolve) => {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=20&format=json&origin=*`;
      
      wx.request({
        url: searchUrl,
        success: (res) => {
          const searchResults = res.data?.query?.search || [];
          
          // 尝试找到合适的图片
          for (const result of searchResults) {
            const title = result.title.toLowerCase();
            
            // 过滤掉不符合的图片（如地图、图标等）
            if (title.includes('map') || title.includes('icon') || title.includes('logo')) {
              continue;
            }
            
            // 获取图片 URL
            this.getImageUrl(result.title).then(url => {
              if (url) resolve(url);
            });
            return;
          }
          resolve(null);
        },
        fail: () => resolve(null)
      });
    });
  },

  /**
   * 获取图片 URL
   */
  getImageUrl(title) {
    return new Promise((resolve) => {
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
      
      wx.request({
        url: imageInfoUrl,
        success: (imgRes) => {
          const pages = imgRes.data?.query?.pages || {};
          const page = Object.values(pages)[0];
          const imageUrl = page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url;
          resolve(imageUrl || null);
        },
        fail: () => resolve(null)
      });
    });
  },

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
      title: `养花助手 - ${this.data.searchText}`,
      path: `/pages/search_result/search_result?search_text=${encodeURIComponent(this.data.searchText)}`
    };
  }
});