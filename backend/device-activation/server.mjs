/**
 * Minimal single-device activation API for Dripo.
 *
 * Run: node server.mjs
 * Set app: EXPO_PUBLIC_ACTIVATION_API_URL=http://YOUR_LAN_IP:8787
 *
 * POST /api/otp/request     { outletId }
 * POST /api/otp/verify      { outletId, otp, deviceId, deviceName }
 * POST /api/session/heartbeat { sessionToken, deviceId }
 * POST /api/session/release   { sessionToken, deviceId }
 */

import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORT = process.env.PORT || 8787;
const OTP_TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, { otp: string, exp: number }>} */
const pendingOtp = new Map();

/** @type {Map<string, { token: string, deviceId: string, deviceName: string }>} */
const activeByOutlet = new Map();

/** @type {Map<string, string>} token -> outletId */
const tokenToOutlet = new Map();

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const cors = { 'Access-Control-Allow-Origin': '*' };

  try {
    const body = await readBody(req);
    const path = req.url?.split('?')[0];

    if (path === '/api/otp/request' && req.method === 'POST') {
      const outletId = String(body.outletId || '').trim().toUpperCase();
      if (!outletId) return json(res, 400, { message: 'outletId required' });

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      pendingOtp.set(outletId, { otp, exp: Date.now() + OTP_TTL_MS });
      console.log(`[OTP] ${outletId} => ${otp}`);
      return json(res, 200, { ok: true, devOtp: otp });
    }

    if (path === '/api/otp/verify' && req.method === 'POST') {
      const outletId = String(body.outletId || '').trim().toUpperCase();
      const otp = String(body.otp || '').trim();
      const deviceId = String(body.deviceId || '');
      const deviceName = String(body.deviceName || 'Device');

      const pending = pendingOtp.get(outletId);
      if (!pending || pending.exp < Date.now() || pending.otp !== otp) {
        return json(res, 400, { code: 'INVALID_OTP', message: 'Invalid or expired OTP.' });
      }
      pendingOtp.delete(outletId);

      const existing = activeByOutlet.get(outletId);
      if (existing && existing.deviceId !== deviceId) {
        return json(res, 409, {
          code: 'DEVICE_IN_USE',
          message: 'Outlet active on another device.',
          activeDeviceName: existing.deviceName,
        });
      }

      const sessionToken = randomBytes(24).toString('hex');
      activeByOutlet.set(outletId, { token: sessionToken, deviceId, deviceName });
      tokenToOutlet.set(sessionToken, outletId);

      return json(res, 200, { sessionToken, outletId });
    }

    if (path === '/api/session/heartbeat' && req.method === 'POST') {
      const { sessionToken, deviceId } = body;
      const outletId = tokenToOutlet.get(sessionToken);
      const active = outletId ? activeByOutlet.get(outletId) : null;
      if (!active || active.token !== sessionToken || active.deviceId !== deviceId) {
        return json(res, 401, { code: 'SESSION_REVOKED', message: 'Session no longer valid.' });
      }
      return json(res, 200, { ok: true });
    }

    if (path === '/api/session/release' && req.method === 'POST') {
      const { sessionToken, deviceId } = body;
      const outletId = tokenToOutlet.get(sessionToken);
      const active = outletId ? activeByOutlet.get(outletId) : null;
      if (active?.token === sessionToken && active.deviceId === deviceId) {
        activeByOutlet.delete(outletId);
        tokenToOutlet.delete(sessionToken);
      }
      return json(res, 200, { ok: true });
    }

    json(res, 404, { message: 'Not found' });
  } catch (e) {
    console.error(e);
    json(res, 500, { message: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Dripo activation API on http://0.0.0.0:${PORT}`);
});
