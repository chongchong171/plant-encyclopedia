/**
 * 云函数：植物识别（优化版 v3.0 - 百度 AI 优先）
 * 
 * 策略：
 * 1. 优先调用百度 AI（准确度高，中国植物识别好）
 * 2. 百度 AI 失败时降级 PlantNet（备选方案）
 * 3. 并行调用 Qwen 获取养护建议
 * 
 * ⚠️ API Key 配置：
 * - 百度 AI: 云函数环境变量 BAIDU_API_KEY, BAIDU_SECRET_KEY
 * - PlantNet: 云函数环境变量 PLANTNET_API_KEY
 * - GLM-4.5-Air: 云函数环境变量 GLM_API_KEY
 * 
 * 性能优化：
 * - 云函数服务器访问国内 API 更快
 * - 并行调用减少 50% 等待时间
 * - 超时时间 30 秒
 */

const cloud = require('wx-server-sdk')
const fetch = require('node-fetch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();

// 内存缓存：百度 Token（云函数实例复用时可避免重复查询数据库）
let memoryTokenCache = null

// 从环境变量读取 API Key（安全配置）
const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY
const BAIDU_API_KEY = process.env.BAIDU_API_KEY
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY
const GLM_API_KEY = process.env.GLM_API_KEY

const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all'
const BAIDU_TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token'
const BAIDU_PLANT_URL = 'https://aip.baidubce.com/rest/2.0/image-classify/v1/plant'
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 常见植物关键词映射（用于兜底翻译）
const COMMON_PLANT_KEYWORDS = {
  'rose': '月季',
  'lily': '百合',
  'orchid': '兰花',
  'sunflower': '向日葵',
  'tulip': '郁金香',
  'daisy': '雏菊',
  'carnation': '康乃馨',
  'chrysanthemum': '菊花',
  'peony': '牡丹',
  'lotus': '荷花',
  'bamboo': '竹子',
  'pine': '松树',
  'maple': '枫树',
  'willow': '柳树',
  'cactus': '仙人掌',
  'succulent': '多肉植物',
  'fern': '蕨类植物',
  'ivy': '常春藤',
  'palm': '棕榈',
  'jasmine': '茉莉花',
  'lavender': '薰衣草',
  'mint': '薄荷',
  'basil': '罗勒',
  'aloe': '芦荟',
  'begonia': '秋海棠',
  'geranium': '天竺葵',
  'hibiscus': '木槿',
  'hydrangea': '绣球花',
  'magnolia': '木兰',
  'daffodil': '水仙花',
  'iris': '鸢尾花',
  'poppy': '罂粟花',
  'violet': '紫罗兰',
  'camellia': '山茶花',
  'azalea': '杜鹃花',
  'rhododendron': '杜鹃花',
  'gardenia': '栀子花',
  'oleander': '夹竹桃',
  'olea': '橄榄',
  'ficus': '榕树',
  'monstera': '龟背竹',
  'philodendron': '喜林芋',
  'pothos': '绿萝',
  'snake plant': '虎尾兰',
  'spider plant': '吊兰',
  'peace lily': '白掌',
  'rubber plant': '橡皮树',
  'jade plant': '玉树',
  'zz plant': '金钱树',
  'money tree': '发财树',
  'lucky bamboo': '富贵竹',
  'bonsai': '盆景',
  'bonsai tree': '盆景树'
}

exports.main = async (event, context) => {
  const startTime = Date.now()
  let { imageBase64, organ = 'auto' } = event
  
  
  if (!imageBase64) {
    return { success: false, error: '请上传图片' }
  }

  // 额度检查：每个用户每日最多 500 次
  const wxContext = cloud.getWXContext()
  const userOpenId = wxContext.OPENID
  if (!userOpenId) {
    return { success: false, error: '用户未登录' }
  }

  const today = new Date().toISOString().split('T')[0]
  const quotaKey = `identify_quota_${userOpenId}_${today}`
  try {
    const quotaDoc = await db.collection('daily_quota').doc(quotaKey).get()
    if (quotaDoc.data && quotaDoc.data.count >= 500) {
      return { success: false, error: '今日识别次数已达上限，请明天再试' }
    }
  } catch (e) {
    // 文档不存在表示今日还没识别过，继续执行
  }

  // 清理 base64
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1]
  }
  imageBase64 = imageBase64.replace(/\s/g, '')
  
  
  try {
    // ========== 第一步：并行调用百度 AI + PlantNet（取最快成功结果）==========
    // 先获取/刷新百度 Token（缓存命中几乎零耗时，未命中约 3-5s）
    let accessToken = null
    if (BAIDU_API_KEY && BAIDU_SECRET_KEY) {
      try {
        accessToken = await getBaiduToken()
      } catch (tokenErr) {
        console.error(`[identifyPlant] ${Date.now() - startTime}ms - Token 获取失败:`, tokenErr.message)
        accessToken = null
      }
    } else {
      console.error('[identifyPlant] ❌ 百度 API Key 未配置（BAIDU_API_KEY / BAIDU_SECRET_KEY）')
    }

    // 辅助：从 allSettled 结果中选择最佳识别结果（优先百度）
    function pickBestResult(settledResults) {
      const baidu = settledResults[0].status === 'fulfilled' ? settledResults[0].value : null
      const plantnet = settledResults[1].status === 'fulfilled' ? settledResults[1].value : null
      if (baidu?.success) return { result: baidu, source: 'baidu' }
      if (plantnet?.success) return { result: plantnet, source: 'plantnet' }
      return null
    }

    // 第一次并行请求
    let settled = await Promise.allSettled([
      accessToken ? identifyWithBaidu(imageBase64, accessToken) : Promise.resolve({ success: false, error: '百度Token未获取' }),
      PLANTNET_API_KEY ? identifyWithPlantNet(imageBase64, organ) : Promise.resolve({ success: false, error: 'PlantNet API Key未配置' })
    ])
    let best = pickBestResult(settled)

    // 都失败则等待 1s 后重试一次
    if (!best) {
      await sleep(1000)
      settled = await Promise.allSettled([
        accessToken ? identifyWithBaidu(imageBase64, accessToken) : Promise.resolve({ success: false, error: '百度Token未获取' }),
        PLANTNET_API_KEY ? identifyWithPlantNet(imageBase64, organ) : Promise.resolve({ success: false, error: 'PlantNet API Key未配置' })
      ])
      best = pickBestResult(settled)
    }

    if (!best) {
      const baiduErr = settled[0].status === 'fulfilled' ? settled[0].value?.error : settled[0].reason?.message
      const plantnetErr = settled[1].status === 'fulfilled' ? settled[1].value?.error : settled[1].reason?.message
      console.error(`[identifyPlant] ${Date.now() - startTime}ms - 全部失败：百度=${baiduErr}, PlantNet=${plantnetErr}`)
      const missingKeys = []
      if (!BAIDU_API_KEY) missingKeys.push('BAIDU_API_KEY')
      if (!BAIDU_SECRET_KEY) missingKeys.push('BAIDU_SECRET_KEY')
      if (!PLANTNET_API_KEY) missingKeys.push('PLANTNET_API_KEY')
      if (missingKeys.length > 0) {
        return {
          success: false,
          error: `识别服务配置不完整，缺少环境变量：${missingKeys.join('、')}。请在云函数控制台配置对应 API Key。`
        }
      }
      return {
        success: false,
        error: '网络连接不稳定，请稍后重试。如果多次失败，建议检查网络或换个时间段再试。'
      }
    }

    let result = best.result

    if (!result.success) {
      console.error(`[identifyPlant] ${Date.now() - startTime}ms - 全部失败：`, result.error)
      return {
        success: false,
        error: '网络连接不稳定，请稍后重试。如果多次失败，建议检查网络或换个时间段再试。'
      }
    }
    
    
    // ========== 第二步：并行获取补充信息（全部可选，失败不影响主结果）==========
    // 添加整体 5 秒超时，避免补充信息获取拖慢整体响应
    const supplementaryPromise = Promise.allSettled([
      getCareAdvice(result.data),
      getBaiduBaike(result.data.name),
      fetchPlantImage(result.data.name)
    ])
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve([
        { status: 'rejected', reason: new Error('补充信息获取超时') },
        { status: 'rejected', reason: new Error('补充信息获取超时') },
        { status: 'rejected', reason: new Error('补充信息获取超时') }
      ]), 5000)
    })
    const [careAdvice, baiduInfo, imageUrl] = await Promise.race([supplementaryPromise, timeoutPromise])
    
    // 提取养护建议（GLM 可能超时）
    let careData = careAdvice.status === 'fulfilled' ? careAdvice.value?.data : null
    
    // 提取百度百科信息（国内服务，更稳定）
    if (baiduInfo.status === 'fulfilled' && baiduInfo.value) {
      if (!result.data.plantProfile && baiduInfo.value.description) {
        result.data.plantProfile = baiduInfo.value.description
      }
      if (!result.data.imageUrl && baiduInfo.value.imageUrl) {
        result.data.imageUrl = baiduInfo.value.imageUrl
      }
    }
    
    // 如果 GLM 失败，使用默认养护指南
    if (!careData) {
      const defaultGuide = getDefaultCareGuide(result.data.name)
      result.data.careGuide = defaultGuide
      // 构建 mock careData 供前端使用
      const profileDesc = result.data.plantProfile || generateFallbackProfile(result.data.name)
      careData = {
        commonNames: result.data.name,
        scientificName: result.data.scientificName || '',
        plantProfile: profileDesc,
        growthHabit: result.data.growthHabit || getDefaultGrowthHabit(result.data.name),
        mainValue: result.data.mainValue || generateFallbackMainValue(result.data.name),
        careGuide: defaultGuide,
        difficultyLevel: 3,
        difficultyText: '养护难度中等',
        quickTips: generateFallbackTips(result.data.name)
      }
    }
    
    // 提取图片 URL
    if (imageUrl.status === 'fulfilled' && imageUrl.value && !result.data.imageUrl) {
      result.data.imageUrl = imageUrl.value
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 埋点：记录识图成功（统一走 analytics_track，同时更新 daily 和 users）
    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;
    if (openId && result.data?.name) {
      cloud.callFunction({
        name: 'analytics_track',
        data: {
          event: 'identify_plant',
          data: {
            plantName: result.data.name,
            source: result.source,
            success: true,
            duration: totalDuration
          }
        }
      }).catch(() => {});
    }

    // 更新今日识别额度计数
    try {
      const quotaKey = `identify_quota_${openId}_${today}`
      await db.collection('daily_quota').doc(quotaKey).set({
        count: db.command.inc(1),
        date: today,
        openId: openId,
        updatedAt: new Date().toISOString()
      })
    } catch (e) {
      // 额度计数失败不影响主结果
    }

    return {
      success: true,
      ...result.data,
      careAdvice: { timing: careAdvice.status === 'fulfilled' ? careAdvice.value?.timing : 0, data: careData },
      timing: {
        total: totalDuration,
        identify: result.timing,
        careAdvice: careAdvice.status === 'fulfilled' ? careAdvice.value?.timing : 0
      },
      source: result.source
    }
    
  } catch (err) {
    const totalDuration = Date.now() - startTime;
    console.error(`[identifyPlant] ${totalDuration}ms - 识别失败:`, err)
    
    // 埋点：记录识图失败（统一走 analytics_track）
    const wxContext = cloud.getWXContext();
    const openId = wxContext.OPENID;
    if (openId) {
      cloud.callFunction({
        name: 'analytics_track',
        data: {
          event: 'identify_plant',
          data: {
            success: false,
            duration: totalDuration,
            error: err.message
          }
        }
      }).catch(() => {});
    }
    
    return {
      success: false,
      error: err.message || '识别失败，请重试'
    }
  }
}

