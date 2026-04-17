# 植物图片搜索的翻译方案分析

## 📌 当前流程

### 用户输入 → AI 返回 → 图片搜索

```
用户输入：芦荟（中文）
    ↓
调用 GLM-4-Flash AI
    ↓
AI 返回 JSON：
{
  "scientificNameLatin": "Aloe vera",  ← 拉丁学名（GBIF 用）
  "scientificName": "芦荟学名是 Aloe vera",  ← 中文说明
  "commonNames": "芦荟、卢会"  ← 中文别名
}
    ↓
图片搜索：
- GBIF：用拉丁学名 "Aloe vera" 搜索 ✅
- Pexels：用中文名 "芦荟" 搜索 ❌（应该是英文）
```

---

## 🔍 问题分析

### 当前代码实现

**文件：** `cloudfunctions/getCareGuide/index.js`

```javascript
// 第 172-174 行
const latinName = plant.scientificNameLatin || plantName;
const chineseName = plantName;
const imageUrl = await getPlantImageFromFreeSources(latinName, chineseName);
```

**传递给图片搜索函数：**
- `latinName` = "Aloe vera"（拉丁学名，GBIF 用）✅
- `chineseName` = "芦荟"（用户输入的中文名）❌

### Pexels 搜索问题

**当前代码（第 328 行）：**
```javascript
const pexelsRes = await fetch(`https://www.pexels.com/api/search/?query=${encodeURIComponent(chineseName)}&per_page=1`, {
  headers: {
    'Authorization': PEXELS_API_KEY
  },
  timeout: 2000
});
```

**问题：** Pexels 是英文图片库，用中文名"芦荟"搜索可能找不到结果！

**应该用：** "Aloe" 或 "Aloe vera" 搜索

---

## 💡 解决方案

### 方案 A：AI 直接返回英文名（推荐）⭐⭐⭐

**修改 AI Prompt，增加英文通用名：**

```javascript
// 在 Prompt 的 JSON 结构中增加
"englishName": "英文通用名（如：Aloe，用于 Pexels 图片搜索）【必填！】"
```

**优点：**
- ✅ 一步到位，AI 直接返回准确的英文名
- ✅ 不需要额外翻译 API
- ✅ 英文名准确（AI 知道植物的标准英文名）

**缺点：**
- 需要修改 Prompt，增加 AI 返回字段

**实现：**
```javascript
// AI 返回
{
  "scientificNameLatin": "Aloe vera",
  "englishName": "Aloe",  ← 新增
  ...
}

// 图片搜索
const imageUrl = await getPlantImageFromFreeSources(
  plant.scientificNameLatin,  // GBIF: "Aloe vera"
  plant.englishName           // Pexels: "Aloe"
);
```

---

### 方案 B：从拉丁学名提取英文名（备选）⭐⭐

**思路：** 拉丁学名通常就是英文名的基础

```javascript
// 简单处理：取拉丁学名的第一个词
const englishName = plant.scientificNameLatin.split(' ')[0];
// "Aloe vera" → "Aloe"
```

**优点：**
- ✅ 不需要修改 AI Prompt
- ✅ 代码简单

**缺点：**
- ❌ 有些植物的拉丁学名和英文名不一致
- ❌ 例如：Epipremnum aureum（拉丁）→ Pothos（英文）

---

### 方案 C：调用翻译 API（不推荐）⭐

**思路：** 用百度翻译/谷歌翻译将中文名翻译成英文

**优点：**
- 准确度高

**缺点：**
- ❌ 需要额外 API（可能收费）
- ❌ 增加延迟
- ❌ 增加复杂度

---

### 方案 D：Pexels 用拉丁学名搜索（简单）⭐⭐⭐

**思路：** Pexels 也用拉丁学名搜索，不用英文名

```javascript
// 修改 getPlantImageFromFreeSources 函数
async function getPlantImageFromFreeSources(latinName, chineseName) {
  // 1. GBIF：用拉丁学名
  // 2. Pexels：也用拉丁学名（而不是中文名）
  const pexelsQuery = latinName || chineseName;
}
```

**优点：**
- ✅ 代码改动最小
- ✅ 拉丁学名是国际标准，Pexels 应该能识别
- ✅ 不需要额外翻译

**缺点：**
- ❌ 拉丁学名可能比较长（如 "Epipremnum aureum"）
- ❌ Pexels 可能对拉丁学名支持不好（需要测试）

---

## 🎯 推荐方案

### 最佳方案：A + D 组合

**步骤：**

1. **立即实施（方案 D）：** Pexels 改用拉丁学名搜索
   - 代码改动最小
   - 5 分钟可以完成
   - 先解决有无问题

2. **优化实施（方案 A）：** AI 返回英文通用名
   - 修改 Prompt，增加 `englishName` 字段
   - Pexels 优先用英文名，失败时用拉丁学名
   - 提升搜索准确度

**实现代码（方案 D）：**

```javascript
// 修改 getPlantImageFromFreeSources 函数
async function getPlantImageFromFreeSources(latinName, chineseName) {
  // 1. GBIF 优先（8 秒超时）- 用拉丁学名
  try {
    const searchRes = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(latinName)}&strict=false`, {
      timeout: 8000
    });
    // ...
  } catch (gbifErr) {
    console.log('GBIF 失败');
  }
  
  // 2. Pexels 备选（2 秒超时）- 也用拉丁学名
  if (PEXELS_API_KEY) {
    const pexelsQuery = latinName || chineseName;  // ← 改动点
    try {
      console.log(`[PlantImage] 开始 Pexels 查询（${pexelsQuery}）...`);
      
      const pexelsRes = await fetch(`https://www.pexels.com/api/search/?query=${encodeURIComponent(pexelsQuery)}&per_page=1`, {
        headers: {
          'Authorization': PEXELS_API_KEY
        },
        timeout: 2000
      });
      // ...
    } catch (pexelsErr) {
      console.log('Pexels 失败');
    }
  }
}
```

---

## 📝 总结

**回答女王大人的问题：**

**Q: 翻译怎么弄？**

**A: 不需要额外翻译！**

1. **GBIF** 已经用拉丁学名（AI 返回）✅
2. **Pexels** 可以：
   - **立即方案：** 用拉丁学名（代码改动最小）
   - **优化方案：** AI 返回英文通用名（更准确）

**不需要：**
- ❌ 翻译 API
- ❌ 额外成本
- ❌ 复杂逻辑

**需要做的：**
1. 修改 `getPlantImageFromFreeSources` 函数，Pexels 改用拉丁学名
2. （可选）修改 AI Prompt，增加 `englishName` 字段

---

*分析时间：2026-04-13*
