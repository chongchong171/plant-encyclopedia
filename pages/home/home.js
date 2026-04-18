/**
 * AI 植物管家 - 首页 v11.1
 * 完整意图系统 + 拍照识别
 */

const VIDEO_CONFIG = require('../../config/video-config')
const api = require('../../api/index')
const plantIdentify = require('../../utils/plantIdentify')
const memberLimit = require('../../utils/member-limit')
const { imageToBase64 } = require('../../utils/image')
const gardenService = require('../../services/garden')

const PROMPTS = [
  '说出你的需求...',
  '我买了一盆绿萝',
  '今天要给植物浇水吗？',
  '帮我看看这盆花怎么了'
]

// 高度配置
const MIN_DIALOG_HEIGHT = 450
const MAX_DIALOG_HEIGHT = 700  // 扩展到slogan上方

// 意图配置
const INTENT_CONFIG = {
  addPlant: {
    name: '添加植物',
    icon: '🌱',
    questions: { plantName: '是什么植物？', purchaseDate: '是今天买的吗？', location: '放在哪里？', healthStatus: '健康吗？' },
    askConfirm: true
  },
  deletePlant: { name: '删除植物', icon: '🗑️', questions: { plantName: '要删除哪盆植物？' }, askConfirm: true },
  watering: { name: '浇水', icon: '💧', questions: {}, askConfirm: true },
  fertilize: { name: '施肥', icon: '🌿', questions: {}, askConfirm: true },
  diagnose: { name: '诊断', icon: '🔍', questions: { problems: '什么问题？' }, askConfirm: false, needImage: true },
  identify: { name: '识别', icon: '📷', questions: {}, askConfirm: false, needImage: true },
  queryGuide: { name: '养护指南', icon: '📖', questions: {}, askConfirm: false, needImage: true },
  myGarden: { name: '我的花园', icon: '🏡', questions: {}, askConfirm: false },
  todayTask: { name: '今日任务', icon: '📋', questions: {}, askConfirm: false },
  recommendPlant: { name: '推荐', icon: '🌸', questions: { scene: '室内/阳台/室外？' }, askConfirm: false },
  careAdvice: { name: '养护建议', icon: '💡', questions: {}, askConfirm: false }
}