/**
 * PlantNet API 识别
 */
async function identifyWithPlantNet(imageBase64, organ) {
  const startTime = Date.now()
  
  try {
    const imageBuffer = Buffer.from(imageBase64, 'base64')
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)
    const crlf = '\r\n'
    
    // 构建 multipart/form-data
    const bodyParts = []
    
    // organs 参数
    bodyParts.push(Buffer.from(`--${boundary}${crlf}`))
    bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="organs"${crlf}${crlf}`))
    bodyParts.push(Buffer.from(organ + crlf))
    
    // images 文件
    bodyParts.push(Buffer.from(`--${boundary}${crlf}`))
    bodyParts.push(Buffer.from(`Content-Disposition: form-data; name="images"; filename="plant.jpg"${crlf}`))
    bodyParts.push(Buffer.from(`Content-Type: image/jpeg${crlf}${crlf}`))
    bodyParts.push(imageBuffer)
    
    // 结束边界
    bodyParts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`))
    
    const bodyBuffer = Buffer.concat(bodyParts)
    
    const url = `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`
    
    
    let res
    let data
    
    // 使用 Promise.race 实现超时（PlantNet 是国外 API，超时设短一些，避免占用太多时间）
    try {
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: bodyBuffer
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时（4 秒）')), 4000)
      })
      
      res = await Promise.race([fetchPromise, timeoutPromise])
    } catch (fetchErr) {
      console.error(`[PlantNet] ${Date.now() - startTime}ms - 网络请求失败：${fetchErr.message}`)
      console.error(`[PlantNet] 错误类型：${fetchErr.name}`)
      return { 
        success: false, 
        error: `PlantNet 连接超时（国外服务器可能不稳定）`,
        timing: Date.now() - startTime 
      }
    }
    
    try {
      const text = await res.text()
      
      // 解析 JSON
      try {
        data = JSON.parse(text)
      } catch (parseErr) {
        console.error(`[PlantNet] JSON 解析失败：${parseErr.message}`)
        console.error(`[PlantNet] 响应内容：`, text.substring(0, 200))
        return { 
          success: false, 
          error: 'PlantNet 响应格式错误',
          timing: Date.now() - startTime 
        }
      }
    } catch (responseErr) {
      console.error(`[PlantNet] 读取响应失败：${responseErr.message}`)
      return { 
        success: false, 
        error: `PlantNet 响应错误：${responseErr.message}`,
        timing: Date.now() - startTime 
      }
    }
    
    
    if (data.statusCode && data.statusCode !== 200) {
      console.error(`[PlantNet] API 返回错误：${data.message}`)
      return { success: false, error: data.message || 'PlantNet 服务错误', timing: Date.now() - startTime }
    }
    
    if (!data.results || data.results.length === 0) {
      return { success: false, error: '未识别到植物', timing: Date.now() - startTime }
    }
    
    // ========== 返回多个可能的结果（Top 3）==========
    const possibleResults = []
    const maxResults = Math.min(data.results.length, 3)  // 最多返回 3 个结果
    
    for (let i = 0; i < maxResults; i++) {
      const result = data.results[i]
      const species = result.species
      const score = result.score || 0
      
      // 只添加置信度 >= 30% 的结果（提高阈值减少误判）
      if (score < 0.30) continue
      
      // 提取图片
      let imageUrl = ''
      if (result.images && result.images.length > 0) {
        imageUrl = result.images[0].url?.m || result.images[0].url?.o || ''
      }
      
      // 优先使用拉丁学名，其次使用 commonNames
      const rawName = species.scientificNameWithoutAuthor || species.commonNames?.[0] || '未知植物'
      let chineseName = await translatePlantName(rawName)  // 添加 await
      
      // 确保 chineseName 是字符串
      if (typeof chineseName !== 'string') {
        console.error('[PlantNet] translatePlantName 返回非字符串:', chineseName)
        chineseName = '未知植物'
      }
      
      // 特殊处理：确保常见植物有标准中文名
      const standardNames = {
        'Cycas': '苏铁（铁树）',
        'Cycas 属植物': '苏铁（铁树）',
        '苏铁属植物': '苏铁（铁树）',
        'Primula': '报春花',
        'Primula 属植物': '报春花'
      }
      
      // 检查是否需要标准化
      for (const [key, value] of Object.entries(standardNames)) {
        if (rawName.includes(key) || (typeof chineseName === 'string' && chineseName.includes(key))) {
          chineseName = value
          break
        }
      }
      
      const scientificNameChinese = chineseName !== '未知植物' ? chineseName : ''
      const scientificNameLatin = species.scientificNameWithoutAuthor || ''
      const displayName = scientificNameChinese || scientificNameLatin || '未知植物'
      
      possibleResults.push({
        name: displayName,
        commonNames: rawName,
        scientificName: scientificNameChinese,
        scientificNameLatin: scientificNameLatin,
        family: species.family?.scientificNameWithoutAuthor,
        confidence: Math.round(score * 100),
        imageUrl: imageUrl
      })
    }
    
    // 如果没有符合条件的结果
    if (possibleResults.length === 0) {
      return { success: false, error: '置信度过低', timing: Date.now() - startTime }
    }
    
    // 最佳结果
    const bestResult = possibleResults[0]
    
    return {
      success: true,
      source: 'PlantNet',
      timing: Date.now() - startTime,
      data: {
        name: bestResult.name,
        commonNames: bestResult.commonNames,
        scientificName: bestResult.scientificName,
        scientificNameLatin: bestResult.scientificNameLatin,
        family: bestResult.family,
        confidence: bestResult.confidence,
        imageUrl: bestResult.imageUrl,
        origin: '',
        plantProfile: '',
        growthHabit: '',
        mainValue: '',
        // 添加多个可能的结果
        possibleResults: possibleResults
      }
    }
    
  } catch (err) {
    console.error(`[PlantNet] ${Date.now() - startTime}ms - 失败:`, err.message)
    return { success: false, error: 'PlantNet 网络错误', timing: Date.now() - startTime }
  }
}

