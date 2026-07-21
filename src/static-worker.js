/**
 * 静态文件托管 Worker - 为前端 HTML 提供服务
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // 根路径重定向到 index.html
    if (path === '/' || path === '') {
      path = '/index.html';
    }

    // 尝试直接返回文件（需要上传到 R2 或使用 Assets）
    // 这里先返回一个简单的响应
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>部署中...</title>
      </head>
      <body>
        <h1>前端正在配置中</h1>
        <p>静态文件托管需要使用 Cloudflare R2 或 Assets</p>
        <p>请访问后端 API: <a href="https://concert-itinerary-api.music-tripay.workers.dev">https://concert-itinerary-api.music-tripay.workers.dev</a></p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
