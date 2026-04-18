Component({
  data: {
    selected: 0,
    homePage: true,
    icons: ['home', 'garden', 'discover', 'user'],
    texts: ['首页', '花园', '发现', '我的'],
    paths: ['/pages/home/home', '/pages/my-plants/my-plants', '/pages/discover/discover', '/pages/profile/profile']
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.paths[index]
      wx.switchTab({ url })
    }
  }
});