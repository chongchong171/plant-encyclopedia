/**
 * Services 层统一入口
 */

const care = require('./care');
const dedup = require('./dedup');

module.exports = {
  care,
  dedup,
  
  // 养护计算快捷方式
  daysUntilWater: care.daysUntilWater,
  processPlantList: care.processPlantList,
  categorizePlants: care.categorizePlants,
  
  // 去重
  dedupByName: dedup.dedupByName,
  dedupByScientificName: dedup.dedupByScientificName
};