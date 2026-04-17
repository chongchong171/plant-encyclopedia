# 程序功能验证与图片清理报告

**验证时间**: 2026-04-12  
**验证范围**: 所有页面功能、图片引用、云函数逻辑

---

## 📊 验证总结

### ✅ 功能正常
1. **云函数图片获取逻辑** - 工作正常
   - GBIF（拉丁学名优先）+ Pexels（中文名备选）
   - 总超时控制 10 秒（GBIF 8 秒 + Pexels 2 秒）
   - 有保底策略（返回空字符串，前端显示占位图）

2. **前端图片加载逻辑** - 工作正常
   - 搜索页面：云函数获取图片，失败显示占位图
   - 异步加载，不阻塞页面显示

### ❌ 严重问题：所有静态图片文件已删除

**被删除的文件**（最新提交 ca71b76）：
```
image/1-high.png
image/1.png
image/2.png
image/3.png
image/4-high.png
image/4.png
image/camera.png
image/cloudy.png
image/discover-header.jpg          ⚠️ 代码仍在引用
image/empty-favorite.png
image/empty-history.png
image/error.png
image/garden-header.jpg            ⚠️ 代码仍在引用
image/hero-garden-option-a.jpg
image/home.png
image/home_selected.png
image/icons/album-action.svg       ⚠️ 代码仍在引用
image/icons/book-green.svg
image/icons/camera-action.svg      ⚠️ 代码仍在引用
image/icons/camera-orange.svg
image/icons/fire-red.svg
image/icons/leaf-yellow.svg
image/icons/lightbulb.svg
image/icons/search-red.svg
image/icons/water-blue.svg
image/loading.gif
image/logo2-1.png
image/logoa.png
image/logofff.png
image/me.png
image/me_selected.png
image/plants/三千年.jpg            (21 个假图片文件)
image/plants/仙人掌.jpg
image/plants/吊兰.jpg
... (共 21 个中文命名图片，实际是 HTML 网页)
image/query.png
image/query_selected.png
image/retake.png
image/scenes/home-poster.jpg       ⚠️ 代码仍在引用
image/search.png
image/tab/compass-active.png
image/tab/compass.png
image/tab/discover-active.png
image/tab/discover-white.png
image/tab/garden-active.png
image/tab/garden-white.png
image/tab/garden.png
image/tab/heart-active.png
image/tab/heart.png
image/tab/home-active.png
image/tab/home-white.png
image/tab/scan-active.png
image/tab/scan.png
image/tab/search-active.png
image/tab/search.png
image/tab/user-active.png
image/tab/user-white.png
image/tab/user.png
image/unknow_icon.png
image/upload.png
image/water_bg.png
image/default-avatar.png           ⚠️ 代码仍在引用
```

**删除原因**：
- `image/plants/` 目录下的 21 个中文命名图片实际是 HTML 网页（假图片）
- 其他图片文件被清理

---

## 🔍 当前代码中的图片引用

### 正在使用但已被删除的图片

| 文件路径 | 引用位置 | 状态 |
|---------|---------|------|
| `/image/scenes/home-poster.jpg` | `pages/home/home.wxml:9` | ❌ 文件不存在 |
| `/image/discover-header.jpg` | `pages/discover/discover.wxml:5` | ❌ 文件不存在 |
| `/image/garden-header.jpg` | `pages/my-plants/my-plants.wxml:5` | ❌ 文件不存在 |
| `/image/icons/camera-action.svg` | `pages/home/home.wxml:228` | ❌ 文件不存在 |
| `/image/icons/album-action.svg` | `pages/home/home.wxml:232` | ❌ 文件不存在 |
| `/image/default-avatar.png` | `pages/community-garden/community-garden.wxml` (多处) | ❌ 文件不存在 |

### 影响范围

1. **首页** (`pages/home/home.wxml`)
   - 背景图缺失：`/image/scenes/home-poster.jpg`
   - 快速操作图标缺失：`camera-action.svg`, `album-action.svg`
   - **影响**：首页背景可能是空白或默认色，快速操作图标不显示

2. **发现页** (`pages/discover/discover.wxml`)
   - 头图缺失：`/image/discover-header.jpg`
   - **影响**：发现页头部可能是空白或默认色

3. **我的花园** (`pages/my-plants/my-plants.wxml`)
   - 头图缺失：`/image/garden-header.jpg`
   - **影响**：花园页头部可能是空白或默认色

4. **社区花园** (`pages/community-garden/community-garden.wxml`)
   - 默认头像缺失：`/image/default-avatar.png`
   - **影响**：用户头像加载失败时显示空白

---

## ✅ 植物图片策略（云函数端）

**当前策略**：完全不依赖本地图片库，使用云函数动态获取

```
优先级：
1. GBIF（拉丁学名）- 8 秒超时 - 科学级准确度
2. Pexels（中文名）- 2 秒超时 - 快速备选
3. 空字符串 - 前端显示占位图
```

