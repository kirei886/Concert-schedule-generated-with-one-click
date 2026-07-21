// API 配置 - Cloudflare Workers
window.API_BASE = 'https://concert-itinerary-api.music-tripay.workers.dev';

// 开发环境检测
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.API_BASE = 'http://localhost:8787';
}

console.log('API Base URL:', window.API_BASE);
