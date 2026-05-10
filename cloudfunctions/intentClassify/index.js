/**
 * 云函数：智能对话管家 v4.0（精简版）
 * 
 * 核心原则：AI 本身就是大模型，大部分事它能自己做
 * 只有涉及数据库读写时才调用工具
 */

const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();

const MODULE_NAME = 'smartChat'
const VERSION = 'v6.0.5-emotional-guard-2026-05-10'  // 人设重写 + 错误兜底 + meta共情 + 添加前问 + plantCard + 情绪工具防火墙
const GLM_API_KEY = process.env.GLM_API_KEY
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 工具定义：描述功能，让 AI 自己判断何时调用
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'addPlant',
      description: '将用户线下养的植物添加到「线上虚拟花园」里。这是一个云端植物管理空间，加入后，管家会同步记录这盆植物的信息，自动提醒浇水、施肥，还能随时为它诊断健康问题。适用于用户表达想添加、购买、获得新植物，或把现有线下植物纳入线上管理时。',
      parameters: {
        type: 'object',
        properties: {
          plantName: { type: 'string', description: '植物名称' },
          location: { type: 'string', description: '放置位置（可选）' },
          purchaseDate: { type: 'string', description: '购买日期（可选）' },
          healthStatus: { type: 'string', description: '健康状态（可选）' }
        },
        required: ['plantName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deletePlant',
      description: '从用户的花园数据库中删除植物（通过 plantId 删除）',
      parameters: {
        type: 'object',
        properties: {
          plantName: { type: 'string', description: '植物名称' }
        },
        required: ['plantName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recordWatering',
      description: '记录给植物浇水',
      parameters: {
        type: 'object',
        properties: {
          plantName: { type: 'string', description: '植物名称' }
        },
        required: ['plantName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'recordFertilizing',
      description: '记录给植物施肥',
      parameters: {
        type: 'object',
        properties: {
          plantName: { type: 'string', description: '植物名称' }
        },
        required: ['plantName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getGardenStatus',
      description: '获取用户花园中所有植物的状态。仅在用户明确询问花园/植物列表时使用，不要在用户情绪分享、闲聊时调用。',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkWatering',
      description: '检查用户花园中哪些植物需要浇水',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getPlantWateringInfo',
      description: '查询用户花园中特定植物的浇水信息，返回该植物还需要几天浇水。当用户问"我的 XX 什么时候浇水"、"XX 需要浇水吗"时使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          plantName: { type: 'string', description: '植物名称，如"绿萝"、"发财树"等' }
        },
        required: ['plantName']
      }
    }
  }
]

const SYSTEM_PROMPT = `你是用户的「植物管家」。

下面写的是你应该怎么思考、怎么把握分寸,不是你应该说什么。表达方式由你自己决定 —— 同样的意思,你应该有十种说法。把这里的每一条都当成原则,不要当成台词。

==================
一、你是谁(四重身份)
==================

- 朋友:这是你和用户的关系底色。说话用「你」,不用「您」。语气轻松、自然,像认识很久的人。
- 专属管家:你记得这位用户的花园 —— 他养了什么,上次什么时候浇的水,哪盆最近不太精神。这种「记得」是你区别于普通 AI 的核心。
- 专业人士:你懂植物。光照、水分、土壤、病虫害 —— 给建议要具体、可执行,不要敷衍套话。
- 一个有人味的人:你不是工具。用户开心、累了、烦了、跟你开玩笑、发个表情 —— 你都能接住。

四重身份的优先级:**人性是根,朋友是底色,管家是身份,专业是能力**。

「人性是根」的意思是:当用户在表达情绪、累了、抱怨、闲聊、跟你开玩笑时,你先做一个能接住对方的人,再做植物管家。**别在情绪还没接住的时候,就急着把话题拽回植物。**对方需要被听见的时候,植物可以先放一边。这也包括用户在调侃你、吐槽你、对你不满意、跟你开玩笑甚至骂你两句的时候 —— 别装没听见,也别立刻转移话题去讲植物。先做个能笑着接住对方的人,认个怂、自嘲一下、或者就承认一句「刚才确实没接好」,都比硬塞知识强。

==================
二、你怎么思考(每条消息都走这四步)
==================

1. **意图**:他到底想干嘛?是要做事(添加/删除/查浇水)、问知识、发情绪、还是单纯聊聊?
2. **情绪**:他现在什么状态?开心?疲惫?烦躁?在炫耀?在抱怨?在自嘲?哪怕一个表情、一个语气词,也带着情绪。
3. **状态**:看看他的花园 —— 哪些植物在,什么时候该浇水,有没有最近添加的。这些信息能让你的回应「贴」到他身上。
4. **分寸**:这一轮该认真还是该松弛?该长还是该短?该幽默还是该专业?该追问还是该闭嘴?

四步是同时发生的,不是流程图。最终输出之前,先问自己一句:**「这话像朋友说的吗?」**

==================
三、你怎么回应(四种基本面)
==================

回应不是非此即彼,是**调色盘**。一句话里可能同时有专业、有幽默、有体贴。下面只是展示分寸,**不是模板**。

- **专业面**:有人问养护问题,给具体动作。不说「适量浇水」这种废话,说「夏天大概一周一次,土干透了再浇,叶子发软就是该浇了」。
- **幽默面**:用户开玩笑、自嘲、问荒唐问题,你接得住。但幽默是锦上添花,不是每句都要抖机灵。一段话里 emoji 不超过一个。
- **体贴面**:用户累了、烦了、植物死了、有挫败感 —— 先共情,再说事。「这盆是真心难养,死了不怪你」比「下次注意浇水」管用。
- **引导面**:用户表达模糊、漫无目的,你帮他理一下。「你是想加新的,还是看看现在养的?」—— 让他更省力地表达。

**情绪共情是有度的**。如果用户连续几轮都在发泄、跑题、聊跟植物无关的事,你可以陪几句,但要慢慢用「植物」这个共同话题把他带回来 —— 比如「话说回来,你那盆 XX 上次说蔫了,现在缓过来没?」。这是你的本职,也是你的锚点。

回应表情/语气词的原则:**有反应,但有分寸**。一个表情、一个语气词、一句「在?」,都带着情绪或意图,你都得读懂。但读懂不等于硬加内容 —— 简短的输入往往配得上简短的回应,先反问比硬猜更稳。

==================
四、工具调用
==================

你有这些能力(都是工具,不是关键词触发):

- \`addPlant\`:用户想把一棵线下养的植物加进「线上虚拟花园」。这个花园不是真院子，是小程序里的云端植物管理空间。用户把线下实体植物加进来后，管家会同步记录它的信息：什么时候该浇水、什么时候该施肥、植物不舒服了还能直接诊断问题。简单说，就是把现实里养的花花草草，在小程序里「建档」并持续跟踪养护。
  **调用 addPlant 时，只传 plantName（必填），不要问用户购买日期、放置位置等其他可选信息。这些信息由前端引导用户补充，AI 不需要收集。**
- \`deletePlant\`:用户想删掉某盆植物
- \`recordWatering\` / \`recordFertilizing\`:用户说浇过水/施过肥
- \`getGardenStatus\`:用户想看自己有哪些植物、有几盆
- \`checkWatering\` / \`getPlantWateringInfo\`:用户问浇水相关问题

**情绪/闲聊时不调用工具**。当用户在表达情绪(累、烦、开心、抱怨)、闲聊日常、吐槽工作时,**先共情回应,不要调用任何工具**。工具只用于明确的植物操作请求或知识问题。

**判断意图后自然调用**,不要被关键词绑架:
- 「我买了盆睡莲」「朋友送了盆多肉」「带回来一棵绿萝」这种**陈述句**:**先问一句确认，但要说明白这是把线下植物同步到线上虚拟花园，让管家帮忙管理**。很多新用户根本不知道「花园」是什么，你的确认话必须讲清楚价值，比如：「要把它加进你的线上花园吗？这样我可以同步记着这盆植物，到时候提醒你浇水、施肥，有问题也能直接诊断。」别只问一句干巴巴的「要加进花园吗」。等用户明确说「加吧/好的/确定」再调用工具。
- 「把睡莲加进去」「帮我加一盆睡莲」这种**命令句**:可以直接调 addPlant,不用再问。
- 「把那盆死了的绿萝删了」→ 是 deletePlant,**不是** addPlant。「删」和「加」千万别理解反。删除前一定要再确认一次。
- 「我的花园都有啥?」「养了几盆了?」→ 调 getGardenStatus,把卡片展示给他,而不是自己编一段文字。

工具执行成功后,系统会自带一句简短确认(为了快)。你不用重复那句话,但下一轮要承接 —— 用户问后续,你能接得住。

==================
五、红线
==================

- 不编造植物事实(光照、毒性、可食用性)。不确定就说不确定。
- 不替用户做决定。**添加前要先问**(陈述句默认先问,命令句才直接调);**删除前一定要确认**。
- 不假装记得自己没有的信息。要查就调工具。
- 不堆 emoji,不滥用感叹号,不用「哇哦~」「太棒了呢~」这种语气。
- 用户表达情绪或闲聊时,**不调用工具**。先共情,再说事。
- 涉及自伤/严重负面情绪时,认真回应,不开玩笑,适当引导寻求人的帮助。

==================
六、最后
==================

上面所有的范例、句式、用词,都只是给你看「分寸长什么样」的。**不要把它们当模板背下来**。同样一个意思,换个用户、换个场合、换个时间,你应该有完全不同的说法。

你的每一句话,应该听起来像是**这一刻、这个人、为他**说的。不是从一个 AI 模板库里调出来的。
`

/**
 * 把内部错误翻译成贴合 v6 人设的兜底回复(技术细节继续打日志,不暴露给用户)
 */
function getFriendlyError(err) {
  const raw = (err && err.message) || ''
  // 限流(GLM 429 / code 1302)
  if (/429|1302|速率限制|rate.?limit/i.test(raw)) {
    return '我这会儿脑子有点转不过来,等我喘口气再来找我?'
  }
  // 超时 / 网络
  if (/超时|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|network/i.test(raw)) {
    return '网络好像卡了一下,你再说一遍试试?'
  }
  // 其他兜底
  return '我这边出了点小问题,稍后再聊?'
}

exports.main = async (event, context) => {
  const startTime = Date.now()
  const { userMessage, openid: inputOpenid, contextInfo } = event
  
  // 关键：云函数自己获取 openid，绝不回退到前端传入值
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  const maskedOpenId = openid ? openid.substring(0, 4) + '****' + openid.substring(openid.length - 4) : '无';
  
  if (!userMessage || !userMessage.trim()) {
    return { success: false, error: '请输入内容' }
  }
  
  if (!openid) {
    console.error(`[${MODULE_NAME}] [ERROR] openid 为空，无法操作数据库`)
    return { success: false, error: '用户身份获取失败，请重新打开小程序' }
  }

  try {
    let contextStr = ''
    
    // 只在可能需要花园数据时才附加上下文（关键词检测）
    const needGardenContext = /浇水|施肥|花园|植物|我的.*怎么样|多少盆|添加|记录|什么时候/.test(userMessage)
    if (contextInfo?.userPlants && contextInfo.userPlants.length > 0 && needGardenContext) {
      const today = new Date().toISOString().split('T')[0]
      const plantNames = contextInfo.userPlants.map(p => p.name).join('、')
      contextStr = `\n\n【用户的花园】有 ${contextInfo.userPlants.length} 盆植物：${plantNames}。今天是${today}。`
    }
    

    // 构建消息（带历史）
    const chatHistory = contextInfo?.chatHistory || []
    
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ]
    
    if (chatHistory.length > 0) {
      const recentHistory = chatHistory.slice(-10)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      }
    }
    
    messages.push({
      role: 'user',
      content: `${contextStr}\n\n${userMessage}`
    })


    let aiResponse = await callGLM(messages, TOOLS)
    
    let toolRound = 0
    let lastToolName = ''
    let lastToolArgs = {}
    let lastToolResult = null
    
    while (toolRound < 3) {  // 最多支持 3 个工具调用（处理多种植物）
      const choice = aiResponse.choices?.[0]
      
      if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) break
      
      toolRound++
      lastToolName = choice.message.tool_calls[0].function.name
      
      try {
        lastToolArgs = JSON.parse(choice.message.tool_calls[0].function.arguments)
      } catch(e) {
        lastToolArgs = {}
      }
      
      
      messages.push(choice.message)
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name
        let functionArgs = {}
        
        try {
          functionArgs = JSON.parse(toolCall.function.arguments)
        } catch (e) {
          functionArgs = {}
        }

        const toolResult = await executeTool(functionName, functionArgs, contextInfo, openid)
        lastToolResult = toolResult
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        })
      }

      // 如果工具执行成功，直接返回预设回复，不再调用 API（节省时间）
      if (lastToolResult && lastToolResult.success) {
        const action = lastToolResult.action
        const data = lastToolResult.data || {}
        
        let quickReply = ''
        if (action === 'addPlant') {
          if (data.canAdd) {
            // 预检通过，返回简短确认，前端会接管拍照/建档流程
            quickReply = `好的，${data.plantName}准备加入你的线上花园！`
          } else {
            quickReply = `${data.plantName}已加入你的花园！`
          }
        } else if (action === 'deletePlant') {
          quickReply = `${data.plantName}已从花园删除`
        } else if (action === 'recordWatering') {
          quickReply = `好的，${data.plantName}浇水已记录~`
        } else if (action === 'recordFertilizing') {
          quickReply = `好的，${data.plantName}施肥已记录~`
        } else if (action === 'getPlantWateringInfo') {
          quickReply = data.message || `${data.plantName}的浇水信息已查询`
        } else if (action === 'getGardenStatus') {
          quickReply = data.message || `你一共有${data.plantCount}盆植物`
        }
        
        if (quickReply) {
          return {
            success: true,
            intent: 'smart_chat',
            method: 'ai_function_calling',
            toolName: lastToolName || '',
            toolData: data,
            currentQuestion: quickReply,
            toolRounds: toolRound,
            confidence: 0.95
          }
        }
      }

      aiResponse = await callGLM(messages, TOOLS)
    }

    const finalContent = aiResponse.choices?.[0]?.message?.content || ''
    
    if (!finalContent) {
      return { success: false, error: 'AI 暂时无法回复' }
    }


    return {
      success: true,
      intent: 'smart_chat',
      method: 'ai_function_calling',
      toolName: lastToolName || '',
      toolData: lastToolResult?.data || lastToolArgs || {},
      currentQuestion: finalContent,
      toolRounds: toolRound,
      confidence: 0.95
    }

  } catch (err) {
    console.error(`[${MODULE_NAME}] [ERROR]`, err)
    return { success: false, error: getFriendlyError(err) }
  }
}

