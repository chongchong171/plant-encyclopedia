# 植物百科小程序 - 设计规范 v1.0

**创建时间：** 2026-03-24  
**目的：** 统一设计标准，避免代码冲突，提高开发效率

---

## 一、页面结构标准

### 1.1 页面文件组成

每个页面必须包含以下 4 个文件：

```
pages/page_name/
├── page_name.wxml    # 页面结构
├── page_name.wxss    # 页面样式
├── page_name.js      # 页面逻辑
└── page_name.json    # 页面配置
```

### 1.2 页面命名规范

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 页面目录 | 小写+下划线 | `search_result` |
| 页面文件 | 与目录同名 | `search_result.wxml` |
| 事件函数 | 驼峰命名 | `goToSearch`, `takePhoto` |
| 数据变量 | 驼峰命名 | `plantList`, `isLoading` |

---

## 二、UI 组件标准

### 2.1 颜色规范

```css
/* 主题色 */
--primary-color: #4CAF50;        /* 主色 - 绿色 */
--primary-light: #81C784;        /* 主色浅 */
--primary-dark: #2E7D32;         /* 主色深 */
--primary-bg: #E8F5E9;           /* 主色背景 */

/* 功能色 */
--success-color: #4CAF50;        /* 成功 */
--warning-color: #FF9800;        /* 警告 */
--danger-color: #F44336;         /* 危险 */
--info-color: #2196F3;           /* 信息 */

/* 中性色 */
--text-primary: #333333;         /* 主文本 */
--text-secondary: #666666;       /* 次要文本 */
--text-placeholder: #999999;     /* 占位文本 */
--border-color: #E0E0E0;         /* 边框 */
--background-color: #F5F5F5;     /* 背景 */
```

### 2.2 字体规范

| 用途 | 字号 | 字重 | 颜色 |
|------|------|------|------|
| 大标题 | 48rpx | bold | #333 |
| 标题 | 36rpx | bold | #333 |
| 小标题 | 32rpx | bold | #333 |
| 正文 | 28rpx | normal | #555 |
| 辅助文字 | 24rpx | normal | #999 |
| 标签文字 | 22rpx | normal | #666 |

### 2.3 间距规范

```css
/* 内边距 */
--padding-xs: 10rpx;
--padding-sm: 16rpx;
--padding-md: 20rpx;
--padding-lg: 30rpx;
--padding-xl: 40rpx;

/* 外边距 */
--margin-xs: 10rpx;
--margin-sm: 16rpx;
--margin-md: 20rpx;
--margin-lg: 30rpx;
--margin-xl: 40rpx;

/* 圆角 */
--radius-sm: 12rpx;
--radius-md: 16rpx;
--radius-lg: 20rpx;
--radius-xl: 24rpx;
--radius-round: 40rpx;
```

---

## 三、组件模板

### 3.1 卡片组件（标准）

```xml
<!-- 标准卡片 -->
<view class="card">
  <view class="card-header">
    <text class="card-icon">🌟</text>
    <text class="card-title">卡片标题</text>
  </view>
  <view class="card-content">
    <text class="card-text">卡片内容</text>
  </view>
</view>
```

```css
/* 卡片样式 */
.card {
  background: white;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.card-content {
  font-size: 28rpx;
  color: #555;
  line-height: 1.6;
}
```

### 3.2 信息项组件（标准）

```xml
<!-- 信息项 -->
<view class="info-item">
  <text class="info-icon">☀️</text>
  <view class="info-content">
    <text class="info-label">光照</text>
    <text class="info-value">具体内容</text>
  </view>
</view>
```

```css
.info-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #F5F5F5;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.info-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.info-content {
  flex: 1;
}

.info-label {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-bottom: 4rpx;
}

.info-value {
  display: block;
  font-size: 28rpx;
  color: #333;
}
```

### 3.3 按钮组件（标准）

```xml
<!-- 主要按钮 -->
<button class="btn-primary">主要按钮</button>

<!-- 次要按钮 -->
<button class="btn-secondary">次要按钮</button>

<!-- 文字按钮 -->
<button class="btn-text">文字按钮</button>
```

```css
/* 主要按钮 */
.btn-primary {
  width: 100%;
  height: 90rpx;
  background: #4CAF50;
  color: white;
  border-radius: 45rpx;
  font-size: 32rpx;
  font-weight: bold;
}

/* 次要按钮 */
.btn-secondary {
  width: 100%;
  height: 90rpx;
  background: white;
  color: #4CAF50;
  border: 4rpx solid #4CAF50;
  border-radius: 45rpx;
  font-size: 32rpx;
}

/* 文字按钮 */
.btn-text {
  background: transparent;
  color: #4CAF50;
  font-size: 28rpx;
}

/* 重置 button 默认边框 */
.btn-primary::after,
.btn-secondary::after,
.btn-text::after {
  border: none;
}
```

### 3.4 隐私协议相关按钮（标准）

**用于：** 相册选择、拍照等需要用户授权的功能

```xml
<!-- 拍照按钮（自动处理隐私协议） -->
<button class="btn-primary" open-type="chooseMedia" bindchoosemedia="onTakePhoto">
  📷 拍照识别
</button>

<!-- 相册选择按钮（自动处理隐私协议） -->
<button class="btn-secondary" open-type="chooseMedia" bindchoosemedia="onChooseFromAlbum">
  🖼️ 相册上传
</button>
```

```javascript
// 页面 JS 中的回调函数
onTakePhoto(e) {
  if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
    const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath);
    if (imageFile) {
      this.compressAndNavigate(imageFile.tempFilePath);
    }
  }
},

onChooseFromAlbum(e) {
  if (e.detail && e.detail.tempFiles && e.detail.tempFiles.length > 0) {
    const imageFile = e.detail.tempFiles.find(f => f.fileType === 'image' || f.tempFilePath);
    if (imageFile) {
      this.compressAndNavigate(imageFile.tempFilePath);
    }
  }
}
```

