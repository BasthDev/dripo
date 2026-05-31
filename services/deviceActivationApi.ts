import Constants from 'expo-constants';

export type ActivationErrorCode =
  | 'DEVICE_IN_USE'
  | 'INVALID_OTP'
  | 'OUTLET_NOT_FOUND'
  | 'SESSION_REVOKED'
  | 'NETWORK'
  | 'UNKNOWN';

export class ActivationApiError extends Error {
  code: ActivationErrorCode;
  activeDeviceName?: string;

  constructor(code: ActivationErrorCode, message: string, activeDeviceName?: string) {
    super(message);
    this.code = code;
    this.activeDeviceName = activeDeviceName;
  }
}

function apiBase(): string | null {
  const extra = Constants.expoConfig?.extra as { activationApiUrl?: string } | undefined;
  const fromExtra = extra?.activationApiUrl?.trim();
  if (fromExtra) return fromExtra.replace(/\/$/, '');
  const fromEnv = process.env.EXPO_PUBLIC_ACTIVATION_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return null;
}

export function isActivationApiConfigured(): boolean {
  return !!apiBase();
}

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const base = apiBase();
  if (!base) {
    throw new ActivationApiError(
      'NETWORK',
      'Activation server URL is not configured. Set EXPO_PUBLIC_ACTIVATION_API_URL in .env'
    );
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ActivationApiError('NETWORK', 'Cannot reach activation server. Check internet.');
  }

  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: ActivationErrorCode;
    message?: string;
    activeDeviceName?: string;
  };

  if (!res.ok) {
    throw new ActivationApiError(
      data.code ?? 'UNKNOWN',
      data.message ?? data.error ?? `Server error (${res.status})`,
      data.activeDeviceName
    );
  }

  return data;
}

export async function requestOutletOtp(outletId: string): Promise<{ devOtp?: string }> {
  return postJson('/api/otp/request', { outletId: outletId.trim().toUpperCase() });
}

export async function verifyOutletOtp(params: {
  outletId: string;
  otp: string;
  deviceId: string;
  deviceName: string;
}): Promise<{ sessionToken: string; outletId: string }> {
  return postJson('/api/otp/verify', {
    outletId: params.outletId.trim().toUpperCase(),
    otp: params.otp.trim(),
    deviceId: params.deviceId,
    deviceName: params.deviceName,
  });
}

export async function heartbeatSession(params: {
  sessionToken: string;
  deviceId: string;
}): Promise<{ ok: boolean }> {
  return postJson('/api/session/heartbeat', params);
}

export async function releaseSession(params: {
  sessionToken: string;
  deviceId: string;
}): Promise<void> {
  await postJson('/api/session/release', params);
}
