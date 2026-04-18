/**
 * API 层统一入口
 * 
 * 使用方式：
 * const api = require('../../api/index');
 * api.plant.getMyPlants();
 */

const plant = require('./plant');
const diagnosis = require('./diagnosis');
const stats = require('./stats');
const cloud = require('./cloud');
const conversation = require('./conversation');
const voice = require('./voice');

module.exports = {
  plant,
  diagnosis,
  stats,
  cloud,
  conversation,
  voice,
  
  // 快捷方式（常用 API 直接挂载）
  getMyPlants: plant.getMyPlants,
  addPlant: plant.addPlant,
  removePlant: plant.removePlant,
  updatePlant: plant.updatePlant,
  updatePlantImage: plant.updatePlantImage,
  recordWatering: plant.recordWatering,
  recordFertilizing: plant.recordFertilizing,
  diagnosePlant: diagnosis.diagnosePlant,
  getFriendsRanking: stats.getFriendsRanking,
  plantIdentify: plant.plantIdentify,
  
  // 对话相关快捷方式
  classifyIntent: conversation.classifyIntent,
  
  // 语音相关快捷方式
  speechToText: voice.speechToText
};