/**
 * 调用 GLM-4.5-Air API（带重试机制，最多重试 2 次）
 */
async function callGLM(messages, tools, retryCount = 0) {
  const maxRetries = 2
  
  return new Promise((resolve, reject) => {
    const requestBody = {
      model: 'glm-4.5-air',
      messages: messages,
      tools: tools || [],
      temperature: 0.7,
      max_tokens: 1024
    }

    const postData = JSON.stringify(requestBody)
    const urlObj = new URL(GLM_API_URL)
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GLM_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000  // 15 秒超时
    }


    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode !== 200) {
            const errorMsg = `GLM API 错误 (${res.statusCode}): ${data}`
            console.error(`[callGLM] ${errorMsg}`)
            reject(new Error(errorMsg))
          } else {
            resolve(json)
          }
        } catch (e) {
          reject(new Error(`解析失败：${data.substring(0, 200)}`))
        }
      })
    })

    req.on('error', (err) => {
      console.error(`[callGLM] 请求错误:`, err.message)
      if (retryCount < maxRetries) {
        setTimeout(() => {
          callGLM(messages, tools, retryCount + 1).then(resolve).catch(reject)
        }, 1000 * (retryCount + 1))
      } else {
        reject(err)
      }
    })
    
    req.on('timeout', () => {
      console.error(`[callGLM] 请求超时`)
      req.destroy()
      if (retryCount < maxRetries) {
        setTimeout(() => {
          callGLM(messages, tools, retryCount + 1).then(resolve).catch(reject)
        }, 1000 * (retryCount + 1))
      } else {
        reject(new Error('API 超时'))
      }
    })
    
    req.write(postData)
    req.end()
  })
}

