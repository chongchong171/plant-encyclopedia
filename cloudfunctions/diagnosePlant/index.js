/**
 * 云函数：植物健康诊断
 * 
 * 使用 Qwen-Turbo（免费，100万Token/180天）生成诊断报告
 */

const cloud = require('wx-server-sdk')
const fetch = require('node-fetch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || process.env.QWEN_API_KEY

exports.main = async (event, context) => {
  console.log('Diagnose plant event:', event);
  
  const { plantName, problems } = event
  
  if (!problems || problems.length === 0) {
    return {
      success: false,
      message: '请选择问题类型'
    }
  }
  
  try {
    console.log('Calling generateDiagnosisWithAI with:', plantName, problems);
    const diagnosis = await generateDiagnosisWithAI(plantName, problems)
    console.log('Diagnosis result:', diagnosis);
    
    return {
      success: true,
      causes: diagnosis.causes || ['养护环境不适', '浇水不当', '营养缺乏'],
      solutions: diagnosis.solutions || ['调整养护环境', '合理浇水', '适当施肥'],
      products: diagnosis.products || [
        { name: '通用营养液', price: 19.9, description: '适用于各种植物的通用肥料' }
      ]
    }
    
  } catch (err) {
    console.error('诊断失败:', err)
    // 即使出错也返回默认诊断结果
    return {
      success: true,
      causes: ['养护环境不适', '浇水不当', '营养缺乏'],
      solutions: ['调整养护环境', '合理浇水', '适当施肥'],
      products: [
        { name: '通用营养液', price: 19.9, description: '适用于各种植物的通用肥料' }
      ]
    }
  }
}

async function generateDiagnosisWithAI(plantName, problems) {
  const prompt = buildPrompt(plantName, problems)
  
  try {
    const res = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GLM_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })
    
    const data = await res.json()
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || ''
    
    if (content) {
      return parseDiagnosisResult(content, problems)
    }
    
    return getDefaultDiagnosis(problems)
    
  } catch (err) {
    console.error('调用 Qwen 失败:', err)
    return getDefaultDiagnosis(problems)
  }
}

function buildPrompt(plantName, problems) {
  return '你是专业的植物医生，拥有丰富的植物养护经验。用户养了一盆"' + plantName + '"，出现以下问题：' + problems.join('、') + '。\n\n请给出详细的诊断建议，格式如下：\n\n【可能原因】\n1. xxx\n2. xxx\n3. xxx\n\n【解决方案】\n1. xxx\n2. xxx\n3. xxx\n\n【推荐商品】\n1. 商品名称 - 价格 - 适用场景\n2. 商品名称 - 价格 - 适用场景\n\n要求：\n1. 原因分析要结合' + plantName + '的特性和生长习性\n2. 解决方案要具体可操作，包含详细步骤\n3. 推荐商品要与诊断结果直接相关，能够解决发现的问题\n4. 语言专业但通俗易懂，每条不超过40字\n5. 提供科学合理的分析，增强诊断的可信度'
}

function parseDiagnosisResult(content, problems) {
  const result = {
    causes: [],
    solutions: [],
    products: []
  }
  
  // 简单解析：按行分割
  const lines = content.split('\n')
  let currentSection = ''
  
  for (let line of lines) {
    line = line.trim()
    
    if (line.indexOf('【可能原因】') >= 0) {
      currentSection = 'causes'
      continue
    }
    if (line.indexOf('【解决方案】') >= 0) {
      currentSection = 'solutions'
      continue
    }
    if (line.indexOf('【推荐商品】') >= 0) {
      currentSection = 'products'
      continue
    }
    
    // 解析带数字的行
    if (line.match(/^\d+\./)) {
      const text = line.replace(/^\d+\.\s*/, '').trim()
      if (text && currentSection === 'causes' && result.causes.length < 5) {
        result.causes.push(text)
      }
      if (text && currentSection === 'solutions' && result.solutions.length < 5) {
        result.solutions.push(text)
      }
      if (text && currentSection === 'products' && result.products.length < 5) {
        // 解析推荐商品格式：商品名称 - 价格 - 适用场景
        const productMatch = text.match(/(.+?)\s*-\s*(.+?)\s*-\s*(.+)/)
        if (productMatch) {
          result.products.push({
            name: productMatch[1].trim(),
            price: parseFloat(productMatch[2].replace(/[^\d.]/g, '')),
            description: productMatch[3].trim()
          })
        } else {
          // 如果格式不匹配，作为简单商品添加
          result.products.push({ name: text, price: 0 })
        }
      }
    }
  }
  
  if (result.causes.length === 0) {
    return getDefaultDiagnosis(problems)
  }
  
  return result
}

