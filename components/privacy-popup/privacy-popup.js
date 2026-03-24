/**
 * 隐私协议弹窗组件
 */
Component({
  data: {
    showPrivacy: false
  },
  lifetimes: {
    attached() {
      // 检查是否需要弹出隐私协议
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: res => {
            console.log('隐私设置', res);
            if (res.needAuthorization) {
              this.setData({ showPrivacy: true });
            }
          },
          fail: err => {
            console.log('获取隐私设置失败', err);
          }
        });
      }
    }
  },
  methods: {
    handleAgree() {
      this.setData({ showPrivacy: false });
      // 触发同意事件
      this.triggerEvent('agree');
    },
    handleDisagree() {
      this.setData({ showPrivacy: false });
      wx.showModal({
        title: '提示',
        content: '您拒绝了隐私协议，部分功能将无法使用',
        showCancel: false
      });
    }
  }
});