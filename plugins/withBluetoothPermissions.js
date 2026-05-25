const {
  withAndroidManifest,
  AndroidConfig,
} = require('expo/config-plugins');

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
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure permissions array exists
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    // Add Android 12+ permissions
    RUNTIME_PERMISSIONS.forEach((permission) => {
      AndroidConfig.Permissions.addPermission(
        manifest,
        permission
      );
    });

    // Add legacy permissions with maxSdkVersion 30
    LEGACY_PERMISSIONS.forEach((permission) => {
      AndroidConfig.Permissions.addPermission(manifest, {
        name: permission,
        maxSdkVersion: 30,
      });
    });

    return config;
  });
}

module.exports = withBluetoothPermissions;