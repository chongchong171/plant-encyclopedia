# Tasks

- [ ] Task 1: 检查被删除的图片清单
  - [ ] SubTask 1.1: 列出所有被删除的图片文件
  - [ ] SubTask 1.2: 检查代码中是否引用这些图片
  - [ ] SubTask 1.3: 标记正在使用但被删除的图片

- [ ] Task 2: 验证核心功能是否正常
  - [ ] SubTask 2.1: 验证首页识别功能（背景图/视频）
  - [ ] SubTask 2.2: 验证发现页头图显示
  - [ ] SubTask 2.3: 验证我的花园头图显示
  - [ ] SubTask 2.4: 验证搜索结果头图加载
  - [ ] SubTask 2.5: 验证识别结果头图加载

- [ ] Task 3: 检查云函数图片获取逻辑
  - [ ] SubTask 3.1: 检查 getCareGuide 云函数的图片获取逻辑
  - [ ] SubTask 3.2: 检查图片降级策略是否完整
  - [ ] SubTask 3.3: 测试云函数是否能正常返回图片

- [ ] Task 4: 生成当前图片使用清单
  - [ ] SubTask 4.1: 扫描所有 wxml 文件，提取图片引用
  - [ ] SubTask 4.2: 扫描所有 wxss 文件，提取背景图片引用
  - [ ] SubTask 4.3: 扫描所有 js 文件，提取动态图片引用
  - [ ] SubTask 4.4: 生成完整的图片使用清单

- [ ] Task 5: 验证默认图片和占位图
  - [ ] SubTask 5.1: 检查默认植物图片是否存在
  - [ ] SubTask 5.2: 检查占位图/加载图是否存在
  - [ ] SubTask 5.3: 检查图标文件是否完整

- [ ] Task 6: 生成验证报告
  - [ ] SubTask 6.1: 总结功能验证结果
  - [ ] SubTask 6.2: 列出有问题的图片引用
  - [ ] SubTask 6.3: 提供修复建议

# Task Dependencies
- Task 2 依赖于 Task 1（先知道哪些图片被删除，才能验证影响）
- Task 4 依赖于 Task 1（需要先扫描代码）
- Task 6 依赖于 Task 2-5（需要所有验证结果）
