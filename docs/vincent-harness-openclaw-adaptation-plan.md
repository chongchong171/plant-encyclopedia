# Vincent Harness → OpenClaw Skill 改造方案

**分析时间：** 2026-04-19  
**原项目：** https://github.com/zhuoweishun/vincent-harness  
**目标：** 改造成 OpenClaw 专用的 Skills 系统

---

## 📊 核心分析

### Vincent Harness 架构
```
┌─────────────────────────────────────────┐
│  Guides (前馈控制)                       │
│  - 8 个 Skills (PRD/Spec/Plan/Build 等)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Sensors (反馈控制)                      │
│  - Hooks (Claude Code)                  │
│  - Git Hooks                            │
│  - CI/CD                                │
│  - 2 阶段代码审查                         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Evolution (规则进化)                    │
│  - 反馈记录 → 规则毕业                   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Context Firewall (子代理隔离)            │
│  - 子代理角色卡                          │
└─────────────────────────────────────────┘
```

---

## ✅ 可直接适配到 OpenClaw 的部分

### 1. Skills 系统（⭐⭐⭐⭐⭐ 完全匹配）
**Harness 有 8 个 Skills：**
| Skill | 用途 | OpenClaw 适配 |
|-------|------|--------------|
| product-spec-builder | 需求澄清 → PRD | ✅ 可直接改造 |
| design-brief-builder | 视觉风格定义 | ✅ 可直接改造 |
| dev-planner | 任务拆解 | ✅ 可直接改造 |
| dev-builder | 代码实现 | ✅ 可直接改造 |
| code-review | 两阶段审查 | ✅ 可直接改造 |
| bug-fixer | 问题修复 | ✅ 可直接改造 |
| design-maker | 原型制作 | ⚠️ 需调整（OpenClaw 无设计工具） |
| release-builder | 发布说明 | ✅ 可直接改造 |

**OpenClaw Skills 格式：**
```markdown
---
name: skill-name
description: 一句话描述
---

# Objective
# Input Contract
# Output Contract
# Procedure
# Gate
```

**Harness SKILL.md 格式：** 几乎一致！

---

### 2. Checklists/Gates（⭐⭐⭐⭐⭐ 完全匹配）
**Harness 有 6 个检查清单：**
- `gate-preflight.md` —— 动手前检查
- `gate-spec-review.md` —— 规格审查
- `gate-code-review.md` —— 代码审查
- `gate-phase-review.md` —— 阶段验收
- `definition-of-done.md` —— 完成定义
- `verification.md` —— 验证清单

**OpenClaw 可直接用：**
- 放在 `skills/xxx/checklists/` 目录
- Skill 中引用对应的检查清单

---

### 3. Templates（⭐⭐⭐⭐⭐ 完全匹配）
**Harness 模板：**
- `templates/PRD.md`
- `templates/SPEC.md`
- `templates/PLAN.md`
- `templates/TASKS.md`
- `templates/REVIEW_REPORT.md`
- `templates/DOC_EVIDENCE.md`
- `templates/MANUAL_TEST.md`

**OpenClaw 可直接用：**
- 放在 `skills/xxx/templates/` 目录
- Skill 执行时生成到项目 `docs/` 目录

---

### 4. Subagents 角色卡（⭐⭐⭐⭐ 可适配）
**Harness 子代理：**
- `implementer.md` —— 实现者
- `code-reviewer.md` —— 审查者
- `doc-scout.md` —— 文档侦察
- `feedback-observer.md` —— 反馈记录
- `evolution-runner.md` —— 规则进化

**OpenClaw 适配：**
- OpenClaw 有 `sessions_spawn` 和 `subagents` 系统
- 可以创建类似的角色卡
- 用 `runtime="subagent"` 调用

---

## ❌ 不能直接适配的部分

### 1. Claude Code Hooks（❌ 完全不兼容）
**Harness 做法：**
```json
// .claude/settings.json
{
  "hooks": {
    "preToolUse": "./hooks/strict-stop-gate.py"
  }
}
```

**问题：**
- OpenClaw 没有 hooks 机制
- 无法强制拦截工具调用

**替代方案：**
- 用 Skill 的"Gate"作为软性约束
- 靠 AI 自觉遵守（不强制）
- 在 HEARTBEAT.md 中提醒

---

