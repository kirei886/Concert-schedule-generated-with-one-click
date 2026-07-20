/**
 * 第三方 API 代理路由
 * 代理龙虾出行 API，Token 保存在服务端
 */
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { authOptional } = require('../middleware/auth');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
function logToFile(filename, msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(LOG_DIR, filename), line);
}

const router = express.Router();

const API_TOKEN = process.env.LONGXIA_TOKEN || 'rdak_live_QmPWtfRKNBVyMcg07kn98sLPCMcwGmFk';
const API_HOST = 'api.longxiachuxing.com';

function proxyGet(apiPath, params, res) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const fullPath = qs ? `${apiPath}?${qs}` : apiPath;

  doRequest({
    hostname: API_HOST, port: 443, path: fullPath, method: 'GET',
    headers: { 'Authorization': 'Bearer ' + API_TOKEN },
    timeout: 30000,
  }, null, res);
}

function proxyPost(apiPath, body, res) {
  const bodyStr = JSON.stringify(body);
  doRequest({
    hostname: API_HOST, port: 443, path: apiPath, method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
    timeout: 30000,
  }, bodyStr, res);
}

function doRequest(options, bodyStr, res) {
  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    });
  });
  proxyReq.on('error', (err) => {
    res.status(502).json({ code: -1, message: '代理请求失败: ' + err.message, data: null });
  });
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({ code: -1, message: '请求超时', data: null });
  });
  if (bodyStr) proxyReq.write(bodyStr);
  proxyReq.end();
}

router.get('/reverse-geocode', (req, res) => {
  proxyGet('/open/v1/geo/reverse', { location: req.query.location, extensions: 'all' }, res);
});

router.get('/poi-search', (req, res) => {
  const params = { keywords: req.query.keywords, offset: req.query.offset || 10, page: 1, extensions: 'all' };
  if (req.query.city) { params.city = req.query.city; params.citylimit = 'true'; }
  proxyGet('/open/v1/geo/places/search', params, res);
});

router.get('/nearby-search', (req, res) => {
  const params = { location: req.query.location, radius: req.query.radius || 3000, offset: req.query.offset || 10, page: 1, extensions: 'all' };
  if (req.query.keywords) params.keywords = req.query.keywords;
  proxyGet('/open/v1/geo/places/nearby', params, res);
});

router.get('/city-airport', (req, res) => {
  proxyGet('/open/v1/flight/city_airport', { city: req.query.city }, res);
});

router.post('/flight-search', (req, res) => {
  const b = req.body;
  proxyPost('/open/v1/flight/search', {
    trip_mode: 'domestic', trip_type: 'oneway',
    from_code: b.from_code, to_code: b.to_code, depart_date: b.depart_date,
    passengers: { adult: 1, child: 0, infant: 0 },
    cabin_class: 'economy', page_size: 10, sort_by: 'price',
  }, res);
});

router.post('/train-search', (req, res) => {
  const b = req.body;
  proxyPost('/open/v1/train/search', {
    dep_date: b.dep_date, from_station: b.from_station, to_station: b.to_station,
    sort_by: 'price', page_size: 10, page: 1,
  }, res);
});

