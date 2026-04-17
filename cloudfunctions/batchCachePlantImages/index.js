/**
 * 云函数：批量写入植物图片缓存到数据库
 *
 * 功能：把已上传到云存储的植物图片 cloud:// 路径写入 plant_cache 集合
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PLANTS = [
  { name: '虎尾兰', file: 'hubilan.png' },
  { name: '长寿花', file: 'changshouhua.png' },
  { name: '芦荟', file: 'luhui.png' },
  { name: '富贵竹', file: 'fuguizhu.png' },
  { name: '吊兰', file: 'diaolan.png' },
  { name: '万年青', file: 'wannianqing.png' },
  { name: '绿萝', file: 'lvluo.png' },
  { name: '虎皮兰', file: 'hupilan.png' },
  { name: '文竹', file: 'wenzhu.png' },
  { name: '仙人掌', file: 'xianrenzhang.png' },
  { name: '竹芋', file: 'zhuyu.png' },
  { name: '空气凤梨', file: 'kongqifengli.png' },
  { name: '波士顿蕨', file: 'boshidunjue.png' },
  { name: '蜘蛛抱蛋', file: 'zhiwubaodan.png' },
  { name: '圆叶椒草', file: 'yuanyejiaocao.png' },
  { name: '金钱树', file: 'jinqianshu.png' },
  { name: '君子兰', file: 'junzilan.png' },
  { name: '蝴蝶兰', file: 'hudielan.png' },
  { name: '栀子花', file: 'zhizihua.png' },
  { name: '茉莉花', file: 'molihua.png' },
  { name: '天竺葵', file: 'tianzhukui.png' },
  { name: '矮牵牛', file: 'aiqianniu.png' },
  { name: '月季', file: 'yueji.png' },
  { name: '发财树', file: 'facaishu.png' },
  { name: '龟背竹', file: 'guibeizhu.png' }
]

exports.main = async (event) => {
  const results = []
  let successCount = 0
  let skipCount = 0
  let failCount = 0

  console.log('[batchCache] 开始写入 25 张植物图片缓存')

  for (const plant of PLANTS) {
    // 正确的 cloud:// fileID 格式：cloud://{env-id}/{file-path}
    // cloudPath 必须与 uploadFile 返回的 fileID 格式一致
    const cloudPath = `cloud://plant-encyclopedia-8d9x10139590b/plant-images/categories/${plant.file}`

    try {
      // 检查是否已有缓存
      const existing = await db.collection('plant_cache')
        .where({ plantName: plant.name })
        .limit(1)
        .get()

      if (existing.data && existing.data.length > 0) {
        // 更新已有
        await db.collection('plant_cache').doc(existing.data[0]._id).update({
          data: {
            cloudUrl: cloudPath,
            updatedAt: Date.now()
          }
        })
        skipCount++
        console.log(`[更新] ${plant.name} -> ${cloudPath}`)
        results.push({ name: plant.name, status: 'updated', cloudUrl: cloudPath })
      } else {
        // 新增
        await db.collection('plant_cache').add({
          data: {
            plantName: plant.name,
            cloudUrl: cloudPath,
            createdAt: Date.now()
          }
        })
        successCount++
        console.log(`[新增] ${plant.name} -> ${cloudPath}`)
        results.push({ name: plant.name, status: 'created', cloudUrl: cloudPath })
      }
    } catch (err) {
      failCount++
      console.log(`[失败] ${plant.name}: ${err.message}`)
      results.push({ name: plant.name, status: 'error', error: err.message })
    }
  }

  console.log(`=== 完成 ===`)
  console.log(`新增: ${successCount} | 更新: ${skipCount} | 失败: ${failCount}`)

  return {
    success: true,
    successCount,
    skipCount,
    failCount,
    results
  }
}
