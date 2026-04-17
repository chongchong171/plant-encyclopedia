# Tasks

- [x] Task 1: 重构 WXML 文件结构，按照 7 大模块组织内容
  - [x] Subtask 1.1: 创建植物头图模块（包含图片、收藏按钮、提示文字）
  - [x] Subtask 1.2: 创建基本信息模块（中文名、拉丁学名、别名、科属、养护难度）
  - [x] Subtask 1.3: 创建植物档案模块（形态特征、观赏价值、原产地）
  - [x] Subtask 1.4: 创建生长习性模块（生长环境、生长速度、生命周期）
  - [x] Subtask 1.5: 创建主要价值模块（观赏价值、净化能力、药用食用、寓意）
  - [x] Subtask 1.6: 创建养护指南模块（8 项核心养护内容）
  - [x] Subtask 1.7: 创建养护要点模块（4 条核心要点）
  - [x] Subtask 1.8: 保留辅助模块（季节性养护、植物趣闻，可折叠）
  - [x] Subtask 1.9: 删除旧的不必要的卡片（植物价值、栽培建议等）

- [x] Task 2: 重写 WXSS 文件，优化视觉设计
  - [x] Subtask 2.1: 设计植物头图样式（图片、收藏按钮、提示）
  - [x] Subtask 2.2: 设计基本信息卡片样式（名称、学名、难度标签）
  - [x] Subtask 2.3: 设计各个内容模块的卡片样式（统一的卡片风格）
  - [x] Subtask 2.4: 设计养护指南网格布局（8 项养护内容的网格展示）
  - [x] Subtask 2.5: 为不同养护项目设计独特的颜色标识
  - [x] Subtask 2.6: 优化文字排版（字号、行距、间距）
  - [x] Subtask 2.7: 添加响应式设计（适配不同屏幕尺寸）
  - [x] Subtask 2.8: 添加动画效果（卡片悬停、折叠展开）

- [x] Task 3: 优化 JavaScript 逻辑
  - [x] Subtask 3.1: 更新 collapsedSections 对象，匹配新的可折叠模块
  - [x] Subtask 3.2: 添加 difficultyStars 计算属性（根据难度等级生成星级）
  - [x] Subtask 3.3: 优化数据加载逻辑，确保新模块数据正确显示
  - [x] Subtask 3.4: 移除不再使用的硬编码数据

- [ ] Task 4: 测试和验证
  - [ ] Subtask 4.1: 测试页面加载和显示
  - [ ] Subtask 4.2: 测试各个模块的内容显示（有条件显示的内容）
  - [ ] Subtask 4.3: 测试折叠/展开功能
  - [ ] Subtask 4.4: 测试收藏功能
  - [ ] Subtask 4.5: 测试图片预览功能
  - [ ] Subtask 4.6: 测试不同设备的显示效果（响应式）
  - [ ] Subtask 4.7: 检查页面性能（加载速度、渲染性能）

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 2, Task 3]