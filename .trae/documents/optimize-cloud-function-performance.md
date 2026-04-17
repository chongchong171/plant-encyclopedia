# 云函数性能优化方案

## 📊 当前性能问题

### 用户反馈
- 文字：20 秒
- 图片：30 秒（有时出不来）
- **总耗时：50 秒+**

### 当前流程（同步等待）

```
用户请求
    ↓
AI 生成文字（20 秒）← 等待
    ↓
获取图片（10-30 秒）← 等待
    ↓
返回结果
```

**问题：** 图片获取在 AI 返回后才开始，串行执行太慢！

---

## 💡 优化方案

### 方案 A：并行获取文字和图片（推荐）⭐⭐⭐

**思路：** AI 生成文字的同时，异步获取图片

```
用户请求
    ↓
┌───────────────────────┐
│ AI 生成文字（20 秒）   │
│ 同时                  │
│ 异步获取图片（10 秒）  │
└───────────────────────┘
    ↓
先返回文字（20 秒）
图片到了再更新（+10 秒）
```

**优势：**
- ✅ 总时间从 50 秒 → 20 秒（先显示文字）
- ✅ 图片异步加载，不阻塞
- ✅ 用户体验好（先看到内容）

**实现：**
```javascript
// 云函数：getCareGuide/index.js
exports.main = async (event, context) => {
  const { plantName } = event;
  
  // 1. 调用 AI 获取文字
  const textPromise = fetchAIResponse(plantName);
  
  // 2. 同时异步获取图片（不等待）
  const imagePromise = getPlantImageFromFreeSources(plantName)
    .then(imageUrl => ({ imageUrl }))
    .catch(() => ({}));
  
  // 3. 先等待文字返回
  const textResult = await textPromise;
  
  // 4. 立即返回文字（不等待图片）
  const result = {
    success: true,
    ...textResult,
    imageUrl: ''  // 图片稍后更新
  };
  
  // 5. 图片获取到后，通过 WebSocket 或轮询通知前端
  // 或者：图片作为可选字段，前端异步加载
  const imageResult = await imagePromise;
  Object.assign(result, imageResult);
  
  return result;
};
```

---

### 方案 B：前端异步加载图片（简单）⭐⭐⭐

**思路：** 云函数只返回文字，图片前端自己加载

**云函数修改：**
```javascript
// 云函数不等待图片，立即返回
const result = {
  success: true,
  ...aiResult,
  imageUrl: ''  // 空着，前端自己加载
};
return result;
```

**前端修改：**
```javascript
// pages/search_result/search_result.js
async searchPlant(keyword) {
  // 1. 先获取文字（20 秒）
  const aiResult = await this.getPlantInfoFromCloud(keyword);
  this.setData({ 
    loading: false, 
    plant: { ...aiResult, imageUrl: '' } 
  });
  
  // 2. 异步加载图片（不阻塞页面）
  this.loadPlantImageAsync(keyword, aiResult);
}

async loadPlantImageAsync(keyword, plant) {
  // 异步加载图片，不阻塞
  const imageUrl = await this.getImageFromCloud(keyword);
  if (imageUrl) {
    this.setData({ 'plant.imageUrl': imageUrl });
  }
}
```

**优势：**
- ✅ 代码改动小
- ✅ 用户 20 秒看到文字
- ✅ 图片慢慢加载，不阻塞

---

### 方案 C：缩短超时时间（激进）⭐⭐

**当前：**
- GBIF: 8 秒
- Pexels: 2 秒
- 总计：10 秒

**优化：**
- GBIF: 5 秒（缩短 3 秒）
- Pexels: 1.5 秒（缩短 0.5 秒）
- 总计：6.5 秒

**风险：**
- ❌ 可能增加失败率
- ❌ 慢的网络直接失败

---

### 方案 D：缓存图片（长期优化）⭐⭐⭐

**思路：** 常见植物的图片缓存起来

**实现：**
```javascript
// 查询前先查缓存
const cachedImage = await db.collection('plant_images')
  .where({ name: plantName })
  .limit(1)
  .get();

if (cachedImage.data.length > 0) {
  return cachedImage.data[0].imageUrl;  // 直接返回
}

// 没有缓存才调用 API
const imageUrl = await getPlantImageFromFreeSources(...);

// 缓存结果
await db.collection('plant_images').add({
  name: plantName,
  imageUrl: imageUrl,
  createTime: new Date()
});
```

