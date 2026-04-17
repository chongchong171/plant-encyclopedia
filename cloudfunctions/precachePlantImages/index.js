 /**
   * 云函数：预缓存分类植物图片到云存储 (极速版)
   */
 const cloud = require('wx-server-sdk')
 const https = require('https')
 const http = require('http')

 cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
 const db = cloud.database()

 // 需要预缓存的植物列表 (已去重)
 const PLANTS_TO_CACHE = [
   { name: '虎尾兰', scientificName: 'Sansevieria' },
   { name: '长寿花', scientificName: 'Kalanchoe blossfeldiana' },
   { name: '芦荟', scientificName: 'Aloe vera' },
   { name: '富贵竹', scientificName: 'Dracaena sanderiana' },
   { name: '吊兰', scientificName: 'Chlorophytum comosum' },
   { name: '万年青', scientificName: 'Rohdea japonica' },
   { name: '绿萝', scientificName: 'Epipremnum aureum' },
   { name: '虎皮兰', scientificName: 'Sansevieria trifasciata' },
   { name: '文竹', scientificName: 'Asparagus setaceus' },
   { name: '仙人掌', scientificName: 'Cactaceae' },
   { name: '竹芋', scientificName: 'Calathea' },
   { name: '空气凤梨', scientificName: 'Tillandsia' },
   { name: '波士顿蕨', scientificName: 'Nephrolepis exaltata' },
   { name: '蜘蛛抱蛋', scientificName: 'Aspidistra elatior' },
   { name: '圆叶椒草', scientificName: 'Peperomia obtusifolia' },
   { name: '金钱树', scientificName: 'Zamioculcas zamiifolia' },
   { name: '君子兰', scientificName: 'Clivia miniata' },
   { name: '蝴蝶兰', scientificName: 'Phalaenopsis aphrodite' },
   { name: '栀子花', scientificName: 'Gardenia jasminoides' },
   { name: '茉莉花', scientificName: 'Jasminum sambac' },
   { name: '天竺葵', scientificName: 'Pelargonium' },
   { name: '矮牵牛', scientificName: 'Petunia' },
   { name: '月季', scientificName: 'Rosa chinensis' },
   { name: '发财树', scientificName: 'Pachira aquatica' },
   { name: '龟背竹', scientificName: 'Monstera deliciosa' }
 ]

 const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php'

 /**
  * 原生 HTTP GET 请求（支持自动跳转 + User-Agent）
  */
 function httpGetWithRedirect(url) {
   return new Promise((resolve, reject) => {
     const client = url.startsWith('https') ? https : http
     const options = {
       headers: { 'User-Agent': 'PlantApp/1.0 (Cloud Function)' }
     }

     client.get(url, options, (res) => {
       // 处理 301/302 跳转
       if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
         const location = res.headers.location
         if (location) {
           return resolve(httpGetWithRedirect(location))
         }
         return reject(new Error('Redirect without location'))
       }

       if (res.statusCode !== 200) {
         return reject(new Error(`HTTP Error: ${res.statusCode}`))
       }

       const chunks = []
       res.on('data', chunk => chunks.push(chunk))
       res.on('end', () => resolve(Buffer.concat(chunks)))
     }).on('error', reject)
   })
 }

 /**
  * 从 Wikimedia 搜索植物图片 URL
  */
 async function searchWikimediaImage(query) {
   try {
     const searchTerms = [query, 'plant'].join(' ')
     const searchUrl = WIKIMEDIA_API +
       '?action=query&list=search&srnamespace=6' +
       '&srsearch=' + encodeURIComponent(searchTerms) +
       '&srlimit=5&format=json'

     const resultStr = await httpGetWithRedirect(searchUrl)
     const result = JSON.parse(resultStr)

     if (result.query && result.query.search && result.query.search.length > 0) {
       const fileTitle = result.query.search[0].title
       const detailUrl = WIKIMEDIA_API +
         '?action=query&titles=' + encodeURIComponent(fileTitle) +
         '&prop=imageinfo&iiprop=url&format=json'

       const detailStr = await httpGetWithRedirect(detailUrl)
       const detailResult = JSON.parse(detailStr)

       if (detailResult.query && detailResult.query.pages) {
         const page = Object.values(detailResult.query.pages)[0]
         if (page.imageinfo && page.imageinfo.length > 0) {
           return page.imageinfo[0].url
         }
       }
     }
   } catch (err) {
     console.error(`  搜索 ${query} 失败:`, err.message)
   }
   return null
 }

 /**
  * 下载图片并上传到云存储 (直接使用 Buffer，不写硬盘)
  */
 async function downloadAndUpload(plantName, sourceUrl) {
   try {
     const cloudPath = `plant-images/categories/${plantName}.jpg`
     console.log(`  正在下载: ${plantName}`)

     const buffer = await httpGetWithRedirect(sourceUrl)

     console.log(`  正在上传: ${plantName} (${(buffer.length/1024).toFixed(1)}KB)`)
     const uploadRes = await cloud.uploadFile({
       cloudPath: cloudPath,
       fileContent: buffer
     })

     return uploadRes.fileID
   } catch (err) {
     console.error(`  失败: ${plantName}`, err.message)
     return null
   }
 }

 /**
  * 检查是否已缓存
  */
 async function isCached(plantName) {
   try {
     const res = await db.collection('plant_cache')
       .where({ plantName: plantName })
       .limit(1)
       .get()
     return res.data && res.data.length > 0 ? res.data[0].cloudUrl : null
   } catch (err) {
     return null
   }
 }

 /**
  * 保存缓存记录
  */
 async function saveCache(plantName, cloudUrl) {
   try {
     await db.collection('plant_cache').add({
       data: {
         plantName: plantName,
         cloudUrl: cloudUrl,
         createdAt: Date.now()
       }
     })
   } catch (err) {
     console.error(`  保存 ${plantName} 缓存失败:`, err.message)
   }
 }

 exports.main = async (event, context) => {
   const { action } = event

   if (action !== 'init') {
     return { success: false, error: '请传入 action: init' }
   }

   const results = []
   let successCount = 0
   let failCount = 0
   let skipCount = 0

   console.log(`[precache] 开始预缓存 ${PLANTS_TO_CACHE.length} 种植物图片`)

   for (const plant of PLANTS_TO_CACHE) {
     // 跳过已缓存的
     const existingCloudUrl = await isCached(plant.name)
     if (existingCloudUrl) {
       results.push({ name: plant.name, status: 'skipped', cloudUrl: existingCloudUrl })
       skipCount++
       console.log(`[precache] 跳过已缓存: ${plant.name}`)
       continue
     }

     // 搜索 Wikimedia 图片
     const sourceUrl = await searchWikimediaImage(plant.scientificName || plant.name)

     if (!sourceUrl) {
       results.push({ name: plant.name, status: 'not_found' })
       failCount++
       console.log(`[precache] 未找到图片: ${plant.name}`)
       continue
     }

     // 下载并上传到云存储
     const cloudUrl = await downloadAndUpload(plant.name, sourceUrl)

     if (cloudUrl) {
       await saveCache(plant.name, cloudUrl)
       results.push({ name: plant.name, status: 'success', cloudUrl })
       successCount++
     } else {
       results.push({ name: plant.name, status: 'upload_failed' })
       failCount++
     }
   }

   return {
     success: true,
     total: PLANTS_TO_CACHE.length,
     successCount,
     failCount,
     skipCount,
     results
   }
 }