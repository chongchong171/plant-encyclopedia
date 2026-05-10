/**
 * 云函数：植物健康诊断
 *
 * 使用 GLM-4.5-Air 生成诊断报告
 */

const cloud = require('wx-server-sdk')
const fetch = require('node-fetch')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY

exports.main = async (event, context) => {

  const { plantName, problems } = event

  if (!problems || problems.length === 0) {
    return {
      success: false,
      message: '请选择问题类型'
    }
  }

  // AI优先（个性化+准确），但严格限时；本地规则兜底
  try {
    const diagnosis = await generateDiagnosisWithAI(plantName, problems)
    return {
      success: true,
      source: 'ai',
      causes: diagnosis.causes,
      solutions: diagnosis.solutions,
      products: diagnosis.products
    }
  } catch (err) {
    console.error('AI诊断失败或超时:', err)
  }

  // AI失败/超时，回退到本地规则（毫秒级响应）
  const localResult = getDefaultDiagnosis(problems)
  return {
    success: true,
    source: 'local',
    causes: localResult.causes,
    solutions: localResult.solutions,
    products: localResult.products
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
        model: 'glm-4.5-air',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 512,
        temperature: 0.5
      }),
      timeout: 3000
    })

    const data = await res.json()
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || ''

    if (content) {
      return parseDiagnosisResult(content, problems)
    }

    return getDefaultDiagnosis(problems)

  } catch (err) {
    console.error('调用 GLM-4.5-Air 失败:', err)
    return getDefaultDiagnosis(problems)
  }
}

