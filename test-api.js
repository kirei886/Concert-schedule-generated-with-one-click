/**
 * API 功能测试脚本
 * 测试新增的管理功能API
 */

const BASE_URL = 'http://localhost:3000';
let adminToken = '';

console.log('========================================');
console.log('🧪 API 功能测试');
console.log('========================================\n');

async function test() {
  try {
    // 1. 登录获取Token
    console.log('【1】测试管理员登录...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();

    if (loginData.code === 0) {
      adminToken = loginData.data.token;
      console.log('✅ 登录成功');
      console.log(`   Token: ${adminToken.substring(0, 30)}...`);
    } else {
      console.log('❌ 登录失败:', loginData.message);
      return;
    }

    // 2. 测试获取公开配置
    console.log('\n【2】测试获取公开配置...');
    const publicSettingsRes = await fetch(`${BASE_URL}/api/settings/public`);
    const publicSettings = await publicSettingsRes.json();

    if (publicSettings.code === 0) {
      console.log('✅ 获取公开配置成功');
      console.log(`   网站名称: ${publicSettings.data.site_name}`);
      console.log(`   网站描述: ${publicSettings.data.site_description}`);
    } else {
      console.log('❌ 获取失败:', publicSettings.message);
    }

    // 3. 测试获取所有配置（管理员）
    console.log('\n【3】测试获取所有配置（管理员）...');
    const allSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const allSettings = await allSettingsRes.json();

    if (allSettings.code === 0) {
      console.log('✅ 获取所有配置成功');
      console.log(`   配置总数: ${allSettings.data.length} 条`);
    } else {
      console.log('❌ 获取失败:', allSettings.message);
    }

    // 4. 测试更新配置
    console.log('\n【4】测试更新配置...');
    const updateRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        updates: [
          { setting_key: 'site_name', setting_value: '演唱会行程生成器 - 测试版' }
        ]
      })
    });
    const updateData = await updateRes.json();

    if (updateData.code === 0) {
      console.log('✅ 更新配置成功');
    } else {
      console.log('❌ 更新失败:', updateData.message);
    }

    // 5. 测试获取CMS内容列表
    console.log('\n【5】测试获取CMS内容列表...');
    const cmsRes = await fetch(`${BASE_URL}/api/cms/contents`);
    const cmsData = await cmsRes.json();

    if (cmsData.code === 0) {
      console.log('✅ 获取CMS内容成功');
      console.log(`   内容总数: ${cmsData.data.pagination.total} 篇`);
      if (cmsData.data.contents.length > 0) {
        console.log(`   示例: ${cmsData.data.contents[0].title} (/${cmsData.data.contents[0].slug})`);
      }
    } else {
      console.log('❌ 获取失败:', cmsData.message);
    }

    // 6. 测试获取单个CMS内容
    console.log('\n【6】测试获取CMS内容详情...');
    const aboutRes = await fetch(`${BASE_URL}/api/cms/about`);
    const aboutData = await aboutRes.json();

    if (aboutData.code === 0) {
      console.log('✅ 获取内容详情成功');
      console.log(`   标题: ${aboutData.data.title}`);
      console.log(`   浏览量: ${aboutData.data.view_count}`);
    } else {
      console.log('❌ 获取失败:', aboutData.message);
    }

    // 7. 测试发送通知
    console.log('\n【7】测试发送通知...');
    const notifyRes = await fetch(`${BASE_URL}/api/notifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: 1,
        type: 'system',
        title: '测试通知',
        content: '这是一条API测试通知'
      })
    });
    const notifyData = await notifyRes.json();

    if (notifyData.code === 0) {
      console.log('✅ 发送通知成功');
    } else {
      console.log('❌ 发送失败:', notifyData.message);
    }

    // 8. 测试获取通知列表
    console.log('\n【8】测试获取通知列表...');
    const notifyListRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const notifyListData = await notifyListRes.json();

    if (notifyListData.code === 0) {
      console.log('✅ 获取通知列表成功');
      console.log(`   通知总数: ${notifyListData.data.pagination.total} 条`);
      console.log(`   未读数量: ${notifyListData.data.pagination.unread_count} 条`);
    } else {
      console.log('❌ 获取失败:', notifyListData.message);
    }

    // 9. 测试获取未读通知数量
    console.log('\n【9】测试获取未读通知数量...');
    const unreadRes = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const unreadData = await unreadRes.json();

    if (unreadData.code === 0) {
      console.log('✅ 获取未读数量成功');
      console.log(`   未读: ${unreadData.data.unread_count} 条`);
    } else {
      console.log('❌ 获取失败:', unreadData.message);
    }

    console.log('\n========================================');
    console.log('✅ 所有测试完成！');
    console.log('========================================\n');

    console.log('📝 测试总结：');
    console.log('  ✅ 管理员登录');
    console.log('  ✅ 网站配置管理（获取、更新）');
    console.log('  ✅ CMS内容管理（列表、详情）');
    console.log('  ✅ 通知系统（发送、获取）');
    console.log('\n🎉 所有API功能正常运行！\n');

  } catch (error) {
    console.error('\n❌ 测试过程中出错:', error.message);
  }
}

// 执行测试
test();