// 机场IATA代码 → 6位行政区划城市代码（巴士接口需要）
const AIRPORT_TO_CITY_CODE = {
  'SZX': '440300',  // 深圳
  'XMN': '350200',  // 厦门
  'PEK': '110100',  // 北京
  'PKX': '110100',  // 北京大兴
  'SHA': '310100',  // 上海虹桥
  'PVG': '310100',  // 上海浦东
  'CAN': '440100',  // 广州
  'HGH': '330100',  // 杭州
  'NKG': '320100',  // 南京
  'WUH': '420100',  // 武汉
  'CTU': '510100',  // 成都
  'TFU': '510100',  // 成都天府
  'CKG': '500000',  // 重庆
  'FOC': '350100',  // 福州
  'XIY': '610100',  // 西安
  'CSX': '430100',  // 长沙
  'TAO': '370200',  // 青岛
  'TSN': '120100',  // 天津
  'CGO': '410100',  // 郑州
  'HFE': '340100',  // 合肥
  'NNG': '450100',  // 南宁
  'ZUH': '440400',  // 珠海
  'KHN': '360100',  // 南昌
  'KWE': '520100',  // 贵阳
  'KMG': '530100',  // 昆明
  'HRB': '230100',  // 哈尔滨
  'SHE': '210100',  // 沈阳
  'CGQ': '220100',  // 长春
  'TYN': '140100',  // 太原
  'SJW': '130100',  // 石家庄
  'HET': '150100',  // 呼和浩特
  'INC': '640100',  // 银川
  'LHW': '620100',  // 兰州
  'XNN': '630100',  // 西宁
  'URC': '650100',  // 乌鲁木齐
  'LXA': '540100',  // 拉萨
  'HAK': '460100',  // 海口
  'SYX': '460200',  // 三亚
  'DLC': '210200',  // 大连
  'WNZ': '330300',  // 温州
  'XUZ': '320300',  // 徐州
  'YNT': '370600',  // 烟台
  'WEH': '371000',  // 威海
};

// 常用城市坐标映射（6位城市代码 → [lat, lng]）
const CITY_COORDS = {
  '110100': [39.9042, 116.4074],   // 北京
  '310100': [31.2304, 121.4737],   // 上海
  '440100': [23.1291, 113.2644],   // 广州
  '440300': [22.5431, 114.0579],   // 深圳
  '330100': [30.2741, 120.1551],   // 杭州
  '320100': [32.0603, 118.7969],   // 南京
  '420100': [30.5928, 114.3055],   // 武汉
  '510100': [30.5728, 104.0668],   // 成都
  '500000': [29.5630, 106.5516],   // 重庆
  '350200': [24.4798, 118.0894],   // 厦门
  '350100': [26.0745, 119.2965],   // 福州
  '610100': [34.3416, 108.9398],   // 西安
  '430100': [28.2280, 112.9388],   // 长沙
  '370200': [36.0671, 120.3826],   // 青岛
  '370100': [36.6512, 117.1201],   // 济南
  '120100': [39.0842, 117.2009],   // 天津
  '320500': [31.2989, 120.5853],   // 苏州
  '320200': [31.4912, 120.3119],   // 无锡
  '330200': [29.8683, 121.5440],   // 宁波
  '410100': [34.7466, 113.6253],   // 郑州
  '340100': [31.8206, 117.2272],   // 合肥
  '450100': [22.8170, 108.3665],   // 南宁
  '440600': [23.0218, 113.1219],   // 佛山
  '441900': [23.0489, 113.7447],   // 东莞
  '442000': [22.5176, 113.3927],   // 中山
  '440400': [22.2710, 113.5670],   // 珠海
  '360100': [28.6820, 115.8579],   // 南昌
  '520100': [26.6470, 106.6302],   // 贵阳
  '530100': [25.0389, 102.7183],   // 昆明
  '230100': [45.8038, 126.5350],   // 哈尔滨
  '210100': [41.8057, 123.4315],   // 沈阳
  '220100': [43.8171, 125.3235],   // 长春
  '140100': [37.8706, 112.5489],   // 太原
  '130100': [38.0428, 114.5149],   // 石家庄
  '150100': [40.8427, 111.7500],   // 呼和浩特
  '640100': [38.4872, 106.2309],   // 银川
  '620100': [36.0611, 103.8343],   // 兰州
  '630100': [36.6171, 101.7782],   // 西宁
  '650100': [43.8256, 87.6168],    // 乌鲁木齐
  '540100': [29.6500, 91.1000],    // 拉萨
  '460100': [20.0440, 110.1999],   // 海口
  '460200': [18.2528, 109.5120],   // 三亚
};

