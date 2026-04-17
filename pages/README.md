# 页面层规范 (pages/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

- 用户界面
- 用户交互
- 调用其他层（api/services/utils/components）
- **不包含业务逻辑**（业务逻辑在 services 层）

---

## 二、文件结构

```
pages/
├── home/              # 首页
│   ├── home.js
│   ├── home.json
│   ├── home.wxml
│   └── home.wxss
├── my-plants/         # 我的花园
├── diagnosis/         # 诊断
├── community-garden/  # 社区花园
└── ...
```

---

## 三、命名规范

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 页面目录 | kebab-case | my-plants |
| 文件名 | 与目录一致 | my-plants.js |
| 函数名 | camelCase | loadPlants, goToDetail |
| 事件处理 | on + 动作 | onTap, onWaterTap |

---

## 四、代码规范

### 4.1 导入规范

```javascript
// ✅ 正确：从统一入口导入
const api = require('../../api/index');
const services = require('../../services/index');
const { showLoading, hideLoading, showErrorToast } = require('../../utils/request');

// ❌ 错误：直接导入具体文件
const plantApi = require('../../api/plant.js');  // 不要这样
```

### 4.2 Page 结构

```javascript
const api = require('../../api/index');
const services = require('../../services/index');
const { showLoading, hideLoading, showErrorToast, showSuccessToast } = require('../../utils/request');

Page({
  data: {
    // 页面数据
    plants: [],
    loading: true
  },

  // ========== 生命周期 ==========
  
  onLoad(options) {
    // 页面初始化
  },

  onShow() {
    // 页面显示
    this.loadData();
  },

  // ========== 数据加载 ==========
  
  async loadData() {
    this.setData({ loading: true });
    
    // 调用 API 层
    const result = await api.getMyPlants();
    
    if (!result.success) {
      showErrorToast(result);
      this.setData({ loading: false });
      return;
    }
    
    // 调用 services 层处理数据
    const processed = services.processPlantList(result.plants);
    const { todayPlants, soonPlants } = services.categorizePlants(processed);
    
    this.setData({ 
      plants: processed,
      todayPlants,
      soonPlants,
      loading: false 
    });
  },

  // ========== 事件处理 ==========
  
  onCardTap(e) {
    const { id } = e.detail;  // 从组件事件获取数据
    wx.navigateTo({ url: `/pages/plant-detail/plant-detail?id=${id}` });
  },

  async onWaterTap(e) {
    const { id, plant } = e.detail;
    
    showLoading('记录中...');
    
    const result = await api.recordWatering(id, plant.careInfo?.wateringDays || 7);
    
    hideLoading();
    
    if (!result.success) {
      showErrorToast(result);
      return;
    }
    
    showSuccessToast('已记录浇水');
    this.loadData();
  },

  // ========== 导航方法 ==========
  
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/plant-detail/plant-detail?id=${id}` });
  },

  goToHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  // ========== 其他 ==========
  
  onShareAppMessage() {
    return {
      title: '我在花草百科养了 ' + this.data.plants.length + ' 盆植物！',
      path: '/pages/home/home'
    };
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  }
});
```

---

## 五、WXML 规范

### 5.1 使用组件

```xml
<!-- ✅ 正确：使用组件 -->
<plant-card 
  plant="{{item}}"
  show-water-badge="{{true}}"
  bind:tap="onCardTap"
  bind:water="onWaterTap"
/>

<!-- ❌ 错误：手写卡片样式 -->
<view class="card" style="border-radius: 20rpx; padding: 20rpx;">
  <!-- 不要这样写 -->
</view>
```

### 5.2 条件渲染

```xml
<!-- 加载状态 -->
<view wx:if="{{loading}}" class="loading-state">
  <view class="loading-spinner"></view>
</view>

<!-- 空状态 -->
<view wx:elif="{{plants.length === 0}}" class="empty-state">
  <view class="empty-text">暂无数据</view>
</view>

<!-- 数据列表 -->
<view wx:else class="data-list">
  <view wx:for="{{plants}}" wx:key="_id">
    <plant-card plant="{{item}}" />
  </view>
</view>
```

---

## 六、WXSS 规范

### 6.1 页面只写布局样式

```css
/* ✅ 正确：页面只写布局 */
.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.section {
  margin-bottom: 30rpx;
}

.plants-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ❌ 错误：页面写卡片样式 */
.plant-card {
  border-radius: 20rpx;  /* 这应该在组件内 */
  padding: 20rpx;
}
```

### 6.2 使用设计规范

```css
/* 如果需要自定义样式，使用统一的设计规范 */
.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.empty-text {
  font-size: 36rpx;
  color: #333;
}
```

---

## 七、JSON 配置

### 7.1 注册组件

```json
{
  "navigationBarTitleText": "我的花园",
  "usingComponents": {
    "plant-card": "/components/plant-card/plant-card",
    "water-badge": "/components/water-badge/water-badge"
  },
  "enablePullDownRefresh": true
}
```

---

## 八、禁止事项

```javascript
// ❌ 禁止：在页面中直接调用云函数
wx.cloud.callFunction({ name: 'getMyPlants' });

// ❌ 禁止：在页面中写业务逻辑
const daysUntil = Math.ceil((new Date(nextWatering) - new Date()) / ...);

// ❌ 禁止：在页面中硬编码样式
<view style="border-radius: 20rpx;">

// ❌ 禁止：在页面中硬编码问题类型
const problems = ['叶尖发黄', '叶子有斑点', ...];

// ❌ 禁止：在页面中硬编码 API Key
const API_KEY = 'sk-xxx';
```

---

## 九、模板页面

```javascript
/**
 * [页面名称] - [简要说明]
 * 
 * ⚠️ 模块化规范：
 * - 通过 api/ 层调用云函数
 * - 通过 services/ 层处理业务逻辑
 * - 通过组件化 UI
 */

const api = require('../../api/index');
const services = require('../../services/index');
const { showLoading, hideLoading, showErrorToast } = require('../../utils/request');

Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 初始化
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    // 加载数据
  },

  onEvent(e) {
    // 事件处理
  },

  goToPage() {
    // 页面跳转
  }
});
```

---

**文档版本：** v1.0