#!/bin/bash
# 代码提交前检查脚本
# 执行方式: bash scripts/pre-commit-check.sh

echo "======================================"
echo "  代码提交前检查"
echo "======================================"

cd "$(dirname "$0")/.."

ERRORS=0

# 1. 检查未定义变量
echo ""
echo "【1】检查未定义变量..."
echo "检查 imagePath 在 utils 中:"
if grep -rn "imagePath" utils/*.js 2>/dev/null; then
  echo "❌ 发现 imagePath 在 utils 中使用"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

# 2. 检查 API Key 是否硬编码
echo ""
echo "【2】检查 API Key 硬编码..."
if grep -rn "sk-[a-zA-Z0-9]\{20,\}" pages/*.js pages/**/*.js 2>/dev/null | grep -v "globalData"; then
  echo "❌ 发现 API Key 硬编码"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ 通过"
fi

# 3. 检查数据结构关键字段
echo ""
echo "【3】检查数据结构..."
echo "plantIdentify.js 返回数据结构:"
if grep -q "commonNames" utils/plantIdentify.js && \
   grep -q "plantProfile" utils/plantIdentify.js && \
   grep -q "careGuide" utils/plantIdentify.js; then
  echo "✅ 通过"
else
  echo "❌ 数据结构缺少必要字段"
  ERRORS=$((ERRORS + 1))
fi

# 4. 检查 result_swiper.js 数据接收
echo ""
echo "【4】检查 result_swiper.js 数据接收..."
if grep -q "result.data.commonNames" pages/result_swiper/result_swiper.js && \
   grep -q "result.data.plantProfile" pages/result_swiper/result_swiper.js; then
  echo "✅ 通过"
else
  echo "❌ 数据接收不完整"
  ERRORS=$((ERRORS + 1))
fi

# 5. 检查页面 JSON 格式
echo ""
echo "【5】检查页面 JSON 格式..."
for f in pages/*/*.json; do
  if grep -q '"window"' "$f" 2>/dev/null; then
    echo "❌ $f 包含 'window' 字段（页面 JSON 不允许）"
    ERRORS=$((ERRORS + 1))
  fi
done
echo "✅ 通过"

# 6. 检查常见错别字
echo ""
echo "【6】检查常见错别字..."
TYPO_FOUND=0
if grep -rn "党护" . --include="*.wxml" --include="*.js" --include="*.wxss" 2>/dev/null; then
  echo "❌ 发现错别字：党护 → 应为 养护"
  ERRORS=$((ERRORS + 1))
  TYPO_FOUND=1
fi
if [ $TYPO_FOUND -eq 0 ]; then
  echo "✅ 通过"
fi

# 总结
echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
  echo "  ✅ 所有检查通过，可以提交"
  echo "======================================"
  exit 0
else
  echo "  ❌ 发现 $ERRORS 个问题，请修复后再提交"
  echo "======================================"
  exit 1
fi