### 2. Git Hooks（❌ 不推荐）
**Harness 做法：**
```bash
# .git/hooks/pre-commit
./vincent-harness/sensors/git-hooks/pre-commit
```

**问题：**
- 需要每个项目单独配置
- 容易误触发
- OpenClaw 项目不一定用 git

**替代方案：**
- 用 Skill 的"阶段验收"代替
- 在关键节点手动触发审查

---

### 3. Strict Mode（❌ 不兼容）
**Harness 做法：**
- 通过 Claude Code hooks 强制门禁
- 不满足条件不让结束

**问题：**
- OpenClaw 无此机制

**替代方案：**
- 用"Output Contract"约束输出
- 靠 AI 自觉填写 Gate 自检清单

---

## 🎯 改造方案（OpenClaw 专用版）

### 方案名称：**OpenClaw Harness Lite**

### 目录结构
```
/root/.openclaw/workspace-guagua/skills/harness/
├── README.md                    # 使用说明
├── core/
│   ├── HARNESS.md               # 总原则
│   ├── ROUTER.md                # 意图识别路由
│   ├── CAPABILITIES.md          # 文档检索路由
│   └── SCORECARDS.md            # 质量评分卡
├── skills/
│   ├── product-spec-builder/
│   │   ├── SKILL.md             # Skill 定义
│   │   ├── checklists/
│   │   │   └── gate-preflight.md
│   │   └── templates/
│   │       └── PRD.md
│   ├── design-brief-builder/
│   ├── dev-planner/
│   ├── dev-builder/
│   ├── code-review/
│   ├── bug-fixer/
│   └── release-builder/
├── subagents/
│   ├── implementer.md
│   ├── code-reviewer.md
│   ├── doc-scout.md
│   └── feedback-observer.md
└── templates/
    ├── PRD.md
    ├── SPEC.md
    ├── PLAN.md
    ├── TASKS.md
    ├── REVIEW_REPORT.md
    ├── DOC_EVIDENCE.md
    └── MANUAL_TEST.md
```

---

## 📝 Skill 改造示例

### 示例 1：product-spec-builder

**原 Harness 格式：**
```markdown
---
name: product-spec-builder
description: 通过多轮追问把模糊想法固化成可执行 PRD
---

# Objective
把用户的"想法/需求"转成**可验收**的 PRD...

# Input Contract
- 用户描述（可模糊）
- 任何现有材料...

# Output Contract
## Artifacts
生成或更新：docs/PRD.md

## Gate
- PRD 包含 Goals / Non-goals
- 需求列表按 P0/P1/P2 分级
- 验收标准可测试...
```

