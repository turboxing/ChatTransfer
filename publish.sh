# 如果添加--debug，会输出log，包体积较大
# pkg package.json -t macos --debug

# 使用说明：
#  sh publish.sh mac    # 只打包 mac 应用
#  sh publish.sh win    # 只打包 windows 应用
#  sh publish.sh all    # 同时打包 mac 和 windows 应用
#  不传参数时默认打包 mac 应用

# 1. 获取当前版本号
export PKG_CACHE_PATH=./.pkg-cache
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "当前软件版本号: $CURRENT_VERSION"

# 2. 提示输入新版本号
read -p "请输入新的版本号 (直接回车则自动递增): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
  # 自动递增修订版本号 (1.0.0 -> 1.0.1)
  NEW_VERSION=$(node -p "
    const v = '$CURRENT_VERSION'.split('.');
    v[2] = (parseInt(v[2]) || 0) + 1;
    v.join('.');
  ")
fi

echo "即将打包版本: $NEW_VERSION"

# 3. 更新 package.json 中的版本号
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# 4. 执行前端构建
echo "正在构建前端..."
cd frontend && npm run build && cd ..

# 5. 执行打包
TARGET="$1"

if [ -z "$TARGET" ]; then
  TARGET="mac"
fi

echo "当前打包目标: $TARGET"

SAFE_VERSION=${NEW_VERSION//./_}

case "$TARGET" in
  mac)
    npx pkg package.json -t node18-macos-x64 --output "dist/ChatTransfer-macos-x64-v${SAFE_VERSION}"
    ;;
  win)
    npx pkg package.json -t node18-win-x64 --output "dist/ChatTransfer-windows-x64-v${NEW_VERSION}.exe"
    ;;
  all)
    npx pkg package.json -t node18-macos-x64 --output "dist/ChatTransfer-macos-x64-v${SAFE_VERSION}"
    npx pkg package.json -t node18-win-x64 --output "dist/ChatTransfer-windows-x64-v${NEW_VERSION}.exe"
    ;;
  *)
    echo "未知目标: $TARGET"
    echo "可选值: mac | win | all"
    exit 1
    ;;
esac
