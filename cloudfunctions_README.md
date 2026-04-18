# 📦 AI 植物管家 - 云函数代码整理

**整理时间：** 2026-04-10  
**版本：** 第一版（免费版）

---

## 📋 目录结构

```
cloudfunctions/                    ← 第一版免费版（移除限制）
├── login/
├── getMyPlants/
├── addPlant/                      ← 已移除 5 盆限制
├── deletePlant/
├── identifyPlant/
├── getCareGuide/
├── getTempFileURL/
├── speechToText/
├── diagnosePlant/
├── intentClassify/
├── getFriendsRanking/
├── getUserStats/
├── sendAiReminder/
├── sendWaterReminder/
└── updateUserStats/

cloudfunctions_backup_vip/         ← 第二批更新（会员功能备份）
├── createVipOrder/
├── getVipStatus/
└── updateVipStatus/
```

---

## 🎯 第一版修改说明

### 修改的云函数

| 云函数 | 修改内容 | 状态 |
|--------|---------|------|
| addPlant | 移除 5 盆植物限制 | ✅ 已修改 |
| member-limit.js | 移除所有限制检查 | ✅ 已修改 |

### 保留的云函数

**所有其他云函数保持不变，直接上传即可。**

---

## 📝 部署说明

1. 登录微信云开发控制台
2. 逐个上传云函数
3. 测试功能是否正常

---

## ⚠️ 注意事项

- 第一版已移除所有会员限制
- 第二版会员功能代码备份在 `cloudfunctions_backup_vip/`
- 如需恢复会员功能，参考 `docs/会员功能移除清单.md`
