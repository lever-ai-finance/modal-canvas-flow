# Lever App - Installation & Running Guide

This guide will help you install dependencies and run the Lever App (Expo React Native application).

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (version 18 or higher recommended)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

## Installation Steps

### Step 1: Navigate to the lever-app directory

```bash
cd lever-app
```

### Step 2: Install dependencies

```bash
npm install
```

This will install all required packages including:
- Expo SDK (~54.0.10)
- React Native (0.81.4)
- React (^19.1.1)
- Supabase client (@supabase/supabase-js)
- TypeScript and other dev dependencies

### Step 3: Verify installation

After installation completes, you should see a `node_modules` folder in the `lever-app` directory.

## Running the App

You have several options for running the app:

### Option 1: Run in Web Browser (Easiest for testing)

```bash
npm run web
```

This will:
- Start the Expo development server
- Automatically open your default web browser
- Display the app at `http://localhost:8081` (or similar)

### Option 2: Run with Expo Development Server (All platforms)

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Provide options to run on:
  - Press `w` to open in web browser
  - Press `a` to open in Android emulator (requires Android Studio)
  - Press `i` to open in iOS simulator (requires Xcode, macOS only)

### Option 3: Run on Android

```bash
npm run android
```

**Requirements:**
- Android Studio installed
- Android emulator configured OR physical Android device connected
- Android SDK and platform tools set up

### Option 4: Run on iOS (macOS only)

```bash
npm run ios
```

**Requirements:**
- macOS operating system
- Xcode installed
- iOS Simulator or physical iOS device

## Testing on Physical Devices

### Method 1: Local Network (Fastest - Same WiFi Required)

1. Install **Expo Go** app on your device:
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. Run `npm start` on your computer

3. Scan the QR code with your device:
   - iOS: Use Camera app to scan QR code
   - Android: Use Expo Go app to scan QR code

4. **Important:** Make sure your phone and computer are on the same WiFi network

### Method 2: Tunnel Mode (Works from Anywhere)

If you're not on the same WiFi network, or having connection issues, use tunnel mode:

```bash
npx expo start --tunnel
```

**Advantages:**
- Works even if phone and computer are on different networks
- Bypasses firewall/router issues
- Can share with testers anywhere in the world

**Note:** Tunnel mode is slightly slower than local network mode because traffic goes through Expo's servers.

**First time using tunnel?** You may need to install `@expo/ngrok`:
```bash
npm install -g @expo/ngrok
```

## Troubleshooting

### Issue: "Command not found: expo"

**Solution:** The app uses Expo SDK directly (not global CLI), so use npm scripts:
```bash
npm start    # Instead of: expo start
```

### Issue: Port already in use

**Solution:** Kill the process using the port or specify a different port:
```bash
npx expo start --port 8082
```

### Issue: Dependencies not installing

**Solution:** Clear npm cache and try again:
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Issue: "Cannot find module" errors

**Solution:** Ensure you're in the correct directory and dependencies are installed:
```bash
cd lever-app
npm install
```

## Development

### File Structure

- `App.tsx` - Main application component
- `index.ts` - Entry point
- `app.json` - Expo configuration
- `package.json` - Dependencies and scripts
- `assets/` - Images, icons, and static files

### Key Configuration

The app is configured with:
- **Bundle Identifier (iOS):** com.leverai.leverapp
- **Expo Project ID:** e4832436-025c-4cfd-9697-028fffaf3854
- **New Architecture:** Enabled (React Native new architecture)
- **Supabase Integration:** @supabase/supabase-js v2.58.0

## Building for Production

For production builds, you'll need to use EAS (Expo Application Services):

1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Build for your target platform:
```bash
eas build --platform android  # For Android
eas build --platform ios      # For iOS
eas build --platform all      # For both
```

## Quick Start Summary

```bash
# Navigate to project
cd lever-app

# Install dependencies
npm install

# Run in web browser (recommended for quick testing)
npm run web

# OR run with full Expo dev tools
npm start
```

---


```bash
npx expo start --tunnel
```

