# HTTPS Development Setup for Camera Access

## Why HTTPS is Required

Modern browsers (especially mobile Safari and Chrome) require HTTPS for accessing camera and microphone due to security reasons. When accessing your dev server via IP address (e.g., `192.168.1.x:3000`) from mobile devices, `navigator.mediaDevices` will be `undefined` without HTTPS.

## Setup Instructions

### Step 1: Generate Self-Signed Certificate

**On Windows:**
```cmd
generate-cert.bat
```

**On Mac/Linux:**
```bash
chmod +x generate-cert.sh
./generate-cert.sh
```

This will create two files:
- `localhost-key.pem` (private key)
- `localhost-cert.pem` (certificate)

⚠️ **IMPORTANT:** Add these files to `.gitignore` - DO NOT commit them!

### Step 2: Run Development Server with HTTPS

```bash
npm run dev:https
```

The server will start at:
- `https://localhost:3000`
- `https://<your-local-ip>:3000`

### Step 3: Accept Self-Signed Certificate

#### On Desktop Browser (First Time):
1. Navigate to `https://localhost:3000`
2. You'll see a security warning
3. Click "Advanced" → "Proceed to localhost (unsafe)"
4. This is safe for local development

#### On Mobile Device:
1. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
2. Navigate to `https://<your-ip>:3000` on your phone
3. You'll see a security warning
4. On iOS Safari: Tap "Show Details" → "visit this website"
5. On Android Chrome: Tap "Advanced" → "Proceed to [IP] (unsafe)"

### Step 4: Test Camera Access

Now when you click "Enable Camera" on the app, it should:
✅ Show the permission dialog
✅ Access the camera successfully
✅ Mirror the video preview