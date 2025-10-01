# iOS Deployment Guide - Lever Financial Planner

Complete guide to build and deploy your app to the Apple App Store using Expo's EAS Build service.

## 📋 Prerequisites

### 1. Apple Developer Account
- **Cost:** $99/year
- **Sign up:** https://developer.apple.com/programs/
- **Wait time:** Usually approved within 24-48 hours

### 2. Install EAS CLI
```bash
npm install -g eas-cli
```

### 3. Login to Expo
```bash
eas login
# Or create account: eas register
```

## 🚀 Deployment Steps

### Step 1: Update Bundle Identifier

**IMPORTANT:** Change the bundle identifier in `app.json` from the placeholder:

```json
"ios": {
  "bundleIdentifier": "com.yourcompany.leverapp"  // ⬅️ CHANGE THIS
}
```

To your actual bundle ID (must be unique):
```json
"ios": {
  "bundleIdentifier": "com.yourname.leverfinancial"  // Example
}
```

**Bundle ID naming rules:**
- Use reverse domain notation (com.yourcompany.appname)
- Only lowercase letters, numbers, hyphens, and periods
- Must be globally unique in the App Store

### Step 2: Configure EAS Build

Navigate to your app directory and initialize EAS:

```bash
cd lever-app
eas build:configure
```

This creates an `eas.json` file. You can accept the defaults.

### Step 3: Build for iOS

#### Option A: Build for App Store Submission
```bash
eas build --platform ios
```

#### Option B: Build for Internal Testing (faster, no Apple Developer account needed initially)
```bash
eas build --platform ios --profile preview
```

**What happens:**
- Code is uploaded to Expo's servers
- Built in the cloud (no Mac required!)
- Takes ~15-30 minutes
- You'll get a download link when done

### Step 4: Submit to App Store

#### Automatic Submission (Recommended)
```bash
eas submit --platform ios
```

EAS will guide you through:
1. Selecting your build
2. Entering your Apple ID credentials
3. Answering App Store questions
4. Uploading to App Store Connect

#### Manual Submission
1. Download the `.ipa` file from the EAS build
2. Go to https://appstoreconnect.apple.com
3. Create a new app
4. Use Transporter app (Mac) or Xcode to upload the `.ipa`

## 📱 App Store Connect Setup

### 1. Create Your App Listing

Go to: https://appstoreconnect.apple.com

1. Click **"My Apps"** → **"+"** → **"New App"**
2. Fill in:
   - **Platform:** iOS
   - **Name:** Lever Financial Planner (or your choice)
   - **Primary Language:** English
   - **Bundle ID:** (select the one matching your app.json)
   - **SKU:** lever-app-001 (any unique identifier)

### 2. App Information

Fill out required fields:
- **Category:** Finance
- **Subtitle:** Track your financial accounts and net worth
- **Description:** (Write a compelling description)
- **Keywords:** financial planner, budget, net worth, accounts
- **Support URL:** Your website or GitHub repo
- **Privacy Policy URL:** Required for finance apps!

### 3. Pricing and Availability
- **Price:** Free (or set a price)
- **Availability:** All countries or select specific ones

### 4. App Privacy

⚠️ **Required for finance apps!** Declare what data you collect:

- User authentication (email/password via Supabase)
- Financial information (account balances)
- Privacy policy must explain data usage

### 5. Screenshots Required

You need screenshots for:
- **iPhone 6.7"** (iPhone 14 Pro Max, 15 Pro Max)
- **iPhone 6.5"** (iPhone 11 Pro Max, XS Max)
- Optional: iPad Pro 12.9"

**Sizes:**
- 6.7": 1290 x 2796 pixels
- 6.5": 1242 x 2688 pixels

**Quick way to get screenshots:**
```bash
# Run in iOS simulator
eas build --platform ios --profile preview
# Then use simulator to take screenshots
```

## 🔧 Common Commands