**注意：** 使用 `open-type="chooseMedia"` 时，微信会自动弹出隐私协议弹窗，不需要手动处理授权。

---

## 四、数据结构标准

### 4.1 植物数据结构

```javascript
{
  // 基本信息
  id: 'plant_001',                    // 唯一ID
  name: '绿萝',                        // 植物名称
  commonNames: '黄金葛、魔鬼藤',        // 常用名
  scientificName: 'Epipremnum aureum', // 学名
  family: '天南星科',                   // 科属
  
  // 详细信息
  plantProfile: '植物档案...',          // 茎叶花种子
  growthHabit: '生长习性...',           // 生长习性
  distribution: '分布范围...',          // 分布范围
  mainValue: '主要价值...',             // 主要价值
  
  // 养护指南
  careGuide: {
    light: '光照需求',
    water: '浇水方法',
    temperature: '温度要求',
    humidity: '湿度要求',
    fertilizer: '施肥建议',
    tips: '养护技巧'
  },
  
  // 难度评估
  difficultyLevel: 3,                  // 1-5星
  difficultyText: '养护难度说明',
  
  // 快速信息
  quickTips: ['要点1', '要点2', '要点3'],
  faq: [
    { question: '问题1', answer: '答案1' },
    { question: '问题2', answer: '答案2' }
  ],
  
  // 元数据
  confidence: 85,                       // 置信度
  source: 'PlantNet + Qwen',           // 来源
  image: 'https://...',                 // 图片URL
  quotaRemaining: 450                   // 剩余额度
}
```

### 4.2 页面数据初始化

```javascript
// 每个页面的标准数据结构
data: {
  // 状态
  loading: false,
  error: false,
  errorMessage: '',
  
  // 数据
  plant: null,  // 或具体的默认值对象
  
  // UI 状态
  isFavorite: false,
  showHistory: true
}
```

---

## 五、API 调用标准

### 5.1 API Key 管理

```javascript
// app.js 中统一管理
globalData: {
  qwenApiKey: 'sk-xxx',
  plantnetApiKey: 'xxx',
  hotPlants: [...],  // 热门植物配置
  // ...
}

// 其他文件中调用
const apiKey = app.globalData.qwenApiKey;
```

### 5.2 请求封装

```javascript
// 标准请求函数
const fetchData = async (url, options = {}) => {
  try {
    const res = await wx.request({
      url: url,
      method: options.method || 'GET',
      header: {
        'Authorization': `Bearer ${app.globalData.qwenApiKey}`,
        'Content-Type': 'application/json'
      },
      data: options.data,
      timeout: 30000
    });
    
    if (res.statusCode === 200) {
      return { success: true, data: res.data };
    }
    return { success: false, error: `请求失败: ${res.statusCode}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
```

---

## 六、开发流程

### 6.0 初始化项目（首次克隆后必须执行）

```bash
# 克隆项目后，执行此脚本配置 Git Hooks
bash scripts/setup-hooks.sh
```

**作用：** 配置 pre-commit hook，每次提交前自动执行代码检查

### 6.1 新增功能流程

```
1. 查看设计规范 → 确认组件类型
2. 复制对应模板 → 修改内容
3. 检查命名规范 → 确保一致
4. 测试功能 → 验证无冲突
5. 提交代码 → 写清楚 commit 信息
```

### 6.2 修改功能流程

```
1. 找到对应组件 → 理解现有代码
2. 使用标准样式 → 不随意新增
3. 保持数据结构一致
4. 测试所有相关页面
5. 提交代码
```

---

## 七、代码检查清单

每次提交前检查：

- [ ] 文件命名是否正确（小写+下划线）
- [ ] 颜色是否使用标准色
- [ ] 字体大小是否使用标准值
- [ ] 间距是否使用标准值
- [ ] 数据结构是否符合规范
- [ ] API Key 是否从 app.globalData 获取
- [ ] 是否有未使用的代码
- [ ] commit 信息是否清晰

---

## 八、app.json 配置标准

### 8.1 隐私协议配置

**必须在 app.json 中声明使用的隐私接口：**

```json
{
  "requiredPrivateInfos": [
    "chooseMedia"
  ]
}
```

### 8.2 支持的隐私接口列表

| 接口名称 | 用途 |
|---------|------|
| `chooseMedia` | 拍照、选择图片/视频 |
| `chooseImage` | 选择图片（已废弃，使用 chooseMedia） |
| `chooseVideo` | 选择视频（已废弃，使用 chooseMedia） |
| `chooseLocation` | 选择位置 |
| `chooseAddress` | 选择地址 |
| `getLocation` | 获取位置 |

### 8.3 完整 app.json 模板

```json
{
  "pages": [
    "pages/home/home",
    "pages/camera/camera",
    "pages/result_swiper/result_swiper",
    "pages/discover/discover",
    "pages/search_page/search_page",
    "pages/search_result/search_result",
    "pages/favorites/favorites",
    "pages/history/history",
    "pages/profile/profile"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#4CAF50",
    "navigationBarTitleText": "花草百科全书",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#E8F5E9"
  },
  "tabBar": {
    "color": "#666666",
    "selectedColor": "#4CAF50",
    "backgroundColor": "#ffffff",
    "list": [...]
  },
  "requiredPrivateInfos": [
    "chooseMedia"
  ],
  "cloud": true,
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

---

**女王大人，这套规范可以确保：**
1. 新功能不会与旧代码冲突
2. UI 风格统一
3. 开发效率提高
4. 代码易于维护

需要我按照这个规范重构现有代码吗？🐾