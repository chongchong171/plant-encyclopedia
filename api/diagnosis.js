/**
 * 诊断 API
 * 
 * 职责：封装诊断相关的云函数调用
 */

const { callCloudFunction } = require('./cloud');
const { ERROR_CODES } = require('../config/enums');
const { formatDate } = require('../utils/time');

/**
 * 执行植物诊断
 * 
 * @param {object} params 诊断参数
 * @param {string} params.plantId 植物 ID（可选）
 * @param {string} params.plantName 植物名称
 * @param {Array} params.problems 问题列表
 * @param {boolean} params.hasImage 是否有图片
 * @returns {Promise<{success: boolean, causes?: Array, solutions?: Array, products?: Array, error?: string}>}
 */
async function diagnosePlant(params) {
  // 参数校验
  if (!params.problems || params.problems.length === 0) {
    return {
      success: false,
      error: '请选择至少一个问题类型',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  const result = await callCloudFunction('diagnosePlant', {
    plantId: params.plantId || null,
    plantName: params.plantName || '未知植物',
    plantType: params.plantType || '',
    problems: params.problems,
    hasImage: params.hasImage || false,
    aiDetectedDiseases: params.aiDetectedDiseases || []
  });
  
  // 直接返回云函数结果（已包含 causes, solutions, products）
  return result;
}

/**
 * 保存诊断记录到养护日志
 * 
 * @param {string} plantId 植物 ID
 * @param {object} diagnosisData 诊断数据
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function saveDiagnosisRecord(plantId, diagnosisData) {
  if (!plantId) {
    return {
      success: false,
      error: '请先选择植物',
      code: ERROR_CODES.VALIDATION_ERROR
    };
  }
  
  try {
    const db = wx.cloud.database();
    
    await db.collection('my_plants').doc(plantId).update({
      data: {
        careLog: db.command.push({
          date: formatDate(new Date()),
          action: 'diagnosis',
          problems: diagnosisData.problems,
          causes: diagnosisData.causes,
          notes: ''
        })
      }
    });
    
    // 更新统计
    await callCloudFunction('updateUserStats', { action: 'diagnosis' });
    
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: '保存失败',
      code: ERROR_CODES.API_ERROR
    };
  }
}

module.exports = {
  diagnosePlant,
  saveDiagnosisRecord
};