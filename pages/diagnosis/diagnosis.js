/**
 * 植物健康诊断页面
 * 
 * ⚠️ 模块化规范：
 * - 通过 api/ 层调用云函数
 * - 通过 config/enums 获取问题类型
 * - 通过组件化 UI
 */

const api = require('../../api/index');
const { PROBLEM_TYPES } = require('../../config/enums');
const { imageToBase64 } = require('../../utils/image');
const { showLoading, hideLoading, showErrorToast, showSuccessToast } = require('../../utils/request');

Page({
  data: {
    selectedPlant: null,
    myPlants: [],
    showPlantPicker: false,
    problemImage: '',
    aiDetectedDiseases: [],
    selectedProblemIds: [],  // 问题选择器组件用
    selectedProblems: [],    // 问题名称列表
    canDiagnose: false,
    diagnosing: false,
    diagnosisResult: null
  },

  onLoad(options) {
    this.loadMyPlants();

    if (options.plantId) {
      this.selectPlantById(options.plantId);
    }
  },

  /**
   * 加载我的植物列表
   */
  async loadMyPlants() {
    const result = await api.getMyPlants();
    
    if (result.success) {
      // 按学名去重
      const plants = result.plants || [];
      const uniquePlants = [];
      const seenScientificNames = new Set();
      
      plants.forEach(plant => {
        const key = plant.scientificName || plant.name;
        if (key && !seenScientificNames.has(key)) {
          seenScientificNames.add(key);
          uniquePlants.push(plant);
        }
      });
      
      this.setData({ myPlants: uniquePlants });
    }
  },

  selectPlantById(plantId) {
    const plant = this.data.myPlants.find(p => p._id === plantId);
    if (plant) {
      this.setData({ selectedPlant: plant });
    }
  },

  selectPlant() {
    this.setData({ showPlantPicker: true });
  },

  closePicker() {
    this.setData({ showPlantPicker: false });
  },

  confirmPlant(e) {
    const plant = e.currentTarget.dataset.plant;
    this.setData({
      selectedPlant: plant,
      showPlantPicker: false
    });
  },

  /**
   * 拍照上传
   */
  takePhoto() {
    const that = this;
    
    // 显示选择菜单
    wx.showActionSheet({
      itemList: ['📷 拍照', '🖼️ 从相册选择'],
      success(res) {
        if (res.tapIndex === 0) {
          // 拍照
          that.takeFromCamera();
        } else {
          // 相册
          that.takeFromAlbum();
        }
      }
    });
  },
  
  /**
   * 从相机拍照（跳转到拍照页面）
   */
  takeFromCamera() {
    // 跳转到拍照页面，拍完照后返回
    wx.navigateTo({
      url: '/pages/camera/camera?mode=diagnosis'
    });
  },
  
  /**
   * 从相册选择
   */
  takeFromAlbum() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({
          problemImage: tempFilePath,
          aiDetectedDiseases: []
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        // 用户取消不提示
        if (err.errMsg && err.errMsg.includes('cancel')) {
          return;
        }
        // 权限被拒绝
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  previewImage() {
    wx.previewImage({
      urls: [this.data.problemImage],
      current: this.data.problemImage
    });
  },

  deleteImage() {
    this.setData({ 
      problemImage: '',
      aiDetectedDiseases: []
    });
  },

  /**
   * 问题选择器变化（组件事件）
   */
  onProblemChange(e) {
    const { ids, names, count } = e.detail;
    
    this.setData({
      selectedProblemIds: ids,
      selectedProblems: names,
      canDiagnose: count > 0
    });
  },

  /**
   * 开始诊断
   */
  async startDiagnosis() {
    if (!this.data.canDiagnose || this.data.diagnosing) return;

    this.setData({ diagnosing: true });

    const result = await api.diagnosePlant({
      plantId: this.data.selectedPlant?._id || null,
      plantName: this.data.selectedPlant?.name || '未知植物',
      plantType: this.data.selectedPlant?.scientificName || '',
      problems: this.data.selectedProblems,
      hasImage: !!this.data.problemImage
    });

    this.setData({ diagnosing: false });

    if (!result.success) {
      showErrorToast(result);
      return;
    }

    console.log('Diagnosis result:', result);

    // 确保诊断结果有数据
    let causes = ['养护环境不适', '浇水不当', '营养缺乏'];
    let solutions = ['调整养护环境', '合理浇水', '适当施肥'];
    let products = [
      { name: '通用营养液', price: 19.9, description: '适用于各种植物的通用肥料' }
    ];

    // 尝试从结果中获取数据
    if (result.causes && Array.isArray(result.causes) && result.causes.length > 0) {
      causes = result.causes;
    }
    if (result.solutions && Array.isArray(result.solutions) && result.solutions.length > 0) {
      solutions = result.solutions;
    }
    if (result.products && Array.isArray(result.products) && result.products.length > 0) {
      products = result.products;
    }

    console.log('Processed data:', { causes, solutions, products });

    // 强制设置诊断结果
    const diagnosisResult = {
      time: new Date().toLocaleString('zh-CN'),
      causes: causes.slice(0, 3), // 只保留前3个原因
      solutions: solutions.slice(0, 3), // 只保留前3个解决方案
      products: products.slice(0, 2) // 只保留前2个商品
    };

    console.log('Final diagnosis result:', diagnosisResult);

    this.setData({
      diagnosisResult: diagnosisResult
    }, () => {
      console.log('Data set callback:', this.data.diagnosisResult);
      // 强制刷新页面
      this.setData({ diagnosisResult: this.data.diagnosisResult });
    });

    console.log('Data set successfully:', this.data.diagnosisResult);
    console.log('Diagnosis result causes:', this.data.diagnosisResult.causes);
    console.log('Diagnosis result solutions:', this.data.diagnosisResult.solutions);
    console.log('Diagnosis result products:', this.data.diagnosisResult.products);

    wx.pageScrollTo({
      selector: '.result-section',
      duration: 300
    });
  },

  /**
   * 保存诊断记录
   */
  async saveDiagnosis() {
    if (!this.data.diagnosisResult) return;
    
    if (!this.data.selectedPlant) {
      wx.showToast({
        title: '请先选择植物才能保存',
        icon: 'none'
      });
      return;
    }

    const result = await api.diagnosis.saveDiagnosisRecord(
      this.data.selectedPlant._id,
      {
        problems: this.data.selectedProblems,
        causes: this.data.diagnosisResult.causes
      }
    );

    if (!result.success) {
      showErrorToast(result);
      return;
    }

    showSuccessToast('已保存到养护日志');
  },

  goToShop() {
    wx.navigateTo({ url: '/pages/shop/shop' });
  }
});