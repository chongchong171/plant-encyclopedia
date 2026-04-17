# 植物百科应用改进方案 - 实施计划

## [ ] Task 1: 改进植物区分方式
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 修改植物名称处理逻辑，使用括号数字格式（如"绿萝 (2)"）
  - 去除旧的中文数字格式（如"绿萝 第二盆"）
  - 确保所有重复植物都使用统一的格式
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 检查重复植物是否显示为"植物名称 (2)"格式
  - `human-judgement` TR-1.2: 确保所有重复植物都使用统一的格式
- **Notes**: 需要处理现有植物名称中的旧格式，确保平滑过渡

## [ ] Task 2: 增强诊断标识的视觉效果
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 修改诊断标识的样式，使用蓝色渐变背景
  - 添加脉冲动画效果
  - 确保诊断标识与其他统计项区分明显
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 检查诊断标识是否显示蓝色渐变背景
  - `human-judgement` TR-2.2: 检查诊断图标是否有脉冲动画
  - `human-judgement` TR-2.3: 确保诊断标识醒目但不突兀
- **Notes**: 使用 `:last-child` 选择器确保样式应用到诊断项

## [ ] Task 3: 提升诊断结果的可信度
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 优化AI提示词，增加植物特性分析
  - 扩展规则库，增加更多植物问题类型
  - 改进诊断结果的格式和内容
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 检查诊断结果是否包含详细的可能原因
  - `human-judgement` TR-3.2: 检查诊断结果是否包含具体的解决方案
  - `human-judgement` TR-3.3: 检查诊断结果是否结合植物特性
- **Notes**: 需要平衡AI生成和规则库的使用

## [ ] Task 4: 增加推荐商品的多样性
- **Priority**: P1
- **Depends On**: Task 3
- **Description**: 
  - 扩展商品库，增加更多种类的植物养护产品
  - 改进AI提示词，要求生成具体的推荐商品
  - 优化推荐逻辑，根据植物种类和问题类型推荐
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 检查推荐商品是否根据不同问题有所不同
  - `human-judgement` TR-4.2: 检查推荐商品是否与诊断结果相关
  - `human-judgement` TR-4.3: 检查推荐商品是否具有多样性
- **Notes**: 需要确保商品推荐的相关性和实用性

## [ ] Task 5: 支持植物位置管理
- **Priority**: P2
- **Depends On**: Task 1
- **Description**: 
  - 在编辑植物时添加位置字段
  - 修改植物名称显示逻辑，优先显示位置信息
  - 确保位置信息正确保存和显示
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-5.1: 检查编辑植物时是否有位置字段
  - `human-judgement` TR-5.2: 检查植物名称是否显示为"植物名称（位置）"格式
  - `human-judgement` TR-5.3: 确保位置信息优先于数字编号显示
- **Notes**: 需要处理位置信息的存储和显示逻辑