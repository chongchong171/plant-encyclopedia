/**
 * 浇水角标组件
 * 
 * 显示浇水状态：紧急/即将/正常
 */

const { WATERING_WARNING_DAYS } = require('../../config/constants');

Component({
  properties: {
    // 剩余天数（null 表示未设置）
    daysUntil: {
      type: Number,
      value: null
    },
    
    // 角标大小：'small' | 'medium' | 'large'
    size: {
      type: String,
      value: 'medium'
    },
    
    // 是否显示动画（紧急状态）
    animated: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 状态类型
    status: 'unknown',
    
    // 显示文案
    text: ''
  },

  lifetimes: {
    attached() {
      this.updateStatus();
    }
  },

  observers: {
    'daysUntil': function() {
      this.updateStatus();
    }
  },

  methods: {
    updateStatus() {
      const days = this.data.daysUntil;
      
      let status, text;
      
      if (days === null || days === undefined) {
        status = 'unknown';
        text = '未设置';
      } else if (days <= 0) {
        status = 'urgent';
        text = '今天';
      } else if (days <= WATERING_WARNING_DAYS) {
        status = 'soon';
        text = `${days}天后`;
      } else {
        status = 'ok';
        text = `${days}天后`;
      }
      
      this.setData({ status, text });
    }
  }
});