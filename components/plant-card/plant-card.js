/**
 * 植物卡片组件
 * 
 * ⚠️ 组件规范：
 * - 统一的样式（从 config/constants 获取尺寸）
 * - 可配置的显示选项
 * - 标准的事件命名
 */

const { CARD_BORDER_RADIUS, CARD_PADDING, IMAGE_SIZE } = require('../../config/constants');
const { getWateringText } = require('../../services/care');

Component({
  /**
   * 组件属性
   */
  properties: {
    // 植物数据
    plant: {
      type: Object,
      value: {}
    },
    
    // 是否显示浇水角标
    showWaterBadge: {
      type: Boolean,
      value: false
    },
    
    // 是否显示操作按钮（浇水/施肥）
    showActions: {
      type: Boolean,
      value: false
    },
    
    // 是否显示光照需求
    showLightNeed: {
      type: Boolean,
      value: false
    },
    
    // 卡片模式：'list' | 'grid' | 'compact'
    mode: {
      type: String,
      value: 'list'
    }
  },

  /**
   * 组件数据
   */
  data: {
    // 默认图片
    defaultImage: '/assets/images/default-plant.png',
    
    // 显示图片（计算后）
    displayImage: '',
    
    // 设计规范（从 config 获取）
    cardRadius: CARD_BORDER_RADIUS,
    cardPadding: CARD_PADDING,
    imageSize: IMAGE_SIZE
  },

  /**
   * 数据监听
   */
  observers: {
    'plant': function(plant) {
      if (plant) {
        // 计算显示图片（兼容可选链）
        const displayImage = plant.userImageUrl
          || plant.imageUrl
          || (plant.identifyResult && plant.identifyResult.imageUrl)
          || '/assets/images/default-plant.png';
        
        // 计算浇水文案
        const wateringText = getWateringText(plant.daysUntilWater);
        
        this.setData({
          displayImage,
          wateringText
        });
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 卡片点击
     */
    onCardTap() {
      this.triggerEvent('tap', {
        plant: this.data.plant,
        id: this.data.plant._id
      });
    },
    
    /**
     * 浇水按钮点击
     */
    onWaterTap(e) {
      console.log('💧 浇水按钮点击', this.data.plant.name);
      
      // 阻止事件冒泡
      e.stopPropagation && e.stopPropagation();
      
      this.triggerEvent('water', {
        id: this.data.plant._id,
        name: this.data.plant.name
      });
    },
    
    /**
     * 施肥按钮点击
     */
    onFertilizeTap(e) {
      console.log('🌱 施肥按钮点击', this.data.plant.name);
      
      // 阻止事件冒泡
      e.stopPropagation && e.stopPropagation();
      
      this.triggerEvent('fertilize', {
        id: this.data.plant._id,
        name: this.data.plant.name
      });
    },
    
    /**
     * 操作按钮区域点击 - 阻止冒泡
     */
    onActionsTap(e) {
      // 阻止事件冒泡，防止触发卡片点击
      console.log('🛡️ 操作按钮区域点击，阻止冒泡');
    },

    /**
     * 删除按钮点击
     */
    onDeleteTap(e) {
      console.log('🗑️ 删除按钮点击', this.data.plant.name);
      
      // 阻止事件冒泡
      e.stopPropagation && e.stopPropagation();
      
      this.triggerEvent('delete', {
        id: this.data.plant._id,
        name: this.data.plant.name
      });
    },
    
    /**
     * 诊断按钮点击
     */
    onDiagnosisTap(e) {
      e.stopPropagation();
      
      this.triggerEvent('diagnosis', {
        id: this.data.plant._id,
        plant: this.data.plant
      });
    },
    
    /**
     * 图片加载失败
     */
    onImageError() {
      console.log('[PlantCard] 图片加载失败:', this.data.plant.name);
      // 设置默认图片
      this.setData({
        displayImage: '/assets/images/default-plant.png'
      });
    }
  }
});