```bash
# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel

# Configure credentials
eas credentials

# Update app version
# (Edit version in app.json, then rebuild)

# Build both iOS and Android
eas build --platform all
```

## 📝 Version Management

### Updating Your App

1. **Update version in app.json:**
   ```json
   {
     "expo": {
       "version": "1.0.1",  // User-facing version
       "ios": {
         "buildNumber": "2"  // Increment for each build
       }
     }
   }
   ```

2. **Create new build:**
   ```bash
   eas build --platform ios
   ```

3. **Submit update:**
   ```bash
   eas submit --platform ios
   ```

## 💰 Costs

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Account | $99 | Annual |
| Expo EAS Build | Free tier: 30 builds/month | Monthly |
| EAS Build Paid | $29+ for more builds | Monthly (optional) |

## ⚡ Quick Workflow

```bash
# 1. Make code changes
# 2. Update version numbers in app.json
# 3. Build
eas build --platform ios

# 4. Test the build (download .ipa and install via TestFlight)
eas build --platform ios --profile preview

# 5. When ready, submit to App Store
eas submit --platform ios

# 6. Go to App Store Connect to complete listing
# 7. Submit for review
```

## 🧪 TestFlight (Beta Testing)

Before public release, test with TestFlight:

1. **Build and submit:**
   ```bash
   eas build --platform ios
   eas submit --platform ios
   ```

2. **In App Store Connect:**
   - Go to TestFlight tab
   - Add internal testers (up to 100)
   - Or add external testers (up to 10,000)
   - Share TestFlight link

3. **Testers install via TestFlight app**

## 🔐 Credentials Management

EAS handles Apple certificates and provisioning profiles automatically!

**To manage manually:**
```bash
eas credentials
```

Options:
- View credentials
- Remove credentials (to regenerate)
- Use your own certificates

## ✅ Pre-Submission Checklist

- [ ] Bundle identifier is unique and correct
- [ ] App icon is 1024x1024 PNG (in `assets/icon.png`)
- [ ] Screenshots are prepared
- [ ] Privacy policy URL is ready
- [ ] Support URL is ready
- [ ] App description is written
- [ ] Version and build numbers are correct
- [ ] Tested app thoroughly on real device
- [ ] Reviewed App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/

## 🚨 Troubleshooting

### "Invalid Bundle Identifier"
- Must match exactly in app.json and App Store Connect
- Check for typos
- Ensure it's registered in your Apple Developer account

### "Missing Compliance"
If your app uses encryption (HTTPS counts!):
- Add to app.json:
  ```json
  "ios": {
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  }
  ```

### Build Fails
```bash
# Check logs
eas build:view [BUILD_ID]

# Common fixes:
npm install  # Ensure dependencies are installed
eas build:configure  # Reconfigure if needed
```

### "Credentials Error"
```bash
# Reset credentials
eas credentials
# Select "Remove credentials" then rebuild
```

## 📚 Resources

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **EAS Submit Docs:** https://docs.expo.dev/submit/introduction/
- **App Store Connect:** https://appstoreconnect.apple.com
- **Apple Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Expo Discord:** https://discord.gg/expo (get help from community)

## 🎯 Expected Timeline

1. **First build:** 20-30 minutes
2. **App Store review:** 1-3 days (average)
3. **Rejection fixes:** 1-2 days per iteration
4. **Total (first time):** 1-2 weeks from start to published

## 💡 Pro Tips

1. **Start TestFlight early** - Get feedback before public launch
2. **Prepare screenshots** - Use a tool like [Fastlane Frameit](https://fastlane.tools/) or [Screenshot Creator](https://www.appstorescreenshot.com/)
3. **Write good release notes** - Users read them!
4. **Monitor reviews** - Respond to user feedback
5. **Plan updates** - Regular updates improve App Store ranking
6. **Use analytics** - Add crash reporting (Sentry, Bugsnag)

---

**Ready to deploy?** Start with:
```bash
eas login
eas build:configure
eas build --platform ios --profile preview
```

Good luck! 🚀

