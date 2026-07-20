/**
 * 认证路由：注册/登录/个人信息
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { generateToken, authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register',
  [
    body('username').isLength({ min: 2, max: 20 }).withMessage('用户名2-20个字符'),
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg, data: null });
    }

    const { username, email, password, nickname } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ code: 409, message: '用户名或邮箱已存在', data: null });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, nickname)
      VALUES (?, ?, ?, ?)
    `).run(username, email, hash, nickname || username);

    const user = db.prepare('SELECT id, username, email, nickname, avatar_url, role FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);

    res.json({ code: 0, data: { token, user } });
  }
);

router.post('/login',
  [
    body('account').notEmpty().withMessage('请输入用户名或邮箱'),
    body('password').notEmpty().withMessage('请输入密码'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, message: errors.array()[0].msg, data: null });
    }

    const { account, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(account, account);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在', data: null });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ code: 401, message: '密码错误', data: null });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      phone: user.phone,
      fan_color: user.fan_color,
      fan_name: user.fan_name,
      fan_slogan: user.fan_slogan,
      role: user.role,
    };
    const token = generateToken(safeUser);

    res.json({ code: 0, data: { token, user: safeUser } });
  }
);

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, nickname, avatar_url, phone,
           fan_color, fan_name, fan_slogan, role, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在', data: null });
  }
  res.json({ code: 0, data: user });
});

router.put('/profile', authRequired,
  [
    body('nickname').optional().isLength({ max: 30 }),
    body('phone').optional().isLength({ max: 20 }),
  ],
  (req, res) => {
    const { nickname, avatar_url, phone, fan_color, fan_name, fan_slogan } = req.body;
    db.prepare(`
      UPDATE users SET
        nickname = COALESCE(?, nickname),
        avatar_url = COALESCE(?, avatar_url),
        phone = COALESCE(?, phone),
        fan_color = COALESCE(?, fan_color),
        fan_name = COALESCE(?, fan_name),
        fan_slogan = COALESCE(?, fan_slogan),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(nickname, avatar_url, phone, fan_color, fan_name, fan_slogan, req.user.id);

    const user = db.prepare(`
      SELECT id, username, email, nickname, avatar_url, phone,
             fan_color, fan_name, fan_slogan, role
      FROM users WHERE id = ?
    `).get(req.user.id);
    res.json({ code: 0, data: user });
  }
);

router.put('/password', authRequired,
  [
    body('old_password').notEmpty(),
    body('new_password').isLength({ min: 6 }).withMessage('新密码至少6位'),
  ],
  (req, res) => {
    const { old_password, new_password } = req.body;
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(old_password, user.password_hash)) {
      return res.status(400).json({ code: 400, message: '原密码错误', data: null });
    }
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(hash, req.user.id);
    res.json({ code: 0, message: '密码修改成功' });
  }
);

module.exports = router;
