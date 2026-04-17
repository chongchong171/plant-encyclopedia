# 使用真实竹子架图片替换CSS绘制

## Why
用户提供了一张高质量的青绿色竹子置物架PNG图片，视觉效果远超CSS绘制效果。需要将此图片集成到"我的花园"页面，替代当前的纯CSS绘制方案。

## 图片特征分析
- **类型**：透明背景PNG（白色背景需处理）
- **内容**：4层竹编置物架，青绿色竹子，带藤蔓装饰
- **风格**：真实照片质感，自然清新
- **尺寸**：原始比例约 3:4（宽:高）

## What Changes
- 将竹子架图片保存到项目 `image/` 目录
- 改造 WXML 结构：用 `<image>` 替代 CSS 绘制的竹子架元素
- 简化 WXSS：移除复杂的竹子/藤蔓/横梁样式
- 调整植物坑位位置：使用百分比定位在图片上
- 图片适配：居中显示，自适应宽度
- 背景融合：与页面整体色调协调

## Impact
- Affected code:
  - `pages/my-plants/my-plants.wxml` - 结构改造
  - `pages/my-plants/my-plants.wxss` - 样式简化
- New assets:
  - `image/bamboo-shelf.png` - 竹子架背景图

## ADDED Requirements

### Requirement: 竹子架背景图显示
The system SHALL 显示用户提供的竹子架背景图片

#### Scenario: 图片显示
- **GIVEN** 用户打开我的花园页面
- **THEN** 显示高质量竹子架图片（替代CSS绘制）
- **AND** 图片居中显示，自适应屏幕宽度
- **AND** 保持图片原始比例不变形
- **AND** 图片背景与页面色调融合

### Requirement: 植物定位在图片上
The system SHALL 将植物坑位精确定位在竹子架的层板上

#### Scenario: 植物放置
- **GIVEN** 竹子架图片已加载
- **THEN** 植物圆形图标显示在4个层板位置上
- **AND** 使用百分比定位确保适配不同屏幕
- **AND** 植物可点击交互正常

### Requirement: 视觉效果优化
The system SHALL 确保整体视觉协调美观

#### Scenario: 整体效果
- **GIVEN** 用户查看花园页面
- **THEN** 竹子架、植物、页面背景三者协调统一
- **AND** 无明显拼接痕迹或色差
