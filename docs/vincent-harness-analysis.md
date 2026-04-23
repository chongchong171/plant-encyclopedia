# Vincent Harness 分析报告

**分析时间：** 2026-04-19  
**项目地址：** https://github.com/zhuoweishun/vincent-harness

---

## 📋 项目概述

**Vincent Harness 是什么？**

一套给 AI 编程助手（Claude Code / TRAE）安装的专业开发工作流框架，把"随意 coding"变成"规范化产品开发"。

**核心价值：**
- 从模糊想法 → PRD → 计划 → 实现 → 审查 → 发布，每个环节都有门禁
- 内置 PM + 架构 + 实现 + QA + 复盘 角色分工
- 文档必须落盘，跨 session 可接续
- 代码审查自动化，不通过不让结束

---

## 🔧 核心功能

### 1. 7 阶段工作流
```
Intake → Clarify → Spec → Plan → Execute → Verify → Ship
  ↓        ↓        ↓       ↓        ↓        ↓       ↓
接收    澄清需求  写 PRD  拆任务  代码实现  测试验证  发布
```

### 2. 8 个专业技能
| Skill | 用途 | 产出 |
|-------|------|------|
| product-spec-builder | 需求澄清 | docs/PRD.md |
| design-brief-builder | 视觉风格定义 | docs/DESIGN_BRIEF.md |
| design-maker | 原型/组件规范 | 线框图 |
| dev-planner | 任务拆解 | docs/PLAN.md + TASKS.md |
| dev-builder | 代码实现 | 代码 + 验证 |
| code-review | 两阶段审查 | 审查报告 |
| bug-fixer | 修复问题 | 修复 + 回归 |
| release-builder | 发布说明 | Release Notes |

### 3. 门禁系统（Gates）
- **Preflight Gate：** 实现前必须先读规范、搜代码、查文档
- **Review Gate：** 每个 Task 完成后自动审查
- **Verify Gate：** 必须提供可视化验收入口
- **Documentation Gate：** 文档必须落盘到固定位置

### 4. Strict Mode（可选）
开启后 Claude Code 被 hooks 强制门禁，不满足条件不让结束。

---

## 📁 安装后结构
```
project/
├── vincent-harness/          # 核心框架
│   ├── skills/               # 8 个专业技能
│   ├── sensors/              # 传感器（危险命令拦截）
│   ├── adapters/             # Claude Code / TRAE 适配层
│   └── tools/                # 工具脚本
├── .claude/                  # Claude Code hooks（可选）
├── CLAUDE.md                 # 调度层入口
└── docs/
    ├── PRD.md                # 产品规格
    ├── SPEC.md               # 技术规格
    ├── PLAN.md               # 开发计划
    ├── TASKS.md              # 任务列表
    ├── STATE.md              # 进度锚点
    └── ...
```

---

## 🔍 与当前项目对比

### 当前项目结构（AI 植物管家）
```
/root/.openclaw/workspace-guagua/
├── .trae/
│   ├── documents/            # 已有文档（15+ 个 plan/solution）
│   └── specs/                # 已有规范（20+ 个子目录）
├── docs/                     # 调研报告/运营文档
├── cloudfunctions/           # 云函数
├── components/               # 小程序组件
├── pages/                    # 小程序页面
└── ...
```

### 对比分析
| 维度 | Vincent Harness | 当前项目 | 匹配度 |
|------|----------------|----------|--------|
| 编辑器 | Claude Code / TRAE | OpenClaw | ⚠️ 不同 |
| 文档结构 | docs/PRD.md 等 | .trae/documents/ | ✅ 类似 |
| 工作流 | 7 阶段标准化 | 自由流程 | ⚠️ 可改进 |
| 代码审查 | 自动两阶段 | 人工 | ⚠️ 可借鉴 |
| 门禁系统 | Strict Mode | 无 | ⚠️ 可借鉴 |

---

## ✅ 可借鉴的核心思想

### 1. 文档规范化（高价值 ⭐⭐⭐⭐⭐）
**Harness 做法：**
- PRD/SPEC/PLAN/TASKS 固定文件位置
- 历史版本归档到 `docs/archive/YYYY-MM-DD_`
- 每次修改必须更新 `docs/STATE.md`（进度锚点）

**当前项目：**
- ✅ 已有 `.trae/documents/` 和 `.trae/specs/`
- ❌ 文件命名不统一（有的用中文，有的用英文）
- ❌ 没有进度追踪文档

