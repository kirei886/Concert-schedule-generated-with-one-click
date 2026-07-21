/**
 * 龙虾机票订单创建测试脚本
 * 用于诊断订单创建问题
 */

const API_BASE = 'https://concert-itinerary-api.music-tripay.workers.dev';

// 测试数据
const testData = {
  item_type: 'flight',
  item_name: '深圳-北京 CA1234',
  offer_id: 'test_offer_123',  // 需要替换为真实的 offer_id
  search_offer_id: 'test_search_123',  // 需要替换为真实的 search_offer_id
  passengers: [
    {
      name: '张三',
      id_type: 'id_card',
      id_number: '440300199001011234',
      phone: '13800138000'
    }
  ],
  contact: {
    name: '张三',
    phone: '13800138000'
  },
  flight_no: 'CA1234',
  departure_time: '2026-08-01 08:00',
  arrival_time: '2026-08-01 11:30'
};

async function testOrderCreation() {
  console.log('='.repeat(60));
  console.log('测试机票订单创建');
  console.log('='.repeat(60));

  // 1. 检查登录状态
  console.log('\n1. 检查登录 Token...');
  const token = 'YOUR_TOKEN_HERE';  // 替换为真实 token

  if (!token || token === 'YOUR_TOKEN_HERE') {
    console.error('❌ 请先设置 Token');
    console.log('提示：从浏览器 localStorage 获取 token');
    return;
  }

  console.log('✅ Token 已设置');

  // 2. 发送请求
  console.log('\n2. 发送订单创建请求...');
  console.log('请求数据:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });

    console.log('\n3. 响应状态:', response.status, response.statusText);

    const data = await response.json();
    console.log('\n4. 响应数据:', JSON.stringify(data, null, 2));

    if (data.code === 0) {
      console.log('\n✅ 订单创建成功！');
      console.log('订单 ID:', data.data.id);
      console.log('订单号:', data.data.order_no);
      console.log('龙虾订单号:', data.data.longxia_order_no);
    } else {
      console.log('\n❌ 订单创建失败');
      console.log('错误码:', data.code);
      console.log('错误信息:', data.message);
      if (data.data) {
        console.log('详细信息:', data.data);
      }
    }
  } catch (error) {
    console.error('\n❌ 请求异常:', error);
    console.error('错误详情:', error.message);
  }

  console.log('\n' + '='.repeat(60));
}

// 执行测试
testOrderCreation();
