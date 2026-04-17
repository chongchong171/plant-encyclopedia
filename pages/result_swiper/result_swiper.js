/**
 * AI 植物管家 - 识别结果页面
 */
const app = getApp()
const plantIdentify = require('../../utils/plantIdentify')
const api = require('../../api/index')
const { imageToBase64 } = require('../../utils/image')

Page({
  data: {
    loading: true,
    imagePath: '',
    plant: null,
    isFavorite: false,
    addedToGarden: false,
    isAdding: false,
    identifyError: false,
    errorMessage: ''
  },

  onLoad(options) {
    const imagePath = decodeURIComponent(options.tmp_filePath || '');
    if (!imagePath) {
      this.setData({ loading: false, identifyError: true, errorMessage: '未获取到图片' });
      return;
    }
    this.setData({ imagePath });
    this.identifyPlant(imagePath);
  },

  async identifyPlant(imagePath) {
    wx.showLoading({ title: '识别中...' });
    
    try {
      const base64 = await imageToBase64(imagePath)
      const result = await plantIdentify.identifyPlant(base64);
      
      wx.hideLoading();
      
      if (result.success && result.data) {
        // 使用符合设计规范的数据结构
        const plant = {
          // 基本信息
          id: result.data.id || 'plant_' + Date.now(),
          name: result.data.name || '植物',
          commonNames: result.data.commonNames || '',
          scientificName: result.data.scientificName || '',
          family: result.data.family || '未知',
          
          // 详细信息
          plantProfile: result.data.plantProfile || '',
          growthHabit: result.data.growthHabit || '',
          distribution: result.data.distribution || '',
          mainValue: result.data.mainValue || '',
          description: result.data.description || '',
          
          // 养护指南
          careGuide: result.data.careGuide || {
            light: '适中光照',
            water: '适量浇水',
            temperature: '室温'
          },
          
          // 难度评估
          difficultyLevel: result.data.difficultyLevel || 3,
          difficultyText: result.data.difficultyText || '适合有一定经验的养护者',
          
          // 快速信息
          quickTips: result.data.quickTips || [],
          
          // 元数据
          image: imagePath,
          confidence: result.data.confidence || 0,
          source: result.data.source || 'AI识别',
          quotaRemaining: result.data.quotaRemaining
        };
        
        
        this.setData({ loading: false, plant });
        
        // 记录识别次数
        if (app.recordIdentify) app.recordIdentify();
        
        // 保存历史
        if (app.addHistory) app.addHistory(plant);
        
        // 检查是否已收藏
        if (app.isFavorite) {
          this.setData({ isFavorite: app.isFavorite(plant.id) });
        }
        
      } else {
        this.setData({ 
          loading: false, 
          identifyError: true, 
          errorMessage: result.error || '识别失败' 
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('识别出错:', error);
      this.setData({ 
        loading: false, 
        identifyError: true, 
        errorMessage: error.message || '识别出错' 
      });
    }
  },

  toggleFavorite() {
    const { plant, isFavorite } = this.data;
    this.setData({ isFavorite: !isFavorite });
    
    if (!isFavorite && app.addFavorite) {
      app.addFavorite(plant);
    } else if (isFavorite && app.removeFavorite) {
      app.removeFavorite(plant.id);
    }
    
    wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
  },

  /**
   * 添加到我的花园
   */
  async addToMyGarden() {
    const { plant, addedToGarden, isAdding, imagePath } = this.data
    
    // 防止重复点击
    if (addedToGarden || isAdding) {
      wx.showToast({ title: '请勿重复点击', icon: 'none' })
      return
    }
    
    if (!plant) {
      wx.showToast({ title: '数据异常', icon: 'none' })
      return
    }
    
    // 标记正在添加中
    this.setData({ isAdding: true })
    
    // 先检查同种植物已有几盆
    const scientificName = plant.scientificName || ''
    if (scientificName) {
      try {
        const plantsRes = await api.getMyPlants()
        if (plantsRes.success && plantsRes.plants) {
          const samePlants = plantsRes.plants.filter(p => p.scientificName === scientificName)
          const existingCount = samePlants.length
          
          // 已取消同种植物数量限制
          
          if (existingCount > 0) {
            // 已有该植物，询问是否添加第 N+1 盆
            const locations = samePlants.map(p => p.location || '未设置位置').join('、')
            const confirm = await new Promise((resolve) => {
              wx.showModal({
                title: '提示',
                content: '您的花园中已有 ' + existingCount + ' 盆' + (plant.commonNames || plant.name) + '（位置：' + locations + '）\n\n是否要添加第 ' + (existingCount + 1) + ' 盆？',
                confirmText: '添加',
                cancelText: '取消',
                success: (res) => {
                  resolve(res.confirm)
                },
                fail: () => {
                  resolve(false)
                }
              })
            })
            
            if (!confirm) {
              this.setData({ isAdding: false })
              return
            }
          }
        }
      } catch (err) {
        console.error('检查植物数量失败:', err)
      }
    }
    
    // 先请求订阅消息授权
    try {
      await wx.requestSubscribeMessage({
        tmplIds: ['XEGNQZUcsrWTE9JKZG088lSpQE2jjzR9JF0pAofOPgY'],
        success: (res) => {
          console.log('订阅结果:', res)
        },
        fail: (err) => {
          console.log('订阅请求失败:', err)
        }
      })
    } catch (e) {
      console.log('订阅异常:', e)
    }
    
    wx.showLoading({ title: '添加中...' })
    
    try {
      // 先上传图片到云存储（使用 fileID，微信小程序可直接显示）
      let cloudImageUrl = ''
      if (imagePath) {
        try {
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath: `plant-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
            filePath: imagePath
          })
          cloudImageUrl = uploadRes.fileID
          console.log('图片上传成功，fileID:', cloudImageUrl)
        } catch (uploadErr) {
          console.log('图片上传失败:', uploadErr)
          cloudImageUrl = ''
        }
      }
      
      // 调用统一 API 入口
      const res = await api.addPlant({
        name: plant.commonNames || plant.name,
        scientificName: plant.scientificName,
        imageUrl: cloudImageUrl,
        identifyResult: plant
      })
      
      wx.hideLoading()
      this.setData({ isAdding: false })
      
      if (res.success) {
        this.setData({ addedToGarden: true })
        
        wx.showModal({
          title: '添加成功',
          content: `${plant.name} 已加入您的花园\n\n下次浇水：${res.nextWatering || '未知'}\n浇水周期：每${res.wateringDays || 7}天`,
          showCancel: false,
          confirmText: '知道了'
        })
        
      } else if (res.error === 'PLANT_LIMIT_EXCEEDED') {
        wx.showModal({
          title: '植物数量已达上限',
          content: '免费用户最多可添加 20 盆植物',
          confirmText: '知道了',
          showCancel: false
        })
      } else {
        // 显示云函数返回的错误信息
        wx.showModal({
          title: '添加失败',
          content: res.message || '请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
    } catch (err) {
      wx.hideLoading()
      this.setData({ isAdding: false })
      console.error('添加到花园失败:', err)
      wx.showToast({
        title: err.message || '添加失败',
        icon: 'none'
      })
    }
  },

  retryIdentify() {
    wx.navigateBack();
  }
});