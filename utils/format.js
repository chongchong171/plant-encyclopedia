/**
 * 格式化工具
 * 
 * 职责：数据格式转换
 */

/**
 * 解析养护指南文本
 * 
 * @param {string} content AI 返回的文本
 * @returns {object} 结构化的养护指南
 */
function parseCareGuide(content) {
  const result = {
    commonNames: '',
    plantProfile: '',
    growthHabit: '',
    distribution: '',
    mainValue: '',
    careGuide: {
      light: '适中光照',
      water: '适量浇水',
      temperature: '室温',
      humidity: '',
      fertilizer: '',
      tips: ''
    },
    difficultyLevel: 3,
    difficultyText: '适合有一定经验的养护者',
    quickTips: []
  };
  
  if (!content) return result;
  
  // 解析各项
  const patterns = {
    commonNames: /【常用名】\s*([^\n【]+)/,
    plantProfile: /【植物档案】\s*([^\n【]+)/,
    growthHabit: /【生长习性】\s*([^\n【]+)/,
    distribution: /【分布范围】\s*([^\n【]+)/,
    mainValue: /【主要价值】\s*([^\n【]+)/,
    light: /【光照】\s*([^\n【]+)/,
    water: /【浇水】\s*([^\n【]+)/,
    temperature: /【温度】\s*([^\n【]+)/,
    difficulty: /【养护难度】\s*(\d)/,
    quickTips: /【快速要点】\s*([^\n【]+)/
  };
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = content.match(pattern);
    if (match) {
      if (key === 'difficulty') {
        result.difficultyLevel = parseInt(match[1]);
      } else if (key === 'quickTips') {
        result.quickTips = match[1].trim().split(/[、，,]/).slice(0, 3);
      } else if (key in result.careGuide) {
        result.careGuide[key] = match[1].trim();
      } else {
        result[key] = match[1].trim();
      }
    }
  }
  
  return result;
}

/**
 * 解析诊断结果
 * 
 * @param {string} content AI 返回的文本
 * @returns {object} { causes, solutions, products }
 */
function parseDiagnosisResult(content) {
  const result = {
    causes: [],
    solutions: [],
    products: []
  };
  
  if (!content) return result;
  
  // 解析可能原因
  const causesMatch = content.match(/【可能原因】([\s\S]*?)(?=【|$)/);
  if (causesMatch) {
    result.causes = causesMatch[1]
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line)
      .slice(0, 5);
  }
  
  // 解析解决方案
  const solutionsMatch = content.match(/【解决方案】([\s\S]*?)(?=【|$)/);
  if (solutionsMatch) {
    result.solutions = solutionsMatch[1]
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line)
      .slice(0, 5);
  }
  
  // 解析推荐商品
  const productsMatch = content.match(/【推荐商品】([\s\S]*?)(?=【|$)/);
  if (productsMatch) {
    const productLines = productsMatch[1].split('\n').filter(line => line.includes('¥'));
    result.products = productLines.map(line => {
      const match = line.match(/[-•]\s*(.+?)\s*[（(]¥(\d+(?:\.\d+)?)[)）]/);
      if (match) {
        return { name: match[1].trim(), price: parseFloat(match[2]) };
      }
      return null;
    }).filter(p => p);
  }
  
  return result;
}

/**
 * 格式化植物名称显示
 * 
 * @param {object} plant 植物数据
 * @returns {string} 显示名称（优先中文名）
 */
function formatPlantName(plant) {
  return plant.commonNames || plant.name || plant.scientificName || '未知植物';
}

module.exports = {
  parseCareGuide,
  parseDiagnosisResult,
  formatPlantName
};