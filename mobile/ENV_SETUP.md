# Environment Variables Setup Guide

## Overview
This app uses environment variables for configuration, especially for sensitive data like API keys. This ensures security and allows different configurations for development, staging, and production.

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values in `.env`:
   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:8000
   EXPO_PUBLIC_WS_URL=ws://localhost:8000/ws
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
   ```

3. Restart your Expo development server:
   ```bash
   npm start
   ```

## Environment Variables

### Required Variables

#### `EXPO_PUBLIC_API_URL`
- **Description:** Base URL for the API server
- **Development:** `http://localhost:8000` or `http://YOUR_LOCAL_IP:8000`
- **Production:** `https://api.yourdomain.com` (HTTPS required)
- **Example:** `EXPO_PUBLIC_API_URL=https://api.nutribox.com`

#### `EXPO_PUBLIC_WS_URL`
- **Description:** WebSocket URL for real-time features
- **Development:** `ws://localhost:8000/ws` or `ws://YOUR_LOCAL_IP:8000/ws`
- **Production:** `wss://api.yourdomain.com/ws` (WSS required)
- **Example:** `EXPO_PUBLIC_WS_URL=wss://api.nutribox.com/ws`

#### `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Description:** Google Maps API key for map features
- **Required:** Yes (in production)
- **How to get:** https://console.cloud.google.com/google/maps-apis
- **Security:** Restrict this key to your app's bundle ID and package name
- **Example:** `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...`

## Development Setup

### For Local Development
1. Use `http://localhost:8000` if testing on emulator/simulator
2. Use your local IP (e.g., `http://192.168.1.100:8000`) if testing on physical device
3. Find your IP:
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ifconfig` or `ip addr`

### For Physical Device Testing
```bash
# Find your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Update .env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:8000/ws
```

## Production Setup

### Using Expo Secrets (Recommended)
For production builds, use Expo Secrets to securely store environment variables:

```bash
# Set secrets using EAS CLI
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://api.nutribox.com
eas secret:create --scope project --name EXPO_PUBLIC_WS_URL --value wss://api.nutribox.com/ws
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value your_key_here
```

### Using app.json (Not Recommended for Production)
While `app.json` can be used for development, it's not recommended for production as values are visible in the app bundle.

## Security Notes

⚠️ **Important Security Guidelines:**

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use HTTPS/WSS in production** - The app will throw errors if HTTP/WS is used in production
3. **Restrict API keys** - Configure Google Maps API key restrictions in Google Cloud Console
4. **Use Expo Secrets for production** - Don't hardcode values in `app.json` for production
5. **Rotate keys regularly** - Change API keys periodically for security

## Troubleshooting

### "API URL must use HTTPS in production"
- **Solution:** Ensure `EXPO_PUBLIC_API_URL` starts with `https://` in production builds

### "WebSocket URL must use WSS in production"
- **Solution:** Ensure `EXPO_PUBLIC_WS_URL` starts with `wss://` in production builds

### "Google Maps API key not found"
- **Solution:** Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in your `.env` file or Expo Secrets

### Maps not loading on physical device
- **Solution:** Use your local IP address instead of `localhost` in `EXPO_PUBLIC_API_URL`

## Priority Order

The app checks for configuration in this order:
1. Environment variables (`EXPO_PUBLIC_*`)
2. `app.json` extra config (development only)
3. Default values (development only)

In production, environment variables are required.

