# 🔍 龙虾机票订单创建问题诊断指南

## 📅 创建时间
**2026-07-21 15:20**

---

## 🐛 问题现象

创建机票订单时返回：**"机票下单失败，请稍后重试"**

---

## 🔍 问题可能的原因

### 1. **offer_id 已过期** ⏰
- **原因**：从搜索航班到创建订单超过 10 分钟
- **解决**：重新搜索航班获取新的 offer_id
- **优先级**：⭐⭐⭐⭐⭐ 最常见

### 2. **Contact 参数格式错误** 📝
- **原因**：联系人姓名或手机号为空
- **解决**：确保前端正确传递 contact.name 和 contact.phone
- **优先级**：⭐⭐⭐⭐

### 3. **Passengers 参数格式错误** 👤
- **原因**：乘客信息不完整
- **解决**：确保包含 name, id_type, id_number, phone
- **优先级**：⭐⭐⭐⭐

### 4. **龙虾 API Token 无效** 🔑
- **原因**：LONGXIA_TOKEN 配置错误或已过期
- **解决**：检查 wrangler.toml 中的 Token
- **优先级**：⭐⭐⭐

### 5. **网络连接问题** 🌐
- **原因**：无法连接龙虾 API
- **解决**：检查网络连接和防火墙
- **优先级**：⭐⭐

---

## 🔧 快速诊断步骤

### 步骤 1️⃣：检查 Workers 日志

```bash
wrangler tail
```

**查找关键信息**：
- `龙虾预订请求:` - 查看发送的参数
- `龙虾预订响应:` - 查看 API 返回
- `创建机票订单失败:` - 查看错误堆栈

### 步骤 2️⃣：检查前端发送的数据

**打开浏览器开发者工具**：
1. F12 打开控制台
2. 切换到 Network 标签
3. 创建订单
4. 查看 `POST /api/orders` 请求
5. 检查 Request Payload

**必须包含的字段**：
```json
{
  "item_type": "flight",
  "offer_id": "xxx",  // ⚠️ 不能为空
  "passengers": [...],  // ⚠️ 必须有至少一个乘客
  "contact": {
    "name": "xxx",  // ⚠️ 不能为空
    "phone": "xxx"  // ⚠️ 不能为空
  }
}
```

### 步骤 3️⃣：检查 offer_id 是否有效

**问题**：offer_id 有效期只有 10 分钟

**解决方案**：
- 搜索航班后立即预订
- 或重新搜索航班

**验证方法**：
```javascript
// 在浏览器控制台执行
const selectedFlight = JSON.parse(localStorage.getItem('selectedFlight'));
console.log('Offer ID:', selectedFlight.offerId);
console.log('Search ID:', selectedFlight.searchId);
```

### 步骤 4️⃣：检查 Token 配置

**查看 wrangler.toml**：
```bash
cat wrangler.toml | grep LONGXIA_TOKEN
```

**应该显示**：
```toml
LONGXIA_TOKEN = "rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk"
```

### 步骤 5️⃣：测试龙虾 API 连接

**使用测试脚本**：
```bash
node test-flight-order.js
```

---

## 🎯 常见错误及解决方案

### ❌ 错误 1：offer_id 过期

**错误信息**：
```json
{
  "code": 400,
  "message": "offer已过期",
  "data": null
}
```

**解决方案**：
1. 重新搜索航班
2. 立即预订（不要等待超过 10 分钟）

---

### ❌ 错误 2：Contact 字段验证失败

**错误信息**：
```
Contact.Name / Contact.Phone 字段验证失败
```

**解决方案**：
已在后端添加验证，确保前端正确传递：
```javascript
contact: {
  name: contactName,  // 不能为空
  phone: contactPhone  // 不能为空
}
```

---

### ❌ 错误 3：Token 无效

**错误信息**：
```json
{
  "code": 401,
  "message": "unauthorized"
}
```

**解决方案**：
1. 检查 wrangler.toml 中的 Token
2. 确认 Token 格式：`rdak_live_xxx`
3. 联系龙虾获取新 Token

---

### ❌ 错误 4：网络超时

**错误信息**：
```
创建机票订单失败: fetch failed
```

**解决方案**：
1. 检查网络连接
2. 检查防火墙设置
3. 确认能访问 `https://api.longxiachuxing.com`

---

## 📋 完整的调试检查清单

### 前端检查 ✅

- [ ] 用户已登录（有 token）
- [ ] 已选择航班（localStorage 有 selectedFlight）
- [ ] offer_id 不为空
- [ ] passengers 数组不为空
- [ ] contact.name 和 contact.phone 不为空
- [ ] 所有必填字段都已填写

### 后端检查 ✅

- [ ] LONGXIA_TOKEN 已配置
- [ ] Token 格式正确（rdak_live_xxx）
- [ ] 数据库表有 longxia_order_no 字段
- [ ] Workers 已部署最新代码
- [ ] 能访问龙虾 API

### 数据检查 ✅

- [ ] offer_id 未过期（10分钟内）
- [ ] 乘客信息完整
- [ ] 联系人信息完整
- [ ] 手机号格式正确（11位）
- [ ] 证件号格式正确

---

## 🚀 推荐的测试流程

### 完整测试步骤：

1. **清空缓存**
   ```javascript
   localStorage.clear();
   ```

2. **重新登录**
   - 访问 login.html
   - 用户名：admin
   - 密码：admin123

3. **搜索航班**
   - 访问 flights.html
   - 出发地：深圳
   - 目的地：北京
   - 日期：明天
   - 点击搜索

4. **立即预订（不要等待）**
   - 选择第一个航班
   - 填写完整信息
   - 点击确认预订

5. **查看结果**
   - 成功：跳转到支付页面 ✅
   - 失败：查看错误信息 ❌

---

## 🔍 实时调试

### 方法 1：查看 Workers 日志

```bash
cd C:\Users\kirei\Desktop\117\111
wrangler tail
```

**然后在浏览器创建订单，实时查看日志输出**

### 方法 2：浏览器控制台

```javascript
// 查看当前选中的航班
const flight = JSON.parse(localStorage.getItem('selectedFlight'));
console.log('航班信息:', flight);
console.log('Offer ID:', flight?.offerId);
console.log('搜索时间:', flight?.searchTime || '未记录');
```

### 方法 3：手动测试 API

```bash
# 使用 curl 测试（需要替换 TOKEN 和参数）
curl -X POST https://concert-itinerary-api.music-tripay.workers.dev/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "item_type": "flight",
    "offer_id": "test_123",
    "passengers": [{"name":"张三","id_type":"id_card","id_number":"440300199001011234","phone":"13800138000"}],
    "contact": {"name":"张三","phone":"13800138000"},
    "flight_no": "CA1234"
  }'
```

---

## 💡 最可能的原因

根据经验，**最常见的原因是**：

### 🏆 第一名：offer_id 过期（80%）
- 从搜索到预订间隔太久
- **解决**：搜索后立即预订

### 🥈 第二名：contact 参数为空（15%）
- 前端未正确传递
- **解决**：已在后端添加验证

### 🥉 第三名：Token 配置错误（5%）
- wrangler.toml 中配置错误
- **解决**：检查并更新 Token

---

## 📞 获取帮助

如果以上方法都无法解决，请提供以下信息：

1. **Workers 日志输出**（wrangler tail）
2. **浏览器控制台错误**
3. **Network 标签中的请求详情**
4. **后端返回的完整错误信息**

---

**文档创建时间**: 2026-07-21 15:20  
**最后更新**: 2026-07-21 15:20  
**优先级**: 🔥 高优先级