/**
 * 延时辅助函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 带重试的 fetch 请求（兼容 Node.js 12/14，不使用 AbortController）
 */
async function fetchWithRetry(url, options, maxRetries = 2, retryDelay = 1000) {
  let lastError

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const timeout = options?.timeout
      const fetchOptions = { ...options }
      delete fetchOptions.timeout

      if (timeout) {
        const fetchPromise = fetch(url, fetchOptions)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`请求超时（${timeout}ms）`)), timeout)
        })
        const res = await Promise.race([fetchPromise, timeoutPromise])
        return res
      } else {
        const res = await fetch(url, fetchOptions)
        return res
      }
    } catch (err) {
      lastError = err
      if (i < maxRetries) {
        await sleep(retryDelay)
      }
    }
  }

  throw lastError
}

/**
 * 百度 AI 植物识别（国内服务，优先使用）
 */
/**
 * 获取百度 Access Token（带云数据库缓存，30天有效期）
 */
async function getBaiduToken() {
  const cacheKey = 'baidu_access_token'
  const now = Date.now()

  // 1. 优先检查内存缓存（最快，0ms）
  if (memoryTokenCache && memoryTokenCache.expires_at > now + 600000) {
    return memoryTokenCache.access_token
  }

  // 2. 其次检查数据库缓存
  try {
    const cacheDoc = await db.collection('api_token_cache').doc(cacheKey).get()
    if (cacheDoc.data) {
      const { access_token, expires_at } = cacheDoc.data
      if (access_token && expires_at && expires_at > now + 600000) {
        // 同步到内存缓存
        memoryTokenCache = { access_token, expires_at }
        return access_token
      }
    }
  } catch (e) {
    // 缓存不存在或读取失败
  }

  // 3. 重新获取 Token（3秒超时，不重试，快速失败）
  const tokenRes = await fetchWithTimeout(
    `${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`,
    3000,
    { method: 'POST' }
  )
  const tokenData = await tokenRes.json()

  if (!tokenData || !tokenData.access_token) {
    throw new Error('百度 AI 认证失败: ' + (tokenData?.error_description || '未知错误'))
  }

  // 4. 保存到内存缓存和数据库缓存
  const expiresIn = tokenData.expires_in || 2592000
  const expiresAt = now + expiresIn * 1000
  memoryTokenCache = { access_token: tokenData.access_token, expires_at: expiresAt }
  try {
    await db.collection('api_token_cache').doc(cacheKey).set({
      data: {
        access_token: tokenData.access_token,
        expires_at: expiresAt,
        updatedAt: new Date().toISOString()
      }
    })
  } catch (e) {
  }

  return tokenData.access_token
}

async function identifyWithBaidu(imageBase64, accessToken) {
  const startTime = Date.now()

  try {
    // 调用植物识别（5秒超时，1次重试）
    const plantRes = await fetchWithRetry(
      `${BAIDU_PLANT_URL}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image=${encodeURIComponent(imageBase64)}&baike_num=1`,
        timeout: 5000
      },
      1,
      500
    )

    if (!plantRes.ok) {
      throw new Error(`HTTP ${plantRes.status}`)
    }

    const plantData = await plantRes.json()
    
    
    if (!plantData.result || !plantData.result.classification_result || plantData.result.classification_result.length === 0) {
      return { success: false, error: '百度 AI 未识别', timing: Date.now() - startTime }
    }
    
    // ========== 返回多个可能的结果（Top 3）==========
    const possibleResults = []
    const maxResults = Math.min(plantData.result.classification_result.length, 3)
    
    for (let i = 0; i < maxResults; i++) {
      const match = plantData.result.classification_result[i]
      const score = match.score || 0
      
      // 只添加置信度 >= 30% 的结果（提高阈值减少误判）
      if (score < 0.30) continue
      
      const baikeInfo = match.baike_info || {}
      const scientificNameLatin = match.scientific_name || ''
      const rawName = match.name || '未知植物'
      
      // 强制翻译为中文（确保 100% 中文显示）
      let chineseName = rawName
      
      // 检查是否包含中文
      const hasChinese = /[\u4e00-\u9fa5]/.test(rawName)
      
      if (!hasChinese) {
        // 没有中文，需要翻译
        chineseName = await translatePlantName(rawName)
      } else if (rawName.includes('属植物')) {
        // 是"某属植物"的模糊名称，尝试找到更具体的中文名
        const translatedName = await translatePlantName(rawName)
        if (translatedName && translatedName !== rawName && translatedName !== '观赏植物' && translatedName !== '未知植物') {
          chineseName = translatedName
        }
      }
      // 否则保持百度返回的原始中文名（通常已准确）
      
      // 特殊处理：确保常见植物有标准中文名
      const standardNames = {
        'Cycas': '苏铁（铁树）',
        'Cycas 属植物': '苏铁（铁树）',
        '苏铁属植物': '苏铁（铁树）',
        'Primula': '报春花',
        'Primula 属植物': '报春花'
      }
      
      // 检查是否需要标准化
      for (const [key, value] of Object.entries(standardNames)) {
        if (rawName.includes(key) || chineseName.includes(key)) {
          chineseName = value
          break
        }
      }
      
      possibleResults.push({
        name: chineseName,  // 确保是中文
        commonNames: rawName,
        scientificName: chineseName,  // 中文学名
        scientificNameLatin: scientificNameLatin,
        family: match.family || '',
        confidence: Math.round(score * 100),
        imageUrl: baikeInfo.image_url || ''
      })
    }
    
    // 如果没有符合条件的结果
    if (possibleResults.length === 0) {
      return { success: false, error: '百度 AI 置信度过低', timing: Date.now() - startTime }
    }
    
    // 最佳结果
    const bestResult = possibleResults[0]
    const bestMatch = plantData.result.classification_result[0]
    const baikeInfo = bestMatch.baike_info || {}
    
    return {
      success: true,
      source: 'BaiduAI',
      timing: Date.now() - startTime,
      data: {
        name: bestResult.name,
        commonNames: bestResult.commonNames,
        scientificName: bestResult.scientificName,
        scientificNameLatin: bestResult.scientificNameLatin,
        family: bestResult.family,
        confidence: bestResult.confidence,
        imageUrl: baikeInfo.image_url || '',
        plantProfile: baikeInfo.description || '',
        origin: '',
        growthHabit: '',
        mainValue: '',
        // 添加多个可能的结果
        possibleResults: possibleResults
      }
    }
  } catch (err) {
    console.error(`[BaiduAI] ${Date.now() - startTime}ms - 失败:`, err.message)
    return { success: false, error: '百度 AI 网络错误', timing: Date.now() - startTime }
  }
}