**建议改进：**
```
.trae/documents/
├── 00-STATE.md              # 新增：当前进度/待决策
├── 01-PRD.md                # 统一：产品规格
├── 02-SPEC.md               # 统一：技术规格
├── 03-PLAN.md               # 统一：开发计划
├── 04-TASKS.md              # 统一：任务清单（带勾选）
├── archive/                 # 新增：历史版本归档
│   └── 2026-04-19_search-optimization.md
└── [原有文档...]
```

---

### 2. Preflight Gate（高价值 ⭐⭐⭐⭐）
**Harness 做法：**
实现或修 bug 前必须先：
1. 读现有规范
2. 搜索相关代码
3. 查文档/证据链
4. 形成书面报告再动手

**当前项目：**
- ❌ 经常直接开始改代码
- ❌ 有时改完才发现有冲突
- ❌ 教训重复出现（见 lessons/ 目录）

**建议改进：**
在 `.trae/documents/00-STATE.md` 中增加：
```markdown
## 当前任务
- [ ] 任务描述

## Preflight 检查
- [ ] 已阅读相关规范（SPEC.md）
- [ ] 已搜索相关代码（关键词：xxx）
- [ ] 已查阅历史文档（见 archive/）
- [ ] 已识别潜在风险（见下方）

## 潜在风险
1. ...
2. ...

## 验证计划
- [ ] 测试点 1
- [ ] 测试点 2
```

---

### 3. 两阶段代码审查（中价值 ⭐⭐⭐）
**Harness 做法：**
- **Stage 1：** 代码审查（规范符合性/代码质量）
- **Stage 2：** 功能审查（回归测试/验收标准）
- 不通过则自动进入 bug-fix 循环

**当前项目：**
- ❌ 无正式审查流程
- ❌ 依赖人工测试
- ❌ 回归测试不系统

**建议改进：**
在 `.trae/documents/` 中增加：
```markdown
## CODE_REVIEW.md（新增）
# 任务：[任务名称]
# 审查时间：YYYY-MM-DD HH:mm
# 审查人：AI

## Stage 1: 代码审查
- [ ] 代码规范符合
- [ ] 无冗余/重复代码
- [ ] 错误处理完善
- [ ] 性能考虑

## Stage 2: 功能审查
- [ ] 功能符合 PRD
- [ ] 回归测试通过
- [ ] 无副作用

## 问题列表
1. [ ] 问题描述 → 已修复/待修复

## 结论
- [ ] 通过，可合并
- [ ] 需修复（见问题列表）
```

---

### 4. 文档证据链（中价值 ⭐⭐⭐）
**Harness 做法：**
涉及 Cloudbase/微信/SDK 等关键词时，必须更新 `docs/DOC_EVIDENCE.md`：
- API 文档链接
- 官方示例代码
- 版本兼容性说明
- 已验证的功能点

**当前项目：**
- ✅ 部分文档有链接
- ❌ 不系统，容易遗漏
- ❌ 新人接手难理解

**建议改进：**
在 `.trae/documents/` 中增加：
```markdown
## DOC_EVIDENCE.md（新增）
# 功能：[功能名称]

## 依赖文档
1. [微信云开发文档](https://...)
2. [GLM API 文档](https://...)

## 关键代码位置
- 云函数：`/cloudfunctions/xxx/index.js`
- 前端：`/pages/xxx/xxx.js`

## 版本信息
- 基础库版本：2.19.0
- API 版本：v1.2.3

## 已验证功能
- [x] 功能点 1（测试时间：YYYY-MM-DD）
- [x] 功能点 2
- [ ] 功能点 3（待验证）
```

---

### 5. 可视化验收入口（低价值 ⭐⭐）
**Harness 做法：**
- 前端项目：应用内 Debug 入口
- 后端项目：`docs/demos/` 下的静态 Demo HTML
- 必须更新 `docs/MANUAL_TEST.md` 和 `docs/TEST_RESULTS.md`

**当前项目：**
- ❌ 无统一验收入口
- ❌ 测试靠人工遍历

**建议改进：**
在 `h5/` 目录下增加：
```
h5/
├── debug.html               # 新增：调试页面（可访问）
└── demos/
    ├── plant-card.html      # 新增：组件 Demo
    └── search-result.html   # 新增：页面 Demo
```

---

## ❌ 不适合直接采用的部分

### 1. CLAUDE.md 调度层
**原因：** 当前环境是 OpenClaw，不是 Claude Code
- OpenClaw 有自己的 session 管理和工具系统
- CLAUDE.md 的 hooks 机制不兼容

**替代方案：**
- 在 `HEARTBEAT.md` 或新增 `.openclaw.md` 中定义工作流
- 利用 OpenClaw 的 memory 系统做进度追踪

---

### 2. Strict Mode hooks
**原因：** 
- 需要修改 Claude Code 配置
- OpenClaw 不支持 .claude/hooks

