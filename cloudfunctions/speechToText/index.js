const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { audioPath } = event
  
  if (!audioPath) {
    return { success: false, error: '缺少音频路径' }
  }

  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: 'voice_check'
    })
    
    const res = await cloud.getTempFileURL({
      fileList: [audioPath]
    })
    
    if (!res.fileList || !res.fileList[0] || !res.fileList[0].tempFileURL) {
      return { success: false, error: '获取音频文件失败' }
    }

    return {
      success: true,
      text: '',
      tempFileURL: res.fileList[0].tempFileURL,
      hint: '语音识别功能需要配置腾讯云语音识别服务，当前返回占位文本'
    }
  } catch (e) {
    console.error('[speechToText] 错误:', e)
    return { success: false, error: e.message || '语音识别失败' }
  }
}
