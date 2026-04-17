# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

## 🔑 API Keys

### Tavily API
- Key: `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`
- 用途：网络搜索、内容提取
- 免费额度：1000 credits/月
- 保存时间：2026-04-06

---

## 💳 微信支付配置

### 商户信息
- 商户号：`1742906938`
- 企业名称：苏州汇和科技产业有限公司
- 关联 APPID：AI 植物管家
- 配置时间：2026-04-10

### APIv2 密钥
- 密钥：`a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6`
- ⚠️ 重要：此密钥只显示一次，已保存
- 用途：支付请求签名

### API 证书
- 状态：待申请
- 文件：apiclient_cert.pem、apiclient_key.pem

---

## 🖼️ Pexels API

- Key: `vJlMaD0ecm89X7UDPi9wm6ekyGJnzOjBB3y5jIJJZ4QoQ1HI0rximiZz`
- 用途：植物图片搜索（GBIF 失败时的备选方案）
- 额度：永久免费，每天 20,000 次
- 配置位置：云函数环境变量 `PEXELS_API_KEY`
- 保存时间：2026-04-12

---

## 🌐 服务器配置（2026-04-15）

### 域名
- **主域名：** `https://plant.yg-crystal.com`
- **SSL 证书：** Let's Encrypt（Caddy 自动续期）
- **CORS：** 已配置（`access-control-allow-origin: *`）

### 腾讯云服务器路径
- **植物图片：** `/data/plant-images/`
- **视频文件：** `/data/videos/`

### 访问 URL
- 图片：`https://plant.yg-crystal.com/plant-images/{filename}`
- 视频：`https://plant.yg-crystal.com/videos/{filename}`

### 上传方式
- ✅ **可直接操作**：服务器在本机，直接用 `cp` 命令复制到 `/data/` 目录
- 示例：`cp /tmp/xxx.png /data/plant-images/xxx.png`

### 已上传资源
| 资源 | 路径 | 状态 | 上传时间 |
|------|------|------|----------|
| 首页视频 | `/data/videos/home-intro.mp4` | ✅ | 2026-04-15 14:32 |
| 植物图片 | `/data/plant-images/*.png` | ✅ 24 张 | 之前 |

### 视频编码信息
- 编码：H.264 Baseline Profile
- 分辨率：540x960（竖屏）
- 时长：12.4 秒
- 大小：1.4MB
- 音频：无（静音播放）

---

## ☁️ 微信云开发配置（2026-04-15 更新）

### 云环境信息
| 项目 | 值 |
|------|-----|
| 环境 ID | `plant-encyclopedia-8d9x10139590b` |
| 环境名称 | `AI 植物管家` |
| 创建时间 | 2026-04-06 |
| 所在地域 | 广州 |

### 云存储配置

#### 视频文件
| 文件 | fileID | 大小 | 上传时间 |
|------|--------|------|----------|
| 首页视频 | `cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/home-video-v12.mp4` | 1.91MB | 2026-04-15 |

#### 植物图片（发现页/分类页）
**路径：** `plant-images/categories/`

| 植物名 | fileID 后缀 | 状态 |
|--------|-----------|------|
| 绿萝 | `plant-images/categories/lvluo.png` | ✅ |
| 虎皮兰 | `plant-images/categories/hupilan.png` | ✅ |
| 文竹 | `plant-images/categories/wenzhu.png` | ✅ |
| 仙人掌 | `plant-images/categories/xianrenzhang.png` | ✅ |
| 吊兰 | `plant-images/categories/diaolan.png` | ✅ |
| 富贵竹 | `plant-images/categories/fuguizhu.png` | ✅ |
| 竹芋 | `plant-images/categories/zhuyu.png` | ✅ |
| 空气凤梨 | `plant-images/categories/kongqifengli.png` | ✅ |
| 波士顿蕨 | `plant-images/categories/boshidunjue.png` | ✅ |
| 蜘蛛抱蛋 | `plant-images/categories/zhiwubaodan.png` | ✅ |
| 金钱树 | `plant-images/categories/jinqianshu.png` | ✅ |
| 长寿花 | `plant-images/categories/changshouhua.png` | ✅ |
| 芦荟 | `plant-images/categories/luhui.png` | ✅ |
| 君子兰 | `plant-images/categories/junzilan.png` | ✅ |
| 虎尾兰 | `plant-images/categories/hubilan.png` | ✅ |
| 万年青 | `plant-images/categories/wannianqing.png` | ✅ |
| 蝴蝶兰 | `plant-images/categories/hudielan.png` | ✅ |
| 栀子花 | `plant-images/categories/zhizihua.png` | ✅ |
| 茉莉花 | `plant-images/categories/molihua.png` | ✅ |
| 天竺葵 | `plant-images/categories/tianzhukui.png` | ✅ |
| 矮牵牛 | `plant-images/categories/aiqianniu.png` | ✅ |
| 月季 | `plant-images/categories/yueji.png` | ✅ |
| 发财树 | `plant-images/categories/facaishu.png` | ✅ |
| 龟背竹 | `plant-images/categories/guibeizhu.png` | ✅ |
| 圆叶椒草 | `plant-images/categories/yuanyejiaocao.png` | ✅ |
| 多肉 | `plant-images/categories/duorou.png` | ✅ |