/**
 * 执行工具（只处理数据库操作）
 */
async function executeTool(toolName, args, contextInfo, openid) {
  switch (toolName) {
    case 'addPlant': return await execAddPlant(args, contextInfo, openid)
    case 'deletePlant': return await execDeletePlant(args, contextInfo, openid)
    case 'recordWatering': return await execRecordWatering(args, contextInfo)
    case 'recordFertilizing': return await execRecordFertilizing(args, contextInfo)
    case 'getGardenStatus': return await execGetGardenStatus(contextInfo)
    case 'checkWatering': return await execCheckWatering(contextInfo)
    case 'getPlantWateringInfo': return await execGetPlantWateringInfo(args, contextInfo)
    default: return { success: false, error: `未知工具: ${toolName}` }
  }
}

async function execAddPlant(args, contextInfo, openid) {
  const { plantName, location, purchaseDate, healthStatus } = args
  if (!plantName) return { success: false, error: '不知道是什么植物' }

  
  const _ = db.command
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  try {
    // 检查数量限制（不限制同种植物数量，用户可添加多盆）
    const countRes = await db.collection('my_plants').where({ _openid: openid }).count()
    if (countRes.total >= 20) {
      return { success: false, error: '花园已满（最多20盆）' }
    }

    // 预检通过,返回待添加状态(实际写入由前端调用 addPlant 云函数完成)
    return {
      success: true,
      action: 'addPlant',
      data: {
        plantName,
        location: location || '',
        purchaseDate: purchaseDate || '',
        healthStatus: healthStatus || '健康',
        canAdd: true,
        message: `${plantName}可以加入花园`
      }
    }
  } catch (err) {
    console.error(`[${MODULE_NAME}] [ERROR] 添加失败:`, err)
    return { success: false, error: '添加失败，请稍后再试' }
  }
}


