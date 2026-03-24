#!/bin/bash
# 初始化 Git Hooks
# 在克隆项目后执行此脚本

echo "配置 Git Hooks..."

cd "$(dirname "$0")/.."

# 创建 .git/hooks 目录（如果不存在）
mkdir -p .git/hooks

# 创建 pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Git pre-commit hook
# 每次提交前自动执行代码检查

echo "执行代码提交前检查..."
bash scripts/pre-commit-check.sh

# 如果检查失败，阻止提交
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ 代码检查未通过，提交被阻止"
  echo "请修复问题后重新提交"
  exit 1
fi

echo ""
echo "✅ 代码检查通过，继续提交..."
exit 0
EOF

chmod +x .git/hooks/pre-commit

echo "✅ Git Hooks 配置完成"
echo ""
echo "现在每次 git commit 前都会自动执行代码检查"