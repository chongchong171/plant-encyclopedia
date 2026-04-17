# MEMORY.md - 长期记忆索引

**新 Agent 请先阅读 → [START_HERE.md](./START_HERE.md)**

---

## 📚 文档层级

```
START_HERE.md          ← 入口指南（从这里开始）
    ↓
MEMORY.md              ← 本文件（索引）
    ↓
├── lessons/           ← 教训文档（14条）
├── PROJECTS.md        ← 项目经历（索引）
├── learning/          ← 学习知识
└── docs/各项目/       ← 详细项目文档
```

---

## 👤 用户信息

详见 [USER.md](./USER.md)

- **称呼：** 女王大人
- **时区：** Asia/Shanghai

---

## 🌿 当前项目

**AI 植物管家** - 微信小程序

| 项目 | 值 |
|------|------|
| 状态 | ✅ 运营中 |
| 文档 | [docs/ai-plant-butler/](./docs/ai-plant-butler/) |
| AppID | `wx286acd0921cd1cae` |

---

## ⚠️ 教训索引

详见 [lessons/README.md](./lessons/README.md)

**事故级 ⭐⭐⭐：**
- 费用红线
- API Key 硬编码
- 删除文件不检查
- 修改功能前不看之前能工作的版本
- 使用新 API 不确认费用
- GBIF 图片加载问题（2026-04-11）：域名配置、学名为空、匹配模式、加载策略、没有降级方案

---

## 🔑 API Key 备份（2026-04-12 更新）

| 服务 | Key/配置 | 用途 | 配置位置 |
|------|---------|------|---------|
| GLM-4-Flash | `962f865d75934dacb0dba248c39269ff.bYosRiGyN3N1aTNJ` | 云函数调用（免费） | 云函数环境变量 `GLM_API_KEY` |
| PlantNet | `2b10FL68fQYQN3rsOHf9xCrSe` | 前端直接调用 | 云函数环境变量 `PLANTNET_API_KEY` |
| 百度 AI | API Key: `BA97HsZzeoehYqUm2ZlzqEkF`<br>Secret Key: `1ipudaAnfy7HRAqevg2xulhMPyH2fYx4` | 植物识别备选（1000 次/天） | 云函数环境变量 `BAIDU_API_KEY` `BAIDU_SECRET_KEY` |
| Pexels | `vJlMaD0ecm89X7UDPi9wm6ekyGJnzOjBB3y5jIJJZ4QoQ1HI0rximiZz` | 植物图片搜索（GBIF 备选） | 云函数环境变量 `PEXELS_API_KEY` |

---

## 💰 费用红线

**所有费用操作必须提前跟女王大人确认！**

---

## 📊 运营数据决策（2026-04-13）

### 限流策略
- **决策：** 暂时不设用户限流
- **原因：** API 成本低，优先保证用户体验
- **后续：** 1.0 上线后考虑会员功能 + 配额体系

### 数据分析需求
**需要监控的数据：**
1. 每日新增用户数
2. 每日活跃用户数 (DAU)
3. 老用户/新用户比例
4. 用户使用时长
5. API 调用统计（各云函数使用次数）

**实现方案：** 轻量级埋点
- 云函数：`analytics_track`（记录用户访问 + API 调用）
- 数据库集合：`analytics_users`（用户档案）、`analytics_daily`（每日汇总）
- 查看方式：云开发控制台直接查看原始数据

---

*最后更新：2026-04-13 00:49*