**替代方案：**
- 用检查清单（checklist）代替强制门禁
- 在文档中明确"不完成不让提交"

---

### 3. 子代理角色卡
**原因：**
- Harness 的子代理是为 Claude Code 设计的
- OpenClaw 有 subagents 系统，但接口不同

**替代方案：**
- 用 OpenClaw 的 `sessions_spawn` 实现类似功能
- 定义本地化的角色卡（PM/架构/QA）

---

## 🎯 建议实施方案

### 阶段 1：文档规范化（1 周）
**目标：** 统一现有文档结构

**动作：**
1. 创建 `.trae/documents/00-STATE.md`（进度追踪）
2. 创建 `.trae/documents/04-TASKS.md`（任务清单）
3. 创建 `.trae/documents/archive/`（历史归档）
4. 整理现有文档，移动到新结构

**投入：** 2-3 小时

---

### 阶段 2：Preflight Gate（1 周）
**目标：** 实现"先文档后代码"流程

**动作：**
1. 在 `00-STATE.md` 中增加 Preflight 检查清单
2. 每次任务开始前填写
3. 强制要求"不填清单不开工"

**投入：** 每次任务额外 5-10 分钟

---

### 阶段 3：代码审查（2 周）
**目标：** 建立两阶段审查流程

**动作：**
1. 创建 `.trae/documents/CODE_REVIEW.md` 模板
2. 每个任务完成后填写
3. 问题列表追踪到修复

**投入：** 每次任务额外 10-15 分钟

---

### 阶段 4：证据链文档（持续）
**目标：** 关键功能都有文档支撑

**动作：**
1. 创建 `.trae/documents/DOC_EVIDENCE.md` 模板
2. 涉及外部 API/SDK 时填写
3. 新人接手可直接看文档

**投入：** 每次新功能额外 15-20 分钟

---

## 📊 预期收益

| 改进项 | 当前状态 | 改进后 | 收益 |
|--------|----------|--------|------|
| 文档查找 | 分散，难找 | 统一结构，30 秒定位 | ⭐⭐⭐⭐ |
| 任务追踪 | 靠记忆/聊天记录 | STATE.md 可视化 | ⭐⭐⭐⭐ |
| 代码质量 | 依赖人工审查 | 两阶段审查清单 | ⭐⭐⭐ |
| 新人上手 | 需要口头传授 | 看文档即可 | ⭐⭐⭐⭐ |
| 问题复发 | 教训重复出现 | Preflight 检查避免 | ⭐⭐⭐ |

---

## 🚀 快速启动（如果决定采用）

### 方案 A：完整安装（不推荐）
```bash
cd /root/.openclaw/workspace-guagua
curl -fsSL https://raw.githubusercontent.com/zhuoweishun/vincent-harness/main/scripts/install.sh | bash -s -- --repo zhuoweishun/vincent-harness --ref main --dest .
```

**问题：**
- 与 OpenClaw 环境不兼容
- 可能破坏现有 .trae 结构
- CLAUDE.md hooks 无法使用

---

### 方案 B：借鉴思想，本地化实现（推荐）
**动作：**
1. 不安装 Harness 框架
2. 只借鉴核心思想（文档规范化/Preflight/审查）
3. 用 OpenClaw 兼容的方式实现

**我可以帮你：**
1. 创建统一的文档模板（PRD/SPEC/PLAN/TASKS）
2. 创建 Preflight 检查清单
3. 创建代码审查模板
4. 创建证据链文档模板

---

## 💡 我的结论

**Vincent Harness 的核心思想很有价值，但直接安装不适合当前环境。**

**推荐做法：**
1. ✅ 借鉴文档规范化思想（统一结构 + 进度追踪）
2. ✅ 借鉴 Preflight Gate（先文档后代码）
3. ✅ 借鉴两阶段审查（代码 + 功能）
4. ✅ 借鉴证据链文档（外部依赖追踪）
5. ❌ 不直接安装框架（环境不兼容）
6. ❌ 不用 CLAUDE.md hooks（OpenClaw 不支持）

**我可以帮你创建一套 OpenClaw 兼容的"Harness Lite"版本，保留核心思想，去掉不兼容的部分。**

---

**分析完成时间：** 2026-04-19 22:45

---

女王大人，需要我帮你：

1. **创建文档模板** —— PRD/SPEC/PLAN/TASKS/CODE_REVIEW 模板
2. **重构现有文档结构** —— 整理 .trae/documents/ 和 .trae/specs/
3. **创建 Preflight 检查清单** —— 每次任务前填写
4. **创建进度追踪文档** —— STATE.md（当前进度/待决策）

你说方向，我来执行！
