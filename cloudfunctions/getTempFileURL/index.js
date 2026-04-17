// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const { fileID } = event
    
    if (!fileID) {
      return {
        success: false,
        error: '请提供 fileID 参数'
      }
    }
    
    const result = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    console.log('获取临时链接成功:', result)
    
    return {
      success: true,
      tempFileURL: result.fileList[0].tempFileURL
    }
  } catch (err) {
    console.error('获取临时链接失败:', err)
    return {
      success: false,
      error: err
    }
  }
}
