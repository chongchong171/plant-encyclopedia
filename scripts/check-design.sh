#!/bin/bash
# ==========================================
# 花草百科全书 - 设计规范检查脚本
# ==========================================

echo "========================================"
echo "  设计规范检查"
echo "========================================"
echo ""

DESIGN_DOC="/root/.openclaw/workspace-guagua/Q3-新项目/花草百科全书/开发方案_v1.1_20260326.md"
DB_DESIGN="/root/.openclaw/workspace-guagua/Q3-新项目/花草百科全书/数据库设计_20260326.md"
PROJECT_DIR="/root/.openclaw/workspace-guagua/plant-encyclopedia"

ERRORS=0

# 【1】检查数据库字段是否与设计一致
echo "【1】检查数据库字段..."
echo ""

# 期望的字段（从设计文档提取）
EXPECTED_FIELDS=(
    "wateringDays"
    "lastWatered"
    "nextWatering"
    "lastFertilized"
    "fertilizingDays"
    "nextFertilizing"
)

# 检查 addPlant 云函数
echo "检查 cloudfunctions/addPlant/index.js..."
for field in "${EXPECTED_FIELDS[@]}"; do
    if grep -q "$field" "$PROJECT_DIR/cloudfunctions/addPlant/index.js"; then
        echo "  ✅ $field 字段存在"
    else
        echo "  ⚠️ $field 字段缺失（可能不是必须）"
    fi
done

echo ""

# 【2】检查页面是否与设计一致
echo "【2】检查页面结构..."
echo ""

EXPECTED_PAGES=(
    "pages/my-plants/my-plants"
    "pages/plant-detail/plant-detail"
)

for page in "${EXPECTED_PAGES[@]}"; do
    if [ -f "$PROJECT_DIR/${page}.js" ]; then
        echo "  ✅ $page 页面存在"
    else
        echo "  ❌ $page 页面缺失"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# 【3】检查 app.json 页面注册
echo "【3】检查 app.json 页面注册..."
echo ""

for page in "${EXPECTED_PAGES[@]}"; do
    if grep -q "$page" "$PROJECT_DIR/app.json"; then
        echo "  ✅ $page 已注册"
    else
        echo "  ❌ $page 未注册"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""

# 【4】检查功能实现
echo "【4】检查功能实现..."
echo ""

# 检查浇水功能
if grep -q "recordWatering" "$PROJECT_DIR/pages/my-plants/my-plants.js" && \
   grep -q "recordWatering" "$PROJECT_DIR/pages/plant-detail/plant-detail.js"; then
    echo "  ✅ 浇水功能已实现"
else
    echo "  ❌ 浇水功能缺失"
    ERRORS=$((ERRORS + 1))
fi

# 检查施肥功能（v1.2）
if grep -q "recordFertilizing" "$PROJECT_DIR/pages/plant-detail/plant-detail.js"; then
    echo "  ✅ 施肥功能已实现（v1.2提前）"
else
    echo "  ⚠️ 施肥功能未实现"
fi

# 检查养护日志
if grep -q "careLog" "$PROJECT_DIR/cloudfunctions/addPlant/index.js"; then
    echo "  ✅ 养护日志已实现"
else
    echo "  ❌ 养护日志缺失"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 【5】检查按钮样式
echo "【5】检查按钮样式..."
echo ""

if grep -q "care-action" "$PROJECT_DIR/pages/my-plants/my-plants.wxml" && \
   grep -q "care-action" "$PROJECT_DIR/pages/my-plants/my-plants.wxss"; then
    echo "  ✅ 浇水按钮样式已定义"
else
    echo "  ❌ 浇水按钮样式缺失"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 【6】检查社区功能（v1.2）
echo "【6】检查社区功能..."
echo ""

# 检查 my-plants 页面是否包含排行榜功能（合并后）
if grep -q "currentTab" "$PROJECT_DIR/pages/my-plants/my-plants.js" && \
   grep -q "loadRankings" "$PROJECT_DIR/pages/my-plants/my-plants.js"; then
    echo "  ✅ 排行榜功能已集成到 my-plants 页面"
else
    echo "  ❌ 排行榜功能未正确集成"
    ERRORS=$((ERRORS + 1))
fi

# 检查云函数
COMMUNITY_FUNCTIONS=(
    "getUserStats"
    "getFriendsRanking"
    "updateUserStats"
)

for func in "${COMMUNITY_FUNCTIONS[@]}"; do
    if [ -d "$PROJECT_DIR/cloudfunctions/$func" ]; then
        echo "  ✅ $func 云函数存在"
    else
        echo "  ⚠️ $func 云函数缺失"
    fi
done

# 检查数据表
if [ -f "$PROJECT_DIR/cloudfunctions/updateUserStats/index.js" ]; then
    if grep -q "user_stats" "$PROJECT_DIR/cloudfunctions/updateUserStats/index.js"; then
        echo "  ✅ user_stats 数据表已使用"
    else
        echo "  ⚠️ user_stats 数据表未使用"
    fi
fi

echo ""

# ==========================================
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo "  ✅ 所有检查通过！"
    echo "========================================"
    exit 0
else
    echo "  ❌ 发现 $ERRORS 个问题"
    echo "========================================"
    exit 1
fi