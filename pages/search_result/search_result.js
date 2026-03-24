/**
 * 养花助手 - 搜索结果页面
 */
const app = getApp();

Page({
  data: {
    searchText: '',
    scientificName: '',  // 优先使用的学名（来自发现页面）
    loading: true,
    error: false,
    plant: null
  },

  onLoad(options) {
    const searchText = decodeURIComponent(options.search_text || '');
    const scientificName = decodeURIComponent(options.scientific_name || '');
    this.setData({ searchText, scientificName });
    
    if (searchText) {
      this.searchPlant(searchText, scientificName);
    } else {
      this.setData({ loading: false, error: true });
    }
  },

  /**
   * 搜索植物信息（AI 文字 + 真实图片）
   */
  async searchPlant(keyword, providedScientificName) {
    wx.showLoading({ title: '查询中...' });
    
    const apiKey = app.globalData.qwenApiKey;
    
    // 先获取 AI 信息
    const aiResult = await this.getPlantInfoFromAI(keyword, apiKey);
    
    if (!aiResult) {
      wx.hideLoading();
      this.setData({ loading: false, error: true });
      return;
    }
    
    // 优先使用传入的学名（来自发现页面的当季推荐），否则用 AI 返回的学名
    const scientificNameToUse = providedScientificName || aiResult.scientificName;
    
    // 使用 GBIF 专业数据库搜索图片
    const imageUrl = await this.getPlantImageFromGBIF(scientificNameToUse, keyword);
    
    wx.hideLoading();
    
    const plant = {
      ...aiResult,
      scientificName: scientificNameToUse,  // 确保使用正确的学名
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
   * 从 GBIF 获取真实植物图片（专业植物数据库，免费）
   */
  async getPlantImageFromGBIF(scientificName, keyword) {
    // 1. 先在 GBIF 搜索植物
    const searchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName || keyword)}&strict=true`;
    
    return new Promise((resolve) => {
      wx.request({
        url: searchUrl,
        success: (res) => {
          const speciesKey = res.data?.speciesKey;
          
          if (speciesKey) {
            // 2. 获取该物种的媒体资源（图片）
            const mediaUrl = `https://api.gbif.org/v1/occurrence/search?taxonKey=${speciesKey}&mediaType=StillImage&limit=5`;
            
            wx.request({
              url: mediaUrl,
              success: (mediaRes) => {
                const results = mediaRes.data?.results || [];
                
                if (results.length > 0 && results[0].media) {
                  const images = results[0].media;
                  // 找到第一张可用图片
                  for (const img of images) {
                    if (img.identifier && img.type === 'StillImage') {
                      resolve(img.identifier);
                      return;
                    }
                  }
                }
                resolve(null);
              },
              fail: () => resolve(null)
            });
          } else {
            resolve(null);
          }
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