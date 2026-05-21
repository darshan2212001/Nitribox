# ZyaeL NutriBox Mobile App

A React Native mobile application built with Expo for the ZyaeL NutriBox nutrition delivery platform.

## Features

- 🔐 Secure authentication with biometric support
- 📦 Real-time order tracking
- 🍽️ Meal plan management
- 👨‍⚕️ Nutritionist consultations
- 🚚 Delivery tracking
- 📱 Push notifications
- 🌐 Offline support
- 🔒 Secure data storage

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your values (see `ENV_SETUP.md` for details).

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/emulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   ├── (kitchen)/         # Kitchen portal
│   ├── (delivery)/        # Delivery portal
│   └── (nutritionist)/    # Nutritionist portal
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and services
│   │   ├── apiClient.ts   # API client
│   │   ├── config.ts      # Configuration
│   │   ├── logger.ts      # Logging utility
│   │   ├── secureStorage.ts # Secure storage
│   │   └── websocket.ts   # WebSocket client
│   └── types/             # TypeScript types
├── assets/                 # Images, fonts, etc.
└── scripts/                # Build and utility scripts
```

## Key Technologies

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Expo Router** - File-based routing
- **React Query** - Data fetching and caching
- **NativeWind** - Tailwind CSS for React Native
- **Expo Secure Store** - Secure storage
- **WebSocket** - Real-time communication

## Security

- All sensitive data (tokens, PINs) stored in secure storage
- API keys managed via environment variables
- HTTPS/WSS enforced in production
- AES-256-GCM encryption for sensitive data
- PIN hashing with SHA-256 and salt

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

## Building

### Development Build
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Build
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Environment Variables

See `ENV_SETUP.md` for detailed environment variable setup instructions.

Required variables:
- `EXPO_PUBLIC_API_URL` - API server URL
- `EXPO_PUBLIC_WS_URL` - WebSocket URL
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

Proprietary - ZyaeL NutriBox