router.post('/bus-search', (req, res) => {
  const b = req.body;

  // 前端传来可能是3位机场代码，需转换为6位行政区划代码
  let startCityCode = b.start_city_code;
  let endCityCode = b.end_city_code;
  if (startCityCode && startCityCode.length === 3) {
    startCityCode = AIRPORT_TO_CITY_CODE[startCityCode] || startCityCode;
  }
  if (endCityCode && endCityCode.length === 3) {
    endCityCode = AIRPORT_TO_CITY_CODE[endCityCode] || endCityCode;
  }

  const requestBody = {
    date: b.date,
    start_city_code: startCityCode,
    end_city_code: endCityCode,
    page_size: b.page_size || 50,
    page: b.page || 1,
    sort_by: b.sort_by || 'dep_time',
  };
  if (b.start_addr) requestBody.start_addr = b.start_addr;
  if (b.end_addr) requestBody.end_addr = b.end_addr;

  // 自动补充城市坐标（巴士接口必填经纬度）
  const startCoords = CITY_COORDS[startCityCode];
  const endCoords = CITY_COORDS[endCityCode];
  if (startCoords) {
    requestBody.start_lat = b.start_lat || startCoords[0];
    requestBody.start_lng = b.start_lng || startCoords[1];
  }
  if (endCoords) {
    requestBody.end_lat = b.end_lat || endCoords[0];
    requestBody.end_lng = b.end_lng || endCoords[1];
  }

  logToFile('bus-search.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/bus/search', requestBody, res);
});

router.post('/taxi-estimate', (req, res) => {
  const b = req.body;
  const requestBody = {
    from_name: b.from_name,
    to_name: b.to_name,
    order_type: b.order_type || 1,
  };
  if (b.booking_time) requestBody.booking_time = b.booking_time;
  if (b.from_adcode) requestBody.from_adcode = b.from_adcode;
  if (b.from_addr) requestBody.from_addr = b.from_addr;
  if (b.from_lat) requestBody.from_lat = b.from_lat;
  if (b.from_lng) requestBody.from_lng = b.from_lng;
  if (b.to_adcode) requestBody.to_adcode = b.to_adcode;
  if (b.to_addr) requestBody.to_addr = b.to_addr;
  if (b.to_lat) requestBody.to_lat = b.to_lat;
  if (b.to_lng) requestBody.to_lng = b.to_lng;

  logToFile('taxi-estimate.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/taxi/estimate', requestBody, res);
});

router.post('/taxi-order-create', (req, res) => {
  const b = req.body;
  const requestBody = {
    contact_phone: b.contact_phone,
    offer_id: b.offer_id,
    out_trade_no: b.out_trade_no,
    pay_channel: b.pay_channel || 'user_pay',
  };
  if (b.contact_name) requestBody.contact_name = b.contact_name;
  if (b.external_user_id) requestBody.external_user_id = b.external_user_id;
  if (b.callback_url) requestBody.callback_url = b.callback_url;

  logToFile('taxi-order.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/taxi/order/create', requestBody, res);
});

router.post('/taxi-recommend-pickup', (req, res) => {
  const b = req.body;
  const requestBody = {
    lat: b.lat,
    lng: b.lng,
  };
  if (b.adcode) requestBody.adcode = b.adcode;
  if (b.addr) requestBody.addr = b.addr;
  if (b.name) requestBody.name = b.name;

  logToFile('taxi-pickup.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/taxi/recommend-pickup-spots', requestBody, res);
});

