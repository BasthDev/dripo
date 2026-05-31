import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  ActivationApiError,
  heartbeatSession,
  isActivationApiConfigured,
  releaseSession,
  requestOutletOtp,
  verifyOutletOtp,
} from '../services/deviceActivationApi';
import { getOrCreateDeviceId } from '../utils/deviceId';

export interface DeviceSession {
  outletId: string;
  sessionToken: string;
  deviceId: string;
  deviceName: string;
  activatedAt: string;
}

interface ActivationState {
  session: DeviceSession | null;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  isLicensed: () => boolean;
  requestOtp: (outletId: string) => Promise<{ devOtp?: string }>;
  verifyOtp: (outletId: string, otp: string) => Promise<void>;
  runHeartbeat: () => Promise<void>;
  signOutDevice: () => Promise<void>;
  /** Dev only when API URL not set */
  devActivate: (outletId: string, otp: string) => Promise<void>;
}

const DEV_OTP = '123456';

export const useActivationStore = create<ActivationState>()(
  persist(
    (set, get) => ({
      session: null,
      _hasHydrated: false,
      setHasHydrated: v => set({ _hasHydrated: v }),

      isLicensed: () => !!get().session?.sessionToken,

      requestOtp: async outletId => {
        if (!isActivationApiConfigured()) {
          return { devOtp: DEV_OTP };
        }
        return requestOutletOtp(outletId);
      },

      verifyOtp: async (outletId, otp) => {
        const deviceId = await getOrCreateDeviceId();
        const deviceName = `Dripo ${deviceId.slice(0, 8)}`;

        if (!isActivationApiConfigured()) {
          if (otp.trim() !== DEV_OTP) {
            throw new ActivationApiError('INVALID_OTP', 'Invalid OTP. Dev code is 123456.');
          }
          set({
            session: {
              outletId: outletId.trim().toUpperCase(),
              sessionToken: `dev-${deviceId}`,
              deviceId,
              deviceName,
              activatedAt: new Date().toISOString(),
            },
          });
          return;
        }

        const result = await verifyOutletOtp({
          outletId,
          otp,
          deviceId,
          deviceName,
        });

        set({
          session: {
            outletId: result.outletId,
            sessionToken: result.sessionToken,
            deviceId,
            deviceName,
            activatedAt: new Date().toISOString(),
          },
        });
      },

      runHeartbeat: async () => {
        const { session } = get();
        if (!session || !isActivationApiConfigured()) return;
        if (session.sessionToken.startsWith('dev-')) return;

        try {
          await heartbeatSession({
            sessionToken: session.sessionToken,
            deviceId: session.deviceId,
          });
        } catch (e) {
          if (e instanceof ActivationApiError && e.code === 'SESSION_REVOKED') {
            set({ session: null });
          }
          throw e;
        }
      },

      signOutDevice: async () => {
        const { session } = get();
        if (session && isActivationApiConfigured() && !session.sessionToken.startsWith('dev-')) {
          try {
            await releaseSession({
              sessionToken: session.sessionToken,
              deviceId: session.deviceId,
            });
          } catch {
            /* best effort */
          }
        }
        set({ session: null });
      },

      devActivate: async (outletId, otp) => get().verifyOtp(outletId, otp),
    }),
    {
      name: 'dripo-activation',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ session: state.session }),
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    }
  )
);