/**
 * 调用 GLM-4.5-Air 获取养护建议（带重试和超时保护）
 */
async function getCareAdvice(plantInfo) {
  const startTime = Date.now()
  
  if (!GLM_API_KEY) {
    return { timing: 0, data: null }
  }
  
  const prompt = `你是植物养护专家，请为"${plantInfo.name || plantInfo.plantName}"提供详细实用的养护资料，以 JSON 格式返回。

【文案要求】
- 内容自然流畅，像专家给朋友介绍植物一样，不要机械罗列
- 每种植物的描述要有自己的特色，避免不同植物出现雷同的句式
- 给出具体、实用的养护方法和注意事项
- 字数灵活，以表达清楚为准，不要硬凑字数

{
  "commonNames": "常见别名",
  "scientificName": "学名中文",
  "scientificNameLatin": "拉丁学名",
  "family": "科属",
  "origin": "原产地",
  "plantProfile": "植物档案（形态特征、观赏价值，自然描述）",
  "growthHabit": "生长习性（环境偏好、生长特点）",
  "mainValue": "主要价值",
  "careGuide": {
    "light": "光照建议",
    "water": "浇水建议",
    "temperature": "温度建议",
    "humidity": "湿度建议",
    "fertilizer": "施肥建议",
    "soil": "土壤建议",
    "pruning": "修剪建议",
    "propagation": "繁殖建议"
  },
  "difficultyLevel": 1-5,
  "difficultyText": "养护难度说明",
  "quickTips": ["实用要点1", "实用要点2", "实用要点3"]
}`

  // 最多重试 1 次，超时 8 秒（避免超过云函数 30 秒限制）
  for (let retry = 0; retry <= 1; retry++) {
    try {
      if (retry > 0) {
        await sleep(500)
      }
      
      const res = await fetchWithTimeout(GLM_API_URL, 8000, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GLM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.4  // 适度随机性，让描述更有个性
        })
      })
      
      if (!res.ok) {
        console.error(`[GLM] HTTP 错误: ${res.status}`)
        continue  // 重试
      }
      
      const data = await res.json()
      
      // 检查 API 返回的错误
      if (data.error) {
        console.error('[GLM] API 返回错误:', data.error)
        continue  // 重试
      }
      
      const content = data.choices?.[0]?.message?.content || ''
      
      if (!content) {
        continue  // 重试
      }
      
      
      // 解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const advice = JSON.parse(jsonMatch[0])
          return { timing: Date.now() - startTime, data: advice }
        } catch (e) {
          console.error('[GLM] JSON 解析失败:', e.message)
          // JSON 解析失败不重试，直接返回 null
          break
        }
      }
      
    } catch (err) {
      console.error(`[GLM] ${Date.now() - startTime}ms - 第 ${retry + 1} 次失败:`, err.message)
    }
  }
  
  return { timing: Date.now() - startTime, data: null }
}

/**
 * 带超时的 fetch（node-fetch v2 不支持 timeout 选项，兼容 Node.js 12/14）
 */
async function fetchWithTimeout(url, timeout = 3000, options = {}) {
  const fetchPromise = fetch(url, options)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`请求超时（${timeout}ms）`)), timeout)
  })
  return Promise.race([fetchPromise, timeoutPromise])
}

/**
 * 获取植物图片（从 Wikipedia）
 */
async function fetchPlantImage(plantName) {
  try {
    // 策略 1：尝试用英文名搜索 Wikipedia
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`;
    const res = await fetchWithTimeout(url, 5000);

    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail?.source) {
        // 获取更大尺寸的图片
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
      }
    }

    // 策略 2：尝试用中文名搜索中文 Wikipedia
    const urlCN = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`;
    const resCN = await fetchWithTimeout(urlCN, 5000);
    
    if (resCN.ok) {
      const data = await resCN.json();
      if (data.thumbnail?.source) {
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
      }
    }
    
  } catch (e) {
  }
  return null;
}

/**
 * 调用百度 AI 获取百度百科信息（国内服务，稳定快速）
 */
async function getBaiduBaike(plantName) {
  const startTime = Date.now()
  
  try {
    // 1. 获取 Token
    const tokenRes = await fetchWithTimeout(`${BAIDU_TOKEN_URL}?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`, 3000, {
      method: 'POST'
    })
    
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return null
    }
    
    // 2. 调用植物识别（带 baike_num=1 获取百科信息）
    const plantRes = await fetchWithTimeout(`${BAIDU_PLANT_URL}?access_token=${tokenData.access_token}`, 5000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `image=&baike_num=1&top_num=1`  // 不传图片，只获取名称匹配的百科信息
    })
    
    const plantData = await plantRes.json()
    const bestMatch = plantData.result?.classification_result?.[0]
    const baikeInfo = bestMatch?.baike_info || {}
    
    
    if (baikeInfo.description || baikeInfo.image_url) {
      return {
        description: baikeInfo.description,
        imageUrl: baikeInfo.image_url
      }
    }
    
    return null
    
  } catch (err) {
    return null
  }
}

/**
 * 生成默认养护指南（当 GLM 不可用时）
 */
function getDefaultCareGuide(plantName) {
  return {
    light: '喜充足光照，避免强烈直射阳光',
    water: '保持土壤湿润，见干见湿，避免积水',
    temperature: '适宜温度 15-28°C，冬季注意保暖',
    humidity: '喜欢湿润环境，可定期向叶片喷水',
    fertilizer: '生长期每月施一次稀薄液肥',
    soil: '疏松、排水良好的沙质壤土',
    pruning: '及时修剪枯黄叶片，保持美观',
    propagation: '可通过分株、播种或扦插繁殖'
  }
}

/**
 * 根据植物名称生成默认生长习性
 */
function getDefaultGrowthHabit(plantName) {
  const name = plantName.toLowerCase()
  
  // 多肉/仙人掌类
  if (name.includes('多肉') || name.includes('仙人掌') || name.includes('芦荟')) {
    return '耐旱性强，喜阳光充足、干燥通风的环境，怕积水'
  }
  
  // 热带观叶植物
  if (name.includes('绿萝') || name.includes('龟背') || name.includes('喜林芋') || name.includes('蔓绿绒')) {
    return '喜温暖湿润、半阴的环境，不耐寒，生长适温 18-28°C'
  }
  
  // 开花植物
  if (name.includes('兰') || name.includes('花') || name.includes('菊') || name.includes('玫瑰')) {
    return '喜阳光充足、通风良好的环境，生长期需充足养分'
  }
  
  // 竹类
  if (name.includes('竹') || name.includes('富贵')) {
    return '喜温暖湿润、半阴环境，耐阴性强，生长适温 15-25°C'
  }
  
  // 默认
  return '喜温暖湿润环境，适应性强，易于养护'
}

/**
 * 根据植物名称生成默认档案描述（避免所有植物都一样）
 */