router.post('/hotel-search', (req, res) => {
  const b = req.body;
  const requestBody = {
    destination: b.destination, check_in: b.check_in, check_out: b.check_out,
    sort_by: b.sort_by || 'price', page_size: b.page_size || 50, page: b.page || 1, adult_count: 1, room_count: 1,
  };
  if (b.latitude && b.longitude) { requestBody.latitude = b.latitude; requestBody.longitude = b.longitude; }
  if (b.adcode) requestBody.adcode = b.adcode;
  if (b.radius) requestBody.radius = b.radius;

  const bodyStr = JSON.stringify(requestBody);
  const proxyReq = https.request({
    hostname: API_HOST, port: 443, path: '/open/v1/hotel/search', method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_TOKEN,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
    timeout: 30000,
  }, (proxyRes) => {
    let data = '';
    proxyRes.on('data', (chunk) => { data += chunk; });
    proxyRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        const hotelCount = (json.data && json.data.hotels) ? json.data.hotels.length : 0;
        const totalInfo = json.data && json.data.page_info ? json.data.page_info : null;
        logToFile('hotel-search.log', `请求体: ${JSON.stringify(requestBody)}`);
        logToFile('hotel-search.log', `返回酒店数: ${hotelCount}${totalInfo ? `, 分页: ${JSON.stringify(totalInfo)}` : ''}`);
      } catch (e) {
        logToFile('hotel-search.log', `响应解析失败: ${data.substring(0, 200)}`);
      }
      res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    });
  });
  proxyReq.on('error', (err) => {
    res.status(502).json({ code: -1, message: '代理请求失败: ' + err.message, data: null });
  });
  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({ code: -1, message: '请求超时', data: null });
  });
  proxyReq.write(bodyStr);
  proxyReq.end();
});

router.get('/route-plan', (req, res) => {
  const params = { mode: req.query.mode || 'transit', origin: req.query.origin, destination: req.query.destination, extensions: 'all' };
  if (req.query.city) params.city = req.query.city;
  if (req.query.cityd) params.cityd = req.query.cityd;
  proxyGet('/open/v1/geo/routes/plan', params, res);
});

// ====== 今日特价：特价机票 ======
// 热门航线配置
const HOT_ROUTES = [
  { from: '深圳', from_code: 'SZX', to: '北京', to_code: 'PEK' },
  { from: '深圳', from_code: 'SZX', to: '上海', to_code: 'PVG' },
  { from: '广州', from_code: 'CAN', to: '成都', to_code: 'CTU' },
  { from: '上海', from_code: 'PVG', to: '重庆', to_code: 'CKG' },
  { from: '北京', from_code: 'PEK', to: '杭州', to_code: 'HGH' },
];

router.get('/deal-flights', (req, res) => {
  const results = [];
  let completed = 0;
  const total = HOT_ROUTES.length;

  // 默认出发日期为7天后
  const departDate = req.query.depart_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  HOT_ROUTES.forEach((route, idx) => {
    const bodyStr = JSON.stringify({
      trip_mode: 'domestic', trip_type: 'oneway',
      from_code: route.from_code, to_code: route.to_code,
      depart_date: departDate,
      passengers: { adult: 1, child: 0, infant: 0 },
      cabin_class: 'economy', page_size: 3, sort_by: 'price',
    });

    const proxyReq = https.request({
      hostname: API_HOST, port: 443, path: '/open/v1/flight/search', method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 15000,
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 0 && json.data && json.data.flights && json.data.flights.length > 0) {
            const cheapest = json.data.flights[0]; // 已按价格排序
            const cabin = (cheapest.cabins && cheapest.cabins[0]) || {};
            const price = cabin.lowest_price || cabin.adult_price || 0;
            results.push({
              route: `${route.from} → ${route.to}`,
              from_code: route.from_code,
              to_code: route.to_code,
              flight_no: cheapest.flight_no || '',
              dep_time: cheapest.dep_time || '',
              arr_time: cheapest.arr_time || '',
              price: price,
              depart_date: departDate,
              offer_id: cabin.search_offer_id || cabin.offer_id || '',
              cabin_name: cabin.cabin_name || '',
            });
          }
        } catch {}
        completed++;
        if (completed === total) {
          results.sort((a, b) => a.price - b.price);
          res.json({ code: 0, data: results });
        }
      });
    });
    proxyReq.on('error', () => { completed++; if (completed === total) { res.json({ code: 0, data: results }); } });
    proxyReq.on('timeout', () => { proxyReq.destroy(); completed++; if (completed === total) { res.json({ code: 0, data: results }); } });
    proxyReq.write(bodyStr);
    proxyReq.end();
  });
});

