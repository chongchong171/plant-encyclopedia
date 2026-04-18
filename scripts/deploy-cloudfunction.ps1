# 部署单个云函数到微信云开发环境
# 用法：.\scripts\deploy-cloudfunction.ps1 <云函数名称>

param(
    [Parameter(Mandatory=$true)]
    [string]$cloudFunctionName
)

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$cloudFunctionPath = "$projectRoot\cloudfunctions\$cloudFunctionName"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 部署云函数：$cloudFunctionName" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查云函数目录是否存在
if (-not (Test-Path $cloudFunctionPath)) {
    Write-Host "❌ 错误：云函数目录不存在：$cloudFunctionPath" -ForegroundColor Red
    exit 1
}

# 进入云函数目录
Set-Location $cloudFunctionPath

Write-Host "📦 安装依赖..." -ForegroundColor Yellow
npm install --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 依赖安装完成" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "📤 请在微信开发者工具中右键云函数 -> 上传并部署：云端安装依赖" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "云函数路径：$cloudFunctionPath" -ForegroundColor White
Write-Host ""

# 返回项目根目录
Set-Location $projectRoot
