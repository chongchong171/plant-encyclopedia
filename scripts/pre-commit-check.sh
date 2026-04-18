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

# 7. 检查云函数参数名匹配
echo ""
echo "【7】检查云函数参数名匹配..."
PARAM_MISMATCH=0

# 检查 addPlant 云函数参数
if grep -q "plantData" cloudfunctions/addPlant/index.js; then
  if ! grep -q "plantData:" api/plant.js; then
    echo "❌ addPlant 参数不匹配：云函数用 plantData，前端未传递 plantData"
    ERRORS=$((ERRORS + 1))
    PARAM_MISMATCH=1
  fi
fi

if [ $PARAM_MISMATCH -eq 0 ]; then
  echo "✅ 通过"
fi

# 8. 检查云函数变量名一致性
echo ""
echo "【8】检查云函数变量名一致性..."
VAR_MISMATCH=0

for f in cloudfunctions/*/index.js; do
  # 检查是否定义了 API Key 变量
  if grep -q "const QWEN_API_KEY" "$f" 2>/dev/null; then
    # 检查是否使用了错误的变量名
    if grep -q '\${apiKey}' "$f" 2>/dev/null; then
      echo "❌ $f 变量名不一致：定义 QWEN_API_KEY，使用 apiKey"
      ERRORS=$((ERRORS + 1))
      VAR_MISMATCH=1
    fi
  fi
done

if [ $VAR_MISMATCH -eq 0 ]; then
  echo "✅ 通过"
fi

# 9. 检查函数名是否正确（关键！）
echo ""
echo "【9】检查函数名是否正确..."
FUNC_ERROR=0

# 检查 services/care.js 中的函数调用
if [ -f "services/care.js" ]; then
  # 检查 daysUntilWatering 是否存在（正确应该是 daysUntilWater）
  if grep -q "daysUntilWatering(" services/care.js 2>/dev/null; then
    echo "❌ services/care.js: 函数名错误 daysUntilWatering → 应为 daysUntilWater"
    ERRORS=$((ERRORS + 1))
    FUNC_ERROR=1
  fi
  
  # 检查变量名是否与函数名冲突
  if grep -qE "const daysUntilFertilize = daysUntilFertilize\(" services/care.js 2>/dev/null; then
    echo "❌ services/care.js: 变量名 daysUntilFertilize 与函数名冲突"
    ERRORS=$((ERRORS + 1))
    FUNC_ERROR=1
  fi
  
  # 检查变量名是否与函数名冲突
  if grep -qE "const daysUntilWater = daysUntilWater\(" services/care.js 2>/dev/null; then
    echo "❌ services/care.js: 变量名 daysUntilWater 与函数名冲突"
    ERRORS=$((ERRORS + 1))
    FUNC_ERROR=1
  fi
fi

# 检查 api/cloud.js 返回结构
if [ -f "api/cloud.js" ]; then
  # 检查是否错误地包了一层 data
  if grep -q "return { success: true, data: res.result }" api/cloud.js 2>/dev/null; then
    echo "❌ api/cloud.js: 不应该把云函数结果包在 data 里，应直接返回 res.result"
    ERRORS=$((ERRORS + 1))
    FUNC_ERROR=1
  fi
fi

if [ $FUNC_ERROR -eq 0 ]; then
  echo "✅ 通过"
fi

# 10. 检查返回结构一致性
echo ""
echo "【10】检查返回结构一致性..."
STRUCTURE_ERROR=0

# 检查 api/cloud.js 是否直接返回 res.result
if [ -f "api/cloud.js" ]; then
  # 不应该有 return { success: true, data: res.result }
  if grep -qE "return\s*\{\s*success:\s*true,\s*data:\s*res\.result" api/cloud.js 2>/dev/null; then
    echo "❌ api/cloud.js: 不应该把云函数结果包在 data 里，应直接返回 res.result"
    ERRORS=$((ERRORS + 1))
    STRUCTURE_ERROR=1
  fi
fi

# 检查云函数 getCareGuide 返回结构
if [ -f "cloudfunctions/getCareGuide/index.js" ]; then
  # 不应该有 return { success: true, data: result }
  if grep -qE "return\s*\{\s*success:\s*true,\s*data:\s*result" cloudfunctions/getCareGuide/index.js 2>/dev/null; then
    echo "❌ cloudfunctions/getCareGuide/index.js: 不应该把结果包在 data 里，应直接返回字段"
    ERRORS=$((ERRORS + 1))
    STRUCTURE_ERROR=1
  fi
fi

if [ $STRUCTURE_ERROR -eq 0 ]; then
  echo "✅ 通过"
fi

# 11. 检查新函数是否已导出
echo ""
echo "【11】检查新函数是否已导出..."
EXPORT_ERROR=0

# 检查 services/index.js 是否导出了所有 dedup.js 中的函数
if [ -f "services/dedup.js" ] && [ -f "services/index.js" ]; then
  # 获取 dedup.js 中导出的函数名
  DEDUP_FUNCS=$(grep -oP "module\.exports\s*=\s*\{[^}]*\}" services/dedup.js 2>/dev/null | grep -oP "\w+:" | tr -d ':' | tr '\n' ' ')
  
  for func in $DEDUP_FUNCS; do
    if ! grep -q "$func:" services/index.js 2>/dev/null; then
      echo "❌ services/index.js: 缺少导出 $func"
      ERRORS=$((ERRORS + 1))
      EXPORT_ERROR=1
    fi
  done
fi

if [ $EXPORT_ERROR -eq 0 ]; then
  echo "✅ 通过"
fi

# 12. 检查组件主容器是否使用 CSS 变量
echo ""
echo "【12】检查组件主容器是否使用 CSS 变量..."
CSS_VAR_ERROR=0

# 只检查主容器样式，不检查变体
for f in components/*/*.wxss; do
  if [ -f "$f" ]; then
    # 检查主容器（如 .plant-card）是否使用硬编码值
    # 注意：只检查块级选择器，不检查元素或修饰符
    
    # 检查是否有 .plant-card { ... border-radius: 20rpx ... }
    if grep -qE "^\.plant-card\s*\{[^}]*border-radius:\s*20rpx" "$f" 2>/dev/null; then
      echo "❌ $f: .plant-card 主容器硬编码 border-radius，应使用 var(--card-border-radius)"
      ERRORS=$((ERRORS + 1))
      CSS_VAR_ERROR=1
    fi
    
    # 检查是否有 .problem-picker { ... border-radius: ... }
    if grep -qE "^\.problem-picker\s*\{[^}]*border-radius:\s*[0-9]+rpx" "$f" 2>/dev/null; then
      echo "❌ $f: 主容器硬编码 border-radius，应使用 CSS 变量"
      ERRORS=$((ERRORS + 1))
      CSS_VAR_ERROR=1
    fi
  fi
done

if [ $CSS_VAR_ERROR -eq 0 ]; then
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