// ====== 今日特价：特价酒店 ======
// 热门城市配置（含中心坐标）
const HOT_CITIES = [
  { name: '北京', adcode: '110100', lat: 39.9042, lng: 116.4074 },
  { name: '上海', adcode: '310100', lat: 31.2304, lng: 121.4737 },
  { name: '深圳', adcode: '440300', lat: 22.5431, lng: 114.0579 },
  { name: '成都', adcode: '510100', lat: 30.5728, lng: 104.0668 },
  { name: '杭州', adcode: '330100', lat: 30.2741, lng: 120.1551 },
];

router.get('/deal-hotels', (req, res) => {
  const results = [];
  let completed = 0;
  const total = HOT_CITIES.length;

  // 默认入住日期为7天后，退房为8天后
  const checkIn = req.query.check_in || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const checkOut = req.query.check_out || new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];

  HOT_CITIES.forEach((city) => {
    const bodyStr = JSON.stringify({
      destination: city.name, check_in: checkIn, check_out: checkOut,
      adcode: city.adcode, latitude: city.lat, longitude: city.lng,
      radius: 20000, sort_by: 'price', page_size: 5, page: 1, adult_count: 1, room_count: 1,
    });

    const proxyReq = https.request({
      hostname: API_HOST, port: 443, path: '/open/v1/hotel/search', method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + API_TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      timeout: 15000,
    }, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code === 0 && json.data && json.data.hotels && json.data.hotels.length > 0) {
            // 取最便宜的几家
            const hotels = json.data.hotels
              .filter(h => h.min_price >= 50)
              .slice(0, 3)
              .map(h => ({
                name: h.hotel_name || '',
                rating: h.review_score || 0,
                price: h.min_price || 0,
                dist: h.distance_km != null ? `距中心${h.distance_km.toFixed(1)}km` : '',
                city: city.name,
                check_in: checkIn,
                check_out: checkOut,
                offer_id: h.search_offer_id || '',
                main_picture: h.main_picture || '',
                address: h.address || '',
              }));
            results.push(...hotels);
          }
        } catch {}
        completed++;
        if (completed === total) {
          results.sort((a, b) => a.price - b.price);
          res.json({ code: 0, data: results });
        }
      });
    });
    proxyReq.on('error', () => { completed++; if (completed === total) { res.json({ code: 0, data: results }); } });
    proxyReq.on('timeout', () => { proxyReq.destroy(); completed++; if (completed === total) { res.json({ code: 0, data: results }); } });
    proxyReq.write(bodyStr);
    proxyReq.end();
  });
});

// ====== 机票直接下单 ======
router.post('/flight-order-create', (req, res) => {
  const b = req.body;
  if (!b.offer_id || !b.out_trade_no) {
    return res.status(400).json({ code: 40001, message: '缺少 offer_id 或 out_trade_no', data: null });
  }
  const requestBody = {
    offer_id: b.offer_id,
    out_trade_no: b.out_trade_no,
    contact: { name: b.contact_name || '预订人', phone: b.contact_phone || '' },
    passengers: b.passengers || [{ name: '预订人', id_card: '' }],
  };
  if (b.contact_email) requestBody.contact.email = b.contact_email;
  if (b.external_user_id) requestBody.external_user_id = b.external_user_id;
  if (b.callback_url) requestBody.callback_url = b.callback_url;

  logToFile('flight-order.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/flight/order/create', requestBody, res);
});

// ====== 酒店直接下单 ======
router.post('/hotel-order-create', (req, res) => {
  const b = req.body;
  if (!b.offer_id || !b.out_trade_no) {
    return res.status(400).json({ code: 40001, message: '缺少 offer_id 或 out_trade_no', data: null });
  }
  const requestBody = {
    offer_id: b.offer_id,
    out_trade_no: b.out_trade_no,
    contact: { name: b.contact_name || '预订人', phone: b.contact_phone || '' },
    guests: b.guests || [{ name: '预订人' }],
  };
  if (b.external_user_id) requestBody.external_user_id = b.external_user_id;
  if (b.callback_url) requestBody.callback_url = b.callback_url;

  logToFile('hotel-order.log', `请求体: ${JSON.stringify(requestBody)}`);
  proxyPost('/open/v1/hotel/order/create', requestBody, res);
});

module.exports = router;
