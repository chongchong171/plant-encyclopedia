# 修复植物删除功能 - 部署指南

## 问题描述

用户反馈：删除植物后，AI 说删除成功了，但花园列表中仍然显示该植物。

## 问题原因

**AI 意图识别缺少 deletePlant 工具定义** - AI 无法通过工具调用删除功能

原有的删除流程：
- ✅ `deletePlant` 云函数一直存在且正常工作
- ✅ 前端 `deletePlantByVoice` 函数直接调用 `deletePlant` 云函数
- ❌ **但 AI 意图识别时没有调用任何工具**，只是口头回复

所以当用户通过 AI 对话删除植物时：
1. AI 说"好的，正在删除..."
2. 但**没有实际调用删除工具**
3. 前端也没有执行删除操作
4. 结果：植物没有被删除

## 修复内容

### 更新 `intentClassify` 云函数
**文件**: `cloudfunctions/intentClassify/index.js`

修改：
- ✅ 添加 `deletePlant` 工具定义到 TOOLS 数组
- ✅ 添加 `execDeletePlant` 函数处理删除逻辑
- ✅ 支持精确匹配和模糊匹配查找植物
- ✅ 调用现有的 `deletePlant` 云函数执行删除

## 部署步骤

### 步骤：上传并部署 `intentClassify` 云函数

1. 打开微信开发者工具
2. 右键点击 `cloudfunctions/intentClassify` 目录
3. 选择 **"上传并部署：云端安装依赖"**
4. 等待部署完成（状态栏显示"上传成功"）

## 测试步骤

1. 打开小程序，进入首页
2. 点击展开 AI 对话框
3. 输入："帮我把花园中的坏绿萝删掉"
4. AI 应该正确识别删除意图，并找到对应的植物
5. 确认后，检查：
   - ✅ AI 回复"✅ 「坏绿萝」已从花园中删除"
   - ✅ 花园列表中不再显示"坏绿萝"

## 验证要点

### 1. 意图识别测试
```
用户：把坏绿萝删掉
AI：应该调用 deletePlant 工具
```

### 2. 精确匹配测试
```
场景 1：花园有"绿萝"和"坏绿萝"两盆植物
用户：把坏绿萝删掉
预期：删除"坏绿萝"，保留"绿萝"

场景 2：花园只有"绿萝"
用户：把绿萝删掉
预期：删除"绿萝"
```

### 3. 数据刷新测试
```
删除后，立即查看花园列表
预期：列表中不再显示已删除的植物
```

## 日志检查

部署后，查看云函数日志确认功能正常：

### intentClassify 日志
```
[smartChat] [INFO] 删除植物：坏绿萝
[smartChat] [INFO] 找到要删除的植物：坏绿萝, ID: xxx
[smartChat] [INFO] deletePlant 云函数调用结果：{ success: true, removed: 1 }
[smartChat] [INFO] 删除成功：坏绿萝
```

### deletePlant 日志
```
deletePlant 被调用
OPENID: xxx
plantId: xxx
删除成功，删除了 1 条记录
```

## 回滚方案

如果部署后出现问题：

1. 右键点击 `cloudfunctions/intentClassify`
2. 选择 **"回滚版本"**
3. 选择之前的版本进行回滚

## 注意事项

1. **依赖安装**：确保选择"云端安装依赖"选项
2. **测试环境**：建议先在测试环境验证，再发布到正式环境

## 相关文件

- `cloudfunctions/intentClassify/index.js` - 更新意图识别云函数（添加 deletePlant 工具）
- `cloudfunctions/deletePlant/index.js` - 现有的删除植物云函数（无需修改）
- `pages/home/home.js` - 前端删除逻辑（已有，无需修改）

## 完成时间

2026-04-17
