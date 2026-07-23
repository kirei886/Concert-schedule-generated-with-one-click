# 📋 支付界面实现说明

## 🎨 当前支付页面实现

支付页面位于 `cloudflare-pages/payment.html`，URL 参数为 `?order_id=xxx`

---

## 🔄 支付流程

### 1. 页面初始化
```javascript
async function init() {
  // 1. 检查登录状态
  _currentUser = await Auth.getUser();
  if (!_currentUser) {
    window.location.href = '/login.html?redirect=/orders.html';
    return;
  }

  // 2. 获取 URL 中的 order_id 参数
  const orderId = params.get('order_id');
  
  // 3. 调用接口获取订单详情
  const data = await Auth.apiGet('/api/orders/' + orderId);
  
  // 4. 渲染订单信息
  _order = data.data;
  renderOrderInfo();
}
```

---

### 2. 订单信息展示

页面展示以下信息：
- ✅ 订单总金额（大字体）
- ✅ 订单号
- ✅ 商品名称
- ✅ 数量和单价
- ✅ 出行日期
- ✅ 详细信息

---

### 3. 支付场景判断

根据不同条件显示不同的支付界面：

#### 场景 A: 订单有 `pay_url`（龙虾支付）
```javascript
if (_order.pay_url) {
  // 隐藏支付方式选择
  document.getElementById('payMethods').style.display = 'none';
  
  // 显示龙虾支付提示
  document.getElementById('platformBanner').style.display = 'block';
  document.getElementById('platformBanner').innerHTML = `
    💳 将跳转至龙虾平台进行真实支付
    支付完成后请返回查看订单状态
  `;
  
  // 修改按钮文字
  document.getElementById('payBtnText').textContent = '去龙虾平台支付';
}
```

#### 场景 B: 管理员账号
```javascript
else if (_currentUser.role === 'admin') {
  // 隐藏支付方式选择
  document.getElementById('payMethods').style.display = 'none';
  
  // 显示管理员提示
  document.getElementById('adminBanner').style.display = 'block';
  document.getElementById('adminBanner').innerHTML = `
    🔑 管理员账号，可跳过支付环节
    点击下方按钮直接完成订单
  `;
  
  // 修改按钮文字
  document.getElementById('payBtnText').textContent = '管理员直接完成订单';
}
```

#### 场景 C: 普通用户模拟支付
```javascript
else {
  // 显示支付方式选择
  document.getElementById('payMethods').style.display = 'flex';
  
  // 三种支付方式：微信、支付宝、银行卡
  // 用户点击选择支付方式
}
```

---

## 💳 支付方式选择

支付页面提供三种支付方式（场景 C 显示）：

```html
<div class="pay-methods">
  <div class="pay-method selected" data-method="wechat" onclick="selectPayMethod('wechat')">
    💚 微信支付
  </div>
  <div class="pay-method" data-method="alipay" onclick="selectPayMethod('alipay')">
    💙 支付宝
  </div>
  <div class="pay-method" data-method="bank" onclick="selectPayMethod('bank')">
    💛 银行卡
  </div>
</div>
```

---

## 🔘 支付按钮处理

支付按钮代码：
```html
<button class="pay-btn" id="payBtn" onclick="doPay()">
  <span id="payBtnText">确认支付</span>
</button>
```

### `doPay()` 函数逻辑

```javascript
async function doPay() {
  // 1. 禁用按钮，显示加载状态
  btn.disabled = true;
  document.getElementById('payBtnText').innerHTML = '<span class="pay-loading"></span> 处理中...';

  // 2. 如果订单有 pay_url（龙虾支付）
  if (_order.pay_url) {
    const data = await Auth.apiPost('/api/orders/' + _order.id + '/pay', {});
    
    if (data && data.code === 0 && data.data && data.data.pay_url) {
      // 打开龙虾支付页面（新窗口）
      window.open(data.data.pay_url, '_blank');
      
      // 显示"支付窗口已打开"
      document.getElementById('payBtnText').textContent = '支付窗口已打开';
      
      // 显示状态检查提示
      document.getElementById('statusChecking').style.display = 'block';
      
      // 开始轮询订单状态（每 5 秒）
      startStatusPolling();
    }
    return;
  }

  // 3. 普通支付（管理员或模拟支付）
  const data = await Auth.apiPost('/api/orders/' + _order.id + '/pay', {
    pay_method: _selectedMethod
  });

  if (data && data.code === 0) {
    // 支付成功，显示成功页面
    showSuccess();
  } else {
    // 支付失败，显示错误信息
    showToast(data?.message || '支付失败', 'error');
  }
}
```

---

## 🔄 支付状态轮询

当使用龙虾支付时，页面会每 5 秒轮询一次订单状态：

```javascript
function startStatusPolling() {
  _statusPollTimer = setInterval(async () => {
    try {
      const data = await Auth.apiPost('/api/orders/' + _order.id + '/sync-status', {});
      
      if (data && data.code === 0 && data.data) {
        const order = data.data;
        
        // 如果状态不是 pending，说明支付完成或失败
        if (order.status !== 'pending') {
          clearInterval(_statusPollTimer);
          
          if (order.status === 'paid') {
            // 支付成功
            showSuccess();
          } else if (order.status === 'cancelled') {
            // 支付取消
            showToast('订单已取消', 'error');
          }
        }
      }
    } catch (e) {
      console.log('轮询订单状态失败:', e);
    }
  }, 5000); // 每 5 秒检查一次
}
```

