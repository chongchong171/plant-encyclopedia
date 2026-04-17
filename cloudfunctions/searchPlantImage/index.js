/**
 * 云函数：通过 Wikimedia Commons API 搜索植物图片
 *
 * 特点：
 * - Wikimedia Commons 是完全免费开源的图片库，无 API 限制
 * - 图片版权归属 CC BY-SA，可用于商业用途（需署名）
 * - 搜索结果优先使用高质量植物照片
 *
 * 调用：
 * wx.cloud.callFunction({
 *   name: 'searchPlantImage',
 *   data: { query: '绿萝' }
 * })
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// Wikimedia Commons API
const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php'

/**
 * 从缓存获取图片
 */
async function getImageFromCache(query) {
  try {
    const res = await db.collection('plant_search_images')
      .where({ query: query })
      .limit(1)
      .get()

    if (res.data && res.data.length > 0) {
      const cached = res.data[0]
      const cacheAge = Date.now() - cached.createdAt
      if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
        console.log('[searchPlantImage] 命中缓存:', query)
        return cached.imageUrl
      }
    }
  } catch (err) {
    console.log('[searchPlantImage] 缓存查询失败:', err)
  }
  return null
}

/**
 * 保存图片到缓存
 */
async function saveImageToCache(query, imageUrl, imageUrlThumb) {
  try {
    await db.collection('plant_search_images').add({
      data: {
        query: query,
        imageUrl: imageUrl,
        imageUrlThumb: imageUrlThumb,
        createdAt: Date.now()
      }
    })
    console.log('[searchPlantImage] 已缓存:', query)
  } catch (err) {
    console.error('[searchPlantImage] 缓存保存失败:', err)
  }
}

/**
 * 从 Wikimedia Commons 搜索植物图片
 */
async function searchFromWikimedia(query) {
  try {
    // 构建搜索关键词：中文名 + plant + flower（增加命中率）
    const searchTerms = [query, 'plant'].join(' ')
    const url = WIKIMEDIA_API +
      '?action=query' +
      '&list=search' +
      '&srnamespace=6' +  // 只搜索文件（图片）
      '&srsearch=' + encodeURIComponent(searchTerms) +
      '&srlimit=10' +
      '&format=json' +
      '&srprop=size'

    console.log('[searchPlantImage] 搜索:', query)

    // 使用云函数 HTTP 能力
    const { data } = await cloud.openapi.http.post({
      url: url
    })

    const result = JSON.parse(data)

    if (result.query && result.query.search && result.query.search.length > 0) {
      // 找到图片，获取详细信息
      const fileTitles = result.query.search.map(s => s.title)

      const detailUrl = WIKIMEDIA_API +
        '?action=query' +
        '&titles=' + encodeURIComponent(fileTitles.slice(0, 5).join('|')) +
        '&prop=imageinfo' +
        '&iiprop=url' +
        '&format=json'

      const { data: detailData } = await cloud.openapi.http.post({
        url: detailUrl
      })

      const detailResult = JSON.parse(detailData)

      if (detailResult.query && detailResult.query.pages) {
        const pages = Object.values(detailResult.query.pages)

        for (const page of pages) {
          if (page.imageinfo && page.imageinfo.length > 0) {
            const info = page.imageinfo[0]
            // 优先返回缩略图（200px），原图太大
            const thumbUrl = info.thumburl || info.url
            const fullUrl = info.url

            console.log('[searchPlantImage] 找到图片:', page.title, thumbUrl)
            return { thumbUrl, fullUrl }
          }
        }
      }
    }
  } catch (err) {
    console.error('[searchPlantImage] Wikimedia 搜索失败:', err)
  }

  return null
}

exports.main = async (event, context) => {
  const { query } = event

  if (!query) {
    return {
      success: false,
      error: '请提供搜索关键词'
    }
  }

  console.log('[searchPlantImage] 开始搜索:', query)

  // 1. 先查缓存
  const cachedUrl = await getImageFromCache(query)
  if (cachedUrl) {
    return {
      success: true,
      imageUrl: cachedUrl,
      fromCache: true,
      source: 'cache'
    }
  }

  // 2. 从 Wikimedia 搜索
  const result = await searchFromWikimedia(query)
  if (result) {
    // 缓存缩略图 URL
    await saveImageToCache(query, result.fullUrl, result.thumbUrl)
    return {
      success: true,
      imageUrl: result.thumbUrl,
      fullImageUrl: result.fullUrl,
      fromCache: false,
      source: 'wikimedia'
    }
  }

  // 3. 未找到
  return {
    success: true,
    imageUrl: '',
    fromCache: false,
    source: 'none'
  }
}
