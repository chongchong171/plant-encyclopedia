/**
 * 养花助手 - 搜索结果页面
 */
const API_KEY = 'sk-d43b58a6d0dd486d89b69a38f305483a';

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
   * 搜索植物信息
   */
  searchPlant(keyword) {
    wx.showLoading({ title: '查询中...' });
    
    wx.request({
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'qwen-turbo',
        input: {
          messages: [
            {
              role: 'system',
              content: '你是一个植物百科专家，请根据用户提供的植物名称，返回该植物的详细信息。'
            },
            {
              role: 'user',
              content: `请介绍"${keyword}"这种植物，以JSON格式返回：
{
  "name": "植物名称",
  "scientificName": "学名",
  "family": "科属",
  "description": "简短描述（50字内）",
  "careGuide": {
    "light": "光照需求",
    "water": "浇水频率",
    "temperature": "适宜温度",
    "humidity": "湿度要求",
    "fertilizer": "施肥建议",
    "tips": "养护技巧"
  },
  "difficulty": "简单/中等/困难",
  "toxicity": false,
  "features": ["特点1", "特点2"]
}`
            }
          ]
        }
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode !== 200) {
          this.setData({ loading: false, error: true });
          return;
        }
        
        const content = res.data?.output?.text || res.data?.output?.choices?.[0]?.message?.content;
        
        if (!content) {
          this.setData({ loading: false, error: true });
          return;
        }
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const plant = JSON.parse(jsonMatch[0]);
            this.setData({
              loading: false,
              error: false,
              plant
            });
          } else {
            this.setData({ loading: false, error: true });
          }
        } catch (e) {
          this.setData({ loading: false, error: true });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ loading: false, error: true });
      }
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
      path: `/pages/search_result/seach_result?search_text=${encodeURIComponent(this.data.searchText)}`
    };
  }
});