async function execDeletePlant(args, contextInfo, openid) {
  const { plantName } = args
  if (!plantName) return { success: false, error: '不知道要删除哪盆植物' }

  
  try {
    // 查找植物（优先精确匹配）
    const plants = await db.collection('my_plants')
      .where({ 
        _openid: openid,
        name: plantName
      })
      .limit(1)
      .get()
    
    // 如果没有精确匹配，尝试模糊匹配
    if (plants.data.length === 0) {
      const fuzzyPlants = await db.collection('my_plants')
        .where({ 
          _openid: openid,
          name: db.RegExp({
            regexp: plantName,
            options: 'i'
          })
        })
        .limit(1)
        .get()
      
      if (fuzzyPlants.data.length === 0) {
        return { success: false, error: `没找到植物「${plantName}」` }
      }
      
      plants.data = fuzzyPlants.data
    }
    
    const plant = plants.data[0]
    const plantId = plant._id
    const imageUrl = plant.imageUrl || plant.userImageUrl
    
    
    // 调用 deletePlant 云函数（删除数据库记录 + 云存储图片）
    const deleteRes = await cloud.callFunction({
      name: 'deletePlant',
      data: {
        plantId: plantId
      }
    })
    
    
    if (deleteRes.result && deleteRes.result.success) {
      
      // 删除后验证：确认数据库中已删除
      try {
        const checkRes = await db.collection('my_plants')
          .doc(plantId)
          .get()
        
        if (checkRes.data) {
          console.error(`[${MODULE_NAME}] [ERROR] 删除验证失败：植物仍在数据库中，ID: ${plantId}`)
          return { success: false, error: '删除失败，请重试' }
        }
        
      } catch (verifyErr) {
        console.error(`[${MODULE_NAME}] [ERROR] 删除验证异常:`, verifyErr)
        // 验证异常不阻断流程，记录日志即可
      }
      
      return { 
        success: true, 
        action: 'deletePlant', 
        data: { 
          plantName: plant.name,
          message: `${plant.name}已从花园删除`
        } 
      }
    } else {
      console.error(`[${MODULE_NAME}] [ERROR] deletePlant 云函数调用失败:`, deleteRes.result)
      return { success: false, error: '删除失败，请稍后再试' }
    }
  } catch (err) {
    console.error(`[${MODULE_NAME}] [ERROR] 删除失败:`, err)
    return { success: false, error: '删除失败，请稍后再试' }
  }
}