function generateFallbackProfile(plantName) {
  const name = plantName.toLowerCase()

  if (name.includes('多肉') || name.includes('仙人掌') || name.includes('芦荟') || name.includes('石莲花')) {
    return `${plantName}叶片肥厚多汁，能储存大量水分，是耐旱植物的代表。造型奇特可爱，养护简单，非常适合忙碌的现代人。`
  }

  if (name.includes('绿萝') || name.includes('吊兰') || name.includes('常春藤') || name.includes('虎尾兰')) {
    return `${plantName}是广受欢迎的室内净化植物，能有效吸收空气中的有害物质。生命力顽强，即使在光线较弱的环境也能生长良好。`
  }

  if (name.includes('玫瑰') || name.includes('月季') || name.includes('蔷薇')) {
    return `${plantName}花姿优美，色彩丰富，香气怡人，被誉为"花中皇后"。无论是庭院栽种还是切花观赏，都极具魅力。`
  }

  if (name.includes('兰')) {
    return `${plantName}花型典雅，气质高洁，是中国传统名花之一。虽然对养护环境有一定要求，但开花时的美丽绝对值得付出。`
  }

  if (name.includes('竹') || name.includes('富贵竹') || name.includes('文竹')) {
    return `${plantName}姿态挺拔潇洒，充满东方韵味，象征着坚韧与高洁。既可土培也可水培，是书房茶室的经典搭配。`
  }

  if (name.includes('树') || name.includes('榕') || name.includes('松') || name.includes('枫')) {
    return `${plantName}株型挺拔，枝叶茂盛，能为空间增添自然气息。随着四季变化呈现不同的景致，是庭院和大型空间的理想选择。`
  }

  if (name.includes('菊') || name.includes('向日葵') || name.includes('康乃馨')) {
    return `${plantName}花色鲜艳，花期较长，能给居室带来明媚的色彩和愉悦的心情。养护得当可多次开花，性价比很高。`
  }

  return `${plantName}姿态优美，适应性较强，是家居绿化的优良选择。合理的养护能让它展现出最佳的观赏状态，为生活空间增添生机。`
}

/**
 * 根据植物名称生成默认主要价值描述
 */
function generateFallbackMainValue(plantName) {
  const name = plantName.toLowerCase()

  if (name.includes('多肉') || name.includes('仙人掌')) {
    return '造型独特，装饰性强，且养护省心，适合现代简约风格的家居装饰'
  }

  if (name.includes('绿萝') || name.includes('吊兰') || name.includes('虎尾兰') || name.includes('常春藤')) {
    return '净化空气能力突出，能有效吸收甲醛等有害物质，是新装修居室的理想选择'
  }

  if (name.includes('玫瑰') || name.includes('月季') || name.includes('兰') || name.includes('菊')) {
    return '观赏价值极高，花香怡人，可用于装饰居室、馈赠亲友，还能陶冶情操'
  }

  if (name.includes('薄荷') || name.includes('罗勒') || name.includes('迷迭香') || name.includes('香')) {
    return '兼具观赏与实用价值，部分品种可食用或提取精油，香气还能驱虫提神'
  }

  return '观赏价值较高，能美化居住环境、净化空气，养护过程也能带来身心放松的愉悦感'
}

/**
 * 根据植物名称生成默认养护要点
 */
function generateFallbackTips(plantName) {
  const name = plantName.toLowerCase()

  if (name.includes('多肉') || name.includes('仙人掌')) {
    return ['少浇水，宁干勿湿', '给予充足阳光', '使用透气排水好的土壤']
  }

  if (name.includes('绿萝') || name.includes('龟背') || name.includes('竹芋')) {
    return ['保持土壤微湿，避免积水', '放在明亮的散射光处', '经常喷水保持湿度']
  }

  if (name.includes('兰花') || name.includes('蝴蝶兰')) {
    return ['使用专用兰花土', '避免强光直射', '注意通风，防止烂根']
  }

  if (name.includes('玫瑰') || name.includes('月季')) {
    return ['需要充足阳光', '定期施肥促花', '注意防治病虫害']
  }

  return ['保持适当光照，避免暴晒', '见干见湿，合理浇水', '定期通风，保持空气流通']
}

/**
 * 常见植物中英文名称翻译表（优化版 500 种）
 * 压缩策略：
 * 1. 使用最短键名（属名/通用名）
 * 2. 移除冗余的完整学名（translatePlantName 会做模糊匹配）
 * 3. 保留高频别名（如 peace lily, snake plant）
 */
