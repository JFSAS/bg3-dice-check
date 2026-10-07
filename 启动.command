#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
trap 'echo "启动失败，请查看上方错误。按回车关闭。"; read -r' ERR
if command -v node >/dev/null 2>&1 && node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"; then
  exec node launch.mjs
fi
runtime="$PWD/.local-runtime"
if [ ! -x "$runtime/node/bin/node" ]; then
  echo '首次启动：从 nodejs.org 下载便携版 Node.js…'
  case "$(uname -m)" in
    arm64) architecture=arm64 ;;
    x86_64) architecture=x64 ;;
    *) echo '不支持此 CPU 架构'; exit 1 ;;
  esac
  mkdir -p "$runtime"
  base='https://nodejs.org/dist/latest-v22.x/'
  curl --fail --location --retry 2 "${base}SHASUMS256.txt" -o "$runtime/SHASUMS256.txt"
  filename=$(awk -v arch="$architecture" '$2 ~ ("^node-v22\\.[0-9]+\\.[0-9]+-darwin-" arch "\\.tar\\.gz$") {print $2; exit}' "$runtime/SHASUMS256.txt")
  [ -n "$filename" ]
  curl --fail --location --retry 2 "${base}${filename}" -o "$runtime/$filename"
  (cd "$runtime"; awk -v file="$filename" '$2 == file' SHASUMS256.txt | shasum -a 256 -c -)
  tar -xzf "$runtime/$filename" -C "$runtime"
  mv "$runtime/${filename%.tar.gz}" "$runtime/node"
  rm "$runtime/$filename" "$runtime/SHASUMS256.txt"
fi
exec "$runtime/node/bin/node" launch.mjs
