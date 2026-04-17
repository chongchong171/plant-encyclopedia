# 修复竹子架视觉效果规格

## Why
当前植物展示架存在以下视觉问题：
1. 展示架位置偏右，需要继续向左移动
2. 藤蔓装饰没有正确显示
3. 竹子立柱看起来像绿色棍子，没有竹节的粗细变化和颜色深浅效果

## What Changes
- 调整展示架位置，继续向左移动
- 修复藤蔓装饰显示问题
- 重新设计竹子立柱样式，增加竹节效果（粗细变化、颜色深浅）

## Impact
- Affected code:
  - `pages/my-plants/my-plants.wxss` - 样式调整
  - `pages/my-plants/my-plants.wxml` - 结构检查

## MODIFIED Requirements

### Requirement: 展示架位置调整
The system SHALL 将植物展示架继续向左移动

#### Scenario: 位置调整
- **GIVEN** 用户打开我的花园页面
- **THEN** 展示架在屏幕中水平居中或略偏左

### Requirement: 竹子立柱竹节效果
The system SHALL 渲染竹子立柱的竹节效果

#### Scenario: 竹节视觉效果
- **GIVEN** 用户查看竹子架
- **THEN** 竹子立柱显示竹节（颜色深浅变化）
- **AND** 竹节处有粗细变化
- **AND** 能看出是一节一节的竹子，而不是绿色棍子

### Requirement: 藤蔓装饰显示
The system SHALL 正确显示藤蔓装饰

#### Scenario: 藤蔓可见
- **GIVEN** 用户查看竹子架两侧
- **THEN** 能看到藤蔓主茎
- **AND** 能看到藤蔓叶子连接到主茎上
