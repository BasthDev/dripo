import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

const PRODUCTS_DIR = `${FileSystem.documentDirectory}products/`;

export function productImagePath(productId: string): string {
  return `${PRODUCTS_DIR}${productId}.jpg`;
}

export async function pickProductImageFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}

/** Copy picked image into app storage for a product id. */
export async function persistProductImage(
  productId: string,
  sourceUri: string
): Promise<string> {
  await FileSystem.makeDirectoryAsync(PRODUCTS_DIR, { intermediates: true });
  const dest = productImagePath(productId);
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function removeProductImageFile(uri?: string): Promise<void> {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
