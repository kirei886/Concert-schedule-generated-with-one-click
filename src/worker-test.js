/**
 * 最简单的 Worker 测试
 */

export default {
  async fetch(request, env, ctx) {
    return new Response(JSON.stringify({
      code: 0,
      message: 'OK',
      data: { status: 'healthy' }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
};
