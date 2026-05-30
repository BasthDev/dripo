const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
const { ensureToolsAvailable } = require('@expo/config-plugins/build/android/Manifest');

const RUNTIME_PERMISSIONS = [
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
];

const LEGACY_PERMISSIONS = [
  'android.permission.BLUETOOTH',
  'android.permission.BLUETOOTH_ADMIN',
];

function withBluetoothPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    let manifest = ensureToolsAvailable(cfg.modResults);

    AndroidConfig.Permissions.ensurePermissions(manifest, RUNTIME_PERMISSIONS);

    if (!Array.isArray(manifest.manifest['uses-permission'])) {
      manifest.manifest['uses-permission'] = [];
    }

    for (const permission of LEGACY_PERMISSIONS) {
      const perms = manifest.manifest['uses-permission'];
      const exists = perms.some((p) => p.$['android:name'] === permission);
      if (!exists) {
        perms.push({
          $: {
            'android:name': permission,
            'android:maxSdkVersion': '30',
          },
        });
      }
    }

    cfg.modResults = manifest;
    return cfg;
  });
}

module.exports = withBluetoothPermissions;
