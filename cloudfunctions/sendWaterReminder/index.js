/**
 * 云函数：发送浇水提醒订阅消息
 * 
 * 功能：每天检查用户植物，发送浇水提醒
 * 触发方式：定时触发器（每天早上8点）
 * 
 * 模板ID：U51jrw2s83NJME7q_TWQ1EHy3m7a-8D6vnqo20ENpHA
 * 模板字段：
 * - 物品名称 {{thing1.DATA}} → 植物名称
 * - 提醒时间 {{date2.DATA}} → 提醒日期
 * - 备注 {{thing3.DATA}} → 提醒内容
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 订阅消息模板ID
const TEMPLATE_ID = 'XEGNQZUcsrWTE9JKZG088lSpQE2jjzR9JF0pAofOPgY'

exports.main = async (event, context) => {
  const today = new Date().toISOString().split('T')[0]
  const todayStr = formatDate(new Date())
  
  console.log(`📅 开始检查 ${today} 需要浇水的植物...`)
  
  try {
    // 查询今天需要浇水的植物
    const plantsRes = await db.collection('my_plants')
      .where({
        'careInfo.nextWatering': _.lte(today)  // 下次浇水日期 <= 今天
      })
      .get()
    
    const plants = plantsRes.data
    console.log(`🌱 找到 ${plants.length} 盆植物需要浇水`)
    
    if (plants.length === 0) {
      return {
        success: true,
        message: '今天没有需要浇水的植物',
        count: 0
      }
    }
    
    // 按用户分组
    const userPlantsMap = new Map()
    plants.forEach(plant => {
      const openid = plant._openid
      if (!userPlantsMap.has(openid)) {
        userPlantsMap.set(openid, [])
      }
      userPlantsMap.get(openid).push(plant)
    })
    
    // 发送订阅消息
    let successCount = 0
    let failCount = 0
    
    for (const [openid, userPlants] of userPlantsMap) {
      // 只发送第一盆植物（避免骚扰）
      const plant = userPlants[0]
      
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: openid,
          page: 'pages/my-plants/my-plants',  // 点击跳转到我的花园
          templateId: TEMPLATE_ID,
          data: {
            thing1: {
              value: plant.name || '您的植物'
            },
            date2: {
              value: todayStr
            },
            thing3: {
              value: userPlants.length > 1 
                ? `今天需要浇水${userPlants.length}盆植物` 
                : '今天需要浇水啦！'
            }
          }
        })
        
        successCount++
        console.log(`✅ 发送成功: ${openid} - ${plant.name}`)
        
      } catch (err) {
        failCount++
        console.error(`❌ 发送失败: ${openid}`, err.message)
        
        // 常见错误处理
        if (err.errCode === 43101) {
          console.log('用户未订阅该模板消息')
        } else if (err.errCode === 47003) {
          console.log('模板参数不准确')
        }
      }
      
      // 延迟100ms，避免频率限制
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`📊 发送完成: 成功 ${successCount}, 失败 ${failCount}`)
    
    return {
      success: true,
      total: plants.length,
      userCount: userPlantsMap.size,
      successCount,
      failCount
    }
    
  } catch (err) {
    console.error('❌ 云函数执行失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}