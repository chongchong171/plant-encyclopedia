# 植物百科小程序 - 代码检查报告

**检查时间：** 2026-03-24  
**检查依据：** docs/DESIGN_SPEC.md

---

## 🔴 严重问题（必须修复）

### 1. API Key 硬编码分散

**问题：** API Key 没有统一从 app.globalData 获取

**位置：**
```
pages/home/home.js:67 - 直接硬编码
pages/search_result/search_result.js:4 - 定义了 API_KEY 常量
utils/plantIdentify.js:12 - PLANTNET_API_KEY 硬编码
utils/plantIdentify.js:14 - QWEN_API_KEY 硬编码
```

**修复方案：**
```javascript
// 应该改为
const apiKey = app.globalData.qwenApiKey;
const plantnetKey = app.globalData.plantnetApiKey;
```

---

### 2. 热门植物配置分散

**问题：** hotPlants 配置没有统一到 app.globalData

**位置：**
- pages/search_detail/search_detail.js:14
- pages/search_page/search_page.js:6

**修复方案：**
- 在 app.js 的 globalData 中定义 hotPlants
- 各页面从 app.globalData.hotPlants 读取

---

### 3. formatTime 函数重复

**问题：** favorites.js 和 history.js 中有重复的 formatTime 函数

**位置：**
- pages/favorites/favorites.js:39
- pages/history/history.js:39

**修复方案：**
```javascript
// 删除重复函数，改为引用
const { formatRelativeTime } = require('../../utils/util');
// 使用 formatRelativeTime(item.addTime)
```

---

## 🟡 中等问题（建议修复）

### 4. 字体大小不规范

**标准值：** 48rpx, 36rpx, 32rpx, 28rpx, 24rpx, 22rpx

**非标准值：**
| 值 | 出现次数 | 建议 |
|---|---------|------|
| 30rpx | 13 | 改为 28rpx 或 32rpx |
| 26rpx | 10 | 改为 28rpx |
| 40rpx | 5 | 改为 36rpx 或 48rpx |
| 44rpx | 1 | 改为 48rpx |
| 100rpx, 120rpx | 6 | emoji 图标大小，可保留 |

---

### 5. 圆角大小不规范

**标准值：** 12rpx, 16rpx, 20rpx, 24rpx, 40rpx

**非标准值：**
| 值 | 出现次数 | 建议 |
|---|---------|------|
| 30rpx | 6 | 改为 20rpx 或 40rpx |
| 50rpx | 2 | 改为 40rpx（圆形按钮） |
| 45rpx | 1 | 改为 40rpx |
| 8rpx | 2 | 改为 12rpx |

---

### 6. 数据结构不一致

**问题：** result_swiper.js 和 search_result.js 中的 plant 数据结构不一致

**result_swiper.js 缺少字段：**
- commonNames（常用名）
- plantProfile（植物档案）
- growthHabit（生长习性）
- distribution（分布范围）
- mainValue（主要价值）
- difficultyLevel（难度等级）
- quickTips（快速要点）
- faq（常见问题）

**修复方案：** 统一使用设计规范中的数据结构

---

## 🟢 轻微问题（可选修复）

### 7. 组件样式不统一

**问题：** 不同页面的卡片、按钮样式不一致

**现状：**
- 卡片样式定义：1 处
- 按钮样式定义：4 处（重复）

**建议：** 创建公共样式文件 `app.wxss`，统一定义组件样式

---

## 📊 修复优先级

| 优先级 | 问题 | 影响 | 预计时间 |
|-------|------|------|---------|
| P0 | API Key 分散 | 安全风险 | 10分钟 |
| P0 | 热门植物配置分散 | 维护困难 | 5分钟 |
| P1 | formatTime 重复 | 代码冗余 | 5分钟 |
| P1 | 数据结构不一致 | 功能缺失 | 20分钟 |
| P2 | 字体大小不规范 | 视觉不一致 | 30分钟 |
| P2 | 圆角大小不规范 | 视觉不一致 | 20分钟 |
| P3 | 组件样式不统一 | 维护困难 | 30分钟 |

**总计：** 约 2 小时

---

## 下一步

女王大人确认后，瓜瓜按优先级逐一修复这些问题 🐾