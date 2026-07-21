#!/bin/bash

echo "🚀 开始部署 Cloudflare Workers + Pages"
echo ""

# 检查是否在正确的目录
if [ ! -f "wrangler.toml" ]; then
  echo "❌ 错误: 请在 111 目录下运行此脚本"
  exit 1
fi

# 步骤 1: 安装依赖
echo "📦 步骤 1: 安装依赖..."
npm install itty-router

if [ $? -ne 0 ]; then
  echo "❌ 依赖安装失败"
  exit 1
fi

echo "✅ 依赖安装完成"
echo ""

# 步骤 2: 部署 Worker
echo "🔧 步骤 2: 部署 Worker..."
wrangler deploy

if [ $? -ne 0 ]; then
  echo "❌ Worker 部署失败"
  exit 1
fi

echo "✅ Worker 部署完成"
echo ""

# 步骤 3: 提示更新前端配置
echo "⚙️  步骤 3: 更新前端 API 配置"
echo ""
echo "请编辑 cloudflare-pages/js/api-config.js"
echo "将 window.API_BASE 设置为你的 Worker URL"
echo ""
read -p "按 Enter 继续部署前端..."

# 步骤 4: 部署前端
echo "📤 步骤 4: 部署前端到 Cloudflare Pages..."
cd cloudflare-pages
wrangler pages deploy . --project-name=tripay-music-app

if [ $? -ne 0 ]; then
  echo "❌ 前端部署失败"
  exit 1
fi

echo ""
echo "✅ 前端部署完成"
echo ""

# 完成
echo "🎉 部署完成！"
echo ""
echo "📋 下一步:"
echo "1. 访问你的前端网站测试功能"
echo "2. 测试定位查询功能"
echo "3. 检查浏览器控制台是否有错误"
echo ""