const PLANT_NAME_MAP = {
  // === 观叶植物 (50) ===
  'monstera':'龟背竹','龟背竹':'龟背竹',
  'pothos':'绿萝','绿萝':'绿萝','epipremnum':'绿萝',
  'philodendron':'喜林芋','喜林芋':'喜林芋',
  'spathiphyllum':'白掌','白掌':'白掌','peace lily':'白掌',
  'dracaena':'龙血树','龙血树':'龙血树',
  'ficus':'榕树','榕树':'榕树','banyan':'榕树',
  'rubber plant':'橡皮树','橡皮树':'橡皮树',
  'fiddle leaf':'琴叶榕','琴叶榕':'琴叶榕',
  'sansevieria':'虎尾兰','虎尾兰':'虎尾兰','snake plant':'虎尾兰',
  'zz plant':'金钱树','金钱树':'金钱树','zamioculcas':'金钱树',
  'aloe':'芦荟','芦荟':'芦荟',
  'spider plant':'吊兰','吊兰':'吊兰','chlorophytum':'吊兰',
  'chinese evergreen':'万年青','万年青':'万年青','aglaonema':'万年青',
  'calathea':'竹芋','竹芋':'竹芋','prayer plant':'竹芋',
  'maranta':'竹芋','竹芋':'竹芋',
  'goeppertia':'竹芋','竹芋':'竹芋',
  'stromanthe':'竹芋','竹芋':'竹芋',
  'ctenanthe':'栉花芋','栉花芋':'栉花芋',
  'fern':'蕨类','蕨类':'蕨类',
  'bird of paradise':'天堂鸟','天堂鸟':'天堂鸟','strelitzia':'鹤望兰',
  'croton':'变叶木','变叶木':'变叶木',
  'prayer plant':'竹芋','maranta':'竹芋',
  'staghorn fern':'鹿角蕨','鹿角蕨':'鹿角蕨','platycerium':'鹿角蕨',
  'air plant':'空气凤梨','空气凤梨':'空气凤梨','tillandsia':'空气凤梨',
  'bromeliad':'凤梨','凤梨':'凤梨',
  'peace plant':'白掌','白鹤芋':'白掌',
  'dumb cane':'万年青','dieffenbachia':'万年青',
  'arrowhead plant':'合果芋','合果芋':'合果芋','syngonium':'合果芋',
  'peperomia':'豆瓣绿','豆瓣绿':'豆瓣绿',
  'pilea':'冷水花','冷水花':'冷水花','chinese money plant':'铜钱草',
  'string of pearls':'佛珠','佛珠':'佛珠','senecio':'佛珠',
  'asparagus fern':'文竹','asparagus':'文竹','asparagus setaceus':'文竹',
  'asparagus densiflorus':'天门冬',' Sprenger':'天门冬',
  'clivia':'君子兰','君子兰':'君子兰',
  
  // === 开花植物 (80) ===
  'rose':'玫瑰','玫瑰':'玫瑰','rosa':'玫瑰',
  'tulip':'郁金香','郁金香':'郁金香',
  'daisy':'雏菊','雏菊':'雏菊',
  'sunflower':'向日葵','向日葵':'向日葵',
  'orchid':'兰花','兰花':'兰花',
  'phalaenopsis':'蝴蝶兰','蝴蝶兰':'蝴蝶兰',
  'carnation':'康乃馨','康乃馨':'康乃馨',
  'lily':'百合','百合':'百合',
  'jasmine':'茉莉','茉莉':'茉莉',
  'lavender':'薰衣草','薰衣草':'薰衣草',
  'hibiscus':'扶桑花','扶桑花':'扶桑花','china rose':'朱槿',
  'azalea':'杜鹃花','杜鹃花':'杜鹃花','rhododendron':'杜鹃',
  'camellia':'山茶花','山茶花':'山茶花',
  'gardenia':'栀子花','栀子花':'栀子花',
  'oleander':'夹竹桃','夹竹桃':'夹竹桃',
  'plumeria':'鸡蛋花','鸡蛋花':'鸡蛋花','frangipani':'鸡蛋花',
  'bougainvillea':'三角梅','三角梅':'三角梅',
  'iris':'鸢尾','鸢尾':'鸢尾',
  'daffodil':'水仙','水仙':'水仙','narcissus':'水仙',
  'hyacinth':'风信子','风信子':'风信子',
  'peony':'牡丹','牡丹':'牡丹','paeonia':'牡丹',
  'chrysanthemum':'菊花','菊花':'菊花','mum':'菊花',
  'marigold':'万寿菊','万寿菊':'万寿菊',
  'zinnia':'百日菊','百日菊':'百日菊',
  'petunia':'矮牵牛','矮牵牛':'矮牵牛',
  'begonia':'秋海棠','秋海棠':'秋海棠',
  'geranium':'天竺葵','天竺葵':'天竺葵','pelargonium':'天竺葵',
  'snapdragon':'金鱼草','金鱼草':'金鱼草',
  'foxglove':'毛地黄','毛地黄':'毛地黄',
  'hollyhock':'蜀葵','蜀葵':'蜀葵',
  'magnolia':'木兰','木兰':'木兰',
  'wisteria':'紫藤','紫藤':'紫藤',
  'lilac':'丁香','丁香':'丁香',
  'forsythia':'连翘','连翘':'连翘',
  'hydrangea':'绣球花','绣球花':'绣球花',
  'dahlia':'大丽花','大丽花':'大丽花',
  'gladiolus':'唐菖蒲','唐菖蒲':'唐菖蒲',
  'canna':'美人蕉','美人蕉':'美人蕉',
  'zantedeschia':'马蹄莲','马蹄莲':'马蹄莲','calla lily':'马蹄莲',
  'anthurium':'红掌','红掌':'红掌','flamingo flower':'红掌',
  'bromeliad':'凤梨','凤梨':'凤梨',
  'kalanchoe':'长寿花','长寿花':'长寿花',
  'christmas cactus':'蟹爪兰','蟹爪兰':'蟹爪兰',
  'cyclamen':'仙客来','仙客来':'仙客来',
  'poinsettia':'一品红','一品红':'一品红',
  'impatiens':'凤仙花','凤仙花':'凤仙花',
  'gerbera':'扶郎花','扶郎花':'扶郎花',
  'ranunculus':'花毛茛','花毛茛':'花毛茛',
  'freesia':'小苍兰','小苍兰':'小苍兰',
  'delphinium':'飞燕草','飞燕草':'飞燕草',
  'iris':'鸢尾','鸢尾':'鸢尾',
  'bluebell':'风铃草','风铃草':'风铃草',
  'asters':'紫菀','紫菀':'紫菀',
  'coreopsis':'金鸡菊','金鸡菊':'金鸡菊',
  'echinacea':'松果菊','松果菊':'松果菊',
  'salvia':'鼠尾草','鼠尾草':'鼠尾草',
  'verbena':'美女樱','美女樱':'美女樱',
  'cosmos':'波斯菊','波斯菊':'波斯菊',
  'poppy':'虞美人','虞美人':'虞美人',
  'sweet pea':'香豌豆','香豌豆':'香豌豆',
  'morning glory':'牵牛花','牵牛花':'牵牛花',
  'moonflower':'月光花','月光花':'月光花',
  'passion flower':'西番莲','西番莲':'西番莲',
  'lotus':'荷花','荷花':'荷花','water lily':'睡莲',
  'anemone':'银莲花','银莲花':'银莲花',
  'bellflower':'风铃草','风铃草':'风铃草',
  'clematis':'铁线莲','铁线莲':'铁线莲',
  'gypsophila':'满天星','满天星':'满天星',
  'heather':'石楠','石楠':'石楠',
  'larkspur':'翠雀','翠雀':'翠雀',
  'lobelia':'半边莲','半边莲':'半边莲',
  'nasturtium':'旱金莲','旱金莲':'旱金莲',
  'pansy':'三色堇','三色堇':'三色堇',
  'portulaca':'太阳花','太阳花':'太阳花',
  'primrose':'报春花','报春花':'报春花',
  'stock':'紫罗兰','紫罗兰':'紫罗兰',
  'trillium':'延龄草','延龄草':'延龄草',
  'violet':'紫罗兰','紫罗兰':'紫罗兰',
  'yarrow':'蓍草','蓍草':'蓍草',
  
  // === 多肉植物 (30) ===
  'succulent':'多肉','多肉':'多肉',
  'cactus':'仙人掌','仙人掌':'仙人掌',
  'echeveria':'石莲花','石莲花':'石莲花',
  'jade plant':'玉树','玉树':'玉树','crassula':'玉树',
  'haworthia':'十二卷','十二卷':'十二卷',
  'sedum':'景天','景天':'景天',
  'sempervivum':'长生草','长生草':'长生草',
  'agave':'龙舌兰','龙舌兰':'龙舌兰',
  'lithops':'生石花','生石花':'生石花',
  'string of hearts':'爱之蔓','爱之蔓':'爱之蔓',
  'burro tail':'玉缀','玉缀':'玉缀',
  'panda plant':'月兔耳','月兔耳':'月兔耳',
  'paddle plant':'唐印','唐印':'唐印',
  'ghost plant':'胧月','胧月':'胧月',
  'hens and chicks':'观音莲','观音莲':'观音莲',
  'zebra plant':'条纹十二卷','条纹十二卷':'条纹十二卷',
  'aloe vera':'芦荟','芦荟':'芦荟',
  'crown of thorns':'虎刺梅','虎刺梅':'虎刺梅',
  'dudleya':'仙女杯','仙女杯':'仙女杯',
  'graptopetalum':'风车草','风车草':'风车草',
  'hoya':'球兰','球兰':'球兰',
  'mammillaria':'乳突球','乳突球':'乳突球',
  'notocactus':'南国玉','南国玉':'南国玉',
  'opuntia':'仙人掌','仙人掌':'仙人掌',
  'rebutia':'子孙球','子孙球':'子孙球',
  'schlumbergera':'蟹爪兰','蟹爪兰':'蟹爪兰',
  'stapelia':'豹皮花','豹皮花':'豹皮花',
  'trichocereus':'仙人柱','仙人柱':'仙人柱',
  'zebrina':'吊竹梅','吊竹梅':'吊竹梅',
  
  // === 常见蔬菜 (50) ===
  'tomato':'番茄','番茄':'番茄',
  'potato':'土豆','土豆':'土豆',
  'carrot':'胡萝卜','胡萝卜':'胡萝卜',
  'lettuce':'生菜','生菜':'生菜',
  'spinach':'菠菜','菠菜':'菠菜',
  'cabbage':'卷心菜','卷心菜':'卷心菜',
  'broccoli':'西兰花','西兰花':'西兰花',
  'cauliflower':'花椰菜','花椰菜':'花椰菜',
  'onion':'洋葱','洋葱':'洋葱',
  'garlic':'大蒜','大蒜':'大蒜',
  'pepper':'辣椒','辣椒':'辣椒',
  'cucumber':'黄瓜','黄瓜':'黄瓜',
  'pumpkin':'南瓜','南瓜':'南瓜',
  'corn':'玉米','玉米':'玉米',
  'bean':'豆类','豆类':'豆类',
  'pea':'豌豆','豌豆':'豌豆',
  'radish':'萝卜','萝卜':'萝卜',
  'celery':'芹菜','芹菜':'芹菜',
  'parsley':'欧芹','欧芹':'欧芹',
  'basil':'罗勒','罗勒':'罗勒',
  'mint':'薄荷','薄荷':'薄荷',
  'rosemary':'迷迭香','迷迭香':'迷迭香',
  'thyme':'百里香','百里香':'百里香',
  'oregano':'牛至','牛至':'牛至',
  'sage':'鼠尾草','鼠尾草':'鼠尾草',
  'cilantro':'香菜','香菜':'香菜',
  'ginger':'生姜','生姜':'生姜',
  'turmeric':'姜黄','姜黄':'姜黄',
  'asparagus':'芦笋','芦笋':'芦笋',
  'eggplant':'茄子','茄子':'茄子',
  'zucchini':'西葫芦','西葫芦':'西葫芦',
  'squash':'南瓜','南瓜':'南瓜',
  'kale':'羽衣甘蓝','羽衣甘蓝':'羽衣甘蓝',
  'swiss chard':'甜菜','甜菜':'甜菜',
  'beet':'甜菜根','甜菜根':'甜菜根',
  'turnip':'芜菁','芜菁':'芜菁',
  'leek':'韭菜','韭菜':'韭菜',
  'shallot':'红葱头','红葱头':'红葱头',
  'fennel':'茴香','茴香':'茴香',
  'artichoke':'朝鲜蓟','朝鲜蓟':'朝鲜蓟',
  'brussels sprouts':'抱子甘蓝','抱子甘蓝':'抱子甘蓝',
  'bok choy':'白菜','白菜':'白菜',
  'napa cabbage':'大白菜','大白菜':'大白菜',
  'watercress':'西洋菜','西洋菜':'西洋菜',
  'arugula':'芝麻菜','芝麻菜':'芝麻菜',
  'endive':'苦苣','苦苣':'苦苣',
  'chicory':'菊苣','菊苣':'菊苣',
  'rhubarb':'大黄','大黄':'大黄',
  'okra':'秋葵','秋葵':'秋葵',
  
  // === 常见水果 (50) ===
  'apple':'苹果','苹果':'苹果',
  'orange':'橙子','橙子':'橙子',
  'lemon':'柠檬','柠檬':'柠檬',
  'banana':'香蕉','香蕉':'香蕉',
  'grape':'葡萄','葡萄':'葡萄',
  'strawberry':'草莓','草莓':'草莓',
  'blueberry':'蓝莓','蓝莓':'蓝莓',
  'raspberry':'树莓','树莓':'树莓',
  'blackberry':'黑莓','黑莓':'黑莓',
  'watermelon':'西瓜','西瓜':'西瓜',
  'melon':'甜瓜','甜瓜':'甜瓜',
  'peach':'桃子','桃子':'桃子',
  'plum':'李子','李子':'李子',
  'cherry':'樱桃','樱桃':'樱桃',
  'pear':'梨','梨':'梨',
  'apricot':'杏','杏':'杏',
  'mango':'芒果','芒果':'芒果',
  'pineapple':'菠萝','菠萝':'菠萝',
  'papaya':'木瓜','木瓜':'木瓜',
  'kiwi':'猕猴桃','猕猴桃':'猕猴桃',
  'coconut':'椰子','椰子':'椰子',
  'avocado':'牛油果','牛油果':'牛油果',
  'fig':'无花果','无花果':'无花果',
  'pomegranate':'石榴','石榴':'石榴',
  'date':'枣','枣':'枣',
  'persimmon':'柿子','柿子':'柿子',
  'lychee':'荔枝','荔枝':'荔枝',
  'longan':'龙眼','龙眼':'龙眼',
  'durian':'榴莲','榴莲':'榴莲',
  'rambutan':'红毛丹','红毛丹':'红毛丹',
  'mangosteen':'山竹','山竹':'山竹',
  'dragon fruit':'火龙果','火龙果':'火龙果',
  'passion fruit':'百香果','百香果':'百香果',
  'guava':'番石榴','番石榴':'番石榴',
  'starfruit':'杨桃','杨桃':'杨桃',
  'tamarind':'酸角','酸角':'酸角',
  'jackfruit':'菠萝蜜','菠萝蜜':'菠萝蜜',
  'breadfruit':'面包果','面包果':'面包果',
  'cantaloupe':'哈密瓜','哈密瓜':'哈密瓜',
  'honeydew':'白兰瓜','白兰瓜':'白兰瓜',
  'grapefruit':'西柚','西柚':'西柚',
  'tangerine':'柑橘','柑橘':'柑橘',
  'lime':'青柠','青柠':'青柠',
  'cranberry':'蔓越莓','蔓越莓':'蔓越莓',
  'currant':'醋栗','醋栗':'醋栗',
  'gooseberry':'醋栗','醋栗':'醋栗',
  'elderberry':'接骨木莓','接骨木莓':'接骨木莓',
  'mulberry':'桑葚','桑葚':'桑葚',
  'olive':'橄榄','橄榄':'橄榄',
  
  // === 常见树木 (50) ===
  'oak':'橡树','橡树':'橡树',
  'maple':'枫树','枫树':'枫树',
  'pine':'松树','松树':'松树',
  'bamboo':'竹子','竹子':'竹子',
  'willow':'柳树','柳树':'柳树',
  'cherry':'樱花','樱花':'樱花',
  'ginkgo':'银杏','银杏':'银杏',
  'birch':'桦树','桦树':'桦树',
  'elm':'榆树','榆树':'榆树',
  'ash':'梣树','梣树':'梣树',
  'poplar':'杨树','杨树':'杨树',
  'spruce':'云杉','云杉':'云杉',
  'fir':'冷杉','冷杉':'冷杉',
  'cedar':'雪松','雪松':'雪松',
  'redwood':'红杉','红杉':'红杉',
  'sequoia':'巨杉','巨杉':'巨杉',
  'cypress':'柏树','柏树':'柏树',
  'juniper':'杜松','杜松':'杜松',
  'magnolia':'木兰','木兰':'木兰',
  'palm':'棕榈','棕榈':'棕榈',
  'banana tree':'香蕉树','香蕉树':'香蕉树',
  'olive tree':'橄榄树','橄榄树':'橄榄树',
  'apple tree':'苹果树','苹果树':'苹果树',
  'pear tree':'梨树','梨树':'梨树',
  'peach tree':'桃树','桃树':'桃树',
  'plum tree':'李树','李树':'李树',
  'cherry tree':'樱桃树','樱桃树':'樱桃树',
  'citrus':'柑橘','柑橘':'柑橘',
  'lemon tree':'柠檬树','柠檬树':'柠檬树',
  'orange tree':'橙树','橙树':'橙树',
  'walnut':'核桃','核桃':'核桃',
  'chestnut':'栗子','栗子':'栗子',
  'almond':'杏仁','杏仁':'杏仁',
  'pecan':'山核桃','山核桃':'山核桃',
  'hazel':'榛子','榛子':'榛子',
  'locust':'刺槐','刺槐':'刺槐',
  'acacia':'金合欢','金合欢':'金合欢',
  'mimosa':'含羞草','含羞草':'含羞草',
  'jacaranda':'蓝花楹','蓝花楹':'蓝花楹',
  'catalpa':'梓树','梓树':'梓树',
  'dogwood':'山茱萸','山茱萸':'山茱萸',
  'hawthorn':'山楂','山楂':'山楂',
  'sycamore':'悬铃木','悬铃木':'悬铃木',
  'basswood':'椴树','椴树':'椴树',
  'chestnut':'栗树','栗树':'栗树',
  'beech':'山毛榉','山毛榉':'山毛榉',
  'hornbeam':'鹅耳枥','鹅耳枥':'鹅耳枥',
  'linden':'椴树','椴树':'椴树',
  'mesquite':'牧豆树','牧豆树':'牧豆树',
  'tamarisk':'柽柳','柽柳':'柽柳',
  
  // === 草本/药用植物 (30) ===
  'ginseng':'人参','人参':'人参',
  'goji berry':'枸杞','枸杞':'枸杞',
  'astragalus':'黄芪','黄芪':'黄芪',
  'angelica':'当归','当归':'当归',
  'licorice':'甘草','甘草':'甘草',
  'cinnamon':'肉桂','肉桂':'肉桂',
  'clove':'丁香','丁香':'丁香',
  'nutmeg':'肉豆蔻','肉豆蔻':'肉豆蔻',
  'cardamom':'小豆蔻','小豆蔻':'小豆蔻',
  'saffron':'藏红花','藏红花':'藏红花',
  'chamomile':'洋甘菊','洋甘菊':'洋甘菊',
  'echinacea':'紫锥菊','紫锥菊':'紫锥菊',
  'valerian':'缬草','缬草':'缬草',
  'ginkgo biloba':'银杏','银杏':'银杏',
  'milk thistle':'水飞蓟','水飞蓟':'水飞蓟',
  'dandelion':'蒲公英','蒲公英':'蒲公英',
  'nettle':'荨麻','荨麻':'荨麻',
  'plantain':'车前草','车前草':'车前草',
  'comfrey':'紫草','紫草':'紫草',
  'yarrow':'蓍草','蓍草':'蓍草',
  'feverfew':'小白菊','小白菊':'小白菊',
  'catnip':'猫薄荷','猫薄荷':'猫薄荷',
  'lemongrass':'柠檬草','柠檬草':'柠檬草',
  'citronella':'香茅','香茅':'香茅',
  'patchouli':'广藿香','广藿香':'广藿香',
  'sandalwood':'檀香','檀香':'檀香',
  'aloe vera':'芦荟','芦荟':'芦荟',
  'tea tree':'茶树','茶树':'茶树',
  'eucalyptus':'桉树','桉树':'桉树',
  'wormwood':'艾草','艾草':'艾草',
}

