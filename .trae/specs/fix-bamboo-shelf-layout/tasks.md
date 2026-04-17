# Tasks

- [x] Task 1: 调整竹子架容器尺寸和位置
  - [x] SubTask 1.1: 设置 .shelf-container 高度为 calc(100vh - 700rpx)
  - [x] SubTask 1.2: 设置 .boguji-single 宽度为 88%
  - [x] SubTask 1.3: 确保 .bamboo-shelf-bg 填满容器

- [x] Task 2: 处理白色背景问题
  - [x] SubTask 2.1: 为 .bamboo-shelf-bg 添加 mix-blend-mode: multiply
  - [x] SubTask 2.2: 使用 border-radius: 16rpx 柔化边缘
  - [x] SubTask 2.3: 背景融合效果已应用

- [x] Task 3: 调整植物坑位位置适配新尺寸
  - [x] SubTask 3.1: 重新计算 .slots-wrapper 的 top/left/right/bottom 百分比
  - [x] SubTask 3.2: 微调植物位置使其落在层板上
  - [x] SubTask 3.3: 验证左右两列对称

- [ ] Task 4: 测试验证（待用户确认）
  - [ ] SubTask 4.1: 验证竹子架尺寸合适
  - [ ] SubTask 4.2: 验证位置正确（统计下→TAB上）
  - [ ] SubTask 4.3: 验证左右留白对称
  - [ ] SubTask 4.4: 验证白色背景已处理

# Task Dependencies
- Task 2 可以和 Task 1 并行
- Task 3 depends on Task 1（定位依赖容器尺寸）
- Task 4 depends on Task 1, 2, 3
