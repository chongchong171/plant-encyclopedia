/**
 * 问题选择器组件
 * 
 * 用于诊断页面，从 config/enums 获取问题类型列表
 */

const { PROBLEM_TYPES } = require('../../config/enums');

Component({
  properties: {
    // 已选择的问题 ID 列表
    selectedIds: {
      type: Array,
      value: []
    },
    
    // 是否允许多选
    multiple: {
      type: Boolean,
      value: true
    },
    
    // 最大选择数量
    maxSelect: {
      type: Number,
      value: 5
    }
  },

  data: {
    // 问题类型列表（从 config/enums 获取）
    problemTypes: PROBLEM_TYPES.map(p => ({
      ...p,
      checked: false
    })),
    
    // 已选择数量
    selectedCount: 0
  },

  lifetimes: {
    attached() {
      this.updateCheckedStatus();
    }
  },

  observers: {
    'selectedIds': function() {
      this.updateCheckedStatus();
    }
  },

  methods: {
    updateCheckedStatus() {
      const { selectedIds } = this.data;
      
      const problemTypes = this.data.problemTypes.map(p => ({
        ...p,
        checked: selectedIds.includes(p.id)
      }));
      
      const selectedCount = problemTypes.filter(p => p.checked).length;
      
      this.setData({ problemTypes, selectedCount });
    },
    
    onToggle(e) {
      const id = e.currentTarget.dataset.id;
      
      let problemTypes = this.data.problemTypes.map(p => {
        if (p.id === id) {
          // 如果是单选模式，先取消所有
          if (!this.data.multiple) {
            return { ...p, checked: true };
          }
          
          // 多选模式
          if (!p.checked && this.data.selectedCount >= this.data.maxSelect) {
            // 已达最大数量，不允许继续选择
            wx.showToast({
              title: `最多选择${this.data.maxSelect}个问题`,
              icon: 'none'
            });
            return p;
          }
          
          return { ...p, checked: !p.checked };
        }
        
        // 单选模式：取消其他
        if (!this.data.multiple) {
          return { ...p, checked: false };
        }
        
        return p;
      });
      
      // 单选模式需要特殊处理
      if (!this.data.multiple) {
        problemTypes = this.data.problemTypes.map(p => ({
          ...p,
          checked: p.id === id
        }));
      }
      
      const selectedIds = problemTypes.filter(p => p.checked).map(p => p.id);
      const selectedNames = problemTypes.filter(p => p.checked).map(p => p.name);
      const selectedCount = selectedIds.length;
      
      this.setData({ problemTypes, selectedCount });
      
      // 触发事件
      this.triggerEvent('change', {
        ids: selectedIds,
        names: selectedNames,
        count: selectedCount
      });
    }
  }
});