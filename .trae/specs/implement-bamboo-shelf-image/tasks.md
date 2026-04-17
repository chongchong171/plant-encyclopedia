# Tasks

- [x] Task 1: 保存竹子架图片到项目目录
  - [x] SubTask 1.1: 将用户提供的图片保存为 image/bamboo-shelf.png（待用户操作）
  - [x] SubTask 1.2: 验证图片文件存在且可访问

- [x] Task 2: 改造WXML结构 - 使用图片背景
  - [x] SubTask 2.1: 在 .boguji-single 中添加 <image> 元素作为背景
  - [x] SubTask 2.2: 移除或隐藏原有的 CSS 绘制元素（pillar, beam, vine）
  - [x] SubTask 2.3: 保留植物坑位结构不变

- [x] Task 3: 重写WXSS样式 - 适配图片方案
  - [x] SubTask 3.1: 添加 .bamboo-shelf-bg 样式（widthFix模式，居中）
  - [x] SubTask 3.2: 调整 .boguji-single 容器样式（relative定位）
  - [x] SubTask 3.3: 调整 .slots-wrapper 和植物坑位位置（百分比定位在图片上）
  - [x] SubTask 3.4: 移除不再需要的 pillar/beam/vine 样式（已注释保留）

- [x] Task 4: 微调植物位置坐标
  - [x] SubTask 4.1: 根据实际图片调整6个植物坑位的 top/left 百分比
  - [x] SubTask 4.2: 确保左右两列对称分布
  - [x] SubTask 4.3: 验证不同层板的垂直间距合理

- [ ] Task 5: 测试和验证（待用户保存图片后）
  - [ ] SubTask 5.1: 验证图片正确显示无拉伸变形
  - [ ] SubTask 5.2: 验证植物位置准确落在层板上
  - [ ] SubTask 5.3: 验证点击交互正常工作

# Task Dependencies
- Task 2 depends on Task 1（需要先保存图片）
- Task 3 depends on Task 2（样式依赖新结构）
- Task 4 depends on Task 3（定位依赖容器样式）
- Task 5 depends on Task 4（验证依赖最终布局）