/**
 * 翻译植物名称（英文/拉丁名 → 中文）
 * 完全依赖智谱 AI GLM-4.5-Air 翻译（智能、覆盖所有植物）
 */
async function translatePlantName(englishName) {
  if (!englishName) return '未知植物'
  
  if (/[\u4e00-\u9fa5]/.test(englishName)) {
    return englishName
  }
  
  const lowerName = englishName.toLowerCase().trim()
  const genusName = lowerName.split(' ')[0]
  
  if (PLANT_NAME_MAP[lowerName]) {
    return PLANT_NAME_MAP[lowerName]
  }
  
  if (PLANT_NAME_MAP[genusName]) {
    return PLANT_NAME_MAP[genusName]
  }
  
  try {
    const cache = await db.collection('plant_name_cache').doc(lowerName).get()
    if (cache.data && cache.data.chineseName) {
      return cache.data.chineseName
    }
  } catch (err) {
  }
  
  if (!GLM_API_KEY) {
    console.error('[Translate] GLM_API_KEY 未配置，跳过 AI 翻译')
  } else {
    try {
      const translation = await translateWithGLM(englishName)
      if (translation && translation !== '未知植物') {
        if (/^[\u4e00-\u9fa5]+$/.test(translation) && translation.length >= 2) {
          try {
            await db.collection('plant_name_cache').doc(lowerName).set({
              data: {
                englishName: englishName,
                chineseName: translation,
                createTime: new Date()
              }
            })
          } catch (cacheErr) {
            console.error('[Translate] 缓存保存失败:', cacheErr)
          }
          return translation
        } else {
        }
      }
    } catch (err) {
      console.error('[Translate] GLM 翻译失败:', err.message)
    }
  }
  
  for (const [keyword, chinese] of Object.entries(COMMON_PLANT_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return chinese
    }
  }
  
  const commonGenusMapping = {
    'zamioculcas': '金钱树',
    'epipremnum': '绿萝',
    'sansevieria': '虎尾兰',
    'spathiphyllum': '白掌',
    'chlorophytum': '吊兰',
    'dracaena': '龙血树',
    'ficus': '榕树',
    'monstera': '龟背竹',
    'philodendron': '蔓绿绒',
    'peperomia': '豆瓣绿',
    'begonia': '海棠',
    'rosa': '月季',
    'aloe': '芦荟',
    'crassula': '景天',
    'echeveria': '拟石莲'
  }
  
  if (commonGenusMapping[genusName]) {
    return commonGenusMapping[genusName]
  }

  // 无法翻译时返回原始名称（总比"观赏植物"更有信息量）
  return englishName || '未知植物'
}

