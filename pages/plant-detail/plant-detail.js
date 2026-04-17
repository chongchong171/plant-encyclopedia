/**
 * 植物详情页
 * 展示植物详细信息、养护状态、养护日志
 */

Page({
  data: {
    plant: null,
    loading: true,
    daysUntilWater: 0,
    waterStatus: '',       // today/soon/ok
    waterStatusText: ''
  },

  onLoad(options) {
    if (options.id) {
      this.loadPlant(options.id)
    }
  },

  /**
   * 加载植物详情
   */
  async loadPlant(id) {
    console.log('[PlantDetail] 开始加载植物，ID:', id)
    wx.showLoading({ title: '加载中...' })
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('my_plants').doc(id).get()
      
      console.log('[PlantDetail] 获取到数据:', res.data)
      
      let plant = res.data
      
      // 计算浇水状态
      this.calculateWaterStatus(plant)
      
      // 优先使用用户拍照的图片（userImageUrl），其次用识别图片（imageUrl）
      const displayImage = plant.userImageUrl || plant.imageUrl || ''
      
      // 如果没有图片，异步加载 GBIF 真实照片
      if (!displayImage || displayImage.trim() === '') {
        // 先设置一个占位图
        plant.imageUrl = ''
        
        this.setData({
          plant,
          loading: false
        })
        console.log('[PlantDetail] 数据已设置（无图模式）')
        
        // 异步加载真实图片
        this.loadPlantImage(plant)
      } else {
        // 有图片，直接显示（优先使用 userImageUrl）
        plant.imageUrl = displayImage
        this.setData({
          plant,
          loading: false
        })
        console.log('[PlantDetail] 数据已设置（有图模式）')
      }
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: plant.name || '植物详情'
      })
      console.log('[PlantDetail] 加载成功，植物名称:', plant.name)
      
    } catch (err) {
      console.error('[PlantDetail] 加载植物详情失败:', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 异步加载植物图片（调用云函数获取 GBIF 图片）
   */
  async loadPlantImage(plant) {
    wx.showLoading({ title: '加载图片中...' })
    
    try {
      // 调用云函数获取图片（服务器访问 GBIF 快）
      const cloudResult = await wx.cloud.callFunction({
        name: 'getCareGuide',
        data: {
          plantName: plant.name,
          scientificName: plant.scientificName || plant.identifyResult?.scientificName
        },
        timeout: 30000
      })
      
      if (cloudResult.result && cloudResult.result.imageUrl) {
        plant.imageUrl = cloudResult.result.imageUrl
        this.setData({ plant })
        console.log('[植物详情] 成功加载图片:', cloudResult.result.imageUrl)
      }
    } catch (err) {
      console.error('[植物详情] 加载图片失败:', err)
    } finally {
      wx.hideLoading()
    }
  },

  /**
   * 获取默认植物图片（调用云函数获取 GBIF 图片）
   */
  getDefaultPlantImage(plantName, scientificName) {
    return wx.cloud.callFunction({
      name: 'getCareGuide',
      data: {
        plantName: plantName,
        scientificName: scientificName
      },
      timeout: 30000
    }).then(res => {
      if (res.result && res.result.imageUrl) {
        return res.result.imageUrl
      }
      return null
    })
  },

  /**
   * 计算浇水状态
   */
  calculateWaterStatus(plant) {
    const today = new Date().toISOString().split('T')[0]
    const nextWatering = plant.careInfo?.nextWatering
    
    if (!nextWatering) {
      this.setData({
        waterStatus: 'ok',
        waterStatusText: '浇水周期未设置'
      })
      return
    }
    
    const diff = this.daysBetween(today, nextWatering)
    
    if (diff <= 0) {
      this.setData({
        daysUntilWater: 0,
        waterStatus: 'today',
        waterStatusText: '今天需要浇水'
      })
    } else if (diff <= 2) {
      this.setData({
        daysUntilWater: diff,
        waterStatus: 'soon',
        waterStatusText: `还需${diff}天浇水`
      })
    } else {
      this.setData({
        daysUntilWater: diff,
        waterStatus: 'ok',
        waterStatusText: `还需${diff}天浇水`
      })
    }
  },

  /**
   * 计算天数差
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
    return diff
  },

  /**
   * 记录浇水
   */
  async recordWatering() {
    const plant = this.data.plant
    if (!plant) return
    
    try {
      wx.showLoading({ title: '记录中...' })
      
      const db = wx.cloud.database()
      
      // 计算下次浇水日期
      const nextWatering = this.addDays(
        new Date(),
        plant.careInfo.wateringDays || 7
      )
      
      // 更新数据库
      await db.collection('my_plants').doc(plant._id).update({
        data: {
          'careInfo.lastWatered': new Date().toISOString().split('T')[0],
          'careInfo.nextWatering': nextWatering,
          'careLog': db.command.push({
            date: new Date().toISOString().split('T')[0],
            action: 'water',
            notes: ''
          })
        }
      })
      
      wx.hideLoading()
      
      wx.showToast({
        title: '已记录浇水',
        icon: 'success'
      })
      
      // 清除列表页缓存，强制刷新
      wx.removeStorageSync('my_garden_plants')
      console.log('[PlantDetail] 已清除列表缓存，下次进入列表页会重新加载')
      
      // 刷新数据
      this.loadPlant(plant._id)
      
    } catch (err) {
      wx.hideLoading()
      console.error('记录浇水失败:', err)
      wx.showToast({
        title: '记录失败',
        icon: 'none'
      })
    }
  },

  /**
   * 记录施肥
   */
  async recordFertilizing() {
    const plant = this.data.plant
    if (!plant) return
    
    try {
      wx.showLoading({ title: '记录中...' })
      
      const db = wx.cloud.database()
      
      // 计算下次施肥日期（默认30天）
      const nextFertilizing = this.addDays(
        new Date(),
        plant.careInfo.fertilizingDays || 30
      )
      
      // 更新数据库
      await db.collection('my_plants').doc(plant._id).update({
        data: {
          'careInfo.lastFertilized': new Date().toISOString().split('T')[0],
          'careInfo.nextFertilizing': nextFertilizing,
          'careLog': db.command.push({
            date: new Date().toISOString().split('T')[0],
            action: 'fertilize',
            notes: ''
          })
        }
      })
      
      wx.hideLoading()
      
      wx.showToast({
        title: '已记录施肥',
        icon: 'success'
      })
      
      // 清除列表页缓存，强制刷新
      wx.removeStorageSync('my_garden_plants')
      console.log('[PlantDetail] 已清除列表缓存，下次进入列表页会重新加载')
      
      // 刷新数据
      this.loadPlant(plant._id)
      
    } catch (err) {
      wx.hideLoading()
      console.error('记录施肥失败:', err)
      wx.showToast({
        title: '记录失败',
        icon: 'none'
      })
    }
  },

  /**
   * 添加天数
   */
  addDays(date, days) {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result.toISOString().split('T')[0]
  },

  /**
   * 预览图片
   */
  previewImage() {
    if (this.data.plant?.imageUrl) {
      wx.previewImage({
        urls: [this.data.plant.imageUrl],
        current: this.data.plant.imageUrl
      })
    }
  }
})