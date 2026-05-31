import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const LOGO_DIR = `${FileSystem.documentDirectory}store/`;
export const STORE_LOGO_PATH = `${LOGO_DIR}receipt-logo.jpg`;

export async function pickAndSaveStoreLogo(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  await FileSystem.makeDirectoryAsync(LOGO_DIR, { intermediates: true });
  await FileSystem.copyAsync({ from: result.assets[0].uri, to: STORE_LOGO_PATH });
  return STORE_LOGO_PATH;
}

export async function readLogoBase64(uri?: string): Promise<string | null> {
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  } catch {
    return null;
  }
}

export async function removeStoreLogoFile(uri?: string): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore missing file
  }
}
