# 花草百科全书 🌱

> 拍照识别植物，一键获取养护指南

## 项目简介

花草百科全书是一款基于微信小程序的植物识别应用。用户只需拍照或上传图片，即可识别植物品种，并获取详细的养护指南。

## 功能特性

### 核心功能
- 📷 **拍照识别** - 拍照识别植物，支持 500 次/天
- 🔍 **搜索功能** - 搜索植物名称获取详细信息
- 📖 **详细信息** - 名称、科属、养护指南
- ❤️ **收藏功能** - 收藏喜欢的植物
- 📋 **识别历史** - 查看过往记录
- 🌿 **发现页面** - 当季推荐植物

### 养护指南
- ☀️ 光照需求
- 💧 浇水方法
- 🌡️ 温度要求
- 📊 养护难度评级
- ⚡ 快速要点
- ⚠️ 养护禁忌

## 技术栈

| 类型 | 技术 |
|------|------|
| 前端 | 微信原生小程序 |
| 后端 | 微信云开发 |
| 植物识别 | PlantNet API（500次/天免费） |
| 养护建议 | 通义千问 Qwen-Turbo（100万Token/90天免费） |
| 植物图片 | GBIF API（免费，无限制） |

## 项目结构

```
plant-encyclopedia/
├── pages/
│   ├── home/            # 首页（拍照识别入口）
│   ├── camera/          # 拍照页面
│   ├── result_swiper/   # 识别结果页面
│   ├── discover/        # 发现页面（当季推荐）
│   ├── search_page/     # 搜索页面
│   ├── search_result/   # 搜索结果页面
│   ├── favorites/       # 收藏页面
│   ├── history/         # 历史记录页面
│   └── profile/         # 个人中心
├── utils/
│   ├── plantIdentify.js # 植物识别工具
│   └── util.js          # 通用工具函数
├── image/
│   └── tab/             # 底部导航图标
├── modules/             # 功能模块
├── docs/                # 文档
├── scripts/             # 脚本
├── app.js
├── app.json
├── app.wxss
└── project.config.json
```

## API 配置

### 1. 微信公众平台配置

#### 服务器域名（开发管理 → 开发设置 → 服务器域名）
```
request 合法域名：
- https://my-api.plantnet.org
- https://dashscope.aliyuncs.com
- https://api.gbif.org
```

#### 隐私协议（设置 → 基本设置 → 用户隐私保护指引）
- 相机权限：用于拍照识别植物
- 相册权限：用于从相册选择图片识别植物

### 2. API Key 配置

在 `app.js` 的 `globalData` 中配置：

```javascript
globalData: {
  qwenApiKey: '您的通义千问 API Key',
  plantnetApiKey: '您的 PlantNet API Key',
}
```

#### 获取方式：
- **PlantNet API Key**: https://my-api.plantnet.org （免费，500次/天）
- **通义千问 API Key**: https://dashscope.console.aliyun.com （免费 100万Token/90天）

## 免费额度说明

| API | 免费额度 | 说明 |
|-----|---------|------|
| PlantNet | 500 次/天 | 植物识别 |
| 通义千问 | 100万 Token/90天 | 养护建议生成 |
| GBIF | 无限制 | 植物图片搜索 |

## 开发进度

- [x] 项目初始化
- [x] 拍照识别功能
- [x] 搜索功能
- [x] 收藏功能
- [x] 历史记录
- [x] 发现页面
- [x] 个人中心
- [x] 隐私协议配置
- [x] 上线发布

## 注意事项

### 费用红线
⚠️ 所有 API 必须使用免费额度，禁止使用付费模型！

### 降级方案
目前使用 PlantNet 识别，每日 500 次限制。  
企业认证后可添加百度 AI 植物识别作为降级方案（免费 3 万次总额度）。

## 许可证

本项目基于 MIT 协议开源

---

**让每个人都能养好花！** 🌸