**完整 fileID 格式：**
```
cloud://plant-encyclopedia-8d9x10139590b.706c-plant-encyclopedia-8d9x10139590b-1416656727/plant-images/categories/xxx.png
```

### 云数据库配置

#### 数据库集合
| 集合名 | 用途 | 说明 |
|--------|------|------|
| `plants` | 用户植物档案 | 存储用户养护的植物信息 |
| `vip_users` | VIP 会员信息 | 存储 VIP 用户等级、有效期等 |
| `care_records` | 养护记录 | 存储浇水、施肥等养护日志 |
| `analytics_users` | 用户分析 | 用户访问统计 |
| `analytics_daily` | 每日汇总 | 每日数据汇总 |

#### 数据库额度
| 项目 | 免费额度 | 超出价格 |
|------|---------|---------|
| 存储容量 | 2GB | 0.5 元/GB/月 |
| 读操作 | 50 万次/月 | 0.015 元/万次 |
| 写操作 | 10 万次/月 | 0.03 元/万次 |

### 云存储额度
| 项目 | 免费额度 | 超出价格 |
|------|---------|---------|
| 存储容量 | 5GB | 0.115 元/GB/月 |
| 下载流量 | 25GB/月 | 0.08 元/GB |
| 上传流量 | 5GB/月 | 免费 |
| 文件个数 | 10 万个 | - |

---

## 🔑 API Keys（2026-04-15 更新）

### 植物识别 API
| 服务 | Key | 用途 | 配置位置 | 额度 |
|------|-----|------|---------|------|
| GLM-4-Flash | `962f865d75934dacb0dba248c39269ff.bYosRiGyN3N1aTNJ` | 云函数调用 AI 识别 | 云函数环境变量 `GLM_API_KEY` | 免费 |
| PlantNet | `2b10FL68fQYQN3rsOHf9xCrSe` | 前端直接调用 | 云函数环境变量 `PLANTNET_API_KEY` | 免费 |
| 百度 AI | API Key: `BA97HsZzeoehYqUm2ZlzqEkF`<br>Secret Key: `1ipudaAnfy7HRAqevg2xulhMPyH2fYx4` | 植物识别备选 | 云函数环境变量 `BAIDU_API_KEY` `BAIDU_SECRET_KEY` | 1000 次/天 |
| Pexels | `vJlMaD0ecm89X7UDPi9wm6ekyGJnzOjBB3y5jIJJZ4QoQ1HI0rximiZz` | 植物图片搜索 | 云函数环境变量 `PEXELS_API_KEY` | 20,000 次/天 |

### 微信支付配置
| 项目 | 值 |
|------|-----|
| 商户号 | `1742906938` |
| 企业名称 | 苏州汇和科技产业有限公司 |
| 关联 APPID | `AI 植物管家` |
| APIv2 密钥 | `a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6` |
| API 证书 | 待申请 |

---

## 📋 小程序配置

### 基本信息
| 项目 | 值 |
|------|-----|
| AppID | `wx286acd0921cd1cae` |
| 名称 | AI 植物管家 |
| 类目 | 工具 - 查询 |

### 服务器域名（微信公众平台配置）
| 类型 | 域名 | 状态 |
|------|------|------|
| downloadFile 合法域名 | `https://plant.yg-crystal.com` | ✅ 已配置 |

### 云开发授权
| 项目 | 状态 |
|------|------|
| 云开发已开通 | ✅ |
| 环境 ID | `plant-encyclopedia-8d9x10139590b` |
| 云函数权限 | ✅ 已授权 |
| 数据库权限 | ✅ 已授权 |

---

## 📝 变更日志

### 2026-04-15
| 时间 | 变更内容 | 影响范围 |
|------|---------|---------|
| 14:32 | 首页视频上传到服务器 `/data/videos/` | 视频重编码 |
| 16:37 | 首页视频改用云存储 | fileID: `home-video-v12.mp4` |
| 17:13 | 发现页/分类页图片改用云存储 | 26 张植物图片 |

### 待办事项
- [ ] 实施图片压缩优化（目标：80KB/张）
- [ ] 实施缩略图策略（列表页 20KB，详情页 200KB）
- [ ] 实施缓存策略（7 天有效期）
- [ ] 实施清理机制（删除植物时同步删图片）

---

*最后更新：2026-04-15 17:15*