**改造后 OpenClaw 格式：** （几乎一样，增加 OpenClaw 特定说明）
```markdown
---
name: product-spec-builder
description: 通过多轮追问把模糊想法固化成可执行 PRD（给后续所有阶段当基准）
version: 1.0.0
author: Vincent Harness (adapted for OpenClaw)
---

# Objective
把用户的"想法/需求"转成**可验收**的 PRD，并明确范围边界与优先级。

**适用场景：**
- 用户提出新功能想法
- 需求模糊需要澄清
- 准备进入开发前

**OpenClaw 特定说明：**
- 本 Skill 通过 `memory_search` 查找历史决策
- 文档生成到项目目录 `/root/projects/{project}/docs/PRD.md`

# Input Contract
- 用户描述（可模糊）
- 任何现有材料（链接、竞品、草图、代码库）
- 约束（时间、平台、合规、成本）

# Output Contract（必须输出）

## Artifacts
生成或更新：
- `{PROJECT_ROOT}/docs/PRD.md`
- `{PROJECT_ROOT}/docs/DECISIONS.md`（可选）

## Gate（通过条件）
- [ ] PRD 包含 Goals / Non-goals
- [ ] 需求列表按 P0/P1/P2 分级
- [ ] **验收标准可测试**（Given/When/Then 或等价形式）
- [ ] 约束/依赖/风险已列出（最少 3 条，若不足说明原因）

## Traceability
在 PRD 底部维护：
- `AC-1 ... AC-n` 的编号列表

## Next
建议进入：
- `design-brief-builder`（如果涉及 UI/品牌且仍模糊）
- 否则进入 `dev-planner`（若已可拆解实现）

# Procedure（执行步骤）

## Step 1：先做"问题澄清"，不要先写 PRD
只要存在关键歧义（会导致 >30% 返工），必须追问。

**追问清单（按需裁剪）：**

### 1) 用户与场景
- 谁在用？一次用多久？频率？规模（用户数/数据量）？
- 典型输入/输出是什么？有没有样例？

### 2) 目标与成功标准
- 成功长什么样？怎么验收？谁来验收？
- 需要量化吗（成功率/时延/成本）？

### 3) 范围边界
- 明确不做什么（Non-goals）
- 有哪些"看起来相关但这期不做"的点？

### 4) 优先级
- P0：没有就不算完成
- P1：重要但可延期
- P2：锦上添花

### 5) 约束与风险
- 平台（Web/iOS/Android/CLI）、环境、版本
- 安全/隐私/合规
- 依赖（第三方 API、支付、存储、账号体系）

## Step 2：生成/更新 PRD.md
使用 `templates/PRD.md` 模板，要求：
- 每个 P0 都至少对应 1 条 AC
- AC 必须可验证（能写测试或手测步骤）

## Step 3：变更记录（当用户"改需求"）
在 PRD 末尾维护一个简短的变更记录块：
- 日期
- 变更摘要
- 影响的 AC 编号

## Step 4：输出 Gate 自检
用清单形式列出 Gate 是否通过，并指出缺口。

# Tools Used
- `memory_search` - 查找历史决策
- `read` - 读取现有文档
- `write` - 生成 PRD 文档

# Examples

## 示例 1：模糊需求澄清
用户："我想加个植物识别功能"

AI（product-spec-builder）：
"好的，我来帮您澄清这个需求。在写 PRD 之前，我需要确认几个关键点：

1. **使用场景**：用户是在什么情况下使用？拍照识别还是上传图片？
2. **准确率要求**：需要达到多少准确率？有没有基准对比？
3. **返回内容**：识别后返回什么信息？（名称/养护建议/相似度？）
4. **性能要求**：识别耗时要求？并发量预估？
5. **成本约束**：用第三方 API 还是自建模型？预算范围？

请告诉我这些信息，我帮您生成 PRD。"
```

---

### 示例 2：code-review

```markdown
---
name: code-review
description: 触发两阶段审查闭环：Stage1 合规，Stage2 质量
version: 1.0.0
---

# Objective
让"评审"成为推理型传感器，稳定把住质量关：**不靠自觉，靠闭环**。

# Input Contract
- `{PROJECT_ROOT}/docs/PRD.md`（验收标准 AC）
- `{PROJECT_ROOT}/docs/SPEC.md`（条目）
- `{PROJECT_ROOT}/docs/TASKS.md`
- 当前变更（diff / 修改文件列表）

# Output Contract（必须输出）

## Artifacts
- `{PROJECT_ROOT}/docs/REVIEW_REPORT.md`

## Gate
- Stage 1 FAIL：不得进入 Stage 2
- Stage 2 有 BLOCKER：不得交付/不得结束

## Next
- PASS：返回主流程，进入下一个 Task
- FAIL：生成 Fix Brief → 调用 `bug-fixer` → 重审

# Procedure

## Stage 1：Spec 合规审查
- [ ] 所有 AC 都有对应实现
- [ ] 无偏航（做了需求外的事）
- [ ] 无遗漏（需求没做完）
- [ ] 无冲突（与现有代码不冲突）

## Stage 2：质量审查
- [ ] 代码结构清晰（函数/模块职责单一）
- [ ] 错误处理完善
- [ ] 无硬编码/魔法数字
- [ ] 性能考虑（循环/查询优化）
- [ ] 安全考虑（输入验证/权限检查）
- [ ] 可测试性（依赖注入/可 mock）

## 派发子代理（可选）
复杂审查可派发 `subagents/code-reviewer.md`

## 生成审查报告
使用 `templates/REVIEW_REPORT.md` 模板

# Tools Used
- `read` - 读取代码和文档
- `exec` - 运行测试（如需要）
- `sessions_spawn` - 派发子代理审查

# Examples

## 示例：审查云函数修改
用户："我刚改完了植物识别云函数，帮我审查"

AI（code-reviewer）：
"好的，我来做两阶段审查。

## Stage 1: Spec 合规审查
✅ AC-1：支持拍照识别 → 已实现（index.js:15-42）
✅ AC-2：返回植物名称和相似度 → 已实现（index.js:45-58）
⚠️ AC-3：错误处理 → 部分实现（缺少超时处理）
❌ AC-4：性能要求（<2 秒） → 未实现（无缓存）

**Stage 1 结论：** FAIL（2 项未通过）

## Stage 2: 质量审查
（Stage 1 失败，跳过）

## Next
生成 Fix Brief，调用 `bug-fixer` 修复 AC-3 和 AC-4。"
```