---

## ✅ 支付成功页面

当支付成功后，显示成功弹窗：

```javascript
function showSuccess() {
  if (_statusPollTimer) clearInterval(_statusPollTimer);
  
  const itineraryId = _order && _order.itinerary_id;
  const tripBtn = itineraryId
    ? `<a href="/trip-detail.html?id=${itineraryId}" class="success-btn secondary">🧳 查看我的行程</a>`
    : '';
  
  const overlay = document.createElement('div');
  overlay.className = 'pay-success-overlay';
  overlay.innerHTML = `
    <div class="pay-success-modal">
      <div class="success-icon">✅</div>
      <div class="success-title">支付成功</div>
      <div class="success-desc">订单已完成支付<br>已自动保存关联行程</div>
      <div class="success-btns">
        <a href="/orders.html" class="success-btn primary">📋 查看订单</a>
        ${tripBtn}
        <a href="/" class="success-btn secondary">🏠 返回首页</a>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}
```

---

## 🎯 三种支付模式对比

| 模式 | 触发条件 | 按钮文字 | 支付流程 |
|------|----------|----------|----------|
| 龙虾支付 | `order.pay_url` 存在 | "去龙虾平台支付" | 打开新窗口 → 轮询状态 |
| 管理员支付 | `user.role === 'admin'` | "管理员直接完成订单" | 直接调用 API → 成功 |
| 模拟支付 | 普通用户 | "确认支付" | 选择支付方式 → 调用 API → 成功 |

---

## 🔌 调用的 API 接口

### 1. 获取订单详情
```
GET /api/orders/:id
```

### 2. 支付订单
```
POST /api/orders/:id/pay
{
  "pay_method": "wechat" // 或 "alipay", "bank"
}
```

**返回示例（龙虾支付）**:
```json
{
  "code": 0,
  "message": "请跳转至龙虾平台完成支付",
  "data": {
    "order_id": 1,
    "pay_url": "https://pay.longxia.dev/xxxxx",
    "status": "pending"
  }
}
```

**返回示例（管理员/模拟支付）**:
```json
{
  "code": 0,
  "message": "支付成功",
  "data": {
    "order_id": 1,
    "status": "paid"
  }
}
```

### 3. 同步订单状态
```
POST /api/orders/:id/sync-status
```

**返回示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": 1,
    "status": "paid",
    "paid_at": "2026-07-21 12:00:00"
  }
}
```

---

## 📝 URL 参数说明

### 当前实现
```
payment.html?order_id=1
```

**参数**: `order_id`

---

## ⚠️ 注意事项

### 1. URL 参数不一致
- **支付页面期望**: `?order_id=xxx`
- **可能的跳转**: `?order=xxx`

**需要确保所有跳转到支付页面的链接使用正确的参数名。**

### 2. 常见跳转来源
- 我的订单页面 (`orders.html`)
- 行程详情页面 (`trip-detail.html`)
- 订单创建成功后

**建议**: 统一使用 `order_id` 参数

---

## 🔧 可能的问题

### 问题 1: 支付页面显示"未找到订单信息"

**原因**: URL 参数错误或缺失

**解决方案**: 
- 检查跳转链接是否使用 `?order_id=xxx`
- 确保 order_id 是有效的订单 ID

### 问题 2: 支付按钮一直禁用

**原因**: 订单加载失败或状态异常

**解决方案**:
- 检查订单是否存在
- 检查订单状态是否为 `pending`

### 问题 3: 龙虾支付窗口打不开

**原因**: 浏览器拦截了弹窗

**解决方案**:
- 提示用户允许弹窗
- 或者使用 `window.location.href` 直接跳转

---

## 🎨 支付页面 UI 元素

### 主要区域
1. **订单信息区域** - 显示订单详情
2. **支付方式选择区域** - 三种支付方式（可选）
3. **提示横幅区域** - 管理员提示/龙虾支付提示
4. **状态检查区域** - 轮询时显示
5. **支付按钮** - 确认支付/去龙虾平台支付/管理员完成

### 样式特点
- ✅ 渐变背景
- ✅ 大金额显示
- ✅ 卡片式设计
- ✅ 响应式布局
- ✅ 加载动画

---

## 📊 支付页面流程图

```
用户访问支付页面
  ↓
检查登录状态
  ↓
获取 order_id 参数
  ↓
调用 GET /api/orders/:id 获取订单详情
  ↓
判断支付场景
  ├─→ 有 pay_url → 龙虾支付模式
  ├─→ 管理员 → 管理员直接支付模式
  └─→ 普通用户 → 模拟支付模式
  ↓
用户点击支付按钮
  ↓
调用 POST /api/orders/:id/pay
  ├─→ 龙虾支付 → 打开支付窗口 → 开始轮询
  └─→ 直接支付 → 立即成功
  ↓
显示支付成功页面
```

---

## ✅ 当前状态

- ✅ 支付页面 UI 完整
- ✅ 三种支付模式支持
- ✅ 订单状态轮询
- ✅ 支付成功页面
- ✅ 后端接口完整实现

**支付功能完全可用！** 🎉

---

**文档创建时间**: 2026-07-21 12:10  
**支付页面**: cloudflare-pages/payment.html  
**URL 参数**: `?order_id=xxx`