function getDefaultDiagnosis(problems) {
  // 扩展商品库
  const productLibrary = {
    '硫酸亚铁肥料': { price: 12.9, description: '补充铁元素，预防黄叶', tags: ['黄叶', '缺铁'] },
    '植物杀菌剂': { price: 19.9, description: '防治真菌病害，保护植物健康', tags: ['斑点', '病害', '发黑'] },
    '营养液': { price: 25.9, description: '全面补充营养，促进植物生长', tags: ['萎蔫', '生长缓慢'] },
    '植物杀虫剂': { price: 15.9, description: '防治蚜虫、红蜘蛛等虫害', tags: ['虫子', '虫害'] },
    '通用营养液': { price: 19.9, description: '适用于各种植物的通用肥料', tags: ['通用', '营养'] },
    '氮磷钾复合肥': { price: 15.9, description: '均衡营养，促进枝叶生长', tags: ['发白', '营养'] },
    '喷雾瓶': { price: 9.9, description: '增加空气湿度，方便浇水', tags: ['干枯', '湿度'] },
    '磷酸二氢钾': { price: 12.9, description: '促进开花，增强抗逆性', tags: ['不开花', '开花'] },
    '植物补光灯': { price: 39.9, description: '补充光照，防止徒长', tags: ['徒长', '光照'] },
    '生根粉': { price: 10.9, description: '促进根系生长，提高成活率', tags: ['根系', '枯萎'] },
    '多肉专用土': { price: 18.9, description: '透气排水，适合多肉植物', tags: ['多肉', '土壤'] },
    '有机肥料': { price: 22.9, description: '天然有机，环保安全', tags: ['通用', '营养'] },
    '土壤改良剂': { price: 16.9, description: '改善土壤结构，提高肥力', tags: ['土壤', '营养'] },
    '盆底网': { price: 8.9, description: '防止土壤流失，保持排水', tags: ['土壤', '排水'] },
    '植物标签': { price: 6.9, description: '标记植物信息，方便管理', tags: ['管理', '标记'] }
  }
  
  // 预设诊断规则
  const rules = {
    '叶尖发黄': {
      causes: ['浇水过多导致根系受损', '土壤缺乏铁元素', '光照过强', '土壤pH值不适'],
      solutions: ['减少浇水频率，等土干透再浇', '施用硫酸亚铁溶液', '移到散射光处', '调整土壤pH值'],
      products: [
        { ...productLibrary['硫酸亚铁肥料'], name: '硫酸亚铁肥料' },
        { ...productLibrary['土壤改良剂'], name: '土壤改良剂' }
      ]
    },
    '叶子有斑点': {
      causes: ['真菌感染', '虫害', '晒伤', '营养不均衡'],
      solutions: ['喷洒杀菌剂', '检查是否有虫害', '避免阳光直射', '均衡施肥'],
      products: [
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' },
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
      ]
    },
    '叶子卷曲': {
      causes: ['缺水', '虫害', '病毒感染', '温度不适'],
      solutions: ['检查土壤湿度', '检查叶片背面是否有虫', '隔离病株', '调整温度'],
      products: [
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' },
        { ...productLibrary['营养液'], name: '营养液' }
      ]
    },
    '有虫子': {
      causes: ['蚜虫', '红蜘蛛', '介壳虫', '粉虱'],
      solutions: ['用湿布擦拭叶片', '喷洒专用杀虫剂', '保持通风', '定期检查'],
      products: [
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' },
        { ...productLibrary['喷雾瓶'], name: '喷雾瓶' }
      ]
    },
    '叶片萎蔫': {
      causes: ['缺水', '根部腐烂', '温度过高', '营养缺乏'],
      solutions: ['检查土壤湿度，及时补水', '检查根部是否腐烂', '移到阴凉处', '适当施肥'],
      products: [
        { ...productLibrary['营养液'], name: '营养液' },
        { ...productLibrary['生根粉'], name: '生根粉' }
      ]
    },
    '茎部发黑': {
      causes: ['根腐病', '浇水过多', '真菌感染', '低温冻害'],
      solutions: ['停止浇水，保持干燥', '切除发黑部分', '喷洒杀菌剂', '保持适宜温度'],
      products: [
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' },
        { ...productLibrary['生根粉'], name: '生根粉' }
      ]
    },
    '生长缓慢': {
      causes: ['光照不足', '营养不良', '温度不适', '根系受限'],
      solutions: ['增加光照时间', '适当施肥', '调整到适宜温度', '考虑换盆'],
      products: [
        { ...productLibrary['通用营养液'], name: '通用营养液' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '落叶严重': {
      causes: ['浇水不当', '环境突变', '病虫害', '营养缺乏'],
      solutions: ['调整浇水频率', '保持环境稳定', '检查是否有病虫害', '适当施肥'],
      products: [
        { ...productLibrary['通用营养液'], name: '通用营养液' },
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
      ]
    },
    '叶子发白': {
      causes: ['光照不足', '营养不良', '叶绿素缺乏', '病虫害'],
      solutions: ['增加散射光照', '补充氮肥', '检查土壤pH值', '检查是否有病虫害'],
      products: [
        { ...productLibrary['氮磷钾复合肥'], name: '氮磷钾复合肥' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '叶子干枯': {
      causes: ['空气干燥', '光照过强', '浇水不足', '营养缺乏'],
      solutions: ['增加空气湿度', '移到阴凉处', '及时补水', '适当施肥'],
      products: [
        { ...productLibrary['喷雾瓶'], name: '喷雾瓶' },
        { ...productLibrary['营养液'], name: '营养液' }
      ]
    },
    '不开花': {
      causes: ['光照不足', '营养不均衡', '休眠期', '温度不适'],
      solutions: ['增加光照时长', '施用磷钾肥', '耐心等待休眠期结束', '调整温度'],
      products: [
        { ...productLibrary['磷酸二氢钾'], name: '磷酸二氢钾' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '徒长': {
      causes: ['光照不足', '氮肥过多', '种植过密', '浇水过多'],
      solutions: ['增加光照', '减少氮肥', '适当修剪', '控制浇水'],
      products: [
        { ...productLibrary['植物补光灯'], name: '植物补光灯' },
        { ...productLibrary['磷酸二氢钾'], name: '磷酸二氢钾' }
      ]
    },
    '新芽枯萎': {
      causes: ['根系问题', '浇水不当', '病害感染', '营养缺乏'],
      solutions: ['检查根系健康', '调整浇水频率', '喷洒杀菌剂', '适当施肥'],
      products: [
        { ...productLibrary['生根粉'], name: '生根粉' },
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' }
      ]
    },
    '叶子变小': {
      causes: ['营养不足', '根系受限', '光照不足', '土壤贫瘠'],
      solutions: ['适当施肥', '考虑换盆', '增加光照', '改善土壤'],
      products: [
        { ...productLibrary['通用营养液'], name: '通用营养液' },
        { ...productLibrary['土壤改良剂'], name: '土壤改良剂' }
      ]
    }
  }
  
  // 匹配
  for (const problem of problems) {
    let key = problem.replace(/\/.*$/, '').trim()
    // 去除括号内容
    key = key.replace(/\s*\(.*?\)\s*/, '').trim()
    if (rules[key]) {
      return rules[key]
    }
  }
  
  // 尝试去除斜杠后的内容
  for (const problem of problems) {
    let key = problem.split('/')[0].trim()
    key = key.replace(/\s*\(.*?\)\s*/, '').trim()
    if (rules[key]) {
      return rules[key]
    }
  }
  
  // 如果没有匹配到，尝试部分匹配
  for (const problem of problems) {
    let key = problem.replace(/\/.*$/, '').trim()
    key = key.replace(/\s*\(.*?\)\s*/, '').trim()
    for (const ruleKey in rules) {
      if (key.includes(ruleKey) || ruleKey.includes(key)) {
        return rules[ruleKey]
      }
    }
  }
  
  // 尝试匹配规则库中的关键词
  for (const problem of problems) {
    for (const ruleKey in rules) {
      if (problem.includes(ruleKey) || ruleKey.includes(problem)) {
        return rules[ruleKey]
      }
    }
  }
  
  // 默认
  return {
    causes: ['养护环境不适', '浇水不当', '营养缺乏', '病虫害'],
    solutions: ['调整养护环境', '合理浇水', '适当施肥', '定期检查'],
    products: [
      { ...productLibrary['通用营养液'], name: '通用营养液' },
      { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
    ]
  }
}