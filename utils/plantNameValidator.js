/**
 * 植物名称验证工具
 * 
 * 用于验证和标准化植物名称
 * 
 * @example
 * const { getStandardPlantName } = require('./plantNameValidator')
 * const result = getStandardPlantName({ latinName: 'Zamioculcas zamiifolia' })
 * console.log(result.name) // 输出："金钱树"
 */

// 拉丁学名到中文名的标准映射
const PLANT_NAME_MAPPING = {
  // 常见观叶植物
  'Zamioculcas zamiifolia': '金钱树',
  'Epipremnum aureum': '绿萝',
  'Sansevieria trifasciata': '虎尾兰',
  'Spathiphyllum wallisii': '白掌',
  'Chlorophytum comosum': '吊兰',
  'Dracaena fragrans': '巴西木',
  'Ficus elastica': '橡皮树',
  'Monstera deliciosa': '龟背竹',
  'Philodendron hederaceum': '心叶蔓绿绒',
  'Peperomia obtusifolia': '豆瓣绿',
  
  // 常见花卉
  'Rosa chinensis': '月季',
  'Begonia semperflorens': '四季海棠',
  'Impatiens walleriana': '凤仙花',
  'Petunia hybrida': '矮牵牛',
  'Geranium hortorum': '天竺葵',
  
  // 多肉植物
  'Aloe vera': '芦荟',
  'Echeveria elegans': '玉露',
  'Crassula ovata': '玉树',
  'Haworthia fasciata': '条纹十二卷',
  
  // 常见果树
  'Citrus limon': '柠檬',
  'Ficus carica': '无花果',
  'Mentha spicata': '薄荷'
}

/**
 * 获取标准植物名称
 * 
 * 优先级：
 * 1. 拉丁学名映射的中文名
 * 2. 验证通过的通用名
 * 3. 备用名称
 * 
 * @param {Object} options - 选项
 * @param {string} options.latinName - 拉丁学名
 * @param {string} options.commonName - 通用名
 * @param {string} options.fallbackName - 备用名称（默认：'观赏植物'）
 * @returns {{name: string, source: string}} - 标准名称及来源
 */
function getStandardPlantName({ latinName, commonName, fallbackName = '观赏植物' }) {
  // 1. 优先使用拉丁学名映射
  if (latinName && PLANT_NAME_MAPPING[latinName]) {
    const standardName = PLANT_NAME_MAPPING[latinName]
    console.log(`[植物名称] 使用拉丁学名映射："${standardName}" (${latinName})`)
    return { name: standardName, source: 'latin_mapping' }
  }
  
  // 2. 验证通用名（确保是中文）
  if (commonName && /^[\u4e00-\u9fa5]{2,10}$/.test(commonName)) {
    console.log(`[植物名称] 使用通用名："${commonName}"`)
    return { name: commonName, source: 'common_name' }
  }
  
  // 3. 使用备用名称
  const fallback = /^[\u4e00-\u9fa5]{2,10}$/.test(fallbackName) ? fallbackName : '观赏植物'
  console.log(`[植物名称] 使用备用名称："${fallback}"`)
  return { name: fallback, source: 'fallback' }
}

module.exports = {
  getStandardPlantName,
  PLANT_NAME_MAPPING
}
