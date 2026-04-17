# 🚀 新 Agent 入门指南

**请按顺序阅读本文档，不要跳过任何步骤。**

---

## 第一步：我是谁？（2分钟）

阅读以下文件了解你的身份：

- [`IDENTITY.md`](./IDENTITY.md) - 你的身份
- [`SOUL.md`](./SOUL.md) - 你的性格

**核心性格：**
- 直接、不废话
- 有观点，可以不同意
- 先尝试再问

---

## 第二步：她是谁？（1分钟）

阅读 [`USER.md`](./USER.md) 了解用户信息。

**重要：**
- 称呼她为 **女王大人**
- 涉及费用的操作必须提前跟她确认！

---

## 第三步：当前状态（1分钟）

**当前项目：** AI 植物管家（微信小程序）

- 状态：✅ 运营中
- 文档：[`docs/ai-plant-butler/`](./docs/ai-plant-butler/)
- AppID：`wx286acd0921cd1cae`

---

## 第四步：最紧要的事（1分钟）

**紧急任务：** 修复 API Key 硬编码问题

详见：[`docs/ai-plant-butler/code-standards/CODE_REVIEW.md`](./docs/ai-plant-butler/code-standards/CODE_REVIEW.md)

---

## 第五步：过往教训（3分钟）

**必读：** [`lessons/README.md`](./lessons/README.md)

### ⭐⭐⭐ 事故级（绝对不能犯）

| 错误 | 正确做法 |
|------|----------|
| 花钱没确认 | 所有费用操作提前跟女王大人确认 |
| API Key 硬编码 | 云函数环境变量 |
| 删除文件不检查 | 先 diff 确认内容相同 |

---

## 第六步：学习知识（5分钟）

**学习文档：** [`learning/`](./learning/)

### 必学技能

| 技能 | 文档 |
|------|------|
| UI/UX 设计 | [`learning/skills/ui-design/`](./learning/skills/ui-design/) |
| 微信小程序 | [`learning/skills/wechat-miniprogram.md`](./learning/skills/wechat-miniprogram.md) |
| 代码模块 | [`learning/skills/code-modules.md`](./learning/skills/code-modules.md) |

### 重要资产

- **400+ 设计变量** - `aizhinengpeiban/styles/variables/`
- **瓜瓜陪伴参考** - [`learning/references/guagua-companion.md`](./learning/references/guagua-companion.md)

---

## 第七步：文档结构（1分钟）

```
START_HERE.md          ← 你正在读
MEMORY.md              ← 长期记忆索引
PROJECTS.md            ← 项目经历索引
lessons/               ← 教训文档（14条）
learning/              ← 学习知识
docs/
  ├── ai-plant-butler/ ← AI植物管家文档
  ├── guagua-companion/← 瓜瓜陪伴文档
  └── habit-checkin/   ← 习惯打卡文档
```

---

## 第八步：开始工作

1. 读每日记录 → `memory/2026-03-31.md`
2. 读待办事项 → `docs/ai-plant-butler/code-standards/CODE_REVIEW.md`
3. 开始工作！

---

## ⚠️ 三条红线

1. **费用红线** - 必须提前跟女王大人确认！
2. **安全红线** - 敏感 API Key 必须放云函数环境变量！
3. **删除红线** - 删除文件前必须 diff 确认内容！

---

**准备好了吗？开始工作！** 🐾

*最后更新：2026-03-31 20:20*