import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivationApiError } from '../services/deviceActivationApi';
import { useActivationStore } from '../store/useActivationStore';
import { DEVICE_ACTIVATION_ENABLED } from '../utils/activationConfig';

const HEARTBEAT_MS = 60_000;

/** Keeps single-device session alive; redirects to activation if revoked. */
export function useDeviceSessionGuard() {
  const router = useRouter();
  const segments = useSegments();
  const session = useActivationStore(s => s.session);
  const runHeartbeat = useActivationStore(s => s.runHeartbeat);
  const signOutDevice = useActivationStore(s => s.signOutDevice);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!DEVICE_ACTIVATION_ENABLED) return;
    if (!session?.sessionToken) return;

    const tick = async () => {
      try {
        await runHeartbeat();
      } catch (e) {
        if (e instanceof ActivationApiError && e.code === 'SESSION_REVOKED') {
          await signOutDevice();
          router.replace('/activation');
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, HEARTBEAT_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session?.sessionToken, runHeartbeat, signOutDevice, router]);

  useEffect(() => {
    if (!DEVICE_ACTIVATION_ENABLED) return;
    const onActivation = segments[0] === 'activation';
    if (!session && !onActivation) {
      router.replace('/activation');
    }
  }, [session, segments, router]);
}