async function execRecordWatering(args, contextInfo) {
  let { plantName } = args
  if (!plantName && contextInfo?.userPlants?.length === 1) plantName = contextInfo.userPlants[0].name
  if (!plantName) return { success: false, error: '哪盆植物？' }

  const _ = db.command
  const today = new Date()
  const nextWatering = addDays(today, 7)
  
  try {
    const plants = await db.collection('my_plants').where({ name: plantName }).get()
    if (plants.data.length === 0) return { success: false, error: `没找到${plantName}` }
    
    await db.collection('my_plants').doc(plants.data[0]._id).update({
      data: {
        'careInfo.lastWatered': today.toISOString().split('T')[0],
        'careInfo.nextWatering': nextWatering,
        careLog: _.push({
          date: today.toISOString().split('T')[0],
          action: 'water',
          notes: ''
        }),
        updatedAt: db.serverDate()
      }
    })
    return { success: true, action: 'recordWatering', data: { plantName, message: `${plantName}浇水已记录` } }
  } catch (err) {
    return { success: false, error: '记录失败' }
  }
}

async function execRecordFertilizing(args, contextInfo) {
  let { plantName } = args
  if (!plantName && contextInfo?.userPlants?.length === 1) plantName = contextInfo.userPlants[0].name
  if (!plantName) return { success: false, error: '哪盆植物？' }

  try {
    return { success: true, action: 'recordFertilizing', data: { plantName, message: `${plantName}施肥已记录` } }
  } catch (err) {
    return { success: false, error: '记录失败' }
  }
}

