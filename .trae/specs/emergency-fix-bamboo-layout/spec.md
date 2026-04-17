# 紧急修复竹子架布局规格

## Why
当前截图显示：
1. 竹子架尺寸太小（只占了中间一小块）
2. 白色背景仍然明显（mix-blend-mode可能未生效）
3. 植物位置不准确（有些超出竹子架范围）
4. 竹子架没有充分利用可用空间

## What Changes
- 强制设置竹子架容器高度为固定值或vh单位
- 移除可能不生效的mix-blend-mode，改用其他方案
- 重新调整所有定位参数
- 确保样式优先级正确

## Impact
- `pages/my-plants/my-plants.wxss` - 关键样式重写

## MODIFIED Requirements

### Requirement: 强制竹子架尺寸
The system SHALL 使用固定/视口单位确保竹子架尺寸正确

#### Scenario:
- **GIVEN** 百分比和flex可能导致尺寸计算失败
- **THEN** 使用 `min-height` + `vh` 单位强制设置高度
- **AND** 宽度使用 `min-width` 确保88%生效

### Requirement: 处理白色背景备选方案
The system SHALL 提供多种背景处理方案

#### Scenario:
- **GIVEN** mix-blend-mode 在小程序中可能不兼容
- **THEN** 尝试方案A: opacity调整
- **OR** 方案B: 使用filter滤镜
- **OR** 方案C: 接受白色背景但优化整体协调

### Requirement: 植物位置重新校准
The system SHALL 根据实际显示效果调整植物位置

#### Scenario:
- **GIVEN** 当前植物位置不准确
- **THEN** 增大top值让植物下移
- **AND** 调整left/right确保在竹子架范围内
