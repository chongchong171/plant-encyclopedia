# 工具层规范 (utils/)

**版本：** v1.0
**更新时间：** 2026-03-28

---

## 一、职责

- 通用工具函数
- 不涉及业务逻辑
- 可在任何项目中复用

---

## 二、文件结构

```
utils/
├── index.js           # 统一入口
├── time.js            # 时间工具
├── format.js          # 格式化工具
├── storage.js         # 存储封装
├── image.js           # 图片工具
├── request.js         # 请求工具
└── plantIdentify.js   # 植物识别（特定业务）
```

---

## 三、分类说明

| 文件 | 职责 | 示例函数 |
|------|------|----------|
| time.js | 时间格式化 | formatTime, formatRelativeTime, getToday |
| format.js | 数据格式化 | parseCareGuide, parseDiagnosisResult |
| storage.js | 本地存储 | getFavorites, setFavorites, addFavorite |
| image.js | 图片处理 | imageToBase64, chooseImageFromAlbum |
| request.js | 请求封装 | showLoading, showErrorToast, httpRequest |
| plantIdentify.js | 植物识别 | identifyPlant（业务特定） |

---

## 四、代码规范

### 4.1 time.js

```javascript
/**
 * 时间工具
 */

/**
 * 格式化时间（完整格式）
 * @param {Date} date
 * @returns {string} YYYY/MM/DD HH:MM:SS
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day].map(formatNumber).join('/') + 
         ' ' + 
         [hour, minute, second].map(formatNumber).join(':');
}

/**
 * 格式化相对时间
 * @param {number} timestamp 时间戳（毫秒）
 * @returns {string} 如：刚刚、5分钟前、2天前
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  
  const date = new Date(timestamp);
  return (date.getMonth() + 1) + '月' + date.getDate() + '日';
}

module.exports = { formatTime, formatRelativeTime };
```

### 4.2 storage.js

```javascript
/**
 * 存储工具
 */

const { STORAGE_KEYS } = require('../config/constants');

/**
 * 获取存储数据
 */
function getStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    console.warn('[Storage] 读取失败:', e);
    return null;
  }
}

/**
 * 设置存储数据
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.warn('[Storage] 写入失败:', e);
  }
}

/**
 * 获取收藏列表
 */
function getFavorites() {
  return getStorage(STORAGE_KEYS.FAVORITES) || [];
}

/**
 * 添加收藏
 */
function addFavorite(plant) {
  const favorites = getFavorites();
  const exists = favorites.some(f => f.name === plant.name);
  
  if (!exists) {
    favorites.push({ ...plant, addTime: Date.now() });
    setStorage(STORAGE_KEYS.FAVORITES, favorites);
  }
  
  return !exists;
}

module.exports = { getStorage, setStorage, getFavorites, addFavorite };
```

### 4.3 image.js

```javascript
/**
 * 图片工具
 */

const { IMAGE_MAX_SIZE_KB } = require('../config/constants');

/**
 * 图片转 Base64
 * @param {string} filePath 图片路径
 * @returns {Promise<string>} Base64 字符串
 */
function imageToBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    });
  });
}

/**
 * 选择图片（相册）
 * @returns {Promise<string>} 图片临时路径
 */
function chooseImageFromAlbum() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => resolve(res.tempFiles[0].tempFilePath),
      fail: (err) => reject(err)
    });
  });
}

/**
 * 检查图片大小是否合法
 */
function validateImageSize(base64) {
  const sizeKB = base64.length * 0.75 / 1024;
  return sizeKB <= IMAGE_MAX_SIZE_KB;
}

module.exports = { 
  imageToBase64, 
  chooseImageFromAlbum, 
  validateImageSize 
};
```

### 4.4 request.js

```javascript
/**
 * 请求工具
 */

const { ERROR_CODES, ERROR_MESSAGES } = require('../config/enums');

/**
 * 统一错误处理
 */
function handleApiError(message, code) {
  console.error(`[API Error ${code}] ${message}`);
  
  const displayMessage = ERROR_MESSAGES[code] || message;
  
  return {
    success: false,
    error: displayMessage,
    code: code
  };
}

/**
 * 显示错误提示
 */
function showErrorToast(errorResult) {
  const message = errorResult.error || '操作失败';
  
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading();
}

module.exports = { 
  handleApiError, 
  showErrorToast, 
  showLoading, 
  hideLoading 
};
```

---

## 五、使用方式

```javascript
// ✅ 正确：从统一入口导入
const utils = require('../../utils/index');
const { formatRelativeTime } = utils.time;

// ✅ 正确：直接导入子模块
const { chooseImageFromAlbum } = require('../../utils/image');

// ❌ 错误：导入已删除的旧文件
const { formatTime } = require('../../utils/util');  // 文件已删除
```

---

## 六、原则

1. **单一职责**：每个文件只做一件事
2. **不依赖业务**：可在任何项目中复用
3. **纯函数**：输入相同，输出相同
4. **统一入口**：通过 index.js 导出

---

**文档版本：** v1.0