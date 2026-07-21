/**
 * JWT 工具函数 - Workers 版本
 */

// 简单的 JWT 实现（使用 Web Crypto API）
export class JWT {
  constructor(secret) {
    this.secret = secret;
  }

  // 生成 Token
  async sign(payload, expiresIn = '7d') {
    const header = { alg: 'HS256', typ: 'JWT' };

    // 计算过期时间
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiry(expiresIn);

    const jwtPayload = {
      ...payload,
      iat: now,
      exp: exp
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));

    const signature = await this.createSignature(
      `${encodedHeader}.${encodedPayload}`,
      this.secret
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // 验证 Token
  async verify(token) {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');

      if (!encodedHeader || !encodedPayload || !signature) {
        throw new Error('Invalid token format');
      }

      // 验证签名
      const expectedSignature = await this.createSignature(
        `${encodedHeader}.${encodedPayload}`,
        this.secret
      );

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      // 解码 payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // 检查过期时间
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  // 创建签名
  async createSignature(data, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    return this.base64UrlEncode(signature);
  }

  // Base64 URL 编码
  base64UrlEncode(data) {
    let base64;
    if (typeof data === 'string') {
      base64 = btoa(data);
    } else if (data instanceof ArrayBuffer) {
      base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
    } else {
      base64 = btoa(data);
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Base64 URL 解码
  base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return atob(str);
  }

  // 解析过期时间
  parseExpiry(expiresIn) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800
    };

    const match = expiresIn.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, num, unit] = match;
    return parseInt(num) * units[unit];
  }
}

// 辅助函数：生成 Token
export async function generateToken(user, secret) {
  const jwt = new JWT(secret);
  return await jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role
  }, '7d');
}

// 辅助函数：验证 Token
export async function verifyToken(token, secret) {
  const jwt = new JWT(secret);
  return await jwt.verify(token);
}
