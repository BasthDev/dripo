import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { readLogoBase64 } from './storeLogo';

export type BluetoothReadyResult = {
  ready: boolean;
  message?: string;
};

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let isNativeSupported = false;

try {
  // Dynamically load the native package if compiled in the binary
  const PrinterModule = require('@vardrz/react-native-bluetooth-escpos-printer');
  if (PrinterModule) {
    BluetoothManager = PrinterModule.BluetoothManager;
    BluetoothEscposPrinter = PrinterModule.BluetoothEscposPrinter;
    if (BluetoothManager && BluetoothEscposPrinter) {
      isNativeSupported = true;
      console.log('[BluetoothPrinter] Native ESC/POS printer library loaded successfully.');
    }
  }
} catch (error) {
  console.log('[BluetoothPrinter] Running in Demo Mode (Native module not available in Expo Go/web/simulator).');
}

export function isNativePrinterSupported(): boolean {
  return isNativeSupported;
}

/** Request Android runtime Bluetooth (and scan) permissions before enable/scan. */
export async function ensureBluetoothPermissions(): Promise<BluetoothReadyResult> {
  if (Platform.OS !== 'android') {
    return { ready: true };
  }

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 31;
  const toRequest: Permission[] =
    apiLevel >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  try {
    const results = await PermissionsAndroid.requestMultiple(toRequest);
    const denied = toRequest.filter(
      (p) => results[p] !== PermissionsAndroid.RESULTS.GRANTED
    );

    if (denied.length > 0) {
      return {
        ready: false,
        message:
          'Bluetooth permission is required. Allow "Nearby devices" and Location in Settings, then try again.',
      };
    }

    return { ready: true };
  } catch (e) {
    console.error('[BluetoothPrinter] Permission request error:', e);
    return {
      ready: false,
      message: 'Could not request Bluetooth permissions.',
    };
  }
}

/** Permissions + enable adapter — call before scan or connect. */
export async function prepareBluetooth(): Promise<BluetoothReadyResult> {
  if (!isNativeSupported) {
    return { ready: true };
  }

  const perm = await ensureBluetoothPermissions();
  if (!perm.ready) {
    return perm;
  }

  try {
    let enabled = await BluetoothManager.isBluetoothEnabled();

    if (!enabled) {
      await BluetoothManager.enableBluetooth();

      // WAIT for adapter startup
      await new Promise((resolve) => setTimeout(resolve, 2000));

      enabled = await BluetoothManager.isBluetoothEnabled();
    }

    if (!enabled) {
      return {
        ready: false,
        message: 'Bluetooth still disabled.',
      };
    }

    return { ready: true };
  } catch (e) {
    console.error('[BluetoothPrinter] Prepare Bluetooth error:', e);

    return {
      ready: false,
      message:
        'Could not initialize Bluetooth adapter.',
    };
  }
}
export async function checkBluetoothEnabled(): Promise<boolean> {
  if (!isNativeSupported) return false;
  try {
    return await BluetoothManager.isBluetoothEnabled();
  } catch (e) {
    return false;
  }
}

export async function requestEnableBluetooth(): Promise<any> {
  const prepared = await prepareBluetooth();
  if (!prepared.ready) {
    throw new Error(prepared.message ?? 'Bluetooth not ready');
  }
  return null;
}

export interface BluetoothScanResult {
  name: string;
  address: string;
  type: 'PRINTER' | 'OTHER';
  rssi: number;
}

export async function scanBluetoothDevices(): Promise<{ found: BluetoothScanResult[]; paired: BluetoothScanResult[] }> {
  if (!isNativeSupported) {
    // Simulator Mode
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          found: [
            { name: 'RPP02N', address: '00:11:22:33:44:55', type: 'PRINTER', rssi: -45 },
            { name: 'PT-210', address: 'AA:BB:CC:DD:EE:FF', type: 'PRINTER', rssi: -58 },
            { name: 'BT-Printer-58', address: '11:22:33:AA:BB:CC', type: 'PRINTER', rssi: -65 },
          ],
          paired: [],
        });
      }, 2000);
    });
  }

  const prepared = await prepareBluetooth();
  if (!prepared.ready) {
    throw new Error(prepared.message ?? 'Bluetooth not ready');
  }
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  
    const resultStr = await BluetoothManager.scanDevices();
    const result = JSON.parse(resultStr);
    
    const mapDevice = (d: any): BluetoothScanResult => ({
      name: d.name || 'Unknown Device',
      address: d.address || '00:00:00:00:00:00',
      type: (d.name && d.name.toLowerCase().includes('printer')) || (d.name && d.name.toLowerCase().includes('rpp')) ? 'PRINTER' : 'OTHER',
      rssi: d.rssi || -100,
    });

    const found: BluetoothScanResult[] = (result.found || []).map(mapDevice);
    const paired: BluetoothScanResult[] = (result.paired || []).map(mapDevice);

    // Prioritize printer type devices
    found.sort((a, b) => (a.type === 'PRINTER' ? -1 : 1));

    return { found, paired };
  } catch (e) {
    console.error('[BluetoothPrinter] Scan devices error:', e);
    return { found: [], paired: [] };
  }
}

