# 植物名称内容安全策略 Spec

## Why

**问题根源**：
- 用户识别植物时出现"ZZ 植物"（金钱树的拉丁学名缩写）
- 类似"打地鼠"式修复：出现一个修复一个，没有系统性预防
- 可能还会出现"AA 植物"、"BB 植物"等不当内容

**根本原因**：
1. **缺乏名称验证机制** - AI 生成的名称没有经过验证
2. **缺乏内容审核** - 没有敏感词、奇怪内容的过滤
3. **被动响应** - 等问题出现再修复，没有主动预防

## What Changes

- **新增【植物名称验证机制】** - 所有植物名称必须通过验证
- **新增【内容安全过滤】** - 过滤敏感词、奇怪内容
- **新增【异常内容检测】** - 自动检测并拦截异常内容
- **修改【植物识别流程】** - 在关键环节添加验证

## Impact

- **Affected specs**: 所有涉及植物识别、AI 生成的 spec
- **Affected code**: 
  - `cloudfunctions/identifyPlant/index.js` - 植物识别
  - `cloudfunctions/getCareGuide/index.js` - 养护指南生成
  - `utils/plantIdentify.js` - 植物识别工具
  - 所有展示植物名称的页面

## ADDED Requirements

### Requirement: 植物名称验证机制

**核心原则**：所有植物名称（AI 生成、API 返回、用户输入）必须通过验证才能展示

**验证规则**：

#### 1. 格式验证
- ✅ 必须是中文名称（2-10 个汉字）
- ✅ 或拉丁学名（标准格式）
- ❌ 不能是纯字母缩写（如"ZZ"、"AA"）
- ❌ 不能包含特殊符号（如"**"、"##"）
- ❌ 不能是乱码、无意义字符

**验证逻辑**：
```javascript
function validatePlantName(name) {
  // 1. 检查是否为空
  if (!name || name.trim() === '') {
    return { valid: false, reason: '名称为空' }
  }
  
  // 2. 检查是否包含敏感词
  if (containsSensitiveWords(name)) {
    return { valid: false, reason: '包含敏感词' }
  }
  
  // 3. 检查是否是纯字母缩写（2-3 个字母）
  if (/^[A-Z]{2,3}$/.test(name)) {
    return { valid: false, reason: '纯字母缩写' }
  }
  
  // 4. 检查是否包含特殊符号
  if (/[\*\#\_\-\~\`]/.test(name)) {
    return { valid: false, reason: '包含特殊符号' }
  }
  
  // 5. 检查是否是中文（2-10 个汉字）
  if (/^[\u4e00-\u9fa5]{2,10}$/.test(name)) {
    return { valid: true }
  }
  
  // 6. 检查是否是拉丁学名（标准格式）
  if (/^[A-Za-z]+ [a-z]+$/.test(name)) {
    return { valid: true }
  }
  
  // 7. 其他情况，视为无效
  return { valid: false, reason: '格式不正确' }
}
```

#### 2. 敏感词过滤
**敏感词列表**（示例）：
```javascript
const SENSITIVE_WORDS = [
  // 政治敏感
  '政治敏感词 1', '政治敏感词 2',
  // 色情低俗
  '色情词 1', '色情词 2',
  // 暴力恐怖
  '暴力词 1', '暴力词 2',
  // 其他不当内容
  '不当词 1', '不当词 2'
]
```

**过滤逻辑**：
```javascript
function containsSensitiveWords(text) {
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) {
      return true
    }
  }
  return false
}
```

#### 3. 异常内容检测
**检测规则**：
- 名称过于简单（如"植物 A"、"植物 B"）
- 名称重复度过高（如"AA 植物"、"BB 植物"）
- 名称不符合常识（如"超级无敌植物"）

**检测逻辑**：
```javascript
function detectAbnormalContent(name) {
  // 1. 检测重复字符
  if (/(.)\1{2,}/.test(name)) {
    return { abnormal: true, reason: '重复字符' }
  }
  
  // 2. 检测过于简单的命名
  if (/^植物 [A-Z]$/.test(name)) {
    return { abnormal: true, reason: '命名过于简单' }
  }
  
  // 3. 检测夸张描述
  if (/超级 | 无敌 | 最强 | 第一/.test(name)) {
    return { abnormal: true, reason: '夸张描述' }
  }
  
  return { abnormal: false }
}
```

### Requirement: 内容安全处理流程

**当发现不当内容时的处理流程**：

#### 场景 1：识别到"ZZ 植物"
```
WHEN: 植物识别返回 "ZZ 植物"
THEN:
1. 验证名称 → 失败（纯字母缩写）
2. 使用备用名称 → "金钱树"（从拉丁学名映射）
3. 记录异常日志 → 用于后续分析
4. 向用户展示 → "金钱树"（安全名称）
```

#### 场景 2：AI 生成不当内容
```
WHEN: AI 生成包含敏感词的内容
THEN:
1. 内容审核 → 失败（包含敏感词）
2. 重新生成 → 要求 AI 重新生成安全内容
3. 记录异常 → 标记 AI 生成失败
4. 使用默认内容 → 如果多次失败
```

#### 场景 3：用户输入不当内容
```
WHEN: 用户输入包含敏感词
THEN:
1. 内容审核 → 失败
2. 友好提示 → "请文明用语哦～"
3. 拒绝处理 → 不执行不当请求
4. 记录日志 → 用于分析
```

### Requirement: 植物名称标准化映射

**建立拉丁学名到中文名的标准映射**：

```javascript
const PLANT_NAME_MAPPING = {
  // 拉丁学名 → 标准中文名
  'Zamioculcas zamiifolia': '金钱树',
  'Epipremnum aureum': '绿萝',
  'Sansevieria trifasciata': '虎尾兰',
  'Spathiphyllum wallisii': '白掌',
  // ... 更多映射
}

// 使用映射确保名称正确
function getStandardPlantName(latinName, commonName) {
  // 1. 优先使用标准映射
  if (PLANT_NAME_MAPPING[latinName]) {
    return PLANT_NAME_MAPPING[latinName]
  }
  
  // 2. 其次验证通用名
  if (validatePlantName(commonName).valid) {
    return commonName
  }
  
  // 3. 最后使用默认名称
  return '未知植物'
}
```

## MODIFIED Requirements

### Requirement: 植物识别流程

**原流程**：
```
1. 调用 PlantNet/百度 AI 识别
2. 获取植物名称
3. 翻译为中文
4. 返回结果
```

**修改后流程**：
```
1. 调用 PlantNet/百度 AI 识别
2. 获取植物名称
3. 翻译为中文
4. 【新增】名称验证
   - 格式验证
   - 敏感词过滤
   - 异常内容检测
5. 【新增】名称标准化
   - 使用标准映射
   - 备用名称
6. 返回结果（确保名称安全）
```

### Requirement: AI 内容生成

**原要求**：AI 生成养护指南、植物档案

**修改后**：
```
1. AI 生成内容
2. 【新增】内容审核
   - 敏感词检测
   - 格式验证
   - 事实核查
3. 【新增】异常处理
   - 审核失败 → 重新生成
   - 多次失败 → 使用默认内容
4. 展示给用户
```

## REMOVED Requirements

### Requirement: 被动修复

**原因**：被动修复（出现一个修复一个）效率低，无法预防新问题

**迁移策略**：
- 使用主动预防机制
- 建立系统性验证流程
- 持续监控和更新敏感词库
