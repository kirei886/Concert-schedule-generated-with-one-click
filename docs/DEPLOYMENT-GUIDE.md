# 🌐 部署到 music.tripay.cn 指南

## 📋 部署前准备

### 1. 域名配置
```
域名：music.tripay.cn
目标：部署演唱会行程生成器 v2.1
```

### 2. 服务器要求
- **Node.js**: >= 14.0.0
- **内存**: >= 512MB
- **存储**: >= 1GB
- **系统**: Linux/Windows Server

---

## 🚀 部署方案

### 方案 A：传统服务器部署（推荐）

#### 步骤 1：准备服务器
```bash
# 安装 Node.js（如果还没有）
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### 步骤 2：上传项目文件
```bash
# 在服务器上创建目录
mkdir -p /var/www/music.tripay.cn
cd /var/www/music.tripay.cn

# 方式1：使用 Git（推荐）
git clone https://github.com/Huiling-123/111.git .

# 方式2：使用 SCP 上传
# 在本地执行
scp -r /path/to/111/* user@your-server:/var/www/music.tripay.cn/

# 方式3：使用 FTP/SFTP 工具上传
# 使用 FileZilla 或 WinSCP 等工具
```

#### 步骤 3：安装依赖
```bash
cd /var/www/music.tripay.cn
npm install --production
```

#### 步骤 4：配置环境变量
```bash
# 创建 .env 文件
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
JWT_SECRET=your_super_secret_jwt_key_change_this
LONGXIA_TOKEN=rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk
AMAP_KEY=your_amap_key_if_needed
EOF

# 设置文件权限
chmod 600 .env
```

#### 步骤 5：初始化数据库
```bash
# 首次运行会自动创建数据库
npm start

# 或手动执行迁移
node migrate.js
```

#### 步骤 6：使用 PM2 管理进程
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "concert-itinerary"

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs concert-itinerary
```

#### 步骤 7：配置 Nginx 反向代理
```bash
# 安装 Nginx
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS/RHEL

# 创建站点配置
sudo nano /etc/nginx/sites-available/music.tripay.cn
```

**Nginx 配置文件**：
```nginx
server {
    listen 80;
    server_name music.tripay.cn;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name music.tripay.cn;

    # SSL 证书配置（需要先申请证书）
    ssl_certificate /etc/nginx/ssl/music.tripay.cn.crt;
    ssl_certificate_key /etc/nginx/ssl/music.tripay.cn.key;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/music.tripay.cn.access.log;
    error_log /var/log/nginx/music.tripay.cn.error.log;

    # 代理到 Node.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 限制上传大小
    client_max_body_size 10M;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/music.tripay.cn /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 步骤 8：申请 SSL 证书（Let's Encrypt）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian

# 自动申请并配置证书
sudo certbot --nginx -d music.tripay.cn

# 测试自动续期
sudo certbot renew --dry-run
```

#### 步骤 9：配置防火墙
```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# FirewallD (CentOS/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

### 方案 B：Docker 部署

#### 创建 Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: concert-itinerary
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - LONGXIA_TOKEN=${LONGXIA_TOKEN}
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

#### 部署命令
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart
```

---

## 🔧 部署后配置

### 1. 修改管理员密码
```bash
# 访问后台
https://music.tripay.cn/admin-dashboard.html

# 登录后立即修改密码
用户名：admin
密码：admin123
```

### 2. 配置网站信息
```bash
# 访问网站配置页面
https://music.tripay.cn/admin-settings.html

# 修改以下配置：
- site_name: 音乐行程助手
- site_description: 演唱会行程一键生成
- contact_email: support@tripay.cn
```

### 3. 更新公开页面
```bash
# 访问内容管理
https://music.tripay.cn/admin-cms.html

# 更新以下页面：
- 关于我们
- 使用帮助
- 隐私政策
- 用户协议
```

---

## 📊 性能优化

### 1. 启用 Gzip 压缩（Nginx）
```nginx
# 在 nginx.conf 或站点配置中添加
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript 
           application/x-javascript application/xml+rss 
           application/json application/javascript;
```

### 2. 配置静态资源 CDN（可选）
```bash
# 将 public/ 目录下的静态文件上传到 CDN
# 修改 HTML 中的静态资源引用
```

### 3. 数据库备份
```bash
# 创建备份脚本
cat > /var/www/music.tripay.cn/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/concert-itinerary"
mkdir -p $BACKUP_DIR
cp /var/www/music.tripay.cn/data/app.db $BACKUP_DIR/app_$DATE.db
# 保留最近30天的备份
find $BACKUP_DIR -name "app_*.db" -mtime +30 -delete
EOF

chmod +x /var/www/music.tripay.cn/backup.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加这一行
0 2 * * * /var/www/music.tripay.cn/backup.sh
```

---

## 🔒 安全加固

### 1. 限制管理后台访问
```nginx
# 在 Nginx 配置中添加
location ~ ^/admin- {
    # 限制IP访问（可选）
    # allow 1.2.3.4;
    # deny all;
    
    proxy_pass http://localhost:3000;
    
    # 添加基本认证（双重保护）
    # auth_basic "Admin Area";
    # auth_basic_user_file /etc/nginx/.htpasswd;
}
```

### 2. 配置 API 限流
```javascript
// 已在 server.js 中配置
// 如需调整，修改以下参数
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200 // 最多200次请求
});
```

### 3. 启用 HTTPS 强制
```nginx
# 已在上面的 Nginx 配置中实现
# HTTP 自动跳转到 HTTPS
```

---

## 📝 部署检查清单

### 部署前
- [ ] 服务器环境准备完成
- [ ] Node.js 版本 >= 14.0.0
- [ ] 域名 DNS 解析配置完成
- [ ] SSL 证书准备完成

### 部署中
- [ ] 项目文件上传完成
- [ ] 依赖安装成功
- [ ] 环境变量配置完成
- [ ] 数据库初始化完成
- [ ] PM2 进程管理配置完成
- [ ] Nginx 反向代理配置完成
- [ ] SSL 证书配置完成
- [ ] 防火墙配置完成

### 部署后
- [ ] 网站可以正常访问（HTTP/HTTPS）
- [ ] 修改管理员密码
- [ ] 配置网站基本信息
- [ ] 测试所有核心功能
- [ ] 配置数据库备份
- [ ] 配置监控告警（可选）
- [ ] 性能测试通过

---

## 🐛 常见问题

### Q1: 端口3000被占用？
```bash
# 查找占用进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000

# 修改端口
# 在 .env 文件中修改 PORT=3001
```

### Q2: Nginx 502 Bad Gateway？
```bash
# 检查 Node.js 应用是否运行
pm2 status

# 检查防火墙是否阻止
sudo ufw status

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### Q3: 数据库权限错误？
```bash
# 修改数据库目录权限
sudo chown -R www-data:www-data /var/www/music.tripay.cn/data
# 或
sudo chown -R $USER:$USER /var/www/music.tripay.cn/data
```

### Q4: SSL 证书过期？
```bash
# Certbot 会自动续期
# 手动续期命令
sudo certbot renew
```

---

## 📞 部署支持

### 需要帮助？
1. 查看服务器日志：`pm2 logs`
2. 查看 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`
3. 检查应用状态：`pm2 status`

### 联系方式
- 技术文档：项目 docs/ 目录
- 快速参考：QUICK-REFERENCE.md

---

## 🎉 部署完成

部署完成后，你的应用将在以下地址可访问：

- **前台首页**：https://music.tripay.cn
- **管理后台**：https://music.tripay.cn/admin-dashboard.html

**祝部署顺利！** 🚀

---

**更新时间**：2026-07-20  
**版本**：v2.1
