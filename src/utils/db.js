/**
 * D1 数据库助手函数
 */

// 查询单条记录
export async function dbGet(db, sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    params.forEach(param => stmt.bind(param));
  }
  return await stmt.first();
}

// 查询多条记录
export async function dbAll(db, sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    params.forEach(param => stmt.bind(param));
  }
  const result = await stmt.all();
  return result.results || [];
}

// 执行语句（INSERT, UPDATE, DELETE）
export async function dbRun(db, sql, ...params) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    params.forEach(param => stmt.bind(param));
  }
  return await stmt.run();
}

// 批量执行
export async function dbBatch(db, statements) {
  return await db.batch(statements);
}

// JSON 响应助手
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

// 错误响应助手
export function errorResponse(message, code = 500, status = 500) {
  return jsonResponse({ code, message, data: null }, status);
}

// 成功响应助手
export function successResponse(data = null, message = 'success') {
  return jsonResponse({ code: 0, message, data });
}
