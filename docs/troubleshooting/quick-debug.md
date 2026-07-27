# 🚨 机票下单失败 - 快速诊断

## 问题：返回"机票下单失败，请稍后重试"

---

## 🎯 最可能的原因（按概率排序）

### 1️⃣ offer_id 已过期 ⭐⭐⭐⭐⭐
**概率：80%**

**检查方法**：
- offer_id 有效期只有 **10 分钟**
- 从搜索航班到创建订单是否超过 10 分钟？

**解决方案**：
✅ 重新搜索航班，立即预订

---

### 2️⃣ 联系人信息缺失 ⭐⭐⭐⭐
**概率：15%**

**检查方法**：
打开浏览器开发者工具 → Network → 查看请求体是否包含：
```json
"contact": {
  "name": "张三",
  "phone": "13800138000"
}
```

**解决方案**：
✅ 确保填写完整的联系人信息（已在后端添加验证）

---

### 3️⃣ Token 配置错误 ⭐⭐⭐
**概率：5%**

**检查方法**：
```bash
cat wrangler.toml | grep LONGXIA_TOKEN
```

**应该显示**：
```
LONGXIA_TOKEN = "rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk"
```

**解决方案**：
✅ 检查 wrangler.toml 配置

---

## 🔍 快速诊断 3 步

### 步骤 1：查看实时日志
```bash
cd C:\Users\kirei\Desktop\117\111
wrangler tail
```
然后创建订单，查看日志中的错误信息

### 步骤 2：检查浏览器控制台
1. F12 打开开发者工具
2. Network 标签
3. 创建订单
4. 查看 `POST /api/orders` 的响应

### 步骤 3：测试 offer_id
```javascript
// 在浏览器控制台执行
const flight = JSON.parse(localStorage.getItem('selectedFlight'));
console.log('Offer ID:', flight?.offerId);
console.log('有效吗？', flight?.offerId ? '可能有效' : '无效');
```

---

## ✅ 推荐解决方案

### 方案 A：重新搜索（最简单）
1. 访问 flights.html
2. 重新搜索航班
3. **立即选择并预订**（不要等待）

### 方案 B：查看详细日志
```bash
# 终端 1：启动日志监控
wrangler tail

# 终端 2：查看后端响应
# 在浏览器创建订单，查看终端 1 的输出
```

---

## 📋 必须满足的条件

创建订单必须满足：

- ✅ 用户已登录
- ✅ offer_id 存在且未过期（< 10分钟）
- ✅ 乘客信息完整（姓名、证件、手机）
- ✅ 联系人信息完整（姓名、手机）
- ✅ LONGXIA_TOKEN 配置正确

---

## 🔧 已实施的修复

1. ✅ 添加 contact 参数验证
2. ✅ 添加详细错误日志
3. ✅ 改进错误信息显示
4. ✅ 添加调试日志

---

## 📞 需要帮助？

请提供以下信息：
1. `wrangler tail` 的日志输出
2. 浏览器 Network 标签的请求/响应
3. 从搜索到预订间隔的时间

---

## 🎯 下一步

1. **部署最新代码**
   ```bash
   wrangler deploy
   ```

2. **测试完整流程**
   - 搜索 → 立即预订 → 查看结果

3. **查看日志**
   - 如果还是失败，查看 `wrangler tail` 输出

---

**创建时间**: 2026-07-21 15:25  
**优先级**: 🔥🔥🔥 高  
**详细文档**: ORDER-CREATION-DEBUG-GUIDE.md
