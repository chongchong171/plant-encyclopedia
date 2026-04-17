# 修复 AI 删除植物数据不同步问题 Spec

## Why

用户反馈：AI 说已删除植物，但花园里还在。问题反复出现，要么是创建失败但已创建，要么是删除成功但数据还在。需要从源头解决 AI 调用与花园数据不同步的问题。

## What Changes

### 问题根源分析

1. **工具名称不匹配**：
   - SYSTEM_PROMPT 说：调用 `removePlant` 工具
   - 实际工具名：`deletePlant`
   - 结果：AI 不知道要调用哪个工具

2. **快速回复缺失**：
   - 工具执行成功后，代码只处理了 `addPlant`、`recordWatering` 等
   - **没有处理 `deletePlant` 的快速回复**
   - 结果：AI 自己编回复，没有真正执行删除

3. **缺乏验证机制**：
   - 删除后没有验证数据库是否真的删除了
   - 结果：即使删除失败，AI 也说成功了

### 修复方案

1. **统一工具名称**：
   - SYSTEM_PROMPT 中的工具名必须与实际一致
   - 所有文档、注释都要同步更新

2. **添加快速回复**：
   - 工具执行成功后立即返回预设回复
   - AI 不再自己编回复

3. **添加验证机制**：
   - 删除后查询数据库确认已删除
   - 如果验证失败，提示用户重试

## Impact

- **Affected specs**: 意图识别、工具调用机制
- **Affected code**: `cloudfunctions/intentClassify/index.js`

## Requirements

### Requirement: 删除植物必须调用数据库

**Scenario: 用户确认删除**
- WHEN 用户说"好的"、"确认"等确认删除
- THEN AI 必须调用 `deletePlant` 工具
- AND 等待工具执行完成
- AND 使用工具的返回结果作为回复

**Scenario: 删除后验证**
- WHEN deletePlant 工具执行成功
- THEN 查询数据库确认植物已删除
- IF 植物还在数据库中
- THEN 提示用户重试

### Requirement: 工具执行成功快速返回

**Scenario: 工具执行成功**
- WHEN 工具返回 `{ success: true, action: 'deletePlant', ... }`
- THEN 直接返回预设回复
- AND 不再调用 AI 生成回复
- AND 回复中明确说明已删除

### Requirement: 工具名称一致性

**Scenario: SYSTEM_PROMPT 中的工具定义**
- WHEN 定义工具调用规则
- THEN 工具名必须与实际一致
- AND 描述必须准确

## MODIFIED Requirements

### 修改 1: 添加 deletePlant 快速回复

在 `intentClassify/index.js` 第 733-766 行，添加 `deletePlant` 的快速回复处理：

```javascript
if (action === 'deletePlant') {
  quickReply = `${data.plantName}已从花园删除`
}
```

### 修改 2: 修正 SYSTEM_PROMPT 中的工具名

将 SYSTEM_PROMPT 中的 `removePlant` 改为 `deletePlant`：

```
【功能调用】
- 删除植物 → 调用 deletePlant 工具
```

### 修改 3: 添加删除验证（可选，增强版）

在 `execDeletePlant` 函数中，删除后验证：

```javascript
// 删除后验证
const checkRes = await db.collection('my_plants')
  .doc(plantId)
  .get()

if (checkRes.data) {
  console.error('[删除验证] 植物仍在数据库中')
  return { success: false, error: '删除失败，请重试' }
}
```

## Test Cases

### 测试 1: 正常删除流程
```
用户：帮我把花园中的金钱树删掉
AI：明白您想删除「金钱树」。确认要删除吗？
用户：好的
AI：「金钱树」已从花园删除
→ 检查花园：金钱树已不存在 ✅
```

### 测试 2: 删除不存在的植物
```
用户：帮我删除玫瑰
AI：没找到植物「玫瑰」
→ 不报错，友好提示 ✅
```

### 测试 3: 删除失败场景
```
用户：确认删除
AI：删除失败，请稍后再试
→ 花园中植物仍在，提示重试 ✅
```
