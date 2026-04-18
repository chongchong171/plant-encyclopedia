/**
 * 首页视频模块化配置
 * 
 * 后期可替换单个片段，无需重新处理全部
 * 
 * 使用方式：
 * 1. 替换 image/scenes/ 下的单个片段文件
 * 2. 更新此配置文件的文件名
 * 3. 重新合成：ffmpeg -f concat -i concat.txt -c:v libx264 -crf 28 -an output.mp4
 */

const VIDEO_MODULES = {
  // 片段配置
  segments: [
    {
      name: '雨天',
      file: 'segment-rain.mp4',
      path: 'image/scenes/segment-rain.mp4',
      duration: 5,        // 秒
      resolution: '720x1280',
      source: {
        file: 'e87cbe5e-6f36-422b-aa22-d97e9fbb00a3.mp4',
        size: '540x960',
        watermark: '左上角',
        process: 'crop=540:840:0:60,scale=720:1280'
      }
    },
    {
      name: '阳光',
      file: 'segment-sun.mp4',
      path: 'image/scenes/segment-sun.mp4',
      duration: 5,
      resolution: '720x1280',
      source: {
        file: 'b84c48d5-a2e6-4e5b-9843-473325aa1dc4.mp4',
        size: '960x960',
        watermark: '右上角 + 右下角',
        process: 'delogo=x=850:y=20:w=105:h=50,delogo=x=800:y=900:w=155:h=55,scale=720:1280'
      }
    },
    {
      name: '光影',
      file: 'segment-light.mp4',
      path: 'image/scenes/segment-light.mp4',
      duration: 2,        // ⚠️ 缩短为2秒
      resolution: '720x1280',
      source: {
        file: '71fd8372-323b-4509-ad16-6ad4d1c82f09.mp4',
        size: '720x720',
        watermark: '中间偏左 + 右下角',
        process: 'delogo=x=300:y=350:w=100:h=50,delogo=x=580:y=620:w=120:h=80,scale=720:1280'
      }
    }
  ],

  // 最终合成配置
  output: {
    file: 'home-video-v10.mp4',
    path: 'image/scenes/home-video-v10.mp4',
    resolution: '720x1280',
    totalDuration: 12,   // 雨天5秒+阳光5秒+光影2秒=12秒
    crf: 28,             // 压缩质量
    maxSize: '1.5MB'
  },

  // CDN 配置
  cdn: {
    baseUrl: 'https://cdn.jsdelivr.net/gh/chongchong171/plant-encyclopedia@0c818f8',
    fullPath: 'https://cdn.jsdelivr.net/gh/chongchong171/plant-encyclopedia@0c818f8/image/scenes/home-video-v10.mp4'
  }
}

// 生成 ffmpeg 合成命令
function generateConcatCommand() {
  const files = VIDEO_MODULES.segments.map(s => `file '${s.file}'`).join('\n')
  return `# 1. 创建 concat.txt
echo "${files}" > concat.txt

# 2. 合成视频
ffmpeg -f concat -safe 0 -i concat.txt -c:v libx264 -crf ${VIDEO_MODULES.output.crf} -preset medium -an ${VIDEO_MODULES.output.file}`
}

// 生成单个片段处理命令
function generateSegmentCommand(index) {
  const seg = VIDEO_MODULES.segments[index]
  if (!seg) return null
  
  return `ffmpeg -i /path/to/${seg.source.file} -vf "${seg.source.process}" -c:v libx264 -crf 23 -an ${seg.file}`
}

module.exports = {
  VIDEO_MODULES,
  generateConcatCommand,
  generateSegmentCommand
}