**优势：**
- ✅ 常见植物秒回（芦荟、绿萝等）
- ✅ 减少 API 调用

**缺点：**
- ❌ 需要数据库存储
- ❌ 冷门植物还是要查

---

## 🎯 推荐方案组合

### 立即实施（今天）

**方案 B：前端异步加载图片**

**步骤：**
1. 云函数不等待图片，立即返回文字
2. 前端先显示文字（20 秒）
3. 图片异步加载（不阻塞）
4. 图片到了再更新显示

**预期效果：**
- 20 秒：显示文字 ✅
- 30 秒：显示图片 ✅
- 用户体验：好（先看到内容）

### 优化实施（明天）

**方案 A：并行获取**

**步骤：**
1. 云函数同时调用 AI 和图片 API
2. 先返回文字
3. 图片通过 WebSocket 或轮询推送

**预期效果：**
- 20 秒：文字 + 图片同时显示
- 总时间：20 秒（而不是 50 秒）

### 长期实施（本周）

**方案 D：图片缓存**

**步骤：**
1. 建立植物图片缓存库
2. 常见植物直接返回缓存
3. 冷门植物才调用 API

**预期效果：**
- 常见植物：秒回
- 冷门植物：20 秒

---

## 📝 立即实施方案 B

### 修改清单

**1. 云函数：** `cloudfunctions/getCareGuide/index.js`

```javascript
// 第 170-180 行：不等待图片，立即返回
// 获取植物图片（异步，不阻塞）
const latinName = plant.scientificNameLatin || plantName;
const chineseName = plantName;

// 不等待图片，先返回
// const imageUrl = await getPlantImageFromFreeSources(latinName, chineseName);

// 图片留给前端异步加载
plant.imageUrl = '';  // 空着

console.log(`[getCareGuide] ${Date.now() - startTime}ms - 返回文字（图片前端加载）`);
return plant;
```

**2. 前端：** `pages/search_result/search_result.js`

```javascript
// 第 65-110 行：searchPlant 函数
async searchPlant(keyword, providedScientificName) {
  wx.showLoading({ title: '查询中...' });
  
  try {
    // 1. 获取文字信息
    const aiResult = await this.getPlantInfoFromCloud(keyword);
    
    wx.hideLoading();
    
    if (!aiResult || !aiResult.success) {
      // 失败处理
      return;
    }
    
    // 2. 先显示文字（不等待图片）
    const scientificNameToUse = providedScientificName || aiResult.scientificNameLatin || aiResult.scientificName;
    
    const plant = {
      id: 'search_' + Date.now(),
      name: keyword,
      ...aiResult,
      scientificName: scientificNameToUse,
      imageUrl: ''  // 先空着
    };
    
    this.setData({ loading: false, error: false, plant });
    this.checkFavorite();
    
    // 3. 异步加载图片（不阻塞）
    this.loadPlantImageAsync(keyword, plant);
    
  } catch (err) {
    wx.hideLoading();
    // 错误处理
  }
}

// 新增：异步加载图片函数
async loadPlantImageAsync(keyword, plant) {
  console.log('[search_result] 异步加载图片:', keyword);
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'getCareGuide',
      data: {
        plantName: keyword,
        mode: 'image_only'
      },
      timeout: 10000  // 10 秒超时
    });
    
    if (res.result && res.result.success && res.result.imageUrl) {
      console.log('[search_result] 图片加载成功:', res.result.imageUrl);
      this.setData({ 'plant.imageUrl': res.result.imageUrl });
    } else {
      console.log('[search_result] 图片加载失败');
    }
  } catch (e) {
    console.warn('[search_result] 图片加载失败:', e.errMsg);
  }
}
```

---

## ⏱️ 性能对比

### 当前（同步等待）
```
AI 生成文字：20 秒
    ↓
GBIF 查询：8 秒
    ↓
Pexels 查询：2 秒（如果 GBIF 失败）
    ↓
总计：20 + 8 + 2 = 30 秒（最坏情况 50 秒）
```

### 优化后（异步加载）
```
AI 生成文字：20 秒 → 立即显示 ✅
    ↓
图片异步加载：10 秒（不阻塞）
    ↓
用户感知：20 秒看到文字，30 秒看到图片
```

**体验提升：**
- ✅ 20 秒有内容看（而不是空白）
- ✅ 图片慢慢加载，不焦虑
- ✅ 总时间不变，但体验好很多

---

*分析时间：2026-04-13*
