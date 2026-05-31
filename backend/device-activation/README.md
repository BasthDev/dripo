# Device activation API

Reference server for **one device per outlet** licensing.

**Full setup guide:** [../../docs/DEVICE_ACTIVATION_OTP.md](../../docs/DEVICE_ACTIVATION_OTP.md)

## Quick run

```bash
node server.mjs
```

```env
# .env in project root
EXPO_PUBLIC_ACTIVATION_API_URL=http://YOUR_LAN_IP:8787
```

OTP is logged to the console when you tap **Send OTP** in the app.
