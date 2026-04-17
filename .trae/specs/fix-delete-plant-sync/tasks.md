# Tasks

- [x] Task 1: 修正 SYSTEM_PROMPT 中的工具名
  - [x] 将 `removePlant` 改为 `deletePlant`
  - [x] 确保所有注释、文档同步更新

- [x] Task 2: 添加 deletePlant 快速回复
  - [x] 在工具执行成功后的快速回复逻辑中添加 deletePlant 分支
  - [x] 确保返回正确的删除消息

- [x] Task 3: 添加删除验证机制（可选）
  - [x] 在 execDeletePlant 函数中添加删除后验证
  - [x] 如果验证失败，返回错误提示

- [ ] Task 4: 测试验证
  - [ ] 测试正常删除流程
  - [ ] 测试删除不存在的植物
  - [ ] 测试删除失败场景

# Task Dependencies

- Task 2 依赖 Task 1（工具名正确后才能正确调用）
- Task 3 依赖 Task 2（先保证基本功能正常）
