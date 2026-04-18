# 组件层规范 (components/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

- 可复用 UI 组件
- 统一样式（从 config/constants 获取尺寸）
- 标准事件

---

## 二、文件结构

```
components/
├── plant-card/       # 植物卡片
│   ├── plant-card.js
│   ├── plant-card.json
│   ├── plant-card.wxml
│   └── plant-card.wxss
├── water-badge/      # 浇水角标
└── problem-picker/   # 问题选择器
```

---

## 三、命名规范

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件名 | kebab-case | plant-card |
| 文件名 | 与组件名一致 | plant-card.js |
| 属性名 | camelCase | showWaterBadge |
| 事件名 | camelCase | bind:water |
| CSS 类名 | BEM | plant-card__image |

---

## 四、组件规范

### 4.1 plant-card（植物卡片）

**用途：** 显示植物信息卡片

**属性：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| plant | Object | {} | 植物数据 |
| showWaterBadge | Boolean | false | 是否显示浇水角标 |
| showActions | Boolean | false | 是否显示操作按钮 |
| showLightNeed | Boolean | false | 是否显示光照需求 |
| mode | String | 'list' | 模式：list/grid/compact |

**事件：**

| 事件 | 参数 | 说明 |
|------|------|------|
| tap | { id, plant } | 卡片点击 |
| water | { id, plant } | 浇水按钮 |
| fertilize | { id, plant } | 施肥按钮 |
| diagnosis | { id, plant } | 诊断按钮 |
| delete | { id, name } | 删除按钮 |

**使用示例：**

```xml
<plant-card 
  plant="{{item}}"
  show-water-badge="{{true}}"
  show-actions="{{true}}"
  bind:tap="goToDetail"
  bind:water="recordWatering"
  bind:delete="confirmDelete"
/>
```

---

### 4.2 water-badge（浇水角标）

**用途：** 显示浇水状态

**属性：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| daysUntil | Number | null | 剩余天数 |
| size | String | 'medium' | 尺寸：small/medium/large |
| animated | Boolean | true | 是否显示动画 |

**状态：**

| 状态 | 条件 | 颜色 |
|------|------|------|
| urgent | daysUntil <= 0 | 红色（闪烁） |
| soon | daysUntil <= 2 | 黄色 |
| ok | daysUntil > 2 | 灰色 |
| unknown | daysUntil == null | 灰色 |

**使用示例：**

```xml
<water-badge days-until="{{2}}" size="large" />
```

---

### 4.3 problem-picker（问题选择器）

**用途：** 选择植物问题类型

**属性：**

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| selectedIds | Array | [] | 已选择的 ID 列表 |
| multiple | Boolean | true | 是否多选 |
| maxSelect | Number | 5 | 最大选择数量 |

**事件：**

| 事件 | 参数 | 说明 |
|------|------|------|
| change | { ids, names, count } | 选择变化 |

**使用示例：**

```xml
<problem-picker 
  selected-ids="{{selectedProblemIds}}"
  max-select="{{5}}"
  bind:change="onProblemChange"
/>
```

---

## 五、样式规范

### 5.1 全局 CSS 变量（定义在 app.wxss）

```css
/* ========== 组件尺寸 ========== */
--card-border-radius: 20rpx;
--card-padding: 20rpx;
--image-size: 120rpx;
--button-size: 80rpx;
--button-small: 60rpx;
--gap: 12rpx;

/* ========== 字号 ========== */
--font-size-xs: 20rpx;
--font-size-sm: 24rpx;
--font-size-md: 28rpx;
--font-size-lg: 32rpx;
--font-size-xl: 36rpx;

/* ========== 颜色 ========== */
--primary-color: #4CAF50;
--success-color: #52c41a;
--warning-color: #faad14;
--error-color: #ff4d4f;
--text-color: #333333;
--text-secondary: #666666;
--text-light: #999999;
--card-background: #FFFFFF;
--white: #FFFFFF;
```

### 5.2 组件中使用 CSS 变量

```css
/* ✅ 正确：使用全局变量 */
.plant-card {
  border-radius: var(--card-border-radius);
  padding: var(--card-padding);
  background: var(--card-background);
}

.plant-card__name {
  font-size: var(--font-size-lg);
  color: var(--text-color);
}

/* ❌ 错误：硬编码值 */
.plant-card {
  border-radius: 20rpx;  /* 应该用 var(--card-border-radius) */
  padding: 20rpx;        /* 应该用 var(--card-padding) */
}
```

### 5.3 CSS BEM 命名

```css
/* 块 */
.plant-card { }

/* 元素 */
.plant-card__image { }
.plant-card__name { }

/* 修饰符 */
.plant-card--grid { }
.plant-card--compact { }

/* 状态 */
.water-badge--urgent { }
.water-badge--soon { }
```

### 5.4 颜色规范

| 用途 | 变量名 | 值 |
|------|--------|-----|
| 主色 | --primary-color | #4CAF50 |
| 成功 | --success-color | #52c41a |
| 警告 | --warning-color | #faad14 |
| 错误 | --error-color | #ff4d4f |
| 主文字 | --text-color | #333333 |
| 次文字 | --text-secondary | #666666 |
| 辅助文字 | --text-light | #999999 |
| 卡片背景 | --card-background | #FFFFFF |

---

## 六、组件开发规范

### 6.1 JS 结构

```javascript
const { CARD_BORDER_RADIUS } = require('../../config/constants');

Component({
  properties: {
    // 属性定义
  },
  
  data: {
    // 内部数据
  },
  
  methods: {
    // 方法定义
    onTap() {
      this.triggerEvent('tap', { id: this.data.plant._id });
    }
  },
  
  lifetimes: {
    attached() {
      // 组件挂载
    }
  }
});
```

### 6.2 WXML 结构

```xml
<view class="plant-card" bindtap="onTap">
  <!-- 图片 -->
  <image class="plant-card__image" src="{{plant.imageUrl}}" />
  
  <!-- 信息 -->
  <view class="plant-card__name">{{plant.name}}</view>
  
  <!-- 条件渲染 -->
  <view wx:if="{{showWaterBadge}}" class="water-badge">💧</view>
</view>
```

---

## 七、使用页面注册组件

```json
{
  "usingComponents": {
    "plant-card": "/components/plant-card/plant-card",
    "water-badge": "/components/water-badge/water-badge"
  }
}
```

---

**文档版本：** v1.0