function buildPrompt(plantName, problems) {
  return '你是一位有20年经验的植物医生，说话温和有耐心，像老朋友一样帮用户分析问题。\n\n用户养了一盆"' + plantName + '"，最近出现了：' + problems.join('、') + '。请结合' + plantName + '的特性和生长习性，给出诊断意见。\n\n注意：\n1. 分析原因时要结合' + plantName + '的习性，说人话，别堆砌术语\n2. 解决方案要具体可操作，步骤清晰\n3. 推荐商品要与诊断结果直接相关\n4. 语言专业但通俗易懂，像朋友间聊天一样自然\n5. 不要机械罗列，每条建议都要有温度\n\n输出格式：\n\n【可能原因】\n1. xxx\n2. xxx\n3. xxx\n\n【解决方案】\n1. xxx\n2. xxx\n3. xxx\n\n【推荐商品】\n1. 商品名称 - 价格 - 适用场景\n2. 商品名称 - 价格 - 适用场景'
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
      causes: [
        '浇水过多导致根系受损，根部无法正常呼吸和吸收养分',
        '土壤缺乏铁元素，叶绿素合成受阻导致叶片失绿',
        '光照过强或土壤pH值不适，影响养分吸收'
      ],
      solutions: ['减少浇水频率，等土干透再浇', '施用硫酸亚铁溶液改善土壤', '移到散射光处并调整土壤pH值'],
      products: [
        { ...productLibrary['硫酸亚铁肥料'], name: '硫酸亚铁肥料' },
        { ...productLibrary['土壤改良剂'], name: '土壤改良剂' }
      ]
    },
    '叶子有斑点': {
      causes: [
        '真菌感染侵入叶片组织，高温高湿环境加速病菌繁殖',
        '蚜虫、红蜘蛛等害虫吸食叶汁，留下伤口和斑点',
        '强光直射晒伤叶片，或长期营养不均衡导致抵抗力下降'
      ],
      solutions: ['喷洒杀菌剂抑制病菌扩散', '检查叶片背面及时除虫', '避免强光直射并补充均衡营养'],
      products: [
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' },
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
      ]
    },
    '叶子卷曲': {
      causes: [
        '土壤长期缺水，叶片为减少蒸腾而向内卷曲',
        '蚜虫、蓟马等害虫藏匿叶背，吸食汁液导致叶片变形',
        '环境温度骤变或病毒感染，干扰正常生理代谢'
      ],
      solutions: ['及时补水并保持土壤湿润', '检查叶片背面清除害虫', '隔离病株并调整到适宜温度'],
      products: [
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' },
        { ...productLibrary['营养液'], name: '营养液' }
      ]
    },
    '有虫子': {
      causes: [
        '蚜虫聚集在嫩芽叶背，吸食汁液并分泌蜜露诱发煤烟病',
        '红蜘蛛在干燥高温环境下繁殖迅速，刺破叶细胞吸食',
        '介壳虫或粉虱附着在茎叶上，分泌蜡质覆盖物阻碍光合作用'
      ],
      solutions: ['用湿布擦拭叶片清除少量害虫', '喷洒专用杀虫剂全面防治', '保持通风干燥定期检查'],
      products: [
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' },
        { ...productLibrary['喷雾瓶'], name: '喷雾瓶' }
      ]
    },
    '叶片萎蔫': {
      causes: [
        '土壤长期缺水，细胞失去膨压导致叶片下垂变软',
        '根部腐烂或土壤积水，根系无法吸收水分和养分',
        '高温暴晒或长期营养不良，植株生理机能下降'
      ],
      solutions: ['检查土壤湿度及时补水或排水', '检查根部修剪腐烂部分', '移到阴凉处并适当施肥'],
      products: [
        { ...productLibrary['营养液'], name: '营养液' },
        { ...productLibrary['生根粉'], name: '生根粉' }
      ]
    },
    '茎部发黑': {
      causes: [
        '根腐病或浇水过多导致根部缺氧腐烂，病菌沿茎向上蔓延',
        '真菌感染侵入茎部组织，高温高湿环境利于病菌扩散',
        '低温冻害或通风不良，植株抵抗力下降易受病菌侵袭'
      ],
      solutions: ['停止浇水保持干燥切除发黑部分', '喷洒杀菌剂抑制病菌', '保持适宜温度加强通风'],
      products: [
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' },
        { ...productLibrary['生根粉'], name: '生根粉' }
      ]
    },
    '生长缓慢': {
      causes: [
        '光照不足导致光合作用减弱，植株无法积累足够能量',
        '土壤贫瘠或长期未施肥，氮磷钾等营养元素缺乏',
        '温度过低或根系长满花盆，生长空间受限'
      ],
      solutions: ['增加光照时间促进光合作用', '适当施肥补充氮磷钾', '调整到适宜温度或考虑换盆'],
      products: [
        { ...productLibrary['通用营养液'], name: '通用营养液' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '落叶严重': {
      causes: [
        '浇水过多或过少，根系受损无法正常供应水分',
        '环境温湿度骤变或通风不良，植株应激性落叶',
        '病虫害侵袭或长期缺肥，叶片老化脱落'
      ],
      solutions: ['调整浇水频率避免过湿过干', '保持环境温湿度稳定', '检查病虫害并适当施肥'],
      products: [
        { ...productLibrary['通用营养液'], name: '通用营养液' },
        { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
      ]
    },
    '叶子发白': {
      causes: [
        '长期光照不足，叶绿素合成减少导致叶片失绿变白',
        '土壤中氮、镁等元素缺乏，影响叶绿素正常合成',
        '病虫害侵袭或土壤碱化，叶片代谢功能紊乱'
      ],
      solutions: ['增加散射光照促进叶绿素合成', '补充氮肥和镁元素', '检查土壤pH值并防治病虫害'],
      products: [
        { ...productLibrary['氮磷钾复合肥'], name: '氮磷钾复合肥' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '叶子干枯': {
      causes: [
        '空气湿度太低或强光直射，叶片蒸腾过快失水干枯',
        '长期浇水不足，根系无法吸收足够水分供应叶片',
        '土壤中营养元素匮乏，叶片老化干枯脱落'
      ],
      solutions: ['增加空气湿度避免强光直射', '及时补水保持土壤湿润', '适当施肥补充营养'],
      products: [
        { ...productLibrary['喷雾瓶'], name: '喷雾瓶' },
        { ...productLibrary['营养液'], name: '营养液' }
      ]
    },
    '不开花': {
      causes: [
        '光照时间不足或强度不够，花芽分化需要充足光照',
        '氮肥过多磷钾不足，营养失衡导致只长叶不开花',
        '温度不适或处于休眠期，植株将能量用于生存而非繁殖'
      ],
      solutions: ['增加光照时长促进花芽分化', '施用磷钾肥均衡营养', '调整温度耐心等待休眠期结束'],
      products: [
        { ...productLibrary['磷酸二氢钾'], name: '磷酸二氢钾' },
        { ...productLibrary['植物补光灯'], name: '植物补光灯' }
      ]
    },
    '徒长': {
      causes: [
        '光照严重不足，植株为寻找光源而徒长变细',
        '氮肥施用量过多，茎叶疯狂生长却无力支撑',
        '种植过密或浇水过勤，通风不良导致茎秆细弱'
      ],
      solutions: ['增加光照抑制徒长', '减少氮肥适当修剪', '控制浇水保持通风'],
      products: [
        { ...productLibrary['植物补光灯'], name: '植物补光灯' },
        { ...productLibrary['磷酸二氢钾'], name: '磷酸二氢钾' }
      ]
    },
    '新芽枯萎': {
      causes: [
        '根系腐烂或受损，无法向新芽输送水分和养分',
        '浇水过多导致根部缺氧，或浇水过少使新芽脱水',
        '真菌病害感染新芽，或长期缺肥导致新芽营养不良'
      ],
      solutions: ['检查根系修剪腐烂部分', '调整浇水频率避免积水', '喷洒杀菌剂并适当施肥'],
      products: [
        { ...productLibrary['生根粉'], name: '生根粉' },
        { ...productLibrary['植物杀菌剂'], name: '植物杀菌剂' }
      ]
    },
    '叶子变小': {
      causes: [
        '土壤养分枯竭，根系吸收不到足够营养供应叶片发育',
        '花盆过小根系盘结，生长空间受限导致叶片发育不良',
        '光照长期不足，光合作用弱，新叶无法正常展开变大'
      ],
      solutions: ['适当施肥补充土壤养分', '考虑换盆扩大根系空间', '增加光照改善土壤'],
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
    key = key.replace(/\s*\(.*\)\s*/, '').trim()
    if (rules[key]) {
      return rules[key]
    }
  }

  // 尝试去除斜杠后的内容
  for (const problem of problems) {
    let key = problem.split('/')[0].trim()
    key = key.replace(/\s*\(.*\)\s*/, '').trim()
    if (rules[key]) {
      return rules[key]
    }
  }

  // 如果没有匹配到，尝试部分匹配
  for (const problem of problems) {
    let key = problem.replace(/\/.*$/, '').trim()
    key = key.replace(/\s*\(.*\)\s*/, '').trim()
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
    causes: [
      '养护环境光照、温度或湿度不适宜，植株生理代谢紊乱',
      '浇水过多或过少，根系受损无法正常吸收水分和养分',
      '土壤长期未更换或施肥不足，营养元素缺乏导致生长不良'
    ],
    solutions: ['调整养护环境', '合理浇水', '适当施肥'],
    products: [
      { ...productLibrary['通用营养液'], name: '通用营养液' },
      { ...productLibrary['植物杀虫剂'], name: '植物杀虫剂' }
    ]
  }
}
