/**
 * 云函数：获取好友排行榜
 * 
 * 功能：从数据库获取所有用户的统计数据，按不同维度排序
 * 
 * 入参：
 * {
 *   orderBy: 'plantCount' | 'survivalRate' | 'totalCareDays',
 *   limit: 20
 * }
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { orderBy = 'plantCount', limit = 20 } = event
  
  try {
    // 获取所有用户的统计数据
    // 注意：云数据库一次最多返回 100 条记录
    const res = await db.collection('user_stats')
      .where({
        'stats.plantCount': _.gt(0)  // 至少有 1 盆植物
      })
      .limit(100)
      .get()
    
    let rankings = res.data
    
    // 排序
    const sortField = `stats.${orderBy}`
    rankings.sort((a, b) => {
      const valueA = a.stats?.[orderBy] || 0
      const valueB = b.stats?.[orderBy] || 0
      return valueB - valueA
    })
    
    // 取前 N 名
    rankings = rankings.slice(0, limit)
    
    // 添加排名
    rankings = rankings.map((item, index) => ({
      rank: index + 1,
      _id: item._id,
      _openid: item._openid,
      nickName: item.nickName || '植物达人',
      avatarUrl: item.avatarUrl || '',
      stats: item.stats,
      featuredPlant: item.featuredPlant,
      isMe: item._openid === wxContext.OPENID
    }))
    
    // 找到当前用户的排名
    const myIndex = rankings.findIndex(r => r._openid === wxContext.OPENID)
    let myRank = null
    
    if (myIndex >= 0) {
      myRank = {
        rank: myIndex + 1,
        ...rankings[myIndex]
      }
    } else {
      // 用户不在前 N 名，需要单独查询
      const myRes = await db.collection('user_stats')
        .where({
          _openid: wxContext.OPENID
        })
        .limit(1)
        .get()
      
      if (myRes.data.length > 0) {
        // 计算用户实际排名
        const myStats = myRes.data[0]
        const myValue = myStats.stats?.[orderBy] || 0
        
        // 统计比用户排名高的人数
        const countRes = await db.collection('user_stats')
          .where({
            [`stats.${orderBy}`]: _.gt(myValue)
          })
          .count()
        
        myRank = {
          rank: countRes.total + 1,
          _openid: wxContext.OPENID,
          nickName: myStats.nickName || '我',
          stats: myStats.stats,
          featuredPlant: myStats.featuredPlant,
          isMe: true
        }
      }
    }
    
    return {
      success: true,
      rankings,
      myRank,
      total: res.data.length
    }
    
  } catch (err) {
    console.error('获取好友排行失败:', err)
    return {
      success: false,
      error: err.message,
      rankings: [],
      myRank: null
    }
  }
}