Page({
  data: {
    currentPrompt: PROMPTS[0],
    videoUrl: VIDEO_CONFIG.videoUrl,
    videoLoaded: false,
    
    isExpanded: false,
    dialogHeight: null,
    messages: [],
    
    // 用户信息授权

    inputText: '',
    isLoading: false,
    loadingText: '',
    scrollToView: '',
    
    currentIntent: null,
    extractedInfo: {},
    missingFields: [],
    confirmCard: null,
    showQuickActions: false,
    showPlusMenu: false,  // 加号弹出菜单
    showEmojiPanel: false,  // 表情面板
    showAuthBar: false,  // 已移除登录提示条
    
    isPCMode: false,  // PC/开发者工具模式
    
    gardenPlants: [],
    pendingAction: null,
    
    autoIdentifyProcessed: false,  // 标记自动识别是否已处理，避免重复

    emojiList: [
      '😊', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😋',
      '🌱', '🌿', '🌸', '🌺', '🌻', '🌹', '🍀', '🌵',
      '💧', '☀️', '🌡️', '❄️', '🌈', '⭐', '🌙', '☁️',
      '👍', '👏', '🙏', '✨', '💡', '❤️', '💚', '💛',
      '🔥', '💪', '🎉', '🎀', '📷', '🔍', '💬', '🆗',
      '😅', '🤔', '😢', '😭', '👀', '🙈', '💦', '🌚'
    ]
  },

  onLoad() {
    this.promptTimer = setInterval(() => {
      if (!this.data.isExpanded) {
        let i = (PROMPTS.indexOf(this.data.currentPrompt) + 1) % PROMPTS.length
        this.setData({ currentPrompt: PROMPTS[i] })
      }
    }, 5000)

    // 检测是否需要自动识别（从我的花园页面跳转过来）
    // 注意：switchTab 不会触发 onLoad，所以主要逻辑在 onShow 中
    console.log('[Home] onLoad 执行')

    // 检查是否需要用户信息授权（已移除登录提示条）
    // const app = getApp()
    // const hasAuthed = wx.getStorageSync('hasUserInfoAuth')
    // const hasUserInfo = app.globalData.userInfo?.nickName
    // const needAuth = app.globalData.needUserInfoAuth
    //
    // if (!hasAuthed && !hasUserInfo && needAuth) {
    //   setTimeout(() => {
    //     this.setData({ showAuthBar: true })
    //   }, 1500)
    // }
  },

  onReady() {
    this.videoContext = wx.createVideoContext('bgVideo', this)
    
    // 检测是否是 PC/开发者工具环境
    try {
      const systemInfo = wx.getSystemInfoSync()
      console.log('[home] systemInfo:', JSON.stringify(systemInfo))
      
      // 开发者工具环境
      const isDevTools = systemInfo.environment === 'devtools'
      // PC 平台（Windows/Mac）
      const isPC = systemInfo.platform === 'windows' || systemInfo.platform === 'mac'
      // 屏幕宽度大于 500px 认为是 PC
      const isWideScreen = systemInfo.windowWidth > 500
      
      console.log('[home] isDevTools:', isDevTools, 'isPC:', isPC, 'isWideScreen:', isWideScreen)
      
      if (isDevTools || isPC || isWideScreen) {
        this.setData({ isPCMode: true })
        console.log('[home] 已启用 PC 模式')
      }
    } catch (e) {
      console.log('[home] 平台检测失败:', e)
      // 默认启用 PC 模式（保守策略）
      this.setData({ isPCMode: true })
    }


  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0, homePage: true })
    }
    // 视频自动播放
    if (this.videoContext) this.videoContext.play()
    this.loadGardenPlants()
    
    // 检测是否需要自动识别（从我的花园页面跳转过来）
    // 放在 onShow 中，因为 switchTab 会触发 onShow 而不是 onLoad
    console.log('[Home] onShow 执行，检查自动识别')
    this.checkAutoIdentify()
  },

  onHide() {
    if (this.videoContext) this.videoContext.pause()
  },

  onUnload() {
    if (this.promptTimer) clearInterval(this.promptTimer)
  },

  onVideoPlay() { 
    console.log('📼 视频开始播放，淡入切换')
    this.setData({ videoLoaded: true })
  },
  
  onVideoLoaded() {
    console.log('✅ 视频元数据加载成功')
    this.setData({ videoLoaded: true })
  },
  
  onVideoError(e) { 
    console.error('❌ 视频加载失败:', e.detail || e)
    console.error('视频 URL:', this.data.videoUrl)
    // 视频解码失败，保持显示静态海报图
    console.log('视频解码不支持，使用静态海报图')
    // 不设置 videoLoaded，保持显示静态图
  },

  /**
   * 检测是否需要自动识别（从我的花园页面跳转过来）
   * 注意：此函数可能在 onLoad 和 onShow 中都被调用，需要确保只执行一次
   */
  checkAutoIdentify() {
    // 如果已经处理过，直接跳过（避免重复执行）
    if (this.data.autoIdentifyProcessed) {
      console.log('[Home] 自动识别已处理，跳过')
      return
    }
    
    try {
      // 优先从全局变量获取（更可靠）
      const app = getApp();
      const globalData = app.autoIdentifyData;
      
      // 也从 Storage 获取（备选方案）
      const storageType = wx.getStorageSync('auto_identify');
      const storageImage = wx.getStorageSync('auto_identify_image');
      
      console.log('[Home] checkAutoIdentify 开始:', { 
        hasGlobal: !!globalData, 
        globalType: globalData?.type,
        storageType,
        hasStorageImage: !!storageImage
      })
      
      // 优先使用全局变量
      let autoIdentify = globalData?.type || storageType;
      let autoIdentifyImage = globalData?.imagePath || storageImage;
      
      if (!autoIdentify) {
        console.log('[Home] 无自动识别标记，跳过')
        return
      }
      
      // 标记为已处理，避免重复执行
      this.setData({ autoIdentifyProcessed: true })
      
      // 清除全局变量和 Storage 标记
      if (globalData) {
        app.autoIdentifyData = null;
      }
      wx.removeStorageSync('auto_identify');
      wx.removeStorageSync('auto_identify_image');
      
      if (autoIdentify === 'camera') {
        // 自动打开相机拍照 - 跳转到相机页面
        console.log('[Home] 自动识别：打开相机页面')
        this.setData({ showPlusMenu: false, showQuickActions: false })
        wx.navigateTo({
          url: '/pages/camera/camera?mode=identify&from=mygarden'
        })
      } else if (autoIdentify === 'album') {
        // 从相册选择图片 - 直接识别
        console.log('[Home] 自动识别：从相册选择，图片路径:', autoIdentifyImage ? '有' : '无')
        if (autoIdentifyImage && autoIdentifyImage.trim() !== '') {
          this.setData({ showPlusMenu: false, showQuickActions: false })
          console.log('[Home] 开始调用 identifyPlantFromImage')
          // 使用 setTimeout 确保页面完全加载后再执行识别
          setTimeout(() => {
            this.identifyPlantFromImage(autoIdentifyImage).catch(err => {
              console.error('[Home] 自动识别失败:', err)
              wx.showToast({
                title: '识别失败，请重试',
                icon: 'none'
              })
            })
          }, 300)
        } else {
          console.error('[Home] 自动识别：缺少图片路径')
          wx.showToast({
            title: '图片路径错误',
            icon: 'none'
          })
        }
      }
    } catch (err) {
      console.error('[Home] checkAutoIdentify 异常:', err)
    }
  },

  /**
   * 从相册选择图片（专门为我的花园添加植物功能）
   */
  openAlbumForMyGarden() {
    this.setData({ showPlusMenu: false, showQuickActions: false })
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        console.log('[Home] 从相册选择成功:', tempFilePath)
        this.identifyPlantFromImage(tempFilePath)
      },
      fail: (err) => {
        console.error('[Home] 从相册选择失败:', err)
      }
    })
  },

  async loadGardenPlants() {
    try {
      const res = await api.getMyPlants()
      if (res.success && res.plants) {
        // 处理图片 URL：优先使用云存储永久路径
        const plantsWithImages = await Promise.all(res.plants.map(async (plant) => {
          let imageUrl = ''
          
          // 1. 优先使用 userImageUrl（云存储永久路径）
          if (plant.userImageUrl) {
            imageUrl = plant.userImageUrl
            console.log('[home] 使用 userImageUrl:', imageUrl.substring(0, 50))
          }
          // 2. 其次使用 imageUrl 的云存储路径（如果有 cloud:// 前缀）
          else if (plant.imageUrl && plant.imageUrl.startsWith('cloud://')) {
            try {
              const tempUrlRes = await wx.cloud.getTempFileURL({
                fileList: [plant.imageUrl]
              })
              if (tempUrlRes.fileList && tempUrlRes.fileList[0]) {
                imageUrl = tempUrlRes.fileList[0].tempFileURL
                console.log('[home] 使用 cloud 临时 URL:', imageUrl.substring(0, 50))
              }
            } catch (e) {
              console.error('[home] 获取图片临时 URL 失败:', e)
            }
          }
          // 3. 最后尝试 identifyResult 中的图片
          else if (plant.identifyResult?.imageUrl) {
            imageUrl = plant.identifyResult.imageUrl
            console.log('[home] 使用 identifyResult 图片')
          }
          
          return {
            ...plant,
            imageUrl: imageUrl
          }
        }))
        
        console.log('[home] 加载完成，共', plantsWithImages.length, '盆植物，有图片的:', plantsWithImages.filter(p => p.imageUrl).length)
        this.setData({ gardenPlants: plantsWithImages })
      }
    } catch (e) { 
      console.error('[home] 加载花园数据失败:', e) 
    }
  },

  expandDialog() {
    this.setData({
      isExpanded: true,
      dialogHeight: MIN_DIALOG_HEIGHT,
      messages: [],
      inputText: '',
      currentIntent: null,
      extractedInfo: {},
      missingFields: [],
      confirmCard: null,
      showQuickActions: false,
      showPlusMenu: false,
      showVoicePanel: false,
      pendingAction: null
    })
  },

  // 胶囊点击处理：只在胶囊状态时展开，展开后点击空白处不收起
  onCapsuleTap(e) {
    // 如果当前是胶囊状态（未展开），点击任意位置展开
    if (!this.data.isExpanded) {
      this.expandDialog()
    }
    // 如果已展开，点击胶囊背景不处理（允许输入框等内部元素正常工作）
  },

  collapseDialog() {
    this.setData({
      isExpanded: false,
      dialogHeight: null,
      messages: [],
      inputText: '',
      currentIntent: null,
      extractedInfo: {},
      missingFields: [],
      confirmCard: null,
      showQuickActions: false
    })
  },

  onInput(e) { this.setData({ inputText: e.detail.value }) },

  async sendMessage() {
    const text = this.data.inputText.trim()
    if (!text || this.data.isLoading) return
    
    this.addMessage('user', text)
    this.setData({ inputText: '', isLoading: true, showQuickActions: false, loadingText: '思考中...' })
    
    // 滚动到 loading 提示位置（延迟稍长，确保 DOM 更新完成）
    setTimeout(() => {
      this.setData({ scrollToView: 'msg-loading' })
    }, 150)
    
    try {
      await this.chatWithAI(text)
    } catch (e) {
      console.error('[home] 发送消息失败:', e)
      this.addMessage('assistant', '网络好像不太好，稍后再试～')
    }
    
    this.setData({ isLoading: false, loadingText: '' })
  },

  // ========== 智能对话（AI 工具调用） ==========
  
  async chatWithAI(text) {
    // 检查用户是否正在确认添加植物（优先处理）
    const isConfirmingAddPlant = this.data.currentIntent === 'addPlant' && 
      /(好的|好|可以|确认|添加|加进|加入|要|是|对)/.test(text)
    
    // 如果是确认添加植物，直接调用确认处理
    if (isConfirmingAddPlant) {
      console.log('[home] 用户确认添加植物:', text)
      // 防御性检查：确保 extractedInfo 和 plantName 存在
      const plantName = this.data.extractedInfo?.plantName || '植物'
      this.onConfirmTap({
        currentTarget: {
          dataset: {
            action: 'addPlant',
            plantName: plantName
          }
        }
      })
      return
    }
    
    // 检查是否是询问用户花园植物状态的问题（不是推荐植物、不是植物知识）
    const isGardenStatusQuery = /(我的花园 | 我的植物 | 今天需要 | 今天要给 | 几天浇 | 多久浇 | 浇水 | 状态 | 任务 | 待办 | 施肥 | 修剪)/.test(text)
    
    // 只有真正询问花园状态时才刷新数据
    if (isGardenStatusQuery) {
      console.log('[home] 检测到花园相关问题，开始刷新数据...')
      await this.loadGardenPlants()
      console.log('[home] 花园数据刷新完成，当前植物数量:', this.data.gardenPlants.length)
      
      // 打印每盆植物的浇水状态
      this.data.gardenPlants.forEach(plant => {
        const status = gardenService.calculateWaterStatus(plant)
        console.log(`[home] 植物：${plant.name}, 需要浇水：${status.needsWater}, 状态：${status.statusText}`)
      })
    }
    
    const chatHistory = this.data.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || ''
    }))
    
    let res
    let retryCount = 0
    const maxRetry = 1
    
    while (retryCount <= maxRetry) {
      try {
        res = await api.classifyIntent(text, '', { 
          userPlants: this.data.gardenPlants,
          chatHistory: chatHistory
        })
        break  // 成功则跳出循环
      } catch (e) {
        console.error('[home] 云函数调用失败:', e)
        const errMsg = e.errMsg || e.message || ''
        if ((errMsg.includes('TIME_LIMIT') || errMsg.includes('timed out')) && retryCount < maxRetry) {
          retryCount++
          console.log(`[home] 超时重试 ${retryCount}/${maxRetry}`)
          continue
        }
        this.addMessage('assistant', '网络有点慢，稍后再试吧～')
        return
      }
    }
    
    if (!res.success) {
      const errorMsg = res.error || ''
      if (errorMsg.includes('TIME_LIMIT') || errorMsg.includes('timeout')) {
        this.addMessage('assistant', 'AI 想太久了，再问一次吧～')
      } else {
        this.addMessage('assistant', '出了一点问题，稍后再试')
      }
      return
    }

    const reply = res.currentQuestion || ''
    if (!reply) {
      this.addMessage('assistant', '我好像走神了，能再说一遍吗？')
      return
    }

    // 处理 AI 工具调用
    if (res.toolName === 'addPlant' && res.toolData && res.toolData.plantName) {
      // 添加植物 - 先幽默地询问用户确认
      const plantName = res.toolData.plantName
      const extractedInfo = {
        plantName: plantName,
        location: res.toolData.location || '',
        purchaseDate: res.toolData.purchaseDate || '',
        healthStatus: res.toolData.healthStatus || '健康',
        scientificName: '',
        imageUrl: '',
        careAdvice: {}
      }
      
      // 保存提取的信息
      this.setData({
        currentIntent: 'addPlant',
        extractedInfo: extractedInfo
      })
      
      // 幽默地询问用户确认
      const confirmMessages = [
        `好的呀～要在你的花园里添加一盆「${plantName}」吗？🌱`,
        `收到！让我确认一下：你想在花园里养一盆「${plantName}」，对吗？✨`,
        `太棒了！你的花园要迎来新成员「${plantName}」啦～确认添加吗？🎉`,
        `哇哦～「${plantName}」将成为你的花园新宠！要现在添加吗？💚`
      ]
      const randomConfirm = confirmMessages[Math.floor(Math.random() * confirmMessages.length)]
      
      // 显示确认消息，带上"确认"和"取消"按钮
      this.addMessage('assistant', randomConfirm, null, null, {
        type: 'confirm',
        action: 'addPlant',
        plantName: plantName,
        confirmText: '✅ 确认添加',
        cancelText: '❌ 下次再说'
      })
      
    } else if (res.toolName === 'deletePlant' && res.toolData && res.toolData.plantName) {
      // 删除植物
      this.deletePlantByVoice(res.toolData.plantName)
    } else if (res.toolName === 'getGardenStatus' && res.toolData && res.toolData.plants) {
      // 显示花园植物卡片列表（带图片）- 只显示前 5 个
      const toolPlants = res.toolData.plants || []
      
      console.log('[home] getGardenStatus toolData.plants:', toolPlants.length, '个植物')
      console.log('[home] 前端花园数据 gardenPlants:', this.data.gardenPlants.length, '个植物')
      
      // 优先使用工具返回的 imageUrl，如果没有则从前端花园数据查找
      const plantsWithImages = toolPlants.slice(0, 5).map(toolPlant => {
        // 优先使用工具返回的 imageUrl
        let imageUrl = toolPlant.imageUrl || ''
        
        // 如果工具返回的没有图片，尝试从前端花园数据查找
        if (!imageUrl && this.data.gardenPlants.length > 0) {
          const gardenPlant = this.data.gardenPlants.find(p => p.name === toolPlant.name)
          imageUrl = gardenPlant ? (gardenPlant.userImageUrl || gardenPlant.imageUrl) : ''
        }
        
        console.log('[home] 匹配植物:', toolPlant.name, '图片:', imageUrl ? '有' : '无', imageUrl)
        return {
          name: toolPlant.name,
          status: toolPlant.status || toolPlant.desc || '',
          imageUrl: imageUrl
        }
      }).filter(p => p.name) // 过滤掉空数据
      
      console.log('[home] 最终 plantsWithImages:', plantsWithImages.length, '个植物')
      
      // 显示植物卡片列表（前 5 个）
      this.addMessage('assistant', res.toolData.message, null, plantsWithImages)
      
      // 如果植物数量超过 5 个，显示省略号和查看更多按钮
      if (toolPlants.length > 5) {
        this.addMessage('assistant', `... 还有${toolPlants.length - 5}盆植物`, null, null, {
          showGardenLink: true
        })
      } else {
        // 显示查看更多花园链接
        this.addMessage('assistant', '👇 点击下面按钮查看完整花园', null, null, {
          showGardenLink: true
        })
      }
      
    } else {
      // 普通对话：如果是花园状态查询，基于真实数据回答
      if (isGardenStatusQuery && this.data.gardenPlants.length > 0) {
        // 计算需要浇水的植物
        const needWater = this.data.gardenPlants.filter(plant => {
          const status = gardenService.calculateWaterStatus(plant)
          return status.needsWater
        })
        
        if (needWater.length > 0) {
          const plantNames = needWater.map(p => p.name).join('、')
          const answer = `今天需要给 ${plantNames} 浇水了。\n\n💡 建议：见干见湿，避免积水`
          this.addMessage('assistant', answer)
          return
        } else {
          const answer = `今天所有植物都不需要浇水。\n\n💡 建议：保持观察，土壤表面干燥后再浇水`
          this.addMessage('assistant', answer)
          return
        }
      }
      
      this.addMessage('assistant', reply)
    }
    
    if (res.method === 'ai_function_calling') {
      if (reply.includes('花园') || reply.includes('状态')) {
        if (reply.includes('看') || reply.includes('查看') || reply.includes('帮你')) {
          this.setData({ pendingAction: 'myGarden' })
        }
      }
      if (reply.includes('任务') || reply.includes('待办')) {
        this.setData({ pendingAction: 'todayTask' })
      }
    }
  },

  async startNewConversation(text) {
    await this.chatWithAI(text)
  },

  // ========== 欢迎示例点击 ==========
  
  async handleWelcomeExample(e) {
    const { text } = e.currentTarget.dataset
    this.setData({ showQuickActions: false })
    
    if (text === 'myGarden') {
      this.showModule('myGarden')
      return
    }
    
    if (text === 'todayTask') {
      this.showModule('todayTask')
      return
    }

    if (text === 'recommend') {
      await this.chatWithAI('推荐一些好养的植物')
      return
    }

    if (text) {
      await this.chatWithAI(text)
    }
  },

  // ========== 模块展示 ==========
  
  showModule(intent) {
    if (intent === 'myGarden') {
      const p = this.data.gardenPlants
      if (p.length === 0) {
        this.addMessage('assistant', '你的花园还空着呢～\n\n说「我买了一盆绿萝」来添加第一盆植物吧！')
      } else {
        // 计算每盆植物的状态，并确保包含图片 URL
        const plantsWithStatus = p.map(plant => {
          const waterStatus = gardenService.calculateWaterStatus(plant)
          return {
            ...plant,
            status: waterStatus.statusText,
            // 确保有 imageUrl 字段
            imageUrl: plant.imageUrl || plant.identifyResult?.imageUrl || ''
          }
        })

        // 统计需要浇水的植物
        const needWater = plantsWithStatus.filter(p => p.status === '💧需要浇水')

        // 只显示前 5 盆植物
        const displayCount = Math.min(p.length, 5)
        const displayPlants = plantsWithStatus.slice(0, displayCount)
        const hasMore = p.length > 5

        let summary = `🏡 你的花园（${p.length}盆）`
        
        // 如果有需要浇水的植物，优先显示
        if (needWater.length > 0) {
          const needWaterNames = needWater.slice(0, 5).map(x => x.name).join('、')
          summary += `\n⚠️ ${needWaterNames}${needWater.length > 5 ? '...' : ''} 需要浇水了`
        }
        
        // 添加幽默提示
        const humorTips = [
          '你的植物们正在努力生长，别忘了多陪陪它们～',
          '花园这么美，都是你的功劳！🌟',
          '植物们说：主人真好，每天都照顾我们！',
          '绿意盎然的花园，是你用心呵护的结果～'
        ]
        const randomTip = humorTips[Math.floor(Math.random() * humorTips.length)]
        summary += `\n💡 ${randomTip}`
        
        if (hasMore) {
          summary += `\n... 还有 ${p.length - 5} 盆植物，去花园页面看看吧～`
        }

        // 添加消息，带上植物列表数据
        this.addMessage('assistant', summary, null, displayPlants)
      }
    } else if (intent === 'todayTask') {
      const p = this.data.gardenPlants
      if (p.length === 0) {
        this.addMessage('assistant', '📋 暂无待办任务\n\n你的花园还空着，先添加一些植物吧～')
      } else {
        // 检查需要浇水的植物
        const needWater = p.filter(plant => gardenService.calculateWaterStatus(plant).needsWater)

        if (needWater.length > 0) {
          // 只显示前 5 盆，并确保包含图片 URL
          const displayCount = Math.min(needWater.length, 5)
          const displayPlants = needWater.slice(0, displayCount).map(plant => ({
            ...plant,
            status: '💧需要浇水',
            // 确保有 imageUrl 字段
            imageUrl: plant.imageUrl || plant.identifyResult?.imageUrl || ''
          }))
          
          const hasMore = needWater.length > 5
          let summary = `💧 需要浇水的植物`
          if (hasMore) {
            summary += `\n... 还有 ${needWater.length - 5} 盆，去花园页面看看吧～`
          }
          
          this.addMessage('assistant', summary, null, displayPlants)
        } else {
          this.addMessage('assistant', '✅ 今天所有植物都不需要浇水\n\n💡 建议：保持观察，土壤表面干燥后再浇水')
        }
      }
    }
  },

  // 点击确认按钮
  onConfirmTap(e) {
    const action = e.currentTarget.dataset.action
    const plantName = e.currentTarget.dataset.plant || this.data.extractedInfo?.plantName || '植物'  // 防御性检查
    
    if (action === 'addPlant') {
      // 用户确认添加，继续询问拍照
      const extractedInfo = this.data.extractedInfo
      this.addMessage('user', `好的，添加「${plantName}」`)
      
      // 询问是否拍照
      this.askForPhoto(extractedInfo)
    }
  },
  
  // 点击取消按钮
  onCancelTap(e) {
    const action = e.currentTarget.dataset.action
    
    if (action === 'addPlant') {
      this.addMessage('user', '下次再说吧')
      this.addMessage('assistant', '好的～什么时候想添加新植物了，随时告诉我哦！🌿')
      // 清空提取的信息
      this.setData({
        currentIntent: '',
        extractedInfo: {}
      })
    }
  },
  
  // 拍照（只调相机）
  // 跳转到相机页面拍照
  takePhoto() {
    this.setData({ showPlusMenu: false, showQuickActions: false })
    wx.navigateTo({
      url: '/pages/camera/camera?mode=identify'
    })
  },

  // 从相册选择
  chooseFromAlbum() {
    this.setData({ showPlusMenu: false, showQuickActions: false })
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.identifyPlantFromImage(tempFilePath)
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
      }
    })
  },

  // 压缩图片（目标：1MB 以内，最大不超过 2MB）
  compressImage(imagePath) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src: imagePath,
        success: (imgInfo) => {
          const originalWidth = imgInfo.width
          const originalHeight = imgInfo.height
          
          // 计算压缩比例（长边不超过 1200px）
          const maxLength = 1200
          let width = originalWidth
          let height = originalHeight
          
          if (width > height && width > maxLength) {
            height = Math.round(height * maxLength / width)
            width = maxLength
          } else if (height > maxLength) {
            width = Math.round(width * maxLength / height)
            height = maxLength
          }
          
          console.log(`📐 原图尺寸：${originalWidth}x${originalHeight}`)
          console.log(`📐 压缩尺寸：${width}x${height}`)
          
          // 压缩并保存
          wx.compressImage({
            src: imagePath,
            quality: 80,  // 80% 质量
            compressedWidth: width,
            compressedHeight: height,
            success: (res) => {
              console.log(`✅ 压缩成功：${res.tempFilePath}`)
              resolve(res.tempFilePath)
            },
            fail: () => {
              // 压缩失败，返回原图
              console.log('⚠️ 压缩失败，使用原图')
              resolve(imagePath)
            }
          })
        },
        fail: () => {
          console.log('⚠️ 获取图片信息失败，使用原图')
          resolve(imagePath)
        }
      })
    })
  },

  // 识别植物
  async identifyPlantFromImage(imagePath) {
    // 检查会员识别限制
    const identifyCheck = await memberLimit.canIdentify()
    
    if (!identifyCheck.canIdentify) {
      memberLimit.showLimitAlert('identify')
      this.setData({ isLoading: false, loadingText: '' })
      return
    }

    this.setData({ isLoading: true, loadingText: '识别中...' })
    
    // 立即滚动到 loading 提示位置（确保"识别中..."可见）
    this.setData({ scrollToView: 'msg-loading' })
    
    try {
      // 压缩图片（目标：1MB 以内，最大不超过 2MB）
      const compressedPath = await this.compressImage(imagePath)
      
      // 转换为 base64
      const base64 = await imageToBase64(compressedPath)
      
      // 检查压缩后的大小
      const sizeKB = base64.length * 0.75 / 1024
      console.log(`📐 压缩后图片大小：${sizeKB.toFixed(1)} KB`)
      
      if (sizeKB > 5000) {
        this.setData({ isLoading: false, loadingText: '' })
        wx.showModal({
          title: '图片太大',
          content: '图片超过 5MB，请选择更小的图片或重新拍摄',
          showCancel: false
        })
        return
      }
      
      // 使用前端直接调用 PlantNet
      const res = await plantIdentify.identifyPlant(base64)
      
      if (res.success && res.data) {
      // 记录识别次数
      memberLimit.recordIdentify()

        // ========== 根据置信度决定展示方式 ==========
        const confidence = res.data.confidence || 0
        let titlePrefix = ''
        let showWarning = false
        let showRetryAdvice = false
        
        if (confidence >= 60) {
          // 高置信度：直接显示
          titlePrefix = '🌿 '
          showWarning = false
          showRetryAdvice = false
        } else if (confidence >= 40) {
          // 中等置信度：谨慎显示
          titlePrefix = '✅ '
          showWarning = false
          showRetryAdvice = false
        } else if (confidence >= 20) {
          // 较低置信度：提醒用户
          titlePrefix = '🔍 '
          showWarning = true
          showRetryAdvice = false
        } else {
          // 极低置信度：建议重拍
          titlePrefix = '❓ '
          showWarning = true
          showRetryAdvice = true
        }
        
        // 构建精简但有内容的识别结果
        let msg = `${titlePrefix}**${res.data.name}**\n`
        
        // 置信度提示
        if (showWarning) {
          if (confidence < 20) {
            msg += `⚠️ 识别置信度较低（${confidence}%），结果仅供参考\n`
          } else {
            msg += `⚠️ 识别结果仅供参考（置信度 ${confidence}%）\n`
          }
        }
        
        // ========== 详细显示植物信息（置信度≥20% 时显示完整信息）==========
        if (confidence >= 20) {
          msg += `\n📖 **详细信息**\n`
          
          // 学名（拉丁名）
          if (res.data.scientificNameLatin) {
            msg += `• 拉丁学名：${res.data.scientificNameLatin}\n`
          }
          
          // 中文学名
          if (res.data.scientificName && res.data.scientificName !== res.data.name) {
            msg += `• 中文学名：${res.data.scientificName}\n`
          }
          
          // 别名/常见名
          if (res.data.commonNames && res.data.commonNames !== res.data.name) {
            msg += `• 别名：${res.data.commonNames}\n`
          }
          
          // 科属
          if (res.data.family) {
            msg += `• 科属：${res.data.family}\n`
          }
          
          // 置信度
          msg += `• 置信度：${confidence}%\n`
        } else {
          // 置信度<20%，只显示基本信息
          msg += ` 置信度：${confidence}%\n`
          if (res.data.family) msg += `🌱 科属：${res.data.family}\n`
        }
        
        // ========== 显示多个可能的结果 ==========
        if (res.data.possibleResults && res.data.possibleResults.length > 1) {
          msg += `\n\n🔍 **其他可能的结果**\n`
          for (let i = 1; i < res.data.possibleResults.length; i++) {
            const possible = res.data.possibleResults[i]
            const possibleConfidence = possible.confidence
            
            if (possibleConfidence >= 20) {
              msg += `${i + 1}. ${possible.name}（${possibleConfidence}%）\n`
            } else {
              msg += `${i + 1}. 可能是${possible.name}（${possibleConfidence}%）\n`
            }
          }
          
          // 根据最佳结果的置信度给出建议
          if (confidence < 20) {
            msg += `\n💡 **拍摄建议**\n`
            msg += `当前识别置信度较低，建议重新拍摄：\n`
            msg += `• 📸 换个角度，拍摄植物整体\n`
            msg += `• ☀️ 在光线充足的地方拍摄\n`
            msg += `• 🎯 对焦清晰，突出叶片/花朵特征\n`
            msg += `• 🌿 拍摄单株植物，避免背景干扰\n`
          }
        }
        
        // 清理文本中的换行符，避免重复换行
        const cleanText = (text) => text ? text.replace(/[\r\n]+/g, ' ').trim() : ''
        
        // 植物档案（合并简介）
        if (res.data.plantProfile) {
          msg += `\n📝 植物档案\n${cleanText(res.data.plantProfile)}\n`
        }
        
        // 生长习性
        if (res.data.growthHabit) {
          msg += `\n🔄 生长习性\n${cleanText(res.data.growthHabit)}\n`
        }
        
        // 主要价值
        if (res.data.mainValue) {
          msg += `\n💎 主要价值\n${cleanText(res.data.mainValue)}\n`
        }
        
        // 养护指南（分组展示，提升可读性）
        if (res.data.careGuide) {
          msg += `\n\n💡 养护指南`
          
          // 基础养护（光照 + 浇水）
          const basicCare = []
          if (res.data.careGuide.light) basicCare.push(`☀️ 光照：${cleanText(res.data.careGuide.light)}`)
          if (res.data.careGuide.water) basicCare.push(`💧 浇水：${cleanText(res.data.careGuide.water)}`)
          if (basicCare.length > 0) {
            msg += `\n【基础养护】\n${basicCare.join('\n')}`
          }
          
          // 环境要求（温度 + 湿度 + 土壤）
          const envCare = []
          if (res.data.careGuide.temperature) envCare.push(`🌡️ 温度：${cleanText(res.data.careGuide.temperature)}`)
          if (res.data.careGuide.humidity) envCare.push(`💦 湿度：${cleanText(res.data.careGuide.humidity)}`)
          if (res.data.careGuide.soil) envCare.push(`🪴 土壤：${cleanText(res.data.careGuide.soil)}`)
          if (envCare.length > 0) {
            msg += `\n\n【环境要求】\n${envCare.join('\n')}`
          }
          
          // 进阶养护（施肥 + 修剪 + 繁殖）
          const advancedCare = []
          if (res.data.careGuide.fertilizer) advancedCare.push(`🌱 施肥：${cleanText(res.data.careGuide.fertilizer)}`)
          if (res.data.careGuide.pruning) advancedCare.push(`🔪 修剪：${cleanText(res.data.careGuide.pruning)}`)
          if (res.data.careGuide.propagation) advancedCare.push(`🔄 繁殖：${cleanText(res.data.careGuide.propagation)}`)
          if (advancedCare.length > 0) {
            msg += `\n\n【进阶养护】\n${advancedCare.join('\n')}`
          }
        }
        
        // 养护难度
        if (res.data.difficultyText) {
          const stars = '⭐'.repeat(res.data.difficultyLevel || 3)
          msg += `\n${stars} 养护难度：${res.data.difficultyText}\n`
        }
        
        // 常见问题
        if (res.data.commonProblems && res.data.commonProblems.length > 0) {
          msg += `\n⚠️ 常见问题\n${res.data.commonProblems.map(p => `• ${p}`).join('\n')}\n`
        }
        
        // 快速要点
        if (res.data.quickTips && res.data.quickTips.length > 0) {
          msg += `\n✨ 养护要点\n${res.data.quickTips.map(t => `• ${t}`).join('\n')}\n`
        }
        
        // 添加图片消息（用户上传的）
        this.addMessage('user', '', imagePath)
        
        // 添加识别结果消息，包含操作按钮
        this.addMessage('assistant', msg, null, null, { 
          identifyResult: {
            plantName: res.data.name,
            scientificName: res.data.scientificName,
            imageUrl: imagePath,
            careAdvice: res.data.careGuide
          }
        })
        
        // 保存识别结果
        this.setData({
          currentIntent: 'addPlant',
          extractedInfo: {
            plantName: res.data.name,
            scientificName: res.data.scientificName,
            imageUrl: imagePath,
            careAdvice: res.data.careGuide
          }
        })
        
      } else {
        this.addMessage('assistant', res.error || '识别失败，请重试')
      }
    } catch (e) {
      console.error(e)
      this.addMessage('assistant', '识别失败')
    }
    
    this.setData({ isLoading: false, loadingText: '' })
  },

  // 预览图片
  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] })
  },

  onConfirmSave() {
    if (this.data.currentIntent === 'addPlant' && this.data.extractedInfo.imageUrl) {
      // 有图片的添加植物
      this.executeIntent('addPlant', this.data.extractedInfo)
    } else if (this.data.currentIntent) {
      this.executeIntent(this.data.currentIntent, this.data.extractedInfo)
    }
  },

  onConfirmCancel() {
    this.setData({ confirmCard: null, currentIntent: null, extractedInfo: {} })
    this.addMessage('assistant', '已取消')
  },

  addMessage(role, content, image, plants, extra) {
    const messages = [...this.data.messages]
    const msg = { id: Date.now(), role, content }
    if (image) msg.image = image
    if (plants && plants.length > 0) msg.plants = plants
    // 支持新的图文类型
    if (extra) {
      if (extra.recommendPlants) msg.recommendPlants = extra.recommendPlants
      if (extra.careTips) msg.careTips = extra.careTips
      if (extra.hotTags) msg.hotTags = extra.hotTags
      if (extra.showGardenLink) msg.showGardenLink = extra.showGardenLink
      if (extra.identifyResult) msg.identifyResult = extra.identifyResult
      if (extra.plantCard) msg.plantCard = extra.plantCard
    }
    // 支持确认按钮
    if (extra?.confirm) msg.confirm = extra.confirm
    
    messages.push(msg)
    
    // 计算高度，随内容增长
    let extraHeight = 0
    if (extra?.recommendPlants) extraHeight += 130
    if (extra?.careTips) extraHeight += 110
    if (extra?.hotTags) extraHeight += 60
    if (plants) extraHeight += plants.length * 65
    if (extra?.showGardenLink) extraHeight += 45
    if (extra?.identifyResult) extraHeight += 60
    if (extra?.plantCard) extraHeight += 150
    
    // 每条消息增加更多高度（改进计算）
    const msgHeight = messages.reduce((total, m) => {
      let h = 60  // 基础高度
      if (m.image) h += 120  // 图片高度
      if (m.content) {
        // 根据内容长度和行数估算高度
        const lines = m.content.split('\n').length
        const chars = m.content.length
        
        // 识别结果内容丰富，需要更多空间
        if (m.identifyResult || lines > 10) {
          h += Math.max(lines * 28, 200)  // 每行约28px，最少200px
        } else if (chars > 100) {
          h += 80 + Math.floor(chars / 50) * 20
        } else if (chars > 50) {
          h += 50
        }
      }
      return total + h
    }, 0)
    
    // 识别结果需要更大的滚动区域
    const hasIdentifyResult = messages.some(m => m.identifyResult)
    const baseHeight = hasIdentifyResult ? 320 : 180
    
    const height = Math.min(baseHeight + msgHeight + extraHeight + (this.data.confirmCard ? 120 : 0), MAX_DIALOG_HEIGHT)
    
    this.setData({
      messages,
      dialogHeight: height,
      scrollToView: ''
    })
    
    // 延迟滚动到最新消息（确保 DOM 更新完成）
    setTimeout(() => {
      this.setData({
        scrollToView: `msg-${msg.id}`
      })
    }, 300)
  },

  // 点击植物卡片
  onPlantCardTap(e) {
    const plant = e.currentTarget.dataset.plant
    wx.showActionSheet({
      itemList: ['记录浇水', '记录施肥', '查看详情'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ inputText: `给${plant.name}浇水` })
          this.sendMessage()
        } else if (res.tapIndex === 1) {
          this.setData({ inputText: `给${plant.name}施肥` })
          this.sendMessage()
        }
      }
    })
  },

  // 从识别结果加入花园（已有照片，直接创建）
  addToGardenFromResult(e) {
    const info = e.currentTarget.dataset.info
    if (!info) return
    
    this.setData({
      currentIntent: 'addPlant',
      extractedInfo: {
        plantName: info.plantName,
        scientificName: info.scientificName,
        imageUrl: info.imageUrl,
        careAdvice: info.careAdvice
      }
    })
    
    this.addMessage('assistant', `好的，正在添加「${info.plantName}」到花园...`)
    // 已有照片，直接创建档案（不再询问）
    this.createPlantWithPhoto(info.imageUrl)
  },

  // 确认添加植物到花园
  async confirmAddPlant_V2() {
    const { currentIntent, extractedInfo } = this.data
    
    if (currentIntent !== 'addPlant' || !extractedInfo.plantName) {
      console.error('[home] confirmAddPlant: 缺少必要数据')
      return
    }
    
    // 询问是否拍照
    this.askForPhoto(extractedInfo)
  },

  /**
   * 询问是否拍照建立档案
   */
  askForPhoto(extractedInfo) {
    wx.showModal({
      title: '建立植物档案',
      content: `是否为「${extractedInfo.plantName}」拍照建立档案？\n\n拍照后可以在花园中看到你真实的植物照片。`,
      confirmText: '立即拍照',
      cancelText: '稍后补充',
      success: (res) => {
        if (res.confirm) {
          // 用户选择立即拍照
          this.takePhotoForPlant(extractedInfo)
        } else {
          // 用户选择稍后补充，直接创建档案
          this.createPlantWithoutPhoto(extractedInfo)
        }
      }
    })
  },

  /**
   * 使用已有照片创建植物档案（识别后添加）
   */
  async createPlantWithPhoto(imageUrl) {
    const extractedInfo = this.data.extractedInfo
    
    // 检查会员限制
    const checkRes = await memberLimit.canAddPlant()
    
    if (!checkRes.canAdd) {
      memberLimit.showLimitAlert('plant')
      this.setData({
        currentIntent: null,
        extractedInfo: {}
      })
      return
    }
    
    wx.showLoading({ title: '添加中...' })

    try {
      const db = wx.cloud.database()

      // 检查植物是否已存在
      const exists = await api.plant.checkPlantExists(db, extractedInfo.plantName, imageUrl)

      // 如果需要询问，弹窗确认
      if (exists.needConfirm) {
        const nextCount = exists.maxCount + 1
        const ordinal = api.plant.getOrdinal(nextCount)
        wx.hideLoading()

        const confirmed = await new Promise((resolve) => {
          wx.showModal({
            title: '提示',
            content: `${exists.reason}\n\n是否要添加第 ${ordinal} 盆？`,
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

        if (!confirmed) {
          this.setData({
            currentIntent: null,
            extractedInfo: {}
          })
          return
        }
        
        // 用户确认添加，重新显示 loading
        wx.showLoading({ title: '添加中...' })
      }
      
      // 6. 创建档案
      const createRes = await this.createPlantRecord(extractedInfo)
      
      if (!createRes.success && createRes.error === 'PLANT_ALREADY_EXISTS') {
        // 植物已存在，询问是否添加第 N 盆
        wx.hideLoading()
        this.handlePlantAlreadyExists(extractedInfo.plantName)
        return
      }
      
      if (!createRes.success) {
        wx.hideLoading()
        this.addMessage('assistant', `❌ 创建档案失败：${createRes.message || '请重试'}`)
        return
      }
      
      // 7. 上传照片（可选，失败不影响植物创建）
      try {
        const tempFilePath = await this.downloadImageToTemp(imageUrl)
        await api.plant.uploadPlantImage(createRes.plantId, tempFilePath)
        console.log('[home] 照片上传成功')
      } catch (uploadErr) {
        console.error('[home] 照片上传失败:', uploadErr)
        // 照片上传失败不阻断流程，只记录错误
      }
      
      wx.hideLoading()
      
      let successMsg = `✅「${extractedInfo.plantName}」已加入花园`
      if (exists.nameCount > 0) {
        const nextCount = exists.nameCount + 1
        const ordinal = api.plant.getOrdinal(nextCount)
        successMsg = `✅ 第 ${ordinal} 盆「${extractedInfo.plantName}」已加入花园`
      }
      
      // 检查是否有照片
      const hasPhoto = imageUrl && imageUrl.trim() !== ''
      if (hasPhoto) {
        successMsg += '（含照片）'
      }
      
      this.addMessage('assistant', successMsg, null, null, {
        plantCard: {
          name: extractedInfo.plantName,
          healthStatus: '健康',
          wateringCycle: '7 天',
          lightNeed: '明亮散射光',
          difficulty: '⭐⭐⭐ 中等',
          tip: '见干见湿，避免积水'
        }
      })
      
      this.loadGardenPlants()
      
      // 清空状态
      this.setData({
        currentIntent: null,
        extractedInfo: {}
      })
      
    } catch (err) {
      wx.hideLoading()
      console.error('[home] createPlantWithPhoto 失败:', err)
      
      // 检查植物是否已经创建成功
      try {
        const db = wx.cloud.database()
        const checkRes = await db.collection('my_plants')
          .where({ name: extractedInfo.plantName })
          .orderBy('addTime', 'desc')
          .limit(1)
          .get()
        
        if (checkRes.data.length > 0) {
          // 植物已创建，只是照片上传失败
          this.addMessage('assistant', `✅「${extractedInfo.plantName}」已加入花园\n⚠️ 照片上传失败，你可以在花园页面点击植物重新上传照片`)
          this.loadGardenPlants()
          this.setData({
            currentIntent: null,
            extractedInfo: {}
          })
          return
        }
      } catch (checkErr) {
        console.error('[home] 检查植物创建状态失败:', checkErr)
      }
      
      // 确认植物未创建，显示错误
      this.addMessage('assistant', `❌ 添加失败：${err.message || '请重试'}`)
    }
  },

  /**
   * 下载网络图片到临时文件
   */
  async downloadImageToTemp(imageUrl) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: imageUrl,
        success: (res) => {
          resolve(res.tempFilePath)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  },

  /**
   * 拍照并创建植物档案
   */
  async takePhotoForPlant(extractedInfo) {
    try {
      // 调用相机
      const chooseRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        sizeType: ['compressed']
      })

      if (!chooseRes.tempFiles || chooseRes.tempFiles.length === 0) {
        // 用户取消拍照，询问是否继续创建档案
        wx.showModal({
          title: '提示',
          content: '未拍摄照片，是否仍要创建档案？',
          confirmText: '创建档案',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.createPlantWithoutPhoto(extractedInfo)
            }
          }
        })
        return
      }

      const tempFilePath = chooseRes.tempFiles[0].tempFilePath
      console.log('[home] 拍照成功:', tempFilePath)

      // 先创建植物档案
      const createRes = await this.createPlantRecord(extractedInfo)
      
      if (!createRes.success) {
        this.addMessage('assistant', `❌ 创建档案失败：${createRes.message || '请重试'}`)
        return
      }

      // 上传图片
      wx.showLoading({ title: '上传中...' })

      await api.plant.uploadPlantImage(createRes.plantId, tempFilePath)

      wx.hideLoading()

      this.addMessage('assistant', `✅ 「${extractedInfo.plantName}」已加入花园（含照片）`, null, null, {
        plantCard: {
          name: extractedInfo.plantName,
          healthStatus: '健康',
          wateringCycle: '7 天',
          lightNeed: '明亮散射光',
          difficulty: '⭐⭐⭐ 中等',
          tip: '见干见湿，避免积水'
        }
      })
      
      this.loadGardenPlants()

    } catch (err) {
      wx.hideLoading()
      console.error('[home] 拍照或创建档案失败:', err)
      // 出错时询问是否继续创建
      wx.showModal({
        title: '提示',
        content: '照片上传失败，是否仍要创建档案？',
        confirmText: '创建档案',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.createPlantWithoutPhoto(extractedInfo)
          }
        }
      })
    }

    // 清空状态
    this.setData({
      currentIntent: null,
      extractedInfo: {}
    })
  },

  /**
   * 不拍照直接创建植物档案
   */
  async createPlantWithoutPhoto(extractedInfo) {
    // 检查会员限制
    const checkRes = await memberLimit.canAddPlant()
    
    if (!checkRes.canAdd) {
      memberLimit.showLimitAlert('plant')
      this.setData({
        currentIntent: null,
        extractedInfo: {}
      })
      return
    }

    wx.showLoading({ title: '添加中...' })

    try {
      const db = wx.cloud.database()

      // 检查植物是否已存在
      const exists = await api.plant.checkPlantExists(db, extractedInfo.plantName, extractedInfo.imageUrl)

      // 如果需要确认，弹窗询问
      if (exists.needConfirm) {
        const nextCount = exists.maxCount + 1
        const ordinal = api.plant.getOrdinal(nextCount)
        wx.hideLoading()

        const confirmed = await new Promise((resolve) => {
          wx.showModal({
            title: '植物已存在',
            content: `${exists.reason}\n\n是否要添加第 ${ordinal} 盆？`,
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

        if (!confirmed) {
          this.setData({
            currentIntent: null,
            extractedInfo: {}
          })
          return
        }

        // 用户确认添加，带上序号
        extractedInfo.plantName = `${extractedInfo.plantName}（第${ordinal}盆）`
        wx.showLoading({ title: '添加中...' })
      }

      // 创建档案
      const res = await this.createPlantRecord(extractedInfo)
      
      wx.hideLoading()
      
      if (res.success) {
        const msg = `✅「${extractedInfo.plantName}」已加入花园\n\n💡 提示：你可以在花园页面点击 + 号随时补充植物照片`

        this.addMessage('assistant', msg, null, null, {
          plantCard: {
            name: extractedInfo.plantName,
            healthStatus: '健康',
            wateringCycle: '7 天',
            lightNeed: '明亮散射光',
            difficulty: '⭐⭐⭐ 中等',
            tip: '见干见湿，避免积水'
          }
        })
        this.loadGardenPlants()
      } else {
        this.addMessage('assistant', `❌ 添加失败：${res.message || '请重试'}`)
      }
      
    } catch (err) {
      wx.hideLoading()
      console.error('[home] createPlantWithoutPhoto 失败:', err)
      this.addMessage('assistant', `❌ 添加失败：${err.message || '请重试'}`)
    }

    // 清空状态
    this.setData({
      currentIntent: null,
      extractedInfo: {}
    })
  },

  /**
   * 处理植物已存在的情况
   */
  async handlePlantAlreadyExists(plantName) {
    try {
      const db = wx.cloud.database()
      // 查询该植物已存在的数量
      const countRes = await db.collection('my_plants').where({
        name: db.RegExp({ regexp: plantName, options: 'i' })
      }).count()

      const currentCount = countRes.total
      const nextCount = currentCount + 1
      const ordinal = api.plant.getOrdinal(nextCount)

      // 保存当前提取的信息
      const savedExtractedInfo = { ...this.data.extractedInfo }

      wx.showModal({
        title: '植物已存在',
        content: `花园里已有 ${currentCount} 盆「${plantName}」\n\n是否要添加第 ${ordinal} 盆？`,
        confirmText: '添加',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            if (savedExtractedInfo && savedExtractedInfo.plantName) {
              savedExtractedInfo.plantName = `${plantName}（第${ordinal}盆）`
              this.createPlantWithDuplicate(savedExtractedInfo, nextCount)
            }
          }
        }
      })
    } catch (err) {
      console.error('[home] 查询植物数量失败:', err)
      this.addMessage('assistant', `⚠️ 「${plantName}」已经在花园里了`)
    }
  },

  /**
   * 创建重复植物（第 N 盆）
   */
  async createPlantWithDuplicate(extractedInfo, count) {
    const res = await this.createPlantRecord(extractedInfo)

    if (res.success) {
      const ordinal = api.plant.getOrdinal(count)
      this.addMessage('assistant', `✅ 第 ${ordinal} 盆「${extractedInfo.plantName}」已加入花园\n\n💡 提示：你可以在花园页面点击 + 号随时补充植物照片`, null, null, {
        plantCard: {
          name: extractedInfo.plantName,
          healthStatus: '健康',
          wateringCycle: '7 天',
          lightNeed: '明亮散射光',
          difficulty: '⭐⭐⭐ 中等',
          tip: '见干见湿，避免积水'
        }
      })
      this.loadGardenPlants()
    } else {
      this.addMessage('assistant', `❌ 添加失败：${res.message || '请重试'}`)
    }

    // 清空状态
    this.setData({
      currentIntent: null,
      extractedInfo: {}
    })
  },

  /**
   * 创建植物档案记录
   */
  async createPlantRecord(extractedInfo) {
    try {
      const res = await api.addPlant({
        name: extractedInfo.plantName,
        scientificName: extractedInfo.scientificName,
        imageUrl: extractedInfo.imageUrl,
        identifyResult: extractedInfo
      })
      
      return res
    } catch (e) {
      console.error('[home] createPlantRecord 失败:', e)
      return { success: false, message: '网络错误' }
    }
  },

  // 跳转发现页
  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' })
  },

  // 取消识别
  cancelIdentify() {
    this.setData({
      currentIntent: null,
      extractedInfo: {}
    })
    this.addMessage('assistant', '好的，已取消')
  },

  /**
   * 删除植物（语音指令）
   */
  async deletePlantByVoice(plantName) {
    if (!plantName) {
      this.addMessage('assistant', '请告诉我您要删除哪盆植物？')
      return
    }

    wx.showLoading({ title: '查找中...' })

    try {
      // 先获取花园植物列表
      const plantsRes = await wx.cloud.callFunction({
        name: 'getMyPlants'
      })

      wx.hideLoading()

      if (!plantsRes.result || !plantsRes.result.success) {
        this.addMessage('assistant', '❌ 获取植物列表失败')
        return
      }

      const plants = plantsRes.result.plants || []
      
      // 查找匹配的植物 - 优先精确匹配，再模糊匹配
      let matchedPlant = null
      
      // 1. 优先精确匹配（完全一致）
      matchedPlant = plants.find(p => p.name === plantName)
      
      // 2. 如果没有精确匹配，尝试包含匹配
      if (!matchedPlant) {
        matchedPlant = plants.find(p => p.name === plantName)
      }
      
      // 3. 如果还是没有，尝试模糊匹配（植物名包含关键词）
      if (!matchedPlant) {
        matchedPlant = plants.find(p => 
          (p.name && p.name.includes(plantName)) || 
          (p.identifyResult && p.identifyResult.name && p.identifyResult.name.includes(plantName))
        )
      }

      if (!matchedPlant) {
        this.addMessage('assistant', `❌ 没有找到「${plantName}」，请确认植物名称`)
        return
      }

      console.log('[home] 找到要删除的植物:', matchedPlant.name, 'ID:', matchedPlant._id)

      // 确认删除
      wx.showModal({
        title: '删除确认',
        content: `确定要删除「${matchedPlant.name}」吗？删除后无法恢复。`,
        confirmText: '删除',
        confirmColor: '#ff5252',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            await this.confirmDeletePlant(matchedPlant._id, matchedPlant.name)
          }
        }
      })
    } catch (err) {
      wx.hideLoading()
      console.error('[home] 删除植物失败:', err)
      this.addMessage('assistant', '❌ 删除失败，请重试')
    }
  },

  /**
   * 确认删除植物
   */
  async confirmDeletePlant(plantId, plantName) {
    wx.showLoading({ title: '删除中...' })

    try {
      const res = await wx.cloud.callFunction({
        name: 'deletePlant',
        data: {
          plantId: plantId
        }
      })

      wx.hideLoading()

      if (res.result && res.result.success) {
        console.log('[home] 删除成功:', plantName, 'ID:', plantId)
        
        // 删除成功后，先清空花园列表，再重新加载（确保显示最新数据）
        this.setData({ gardenPlants: [] })
        
        // 稍微延迟后再加载，确保云数据库已经更新
        setTimeout(() => {
          this.loadGardenPlants().then(() => {
            console.log('[home] 花园列表刷新完成，当前植物数量:', this.data.gardenPlants.length)
          })
        }, 500)
        
        this.addMessage('assistant', `✅ 「${plantName}」已从花园中删除`)
      } else {
        console.error('[home] 删除失败:', res.result)
        this.addMessage('assistant', '❌ 删除失败，请重试')
      }
    } catch (err) {
      wx.hideLoading()
      console.error('[home] 删除植物失败:', err)
      this.addMessage('assistant', '❌ 删除失败，请重试')
    }
  },

  // 点击推荐植物
  onRecommendTap(e) {
    const plant = e.currentTarget.dataset.plant
    this.addMessage('user', plant.name)
    this.setData({ inputText: `${plant.name}怎么养` })
    this.sendMessage()
  },

  // 点击热门标签
  onHotTagTap(e) {
    const tag = e.currentTarget.dataset.tag
    this.addMessage('user', tag)
    this.setData({ inputText: `${tag}怎么养` })
    this.sendMessage()
  },

  // 切换加号菜单
  togglePlusMenu() {
    this.setData({ 
      showPlusMenu: !this.data.showPlusMenu,
      showEmojiPanel: false,
      showVoicePanel: false
    })
  },

  // 阻止冒泡
  stopPropagation() {},

  // 通过 button open-type 调用相机的回调
  onTakePhoto(e) {
    this.setData({ showPlusMenu: false })
    if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
      const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath)
      if (imageFile) {
        this.identifyPlantFromImage(imageFile.tempFilePath)
      }
    }
  },

  // 通过 button open-type 调用相册的回调
  onChooseFromAlbum(e) {
    this.setData({ showPlusMenu: false })
    if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
      const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath)
      if (imageFile) {
        this.identifyPlantFromImage(imageFile.tempFilePath)
      }
    }
  },



  // 表情 - 打开表情面板
  onEmoji() {
    this.setData({ 
      showVoicePanel: false,
      showEmojiPanel: !this.data.showEmojiPanel 
    })
  },

  // 切换表情面板
  toggleEmojiPanel() {
    this.setData({ showEmojiPanel: !this.data.showEmojiPanel })
  },

  // 插入表情到输入框
  insertEmoji(e) {
    const emoji = e.currentTarget.dataset.emoji
    const newText = (this.data.inputText || '') + emoji
    this.setData({ inputText: newText, showEmojiPanel: false })
  },



  // ========== 新增：展示图文内容 ==========

  // 展示当季植物推荐
  showRecommendPlants() {
    // 先展开对话框
    if (!this.data.isExpanded) {
      this.expandDialog()
    }
    
    // 当季植物数据
    const seasonPlants = [
      { name: '绿萝', image: 'https://images.unsplash.com/photo-1459411552884-541f6a4c0a77?w=400&q=80', desc: '耐阴好养，净化空气' },
      { name: '多肉', image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&q=80', desc: '喜阳耐旱，萌萌可爱' },
      { name: '发财树', image: 'https://images.unsplash.com/photo-1459411552884-541f6a4c0a77?w=400&q=80', desc: '寓意好，好养护' },
      { name: '吊兰', image: 'https://images.unsplash.com/photo-1459411552884-541f6a4c0a77?w=400&q=80', desc: '净化空气，易繁殖' },
      { name: '龟背竹', image: 'https://images.unsplash.com/photo-1459411552884-541f6a4c0a77?w=400&q=80', desc: '热带风情，网红植物' }
    ]
    
    this.addMessage('assistant', '🌸 当季推荐植物', null, null, { recommendPlants: seasonPlants })
  },

  // 展示养护小贴士
  showCareTips() {
    if (!this.data.isExpanded) {
      this.expandDialog()
    }
    
    const tips = [
      { icon: '💧', title: '浇水技巧', desc: '见干见湿，避免积水' },
      { icon: '☀️', title: '光照要点', desc: '散射光为主，避免暴晒' },
      { icon: '🌡️', title: '温度控制', desc: '15-25°C最适宜' },
      { icon: '🌿', title: '施肥建议', desc: '薄肥勤施，生长期为主' }
    ]
    
    this.addMessage('assistant', '💡 养护小贴士', null, null, { careTips: tips })
  },

  // 展示热门搜索
  showHotSearch() {
    if (!this.data.isExpanded) {
      this.expandDialog()
    }
    
    const tags = ['绿萝', '多肉', '发财树', '吊兰', '龟背竹', '虎皮兰', '文竹', '君子兰', '茉莉', '栀子花']
    
    this.addMessage('assistant', '🔥 热门搜索', null, null, { hotTags: tags })
  },

  // 跳转到花园页面
  goToGarden() {
    wx.switchTab({ url: '/pages/my-plants/my-plants' })
  },

  // 点击示例语句
  onExampleTap(e) {
    const text = e.currentTarget.dataset.text
    this.setData({ showQuickActions: false })
    
    // 特殊卡片直接调用 showModule
    if (text === '查看我的花园有哪些植物') {
      this.showModule('myGarden')
      return
    }
    
    if (text === '今天需要给哪些植物浇水') {
      this.showModule('todayTask')
      return
    }
    
    // 普通问题走 AI 对话
    this.setData({ inputText: text })
    this.sendMessage()
  },

  // 弹出拍照/相册选择
  showPhotoOptions() {
    wx.showActionSheet({
      itemList: ['📷 拍照识别', '🖼️ 相册上传'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto()
        } else if (res.tapIndex === 1) {
          this.chooseFromAlbum()
        }
      }
    })
  },

  // 展示花园简易卡片
  showGardenSummary() {
    // 确保已展开
    if (!this.data.isExpanded) {
      this.expandDialog()
    }
    
    const plants = this.data.gardenPlants
    
    // 如果没有缓存数据，显示加载
    if (plants.length === 0) {
      this.addMessage('assistant', '🏡 正在加载花园数据...')
      this.loadGardenPlants().then(() => {
        this.renderGardenSummary()
      })
    } else {
      // 直接用缓存数据
      this.renderGardenSummary()
    }
  },

  // 用户信息授权相关函数
  closeAuthBar() {
    // 点击关闭登录提示条
    this.setData({ showAuthBar: false });
  },

  doNothing() {
    // 防止点击弹窗内容关闭
  },

  // authorizeUserInfo() {
  //   // 已移除：不再需要登录提示
  //   // getApp().getUserProfile()
  // },

  // skipAuth() {
  //   // 已移除
  //   // this.setData({ showAuthBar: false });
  // },

  // 渲染花园卡片
  renderGardenSummary() {
    const plants = this.data.gardenPlants

    if (plants.length === 0) {
      this.addMessage('assistant', '🏡 你的花园还空着\n\n去识别一盆植物，添加到花园吧～')
      return
    }

    // 计算待浇水
    const needWater = plants.filter(p => gardenService.calculateWaterStatus(p).needsWater)

    // 展示简易卡片（最多显示3个）
    const displayPlants = plants.slice(0, 3).map(p => ({
      name: p.name,
      status: gardenService.calculateWaterStatus(p).needsWater ? '💧需浇水' : '✅状态好'
    }))

    // 简洁的标题行
    let msg = `🏡 我的花园 · ${plants.length} 盆`
    if (needWater.length > 0) {
      msg += `\n💧 ${needWater.length} 盆待浇水`
    }

    this.addMessage('assistant', msg, null, displayPlants, { showGardenLink: true })
  }
})