---

## 🚀 实施步骤

### 阶段 1：核心框架（1-2 小时）
1. 创建 `skills/harness/` 目录结构
2. 复制并改造核心文档（HARNESS.md/ROUTER.md）
3. 创建模板文件（PRD/SPEC/PLAN 等）

### 阶段 2：Skills 开发（4-6 小时）
1. product-spec-builder
2. dev-planner
3. dev-builder
4. code-review
5. bug-fixer

### 阶段 3：子代理角色卡（2 小时）
1. implementer.md
2. code-reviewer.md
3. doc-scout.md
4. feedback-observer.md

### 阶段 4：集成测试（1 小时）
1. 用 AI 植物管家项目测试
2. 跑通完整流程（PRD → Plan → Build → Review）
3. 修复问题

---

## 📊 工作量评估

| 任务 | 耗时 | 难度 |
|------|------|------|
| 目录结构创建 | 30 分钟 | ⭐ |
| 核心文档改造 | 1 小时 | ⭐⭐ |
| 模板文件创建 | 1 小时 | ⭐ |
| Skills 开发（5 个） | 4 小时 | ⭐⭐⭐ |
| 子代理角色卡 | 2 小时 | ⭐⭐ |
| 集成测试 | 1 小时 | ⭐⭐ |
| **总计** | **9.5 小时** | - |

---

## 💡 核心价值

### 对 AI（我）的价值
1. ✅ **工作规范化** —— 先澄清再动手，避免做偏
2. ✅ **质量可控制** —— 两阶段审查，不靠自觉
3. ✅ **知识可沉淀** —— 文档落盘，跨 session 接续
4. ✅ **教训可进化** —— 反馈 → 规则毕业

### 对女王大人的价值
1. ✅ **交付可预期** —— 每个阶段有 Gate，不烂尾
2. ✅ **质量可信任** —— 审查报告可视化
3. ✅ **进度可追踪** —— TASKS.md 勾选，进度透明
4. ✅ **新人可接手** —— 文档齐全，不依赖口头传授

---

## ⚠️ 风险和挑战

### 风险 1：过度工程化
**问题：** 小项目用大框架，效率降低

**解决：**
- 提供"轻量模式"（只选核心 Skills）
- 简单任务可跳过部分 Gates

---

### 风险 2：文档负担
**问题：** 写文档时间超过写代码

**解决：**
- 提供模板，填空即可
- 文档精简，只写关键点
- 用 AI 自动生成初稿

---

### 风险 3：AI 不自觉
**问题：** Gate 是软约束，AI 可能跳过

**解决：**
- 在 HEARTBEAT.md 中提醒
- 女王大人不定期抽查
- 重要项目手动触发审查

---

## 🎯 我的建议

**建议 1：先做 MVP 版本**
- 只改造 3 个核心 Skills（PRD/Plan/Review）
- 用 AI 植物管家项目试点
- 跑通后再扩展

**建议 2：渐进式采用**
- 不强制所有项目用
- 复杂项目用完整版
- 简单项目用轻量版

**建议 3：持续优化**
- 每次使用后收集反馈
- 3 次反馈 → 改进 Skill
- 定期更新模板和清单

---

## ✅ 结论

**Vincent Harness 可以成功改造为 OpenClaw 专用 Skills！**

**可保留的核心价值：**
- ✅ Skills 系统（8 个核心技能）
- ✅ Gates 机制（检查清单）
- ✅ Templates（文档模板）
- ✅ Subagents（角色卡）

**需要放弃的部分：**
- ❌ Claude Code Hooks（不兼容）
- ❌ Git Hooks（太重）
- ❌ Strict Mode（无强制机制）

**改造工作量：** 约 10 小时

**预期收益：**
- AI 工作更规范（减少返工）
- 交付质量更稳定（审查把关）
- 文档更齐全（新人可接手）

---

**女王大人，需要我现在开始改造吗？**

我可以：
1. 先创建目录结构和核心框架
2. 开发 3 个核心 Skills（PRD/Plan/Review）
3. 用 AI 植物管家项目测试

你说开始，我马上执行！