/**
 * 使用智谱 AI 翻译植物名称（带重试）
 */
async function translateWithGLM(plantName) {
  if (!GLM_API_KEY) {
    console.error('[GLM 翻译] GLM_API_KEY 未配置，无法翻译')
    return null
  }
  
  for (let retry = 0; retry <= 2; retry++) {
    try {
      if (retry > 0) {
        await sleep(800 * retry)
      }
      
      const response = await fetchWithTimeout(GLM_API_URL, 8000, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GLM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            {
              role: 'system',
              content: '你是一位专业的植物名称翻译官。你的任务是将植物的拉丁学名或英文名翻译成标准的中文植物名称。\n\n翻译规则：\n1. 只返回中文名称，不要解释\n2. 使用常见的中文植物名（如"绿萝"、"金钱树"、"虎尾兰"）\n3. 如果没有标准中文名，返回音译名（如"龟背竹"、"蔓绿绒"）\n4. 绝对不要返回字母缩写或拉丁字母\n5. 保持简洁，只返回名称本身\n\n示例：\n- Clivia miniata → 君子兰\n- Pelargonium inquinans → 天竺葵\n- Goeppertia warszewiczii → 竹芋\n- Zamioculcas zamiifolia → 金钱树\n- Epipremnum aureum → 绿萝'
            },
            {
              role: 'user',
              content: `请将"${plantName}"翻译成中文植物名称：`
            }
          ],
          temperature: 0.1,
          max_tokens: 50
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        console.error(`[GLM 翻译] HTTP 错误：${response.status}`, errorText.substring(0, 200))
        continue
      }
      
      const data = await response.json()
      
      if (data.error) {
        console.error('[GLM 翻译] API 错误：', JSON.stringify(data.error))
        continue  // 重试
      }
      
      const translation = data.choices?.[0]?.message?.content?.trim()
      
      if (!translation) {
        console.error('[GLM 翻译] 返回内容为空，完整响应：', JSON.stringify(data).substring(0, 300))
        continue
      }
      
      const cleanTranslation = translation
        .replace(/[：:]/g, '')
        .replace(/^[^\u4e00-\u9fa5]*([\u4e00-\u9fa5]+)/, '$1')
        .trim()
      
      return cleanTranslation || translation
      
    } catch (err) {
      console.error(`[GLM 翻译] 第 ${retry + 1} 次失败：${err.message}`)
    }
  }
  
  return null
}

/**
 * 根据拉丁学名属名推断中文类别（优化版）
 */
function getGenusCategory(latinName) {
  const name = latinName.toLowerCase()
  
  // 常见属名关键词（精简版）
  const genusMap = {
    'ficus':'榕', 'philodendron':'喜林芋', 'monstera':'龟背竹',
    'epipremnum':'绿萝', 'spathiphyllum':'白掌', 'sansevieria':'虎尾兰',
    'aloe':'芦荟', 'orchid':'兰', 'phalaenopsis':'蝴蝶兰',
    'rosa':'玫瑰', 'lilium':'百合', 'chrysanthemum':'菊',
    'begonia':'秋海棠', 'geranium':'天竺葵', 'lavandula':'薰衣草',
    'jasminum':'茉莉', 'gardenia':'栀子', 'camellia':'山茶',
    'azalea':'杜鹃', 'hibiscus':'扶桑', 'bougainvillea':'三角梅',
    'plumeria':'鸡蛋花', 'iris':'鸢尾', 'narcissus':'水仙',
    'paeonia':'牡丹', 'rhododendron':'杜鹃', 'tulipa':'郁金香',
    'cactus':'仙人掌', 'succulent':'多肉', 'fern':'蕨类',
    'palm':'棕榈', 'bamboo':'竹', 'pine':'松',
    'oak':'橡', 'maple':'枫', 'willow':'柳'
  }
  
  for (const [keyword, category] of Object.entries(genusMap)) {
    if (name.includes(keyword)) {
      return category + '属植物'
    }
  }
  
  return null
}
