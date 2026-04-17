# 修复竹子架布局规格

## Why
竹子架背景图已成功显示，但存在以下布局问题：
1. 图片带有白色背景，与页面不协调
2. 竹子架尺寸太小，没有充分利用空间
3. 位置未对齐：应该从统计模块下方延伸到底部导航栏
4. 左右留白不均匀

## What Changes
- 调整竹子架尺寸：放大到合适大小，填充可用空间
- 处理白色背景：使用CSS混合模式或裁剪
- 调整位置：上至统计模块，下至底部TAB
- 统一左右留白比例

## Impact
- Affected code:
  - `pages/my-plants/my-plants.wxss` - 布局样式调整
  - `pages/my-plants/my-plants.wxml` - 可能需要微调

## MODIFIED Requirements

### Requirement: 竹子架尺寸适配
The system SHALL 将竹子架放大到合适尺寸

#### Scenario: 尺寸调整
- **GIVEN** 用户查看花园页面
- **THEN** 竹子架宽度占屏幕的 **85-90%**
- **AND** 高度从统计模块底部延伸到 **TAB栏上方**
- **AND** 保持图片原始比例不变形

### Requirement: 白色背景处理
The system SHALL 去除或融合竹子架的白色背景

#### Scenario: 背景处理
- **GIVEN** 竹子架图片有白色背景
- **THEN** 使用 CSS `mix-blend-mode: multiply` 或其他方式融合
- **OR** 使用 `border-radius` 柔化边缘
- **AND** 整体视觉协调自然

### Requirement: 居中对称布局
The system SHALL 确保竹子架居中且左右留白对称

#### Scenario: 对称布局
- **GIVEN** 页面显示竹子架
- **THEN** 左右留白相等（各5-7.5%）
- **AND** 竹子架水平居中
