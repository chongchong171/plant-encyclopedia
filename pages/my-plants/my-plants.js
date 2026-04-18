/**
 * 我的花园页面 - 简洁陈列式布局
 */

const plantApi = require('../../api/plant');
const gardenService = require('../../services/garden');
const { logInfo, logError } = require('../../utils/log');

Page({
  data: {
    plants: [],
    todayPlants: [],
    soonPlants: [],
    otherPlants: [],
    actualPlantCount: 0,
    loading: true,
    fromCache: false,
    showDeleteModal: false,
    deletePlantId: null,
    deletePlantName: '',
    showEditModal: false,
    editPlantId: null,
    editPlantName: '',
    editPlantAlias: '',
    editPlantLocation: '',
    editWateringDays: 7,
    editPlantImageUrl: '',
    editPlantNotes: '',
    showPhotoModal: false,
    addPhotoPlantId: null,
    addPhotoPlantName: ''
  },

  onLoad() {
    // 获取系统状态栏高度
    const systemInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 20
    })
    
    wx.removeStorageSync('my_garden_plants')
    this.loadPlants()
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, homePage: false });
    }
    this.loadPlants();
  },

  /**
   * 加载植物列表
   */
  async loadPlants() {
    this.setData({ loading: true });
    
    logInfo('MyPlants', '开始加载植物列表');
    
    try {
      const result = await plantApi.getMyPlantsWithCache();
      
      if (!result.success) {
        logError('MyPlants', '加载失败', result.error);
        this.useMockData();
        return;
      }
      
      let plants = result.plants || [];
      const fromCache = result.fromCache || false;
      
      console.log('[MyPlants] 获取到植物数量:', plants.length, fromCache ? '(来自缓存)' : '(来自云端)');
      
      const processedPlants = gardenService.processPlantData(plants);
      const { today, soon, others } = gardenService.categorizePlants(processedPlants);
      
      // 统计每种植物的数量
      const plantCounts = {};
      processedPlants.forEach(plant => {
        let key = plant.name || '未命名';
        // 提取基本名称（去除别名、位置信息和序号后缀）
        let mainName = key.includes('、') ? key.split('、')[0].trim() : key.trim();
        // 去除可能的位置信息
        mainName = mainName.replace(/（.*?）/g, '').trim();
        // 去除可能的序号后缀（如：第二盆、（第二盆）、(2) 等）
        mainName = mainName.replace(/\s*（?第[一二三四五六七八九十]+盆）?\s*$/g, '').trim();
        mainName = mainName.replace(/\s*\(\d+\)\s*$/g, '').trim();
        if (!plantCounts[mainName]) {
          plantCounts[mainName] = 0;
        }
        plantCounts[mainName]++;
      });
      
      // 为每种植物添加序号
      const plantIndex = {};
      processedPlants.forEach(plant => {
        // 判断是否有有效图片（用户拍照或识别图片）
        const userImg = plant.userImageUrl && plant.userImageUrl.trim() !== '';
        const identifyImg = plant.imageUrl && plant.imageUrl.trim() !== '';
        plant.hasImage = userImg || identifyImg;
        
        // 处理名称
        let displayName = '未命名';
        let baseName = '未命名';
        if (plant.name) {
          let name = plant.name.trim();
          // 去除可能的序号后缀（如：第二盆、（第二盆）、(2) 等）
          name = name.replace(/\s*（?第[一二三四五六七八九十]+盆）?\s*$/g, '').trim();
          name = name.replace(/\s*\(\d+\)\s*$/g, '').trim();
          
          if (name === '植物' || name === '') {
            displayName = '未命名';
            baseName = '未命名';
          } else if (name.includes('、')) {
            displayName = name.split('、')[0].trim();
            baseName = displayName;
          } else if (/^[a-zA-Z]/.test(name)) {
            const nameMap = {
              'Golden pothos': '黄金葛',
              'Areca palm': '散尾葵',
              'Bird of paradise': '天堂鸟',
              'Snake plant': '虎皮兰',
              'Aloe vera': '芦荟',
              'Cactus': '仙人掌',
              'Succulent': '多肉植物'
            };
            displayName = plant.chineseName || nameMap[name] || name;
            baseName = displayName;
          } else {
            displayName = name;
            baseName = name;
          }
        }
        
        // 优先显示位置信息
        if (plant.location && plant.location.trim() !== '') {
          displayName = displayName + '（' + plant.location.trim() + '）';
        } else {
          // 添加序号标记
          if (plantCounts[baseName] > 1) {
            if (!plantIndex[baseName]) {
              plantIndex[baseName] = 1;
            } else {
              plantIndex[baseName]++;
            }
            const index = plantIndex[baseName];
            if (index > 1) {
              displayName = displayName + ' (' + index + ')';
            }
          }
        }
        
        plant.displayName = displayName;
        
        // 添加光照需求标签
        const lightTag = this.getLightTag(plant);
        plant.lightTag = lightTag.text;
        plant.lightTagClass = lightTag.class;
        
        // 添加温度需求标签
        const tempTag = this.getTempTag(plant);
        plant.tempTag = tempTag.text;
        plant.tempTagClass = tempTag.class;
        
        // 状态指示器：
        // - 浇水状态：需要浇水时显示水滴（优先级最高）
        // - 光照需求：喜欢充足光照的植物显示太阳
        if (plant.daysUntilWater <= 0) {
          plant.statusType = 'water'; // 需要浇水时显示水滴
        } else if (lightTag.text.includes('喜充足光照')) {
          plant.statusType = 'sun';    // 喜欢充足光照的植物显示太阳
        } else {
          plant.statusType = '';       // 其他情况不显示图标
        }
      });
      
      gardenService.savePlantsToCache(processedPlants);
      
      const actualPlantCount = processedPlants.filter(p => this.isValidPlant(p)).length;
      
      logInfo('MyPlants', `加载成功，共 ${actualPlantCount} 盆植物`);
      
      this.setData({ 
        plants: processedPlants, 
        todayPlants: today, 
        soonPlants: soon, 
        otherPlants: others,
        actualPlantCount,
        loading: false,
        fromCache
      });
      
    } catch (err) {
      console.error('[MyPlants] 加载植物列表出错:', err);
      logError('MyPlants', '加载异常', err.message);
      this.useMockData();
    }
  },

  /**
   * 判断是否是有效植物
   */
  isValidPlant(plant) {
    if (!plant) return false;
    const hasValidName = plant.name && plant.name !== '植物' && plant.name.trim() !== '';
    const hasUserImage = plant.userImageUrl;
    return hasValidName || hasUserImage;
  },

  /**
   * 使用模拟数据
   */
  useMockData() {
    console.warn('[MyPlants] 使用模拟数据');
    
    const plantNames = ['绿萝、黄金葛', '仙人掌', '月季、玫瑰', '多肉', '发财树', '吊兰', '虎皮兰', '芦荟'];
    const mockPlants = plantNames.map((name, index) => {
      let displayName = name;
      if (name === '植物') {
        displayName = '未命名';
      } else if (name.includes('、')) {
        displayName = name.split('、')[0];
      }
      
      return {
        _id: `mock${index + 1}`,
        name: name,
        displayName: displayName,
        imageUrl: `https://images.unsplash.com/photo-${index % 2 === 0 ? '1596724857861-d277d5e25133' : '1459411552884-841db9b3cc2a'}?w=400`,
        daysUntilWater: index % 3 === 0 ? -1 : index % 3 === 1 ? 0 : 5,
        statusType: index % 3 === 0 ? 'water' : index % 3 === 1 ? 'water' : 'sun',
        careInfo: { nextWatering: '2024-01-01' }
      };
    });
    
    const { today, soon, others } = gardenService.categorizePlants(mockPlants);
    
    this.setData({ 
      plants: mockPlants, 
      todayPlants: today,
      soonPlants: soon,
      otherPlants: others,
      actualPlantCount: mockPlants.length,
      loading: false,
      fromCache: true
    });
  },

  /**
   * 植物点击事件 - 整个卡片可点击
   */
  onPlantTap(e) {
    console.log('[MyPlants] 点击植物卡片，event:', e)
    const plantId = e.currentTarget.dataset.plantId;
    console.log('[MyPlants] 获取到植物 ID:', plantId)
    
    if (!plantId) {
      console.error('[MyPlants] 植物 ID 为空');
      wx.showToast({
        title: '植物数据加载失败',
        icon: 'none'
      });
      return;
    }
    
    const url = `/pages/plant-detail/plant-detail?id=${plantId}`
    console.log('[MyPlants] 准备跳转:', url)
    
    wx.navigateTo({ 
      url: url,
      success: () => {
        console.log('[MyPlants] 跳转成功')
      },
      fail: (err) => {
        console.error('[MyPlants] 跳转失败:', err)
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        })
      }
    });
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    const plant = e.currentTarget.dataset.plant;
    console.warn('[MyPlants] 图片加载失败，使用默认图:', plant ? plant.name : '未知植物');
  },

  /**
   * 点击添加照片按钮
   */
  onAddPhotoTap(e) {
    const plantId = e.currentTarget.dataset.plantId;
    const plantName = e.currentTarget.dataset.plantName;
    
    console.log('[MyPlants] 点击添加照片:', plantId, plantName);
    
    wx.showActionSheet({
      itemList: ['拍摄照片', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍摄照片
          this.choosePhotoForPlant(plantId, plantName, 'camera')
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.choosePhotoForPlant(plantId, plantName, 'album')
        }
      }
    })
  },

  /**
   * 选择照片（相机或相册）
   */
  async choosePhotoForPlant(plantId, plantName, sourceType) {
    if (sourceType === 'camera') {
      // 跳转到自定义相机页面
      wx.navigateTo({
        url: `/pages/camera/camera?mode=identify&plantId=${plantId}&plantName=${encodeURIComponent(plantName)}`,
        success: (res) => {
          console.log('[MyPlants] 跳转到相机页面成功')
        },
        fail: (err) => {
          console.error('[MyPlants] 跳转到相机页面失败:', err)
          wx.showToast({
            title: '打开相机失败',
            icon: 'none'
          })
        }
      })
    } else if (sourceType === 'album') {
      // 从相册选择
      try {
        const chooseRes = await wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: [sourceType]
        })

        if (!chooseRes.tempFilePaths || chooseRes.tempFilePaths.length === 0) {
          return
        }

        const tempFilePath = chooseRes.tempFilePaths[0]
        console.log('[MyPlants] 选择照片成功:', tempFilePath)

        wx.showLoading({ title: '上传中...' })

        const result = await plantApi.uploadPlantImage(plantId, tempFilePath)

        wx.hideLoading()

        if (result.success) {
          wx.showToast({
            title: '照片已更新',
            icon: 'success'
          })
          this.loadPlants()
        } else {
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none'
          })
        }
      } catch (err) {
        wx.hideLoading()
        console.error('[MyPlants] 上传照片失败:', err)
        wx.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        })
      }
    }
  },

  /**
   * 点击编辑按钮
   */
  onEditTap(e) {
    // 使用 plantId 重新查询完整数据，避免 data-plant 传递丢失
    const plantId = e.currentTarget.dataset.plantId;
    const plant = this.data.plants.find(p => p._id === plantId);
    
    if (!plant) {
      console.error('[MyPlants] 未找到植物:', plantId);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
      return;
    }
    
    console.log('[MyPlants] 点击编辑:', plant);
    
    // 提取别名（如果有）
    let mainName = plant.name || plant.displayName || '';
    let alias = '';
    
    if (plant.name && plant.name.includes('、')) {
      const parts = plant.name.split('、');
      mainName = parts[0].trim();
      if (parts.length > 1) {
        alias = parts.slice(1).join('、');
      }
    }
    
    this.setData({
      showEditModal: true,
      editPlantId: plant._id,
      editPlantName: mainName,
      editPlantAlias: alias,
      editPlantLocation: plant.location || '',
      editPlantImageUrl: plant.userImageUrl || plant.imageUrl || '',
      editWateringDays: plant.careInfo?.wateringDays || 7,
      editPlantNotes: plant.notes || ''
    });
  },

  /**
   * 更换植物图片
   */
  async onChangeImage() {
    try {
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })

      if (!chooseRes.tempFiles || chooseRes.tempFiles.length === 0) {
        return
      }

      const tempFilePath = chooseRes.tempFiles[0].tempFilePath
      
      // 更新预览
      this.setData({
        editPlantImageUrl: tempFilePath,
        editPlantTempFile: tempFilePath
      })

    } catch (err) {
      console.error('[MyPlants] 选择图片失败:', err)
    }
  },

  /**
   * 编辑名称输入
   */
  onEditNameInput(e) {
    this.setData({
      editPlantName: e.detail.value
    });
  },

  /**
   * 编辑别名输入
   */
  onEditAliasInput(e) {
    this.setData({
      editPlantAlias: e.detail.value
    });
  },

  /**
   * 编辑浇水周期输入
   */
  onEditWateringInput(e) {
    this.setData({
      editWateringDays: parseInt(e.detail.value) || 7
    });
  },

  /**
   * 编辑备注输入
   */
  onEditNotesInput(e) {
    this.setData({
      editPlantNotes: e.detail.value
    });
  },

  /**
   * 编辑位置输入
   */
  onEditLocationInput(e) {
    this.setData({
      editPlantLocation: e.detail.value
    });
  },

  /**
   * 关闭编辑弹窗
   */
  closeEditModal() {
    this.setData({
      showEditModal: false,
      editPlantId: null,
      editPlantName: '',
      editPlantAlias: '',
      editPlantLocation: '',
      editPlantImageUrl: '',
      editPlantTempFile: null,
      editWateringDays: 7,
      editPlantNotes: ''
    });
  },

  /**
   * 确认编辑植物
   */
  async confirmEdit() {
    const plantId = this.data.editPlantId;
    const newName = this.data.editPlantName.trim();
    const newAlias = this.data.editPlantAlias.trim();
    const newLocation = this.data.editPlantLocation.trim();
    const newWateringDays = this.data.editWateringDays;
    const newNotes = this.data.editPlantNotes.trim();
    const newImageUrl = this.data.editPlantTempFile;
    
    if (!plantId) {
      console.error('[MyPlants] 植物 ID 为空');
      return;
    }

    if (!newName) {
      wx.showToast({
        title: '植物名称不能为空',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const db = wx.cloud.database();
      
      // 组合完整名称（名称 + 别名）
    let fullName = newName;
    if (newAlias) {
      fullName = newName + '、' + newAlias;
    }
    
    // 更新植物信息
    const updateData = {
      name: fullName,
      location: newLocation,
      'careInfo.wateringDays': newWateringDays
    };
    
    if (newNotes) {
      updateData.notes = newNotes;
    }
      
      // 如果有新图片，上传并更新
      if (newImageUrl) {
        const cloudPath = `plant-images/${plantId}/${Date.now()}.jpg`
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: newImageUrl
        })

        // 获取临时访问链接
        const tempUrlRes = await wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        })
        const tempUrl = tempUrlRes.fileList[0].tempFileURL
        
        updateData.userImageUrl = tempUrl;
      }
      
      await db.collection('my_plants').doc(plantId).update({
        data: updateData
      });

      wx.hideLoading();

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      // 清除缓存并刷新
      wx.removeStorageSync('my_garden_plants');
      this.loadPlants();
      this.closeEditModal();
      
    } catch (err) {
      wx.hideLoading();
      console.error('[MyPlants] 更新植物失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 点击删除按钮
   */
  onDeleteTap(e) {
    const plantId = e.currentTarget.dataset.plantId;
    const plantName = e.currentTarget.dataset.plantName;
    
    console.log('[MyPlants] 点击删除:', plantId, plantName);
    
    this.setData({
      showDeleteModal: true,
      deletePlantId: plantId,
      deletePlantName: plantName
    });
  },

  /**
   * 关闭删除弹窗
   */
  closeDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deletePlantId: null,
      deletePlantName: ''
    });
  },

  /**
   * 阻止冒泡
   */
  preventBubble() {
    // 什么都不做，只是阻止事件冒泡
  },

  /**
   * 确认删除植物
   */
  async confirmDelete() {
    const plantId = this.data.deletePlantId;
    
    if (!plantId) {
      console.error('[MyPlants] 植物 ID 为空');
      return;
    }

    wx.showLoading({ title: '删除中...' });

    try {
      // 调用 deletePlant 云函数删除植物
      const result = await wx.cloud.callFunction({
        name: 'deletePlant',
        data: {
          plantId: plantId
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        // 刷新页面
        this.loadPlants();
      } else {
        wx.showToast({
          title: result.result?.message || '删除失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[MyPlants] 删除植物出错:', err);
      wx.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      });
    }

    this.closeDeleteModal();
  },

  /**
   * 添加植物入口点击（右上角按钮）
   */
  onAddPlantEntry() {
    wx.showActionSheet({
      itemList: ['📷 拍照识别', '📁 从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照识别
          this.takePhotoToAdd();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.chooseFromAlbumToAdd();
        }
      }
    });
  },

  /**
   * 诊断悬浮按钮点击（右下角呼吸灯）
   */
  onDiagnosisFloatTap() {
    wx.navigateTo({ 
      url: '/pages/diagnosis/diagnosis' 
    });
  },

  /**
   * 拍照识别添加植物
   */
  takePhotoToAdd() {
    // 清理旧的 auto_identify 标记，避免干扰
    wx.removeStorageSync('auto_identify');
    
    // 直接跳转到相机页面（不经过首页）
    wx.navigateTo({
      url: '/pages/camera/camera?mode=identify&from=mygarden'
    });
  },

  /**
   * 从相册选择添加植物 - 跳转到首页，调用首页的 chooseFromAlbum
   */
  chooseFromAlbumToAdd() {
    // 跳转到首页
    wx.switchTab({
      url: '/pages/home/home',
      success: () => {
        // 延迟一点，确保首页加载完成
        setTimeout(() => {
          const pages = getCurrentPages();
          const homePage = pages.find(p => p.route === 'pages/home/home');
          if (homePage && homePage.chooseFromAlbum) {
            console.log('[MyPlants] 调用首页的 chooseFromAlbum');
            homePage.chooseFromAlbum();
          } else {
            console.error('[MyPlants] 未找到首页或 chooseFromAlbum 方法');
          }
        }, 300);
      },
      fail: (err) => {
        console.error('[MyPlants] switchTab 失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取光照需求标签
   * @returns {{text: string, class: string}}
   */
  getLightTag(plant) {
    if (!plant) {
      return { text: '', class: '' };
    }
    
    // 优先从 identifyResult 获取
    let light = '';
    if (plant.identifyResult && plant.identifyResult.careAdvice) {
      light = plant.identifyResult.careAdvice.light || '';
    }
    
    // 从 careInfo 获取备选
    if (!light && plant.careInfo) {
      light = plant.careInfo.light || '';
    }
    
    // 根据植物名称推断
    const plantName = (plant.name || plant.displayName || '').toLowerCase();
    if (!light) {
      if (plantName.includes('绿萝') || plantName.includes('黄金葛') || plantName.includes('pothos')) {
        light = '散射光';
      } else if (plantName.includes('仙人掌') || plantName.includes('仙人球') || plantName.includes('cactus')) {
        light = '充足光照';
      } else if (plantName.includes('龟背竹') || plantName.includes('竹芋') || plantName.includes('fern')) {
        light = '散射光';
      }
    }
    
    // 根据光照需求返回不同的标签
    if (light.includes('充足') || light.includes('强') || light.includes('直射')) {
      return { text: '☀️ 喜充足光照', class: 'tag-light-high' };
    } else if (light.includes('散射') || light.includes('明亮') || light.includes('半阴')) {
      return { text: '💡 喜散射光照', class: 'tag-light-medium' };
    } else if (light.includes('弱') || light.includes('耐阴') || light.includes('阴暗')) {
      return { text: '🌙 耐阴植物', class: 'tag-light-low' };
    }
    
    return { text: '', class: '' };
  },

  /**
   * 获取温度需求标签
   * @returns {{text: string, class: string}}
   */
  getTempTag(plant) {
    if (!plant) {
      return { text: '', class: '' };
    }
    
    // 优先从 identifyResult 获取
    let temp = '';
    if (plant.identifyResult && plant.identifyResult.careAdvice) {
      temp = plant.identifyResult.careAdvice.temperature || '';
    }
    
    // 从 careInfo 获取备选
    if (!temp && plant.careInfo) {
      temp = plant.careInfo.temperature || '';
    }
    
    // 根据植物名称推断
    const plantName = (plant.name || plant.displayName || '').toLowerCase();
    if (!temp) {
      if (plantName.includes('绿萝') || plantName.includes('黄金葛') || plantName.includes('pothos') ||
          plantName.includes('龟背竹') || plantName.includes('竹芋') || plantName.includes('仙人掌')) {
        temp = '温暖';
      } else if (plantName.includes('梅花') || plantName.includes('菊花') || plantName.includes('牡丹')) {
        temp = '凉爽';
      } else if (plantName.includes('松树') || plantName.includes('柏树') || plantName.includes('冬青')) {
        temp = '耐寒';
      }
    }
    
    // 根据温度需求返回不同的标签
    if (temp.includes('温暖') || temp.includes('20') || temp.includes('25') || temp.includes('30')) {
      return { text: '🌡️ 喜温暖', class: 'tag-temp-warm' };
    } else if (temp.includes('凉爽') || temp.includes('15') || temp.includes('18')) {
      return { text: '❄️ 喜凉爽', class: 'tag-temp-cool' };
    } else if (temp.includes('耐寒') || temp.includes('5') || temp.includes('10')) {
      return { text: '🌨️ 较耐寒', class: 'tag-temp-hardy' };
    }
    
    return { text: '', class: '' };
  },

  /**
   * 跳转到首页
   */
  goToHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '我在花草百科养了 ' + (this.data.actualPlantCount || 0) + ' 盆植物！',
      path: '/pages/home/home'
    };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadPlants().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
