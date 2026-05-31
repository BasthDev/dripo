import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const DEVICE_ID_KEY = 'dripo-device-id';

/** Stable id for this tablet/phone — used for single-device licensing. */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = uuid.v4() as string;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
