# 程序功能验证与图片清理检查

## Why
从 GitHub 同步的最新代码删除了大量图片文件（81 个文件，包括中文命名的植物图片），需要验证：
1. 所有功能是否仍能正常运作
2. 被删除的图片是否都是多余的
3. 当前图片策略是否依然有效

## What Changes
- 验证所有页面的图片引用是否正常
- 验证云函数图片获取逻辑是否工作
- 确认被删除图片的影响范围
- 检查当前图片策略的有效性

## Impact
- **Affected specs**: 植物图片源解决方案、识植物头图快速解决方案
- **Affected code**: 
  - `cloudfunctions/getCareGuide/index.js` - 图片获取逻辑
  - `pages/search_result/search_result.js` - 搜索结果图片加载
  - 所有使用图片的页面（home, discover, my-plants 等）

## ADDED Requirements

### Requirement: 功能完整性验证
系统 SHALL 验证以下核心功能正常工作：
1. 首页识别功能（能正常显示识别结果和头图）
2. 搜索功能（搜索结果能显示头图）
3. 发现页搜索（能正常搜索并显示结果）
4. 我的花园（能正常显示花园头图）
5. 发现页（能正常显示头图）

#### Scenario: 搜索植物
- **WHEN** 用户搜索任意植物名称
- **THEN** 搜索结果页面立即显示，头图在 3 秒内加载

#### Scenario: 识别植物
- **WHEN** 用户上传植物照片进行识别
- **THEN** 识别结果页面显示，头图正常加载

### Requirement: 图片使用清单
系统 SHALL 提供当前所有正在使用的图片清单：
1. 静态资源图片（图标、背景图等）
2. 动态加载图片（植物图片、用户头像等）
3. 默认占位图片

### Requirement: 图片删除影响评估
系统 SHALL 评估被删除图片的影响：
1. 列出所有被删除的图片
2. 标记哪些图片正在被代码引用
3. 确认删除是否导致功能异常

## MODIFIED Requirements

### Requirement: 植物图片策略
**当前策略**：使用云函数动态获取图片（GBIF > 维基百科 > Unsplash 默认图）

**修改为**：
1. 不维护本地植物图片库
2. 完全依赖云函数动态获取
3. 保证有默认图保底

## REMOVED Requirements

### Requirement: 本地植物图片库
**Reason**: 根据文档《植物图片源解决方案.md》，维护本地图片库工作量大、维护成本高，且已被排除

**Migration**: 
- 使用云函数动态获取图片
- 使用 Unsplash、GBIF、维基百科等免费 API
- 保留默认图作为保底

---

## 验证范围

### 需要验证的页面
1. ✅ 首页 (`pages/home`) - 背景视频/图片
2. ✅ 发现页 (`pages/discover`) - 头图
3. ✅ 我的花园 (`pages/my-plants`) - 头图
4. ✅ 搜索结果 (`pages/search_result`) - 植物头图
5. ✅ 识别结果 (`pages/result_swiper`) - 植物头图
6. ✅ 相机页 (`pages/camera`) - 图标

### 需要检查的云函数
1. ✅ `getCareGuide` - 植物图片和详情获取
2. ✅ `intentClassify` - 意图识别
3. ✅ `identifyPlant` - 植物识别

### 需要确认的图片
1. ✅ `/image/scenes/home-poster.jpg` - 首页背景
2. ✅ `/image/discover-header.jpg` - 发现页头图（已删除？）
3. ✅ `/image/garden-header.jpg` - 花园页头图（已删除？）
4. ✅ `/image/icons/*.svg` - 图标文件（已删除？）
