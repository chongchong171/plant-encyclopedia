/**
 * 植物识别工具 v7.0（云函数统一调用）
 * 
 * 策略：
 * 1. 前端只负责上传图片
 * 2. 云函数统一调用 PlantNet + 百度 AI + Qwen
 * 3. 云函数服务器访问国外 API 快 3-5 倍
 * 
 * ⚠️ 安全架构：
 * - 前端：不接触任何 API Key
 * - 云函数：所有 Key 在环境变量中
 * 
 * ⚠️ 优势：
 * - 速度：8-12 秒（原 25 秒）
 * - 稳定：云函数代理不受墙影响
 * - 安全：前端无敏感信息
 */

const app = getApp()

// 额度追踪（本地缓存）
let todayCount = 0
const DAILY_LIMIT = 500
const STORAGE_KEY = 'plant_identify_count'

/**
 * 检查并重置每日计数
 */
function checkDailyReset() {
  const today = new Date().toDateString()
  
  try {
    const stored = wx.getStorageSync(STORAGE_KEY)
    if (stored && stored.date === today) {
      todayCount = stored.count
    } else {
      todayCount = 0
      wx.setStorageSync(STORAGE_KEY, { date: today, count: 0 })
      console.log('📅 新的一天，识别计数已重置')
    }
  } catch (e) {
    console.log('⚠️ 读取存储失败')
  }
}

/**
 * 保存计数
 */
function saveCount() {
  try {
    wx.setStorageSync(STORAGE_KEY, {
      date: new Date().toDateString(),
      count: todayCount
    })
  } catch (e) {}
}

/**
 * 主入口：调用云函数统一识别
 */
const identifyPlant = async (imageBase64) => {
  checkDailyReset()
  const startTime = Date.now()
  
  console.log('🌿 ========== 开始识别 ==========')
  console.log(`📊 今日已识别：${todayCount}/${DAILY_LIMIT}`)
  
  // 检查额度
  if (todayCount >= DAILY_LIMIT) {
    return { success: false, error: '今日识别次数已用完，请明天再试' }
  }
  
  // 计算图片大小
  const sizeKB = imageBase64.length * 0.75 / 1024
  console.log(`📐 图片大小：${sizeKB.toFixed(1)} KB`)
  
  // 云函数调用限制：5MB（5120KB）
  if (sizeKB > 5000) {
    return { success: false, error: '图片太大 (>5MB)，请选择较小的图片或压缩后上传' }
  }
  
  // 建议大小：2MB 以内
  if (sizeKB > 2000) {
    console.log(`⚠️ 图片较大 (${sizeKB.toFixed(1)} KB)，可能影响识别速度`)
  }
  
  console.log('☁️ 调用云函数 identifyPlant...')
  
  return new Promise((resolve) => {
    wx.cloud.callFunction({
      name: 'identifyPlant',
      data: {
        imageBase64: imageBase64,
        organ: 'auto'
      },
      timeout: 22000,  // 22 秒超时（云函数 25 秒）
      success: (res) => {
        const duration = Date.now() - startTime
        
        if (res.result && res.result.success) {
          todayCount++
          saveCount()
          
          // 兼容两种数据格式：有 data 字段 或 扁平结构
          const plantData = res.result.data || res.result
          const careData = res.result.careAdvice?.data || {}
          
          console.log(`✅ 识别成功！耗时：${duration}ms`)
          console.log(`🌿 植物：${plantData.name}`)
          console.log(`📊 置信度：${plantData.confidence}%`)
          console.log(`☁️ 来源：${res.result.source}`)
          console.log(`📋 careAdvice.data:`, JSON.stringify(careData).substring(0, 200))
          console.log(`📋 careGuide:`, JSON.stringify(careData.careGuide).substring(0, 200))
          
          resolve({
            success: true,
            data: {
              ...plantData,
              // 展开养护建议的各个字段
              ...(res.result.careAdvice?.data || {}),
              // careGuide 单独提取（供 home.js 使用）
              careGuide: res.result.careAdvice?.data?.careGuide || {},
              source: res.result.source,
              timing: res.result.timing,
              quotaRemaining: DAILY_LIMIT - todayCount
            }
          })
        } else {
          const errorMsg = res.result?.error || res.result?.errMsg || '识别失败'
          console.log('❌ 识别失败:', errorMsg)
          
          // 根据错误类型给出不同提示
          let userFriendlyError = errorMsg
          if (errorMsg.includes('未识别到植物')) {
            userFriendlyError = '图片中没有检测到植物，请重新拍摄'
          } else if (errorMsg.includes('置信度')) {
            userFriendlyError = '识别结果不太确定，建议拍更清晰的照片'
          } else if (errorMsg.includes('图片太大')) {
            userFriendlyError = '图片太大了，请选择小于 9MB 的图片'
          } else if (errorMsg.includes('网络')) {
            userFriendlyError = '网络连接不稳定，请稍后重试'
          }
          
          resolve({
            success: false,
            error: userFriendlyError
          })
        }
      },
      fail: (err) => {
        console.log('❌ 云函数调用失败:', err)
        
        // 详细分析错误原因
        let detailedError = '网络错误，请检查连接后重试'
        const errMsg = err.errMsg || ''
        
        if (errMsg.includes('timeout')) {
          detailedError = '请求超时，服务器响应太慢，请稍后重试'
        } else if (errMsg.includes('IMAGE_TOO_LARGE')) {
          detailedError = '图片太大了，请选择小于 9MB 的图片'
        } else if (errMsg.includes('INVALID_IMAGE')) {
          detailedError = '图片格式不正确，请使用 JPG 或 PNG 格式'
        } else if (errMsg.includes('NETWORK')) {
          detailedError = '网络连接不稳定，请检查网络后重试'
        } else if (errMsg.includes('TIME_LIMIT')) {
          detailedError = '请求超时，请稍后重试'
        }
        
        resolve({
          success: false,
          error: detailedError
        })
      }
    })
  })
}

/**
 * 获取额度状态
 */
const getQuotaStatus = () => {
  checkDailyReset()
  return {
    used: todayCount,
    limit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - todayCount,
    resetTime: '每天 00:00'
  }
}

module.exports = {
  identifyPlant,
  getQuotaStatus
}
