/**
 * 初始化 VIP 系统数据库
 * 
 * 使用方法：
 * 1. 在微信开发者工具中打开「云开发」控制台
 * 2. 创建以下集合：
 *    - users（用户信息）
 *    - vip_orders（VIP 订单）
 * 3. 运行此脚本初始化数据
 */

// 在云函数中运行此代码，或在小程序中临时调用

const initCode = `
// 创建 users 集合索引
db.collection('users').createIndex({
  openid: 1
}, {
  unique: true
})

// 创建 vip_orders 集合索引
db.collection('vip_orders').createIndex({
  openid: 1,
  createdAt: -1
})

console.log('✅ VIP 数据库初始化完成')
`

console.log('请在云开发控制台的「数据库」中执行以下代码：')
console.log(initCode)

console.log('\n或者在小程序临时页面中调用云函数初始化：')
console.log(`
wx.cloud.callFunction({
  name: 'initVipDb'
}).then(res => {
  console.log('初始化成功:', res)
})
`)
