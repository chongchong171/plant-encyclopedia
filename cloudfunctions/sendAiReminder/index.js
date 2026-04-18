/**
 * 云函数：AI 推送提醒
 * 
 * 功能：
 * 1. 浇水提醒
 * 2. 施肥提醒
 * 3. 新植物关怀
 * 
 * 使用：配置定时触发器，每天早上 8:00 执行
 * 
 * 更新日期：2026-03-29
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 订阅消息模板 ID
const TEMPLATE_ID = 'XEGNQZUcsrWTE9JKZG088lSpQE2jjzR9JF0pAofOPgY'

exports.main = async (event, context) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  console.log(`[sendAiReminder] 开始执行: ${today}`)
  
  try {
    // 1. 获取所有需要提醒的植物
    const plants = await getPlantsNeedingWater()
    
    if (plants.length === 0) {
      return { success: true, message: '今天没有需要浇水的植物' }
    }
    
    // 2. 按用户分组
    const userPlants = groupByUser(plants)
    
    // 3. 发送推送
    let sentCount = 0
    for (const [openid, plantList] of Object.entries(userPlants)) {
      const result = await sendReminder(openid, plantList)
      if (result.success) {
        sentCount++
      }
    }
    
    return {
      success: true,
      message: `已发送 ${sentCount} 条提醒`,
      totalPlants: plants.length
    }
    
  } catch (err) {
    console.error('[sendAiReminder] 执行失败:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 获取需要浇水的植物
 */
async function getPlantsNeedingWater() {
  const now = Date.now()
  
  try {
    const res = await db.collection('plants')
      .where({
        nextWateringDate: _.lte(now),
        isDead: _.neq(true)
      })
      .get()
    
    return res.data
  } catch (err) {
    console.error('[sendAiReminder] 获取植物失败:', err)
    return []
  }
}

/**
 * 按用户分组
 */
function groupByUser(plants) {
  const grouped = {}
  
  for (const plant of plants) {
    const openid = plant._openid
    if (!grouped[openid]) {
      grouped[openid] = []
    }
    grouped[openid].push(plant)
  }
  
  return grouped
}

/**
 * 发送提醒
 */
async function sendReminder(openid, plantList) {
  // 生成 AI 备注
  const aiRemark = generateAiRemark(plantList)
  
  // 植物名称（最多显示 3 个）
  const plantNames = plantList.slice(0, 3).map(p => p.name).join('、')
  const extraCount = plantList.length > 3 ? `等${plantList.length}盆` : ''
  
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      page: `pages/chat/chat?intent=watering`,
      data: {
        thing1: { value: `${plantNames}${extraCount}` },  // 植物名称
        time2: { value: formatDate(new Date()) },          // 时间
        thing3: { value: aiRemark }                        // AI 备注
      },
      templateId: TEMPLATE_ID,
      miniprogramState: 'developer'
    })
    
    console.log(`[sendAiReminder] 发送成功: ${openid}`)
    return { success: true }
    
  } catch (err) {
    console.error(`[sendAiReminder] 发送失败: ${openid}`, err)
    return { success: false, error: err.message }
  }
}

/**
 * 生成 AI 备注（个性化文案）
 */
function generateAiRemark(plantList) {
  const templates = [
    '它们想你了，给它们喝点水吧~',
    '今天记得给你的小可爱们浇水哦~',
    '植物们在等你照顾呢~',
    '该浇水啦，让它们保持活力~',
    '浇水时间到，它们会感谢你的~'
  ]
  
  // 随机选择一个模板
  const randomIndex = Math.floor(Math.random() * templates.length)
  return templates[randomIndex]
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  
  return `${month}月${day}日 ${hour}:${minute}`
}