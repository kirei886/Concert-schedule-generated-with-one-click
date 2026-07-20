/**
 * 统一错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    data: null,
  });
}

function notFound(req, res) {
  res.status(404).json({ code: 404, message: '接口不存在: ' + req.path, data: null });
}

module.exports = { errorHandler, notFound };