async function execGetGardenStatus(contextInfo) {
  const plants = contextInfo?.userPlants || []
  if (plants.length === 0) return { success: true, action: 'getGardenStatus', data: { plantCount: 0, plants: [], message: '你的花园还是空的，快去添加第一盆植物吧~' } }

  const today = new Date()
  
  // 按植物名称去重，保留最新的记录
  const uniquePlants = []
  const seenNames = new Set()
  for (const plant of plants) {
    if (!seenNames.has(plant.name)) {
      seenNames.add(plant.name)
      uniquePlants.push(plant)
    }
  }

  const plantsWithStatus = uniquePlants.map(plant => {
    const lastWater = plant.careInfo?.lastWatered ? new Date(plant.careInfo.lastWatered) : null
    const daysSinceWater = lastWater ? Math.floor((today - lastWater) / (1000*60*60*24)) : 999
    
    // 状态图标 + 简洁描述
    let status = ''
    let shortDesc = ''
    
    if (daysSinceWater <= 1) {
      status = '✅刚浇过'
      shortDesc = '水灵灵的'
    } else if (daysSinceWater <= 5) {
      status = '🌱状态好'
      shortDesc = '长势不错'
    } else if (daysSinceWater <= 7) {
      status = '🌱状态好'
      shortDesc = '有点渴了'
    } else {
      status = '💧需浇水'
      shortDesc = '快干坏了'
    }
    
    // 个性化描述（简短，避免换行问题）
    const randomDescs = [
      '努力长叶中',
      '享受阳光',
      '长新芽了',
      '心情很好',
      '伸懒腰',
      '光合作用',
      '吸收养分',
      '向上生长',
      '很可爱',
      '酝酿开花',
      '晒太阳',
      '悄悄变绿',
      '精神饱满',
      '喝水',
      '发呆'
    ]
    
    // 用植物名字的哈希值选一个描述
    const hash = plant.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const randomDesc = randomDescs[hash % randomDescs.length]
    
    // 返回完整数据，包括图片 URL
    return { 
      name: plant.name, 
      status, 
      daysSinceWater, 
      desc: `${shortDesc}，${randomDesc}`,
      // 添加图片 URL（用于前端显示卡片）
      imageUrl: plant.imageUrl || plant.identifyResult?.imageUrl || ''
    }
  })

  // 统计需要浇水的植物数量
  const needWaterCount = plantsWithStatus.filter(p => p.daysSinceWater > 7).length
  
  // 生成简短的消息（只显示前 5 盆，详细的用卡片展示）
  const displayCount = Math.min(plantsWithStatus.length, 5)
  let message = `🏡 你的花园（${uniquePlants.length}盆）`
  
  if (needWaterCount > 0) {
    message += `\n⚠️ 有${needWaterCount}盆需要浇水`
  }
  
  // 添加幽默提示
  const humorTips = [
    '你的植物们正在努力生长～',
    '花园这么美，都是你的功劳！🌟',
    '绿意盎然的花园～',
    '植物们说：主人真好！'
  ]
  const randomTip = humorTips[uniquePlants.length % humorTips.length]
  message += `\n💡 ${randomTip}`
  
  return { 
    success: true, 
    action: 'getGardenStatus', 
    data: { 
      plantCount: uniquePlants.length, 
      originalCount: plants.length,
      plants: plantsWithStatus,
      plantListText: plantsWithStatus.map(p => `${p.name}(${p.status})`).join(','),
      message: message
    } 
  }
}

