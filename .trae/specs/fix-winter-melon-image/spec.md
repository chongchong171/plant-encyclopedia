# 冬瓜头图错误修复 Spec

## Why

用户反馈搜索冬瓜时，头图显示穿西装的男士（错误图片），而不是冬瓜。这是因为之前添加的 Pexels 图片链接 `https://images.pexels.com/photos/5322260/pexels-photo-5322260.jpeg` 返回了错误的图片。

## What Changes

- **修改**：将冬瓜的 `imageUrl` 从 Pexels 链接改为空字符串
- **原因**：Pexels 图片链接不可靠，可能返回错误图片
- **影响**：冬瓜搜索结果将显示默认占位图，而不是错误图片

## Impact

- **受影响文件**: `cloudfunctions/getCareGuide/plantCache.js`
- **受影响功能**: 发现页搜索冬瓜的结果展示
- **用户体验**: 从显示错误图片变为显示占位图（更合理）

## REMOVED Requirements

### Requirement: 冬瓜使用 Pexels 图片
**Reason**: Pexels 图片链接不可靠，返回了穿西装男士的错误图片
**Migration**: 暂时留空 imageUrl，显示占位图

## 后续优化（可选）

1. 上传冬瓜图片到云存储，使用云存储 fileID
2. 使用 AI 识别返回的真实冬瓜图片
3. 使用其他可靠的图片源
