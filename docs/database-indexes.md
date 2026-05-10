# 数据库索引配置指南

> 以下索引需要在微信开发者工具 → 云开发控制台 → 数据库 → 对应集合 → 索引管理中手动创建。
> 创建后可显著降低查询耗时（部分查询从全表扫描降至毫秒级）。

---

## my_plants 集合（最高优先级）

该集合是用户访问最频繁的表，以下索引直接影响核心功能体验。

| 索引名称 | 字段 1 | 字段 2 | 用途 |
|---------|--------|--------|------|
| `openid_nextWatering` | `_openid` (升序) | `careInfo.nextWatering` (升序) | 我的花园按浇水时间排序 |
| `nextWatering` | `careInfo.nextWatering` (升序) | — | 定时提醒查询今天需浇水植物 |
| `nextWateringDate_isDead` | `nextWateringDate` (升序) | `isDead` (升序) | AI 推送提醒过滤死亡植物 |
| `openid_name` | `_openid` (升序) | `name` (升序) | 按用户+植物名查询（诊断、删除等） |
| `name` | `name` (升序) | — | 按植物名查询 |

### 涉及的云函数/页面
- `getMyPlants`: `where(_openid).orderBy('careInfo.nextWatering', 'asc')`
- `sendWaterReminder`: `where('careInfo.nextWatering' <= 今天)`
- `sendAiReminder`: `where(nextWateringDate <= now, isDead != true)`
- `intentClassify`: `where(_openid, name)` / `where(name)`
- `deletePlant`: `where(_openid, name)`

---

## analytics_events 集合（后台管理用）

| 索引名称 | 字段 1 | 字段 2 | 用途 |
|---------|--------|--------|------|
| `timestamp_desc` | `timestamp` (降序) | — | 最近事件流查询 |
| `event_timestamp` | `event` (升序) | `timestamp` (降序) | 近7天识别成功率、热门植物 |

### 涉及的云函数
- `getAnalytics` → `getRecentEvents()`: `orderBy('timestamp', 'desc').limit(20)`
- `getAnalytics` → `getIdentifySuccessRate()`: `where(event='identify_plant', timestamp>=7天前)`
- `getAnalytics` → `getHotPlants()`: 同上
- `getAnalytics` → `getHourlyActivity()`: `where(timestamp>=7天前)`

---

## user_stats 集合

| 索引名称 | 字段 1 | 用途 |
|---------|--------|------|
| `openid` | `_openid` (升序) | 快速查询用户统计 |

### 涉及的云函数
- `getUserStats`: `where(_openid).limit(1)`
- `updateUserStats`: `where(_openid)`

---

## users 集合（如存在）

| 索引名称 | 字段 1 | 用途 |
|---------|--------|------|
| `openid` | `_openid` (升序) | 登录时查询用户信息 |

### 涉及的云函数
- `login`: `where(_openid)`
- `updateUserInfo`: `where(_openid)`

---

## friends 集合（如存在）

| 索引名称 | 字段 1 | 用途 |
|---------|--------|------|
| `openid` | `_openid` (升序) | 查询我的好友列表 |
| `friendOpenid` | `friendOpenid` (升序) | 查询我被谁添加 |

### 涉及的云函数
- `getFriendsRanking`: `where(_openid)` / `where(friendOpenid)`

---

## 无需额外索引的查询（微信自动支持）

以下查询模式不需要手动创建索引：

| 集合 | 查询方式 | 原因 |
|-----|---------|------|
| `app_config` | `doc('global')` | 文档 ID 查询，自动索引 |
| `daily_quota` | `doc('YYYY-MM-DD')` | 文档 ID 查询，自动索引 |
| `analytics_daily` | `doc('YYYY-MM-DD')` | 文档 ID 查询，自动索引 |
| `analytics_users` | `doc('user_${openid}')` | 文档 ID 查询，自动索引 |
| `my_plants` | `doc(plantId)` | 文档 ID 查询，自动索引 |
| 任意集合 | `where({ _openid })` 单字段 | 微信云数据库自动为 `_openid` 建索引 |

---

## 创建步骤

1. 打开微信开发者工具
2. 点击「云开发」→「数据库」
3. 选择对应集合（如 `my_plants`）
4. 点击「索引」→「添加索引」
5. 填写索引名称和字段（注意升序/降序）
6. 点击「确定」等待创建完成

> 复合索引的前缀字段可以单独服务前缀查询。例如 `openid_nextWatering` 索引也能加速纯 `_openid` 查询，但反过来不行。