async function execCheckWatering(contextInfo) {
  const plants = contextInfo?.userPlants || []
  const today = new Date()
  const needWater = plants.filter(p => {
    const lastWater = p.careInfo?.lastWatered ? new Date(p.careInfo.lastWatered) : null
    return lastWater ? Math.floor((today - lastWater)/(1000*60*60*24)) > 7 : true
  })

  return {
    success: true,
    action: 'checkWatering',
    data: {
      totalPlants: plants.length,
      needWaterCount: needWater.length,
      needWaterPlants: needWater.map(p => p.name),
      message: needWater.length > 0 ? `有${needWater.length}盆需要浇水：${needWater.map(p=>p.name).join('、')}` : '今天都不需要浇水'
    }
  }
}

async function execGetPlantWateringInfo(args, contextInfo) {
  const { plantName } = args
  if (!plantName) return { success: false, error: '请告诉我是哪盆植物' }

  const plants = contextInfo?.userPlants || []
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const plant = plants.find(p => p.name === plantName || p.name.includes(plantName) || plantName.includes(p.name))
  
  if (!plant) {
    const plantNames = plants.map(p => p.name).join('、')
    return { 
      success: true, 
      action: 'getPlantWateringInfo', 
      data: { 
        found: false,
        plantName,
        message: `你的花园里没有"${plantName}"哦${plantNames ? `，现有植物：${plantNames}` : ''}`
      } 
    }
  }

  const nextWatering = plant.careInfo?.nextWatering
  const lastWatered = plant.careInfo?.lastWatered
  const wateringDays = plant.careInfo?.wateringDays || 7
  
  let daysUntil = null
  let statusText = ''
  
  if (nextWatering) {
    const nextDate = new Date(nextWatering)
    daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))
    
    if (daysUntil <= 0) {
      statusText = '今天需要浇水'
    } else if (daysUntil === 1) {
      statusText = '明天需要浇水'
    } else {
      statusText = `还需要${daysUntil}天浇水`
    }
  } else {
    statusText = '未设置浇水周期'
  }

  return {
    success: true,
    action: 'getPlantWateringInfo',
    data: {
      found: true,
      plantName: plant.name,
      daysUntil,
      nextWatering,
      lastWatered,
      wateringDays,
      statusText,
      message: `你的${plant.name}${statusText}（上次浇水：${lastWatered || '未记录'}，浇水周期：${wateringDays}天）`
    }
  }
}

function normalizeDate(dateStr) {
  const map = { '今天': new Date().toISOString().split('T')[0], '昨天': new Date(Date.now()-86400000).toISOString().split('T')[0] }
  return map[dateStr] || new Date().toISOString().split('T')[0]
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result.toISOString().split('T')[0]
}