**代码位置**：
- `cloudfunctions/getCareGuide/index.js` - `getPlantImageFromFreeSources()` 函数
- `pages/search_result/search_result.js` - `searchPlant()` 函数

**验证结果**：✅ 逻辑完整，能正常工作

---

## 📋 当前图片使用清单

### 静态资源图片（已删除，需要恢复或替换）

| 用途 | 文件路径 | 状态 |
|------|---------|------|
| 首页背景 | `/image/scenes/home-poster.jpg` | ❌ 缺失 |
| 发现页头图 | `/image/discover-header.jpg` | ❌ 缺失 |
| 花园页头图 | `/image/garden-header.jpg` | ❌ 缺失 |
| 快速操作图标 1 | `/image/icons/camera-action.svg` | ❌ 缺失 |
| 快速操作图标 2 | `/image/icons/album-action.svg` | ❌ 缺失 |
| 默认用户头像 | `/image/default-avatar.png` | ❌ 缺失 |

### Tab 栏图标（已删除，但可能被小程序基础组件替代）

| 图标 | 文件路径 | 状态 |
|------|---------|------|
| 首页 | `/image/tab/home.png` 等 | ❌ 已删除 |
| 花园 | `/image/tab/garden.png` 等 | ❌ 已删除 |
| 发现 | `/image/tab/discover.png` 等 | ❌ 已删除 |
| 我的 | `/image/tab/user.png` 等 | ❌ 已删除 |

**说明**：Tab 栏图标可能在 `app.json` 中配置，需要检查是否使用了图片路径

### 动态加载图片（不需要本地文件）

| 用途 | 来源 | 状态 |
|------|------|------|
| 植物头图 | GBIF / Pexels API | ✅ 正常 |
| 用户头像 | 用户微信头像或上传 | ✅ 正常 |
| 相册图片 | 用户手机相册 | ✅ 正常 |

---

## ⚠️ 问题与建议

### 严重问题（影响功能）

1. **首页背景图缺失**
   - 文件：`/image/scenes/home-poster.jpg`
   - 影响：首页可能显示空白背景
   - 建议：恢复该文件或修改代码使用视频背景

2. **发现页和花园页头图缺失**
   - 文件：`/image/discover-header.jpg`, `/image/garden-header.jpg`
   - 影响：页面头部可能显示空白
   - 建议：恢复这些文件或修改设计使用纯色背景

3. **首页快速操作图标缺失**
   - 文件：`/image/icons/camera-action.svg`, `/image/icons/album-action.svg`
   - 影响：图标不显示，用户无法识别功能
   - 建议：恢复这些图标或使用 emoji/文字替代

4. **默认头像缺失**
   - 文件：`/image/default-avatar.png`
   - 影响：用户头像加载失败时显示空白
   - 建议：恢复该文件或使用 base64 默认头像

### 建议的修复方案

#### 方案 A：恢复关键图片文件（推荐）

从 Git 历史中恢复以下文件：
```bash
git checkout HEAD~1 -- image/scenes/home-poster.jpg
git checkout HEAD~1 -- image/discover-header.jpg
git checkout HEAD~1 -- image/garden-header.jpg
git checkout HEAD~1 -- image/icons/camera-action.svg
git checkout HEAD~1 -- image/icons/album-action.svg
git checkout HEAD~1 -- image/default-avatar.png
```

#### 方案 B：修改代码，移除图片依赖

1. 首页背景改用视频（已有 `home-video-v12.mp4`）
2. 发现页和花园页使用 CSS 渐变背景
3. 快速操作图标使用 emoji（📷 📸）
4. 默认头像使用 base64 或 CSS 圆形占位符

#### 方案 C：使用在线图片源

1. 使用 Unsplash 等在线图片 CDN
2. 使用 emoji 或 iconfont 替代图标

---

## 🎯 结论

### ✅ 正确的删除
- `image/plants/` 目录下的 21 个假图片文件（实际是 HTML 网页）- **删除正确**
- 前端本地图片映射表（localImages）- **删除正确**，因为当前策略是云函数动态获取

### ⚠️ 错误的删除（需要恢复）
- 首页背景图、发现页头图、花园页头图 - **需要恢复**
- 快速操作图标、默认头像 - **需要恢复**
- Tab 栏图标 - **需要检查 app.json 配置**

### 📝 当前植物图片策略
- ✅ 云函数动态获取（GBIF + Pexels）- **策略正确，无需本地图片库**
- ✅ 前端异步加载，不阻塞页面 - **实现正确**
- ✅ 有保底策略（占位图）- **设计完整**

---

## 🔧 下一步行动

1. **立即恢复关键图片文件**（方案 A）
2. **验证 Tab 栏图标配置**（检查 app.json）
3. **测试所有页面显示**（确认背景、图标正常）
4. **更新 checklist.md**（标记已验证的项目）

---

*报告生成时间：2026-04-12*  
*验证人：AI 助手*