export async function connectDevice(address: string): Promise<boolean> {
  if (!isNativeSupported) {
    return new Promise((resolve) => setTimeout(() => resolve(true), 1500));
  }
  const prepared = await prepareBluetooth();
  if (!prepared.ready) {
    console.error('[BluetoothPrinter] Connect blocked:', prepared.message);
    return false;
  }
  try {
    await BluetoothManager.connect(address);
    return true;
  } catch (e) {
    console.error('[BluetoothPrinter] Connect printer error:', e);
    return false;
  }
}

export async function disconnectDevice(address: string): Promise<boolean> {
  if (!isNativeSupported) return true;
  try {
    await BluetoothManager.disconnect(address);
    return true;
  } catch (e) {
    console.error('[BluetoothPrinter] Disconnect printer error:', e);
    return false;
  }
}

// 58mm printer has 32 columns
function formatLine(left: string, right: string, width = 32): string {
  const spaceCount = width - left.length - right.length;
  if (spaceCount <= 0) {
    const truncatedLeft = left.substring(0, Math.max(5, width - right.length - 2)) + '..';
    const spaces = Math.max(1, width - truncatedLeft.length - right.length);
    return truncatedLeft + ' '.repeat(spaces) + right;
  }
  return left + ' '.repeat(spaceCount) + right;
}

export async function printReceipt(tx: any, storeSettings: any): Promise<boolean> {
  if (!isNativeSupported) {
    console.log('[BluetoothPrinter] (Demo Print) Transaction Receipt:\n', tx);
    return true;
  }

  try {
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText('\n', {});

    const logoBase64 = await readLogoBase64(storeSettings.logoUri);
    if (logoBase64) {
      try {
        await BluetoothEscposPrinter.printPic(logoBase64, {
          width: 200,
          center: true,
          paperSize: 58,
          autoCut: false,
        });
        await BluetoothEscposPrinter.printText('\n', {});
      } catch (logoErr) {
        console.warn('[BluetoothPrinter] Logo print skipped:', logoErr);
      }
    }

    await BluetoothEscposPrinter.printText(`${storeSettings.name || 'Dripo'}\n`, 
      {
      encoding: 'GBK',
      codepage: 0,
      widthtimes: 2, // Double size
      heigthtimes: 1,
      fonttype: 2,
    });
    
    // Address & Info
    await BluetoothEscposPrinter.printText(`${storeSettings.address || ''}\n`, {});
    if (storeSettings.phone) {
      await BluetoothEscposPrinter.printText(`Tel: ${storeSettings.phone}\n`, {});
    }
    if (storeSettings.social) {
      await BluetoothEscposPrinter.printText(`${storeSettings.social}\n`, {});
    }
    
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // 2. Align left for receipt metadata
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    const dateStr = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : new Date().toLocaleString();
    await BluetoothEscposPrinter.printText(`ID: #${tx.id.substring(0, 6).toUpperCase()}\n`, {});
    await BluetoothEscposPrinter.printText(`Date: ${dateStr}\n`, {});
    await BluetoothEscposPrinter.printText(`Payment: ${tx.paymentMethod}\n`, {});
    if (tx.orderNote) {
      await BluetoothEscposPrinter.printText(`Note: ${tx.orderNote}\n`, {});
    }
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // 3. Print Transaction Items
    for (const item of tx.items) {
      if (item.status === 'CANCELED') continue;
      const leftCol = `${item.quantity}x ${item.name}`;
      const rightCol = `Rp ${(item.quantity * item.sellPrice).toLocaleString()}`;
      await BluetoothEscposPrinter.printText(`${formatLine(leftCol, rightCol)}\n`, {});
      if (item.note) {
        await BluetoothEscposPrinter.printText(`   * ${item.note}\n`, {});
      }
    }
    
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // 4. Print Totals
    const subtotal = tx.totalAmount;
    await BluetoothEscposPrinter.printText(
      `${formatLine('TOTAL', `Rp ${subtotal.toLocaleString()}`)}\n`,
      {}
    );

    if (tx.cashGiven !== undefined && tx.cashGiven > 0) {
      await BluetoothEscposPrinter.printText(`${formatLine('CASH', `Rp ${tx.cashGiven.toLocaleString()}`)}\n`, {});
      if (tx.change !== undefined && tx.change > 0) {
        await BluetoothEscposPrinter.printText(`${formatLine('CHANGE', `Rp ${tx.change.toLocaleString()}`)}\n`, {});
      }
    }
    
    await BluetoothEscposPrinter.printText('--------------------------------\n', {});

    // 5. Print QR Code if available
    if (storeSettings.qrData) {
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printQRCode(storeSettings.qrData, 250, 3);
      await BluetoothEscposPrinter.printText('\n', {});
    }

    // 6. Receipt footer (from store settings)
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    const footer = (storeSettings.receiptFooter || 'Thank you for your visit!').trim();
    if (footer) {
      const lines = footer.split('\n').filter(Boolean);
      for (const line of lines) {
        await BluetoothEscposPrinter.printText(`${line}\n`, {});
      }
    }
    await BluetoothEscposPrinter.printText('\n\n\n', {});
    
    return true;
  } catch (error) {
    console.error('[BluetoothPrinter] Print error:', error);
    return false;
  }
}
