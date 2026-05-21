# Dependency Update Plan

## Safe Updates (Completed)
- ✅ @tanstack/react-query: 5.90.5 → 5.90.7
- ✅ axios: 1.12.2 → 1.13.2
- ✅ expo: 54.0.21 → 54.0.23
- ✅ expo-camera: 17.0.8 → 17.0.9
- ✅ react: 19.1.0 → 18.2.0 (downgraded for expo-router compatibility)
- ✅ react-dom: 19.1.0 → 18.2.0 (downgraded for expo-router compatibility)
- ✅ react-native: 0.81.5 → 0.76.5 (fixed invalid version)
- ✅ react-native-razorpay: 2.3.0 → 2.3.1
- ✅ react-native-safe-area-context: 5.6.1 → 5.6.2

## Major Version Updates (Require Testing)

### React Navigation (v6 → v7)
**Current:** v6.x
**Latest:** v7.x
**Impact:** Major breaking changes
**Action:** Test thoroughly before updating
- @react-navigation/bottom-tabs: 6.6.1 → 7.8.4
- @react-navigation/native: 6.1.18 → 7.1.19
- @react-navigation/stack: 6.4.1 → 7.6.3

### React Native
**Current:** 0.76.5
**Latest:** 0.82.1
**Impact:** Major version update, requires testing
**Action:** Update after testing (Expo SDK 54 uses 0.76.x)

### Testing Libraries
- @testing-library/react-native: 12.9.0 → 13.3.3 (Major version)
- @types/jest: 29.5.14 → 30.0.0 (Major version)
- jest: 29.7.0 → 30.2.0 (Major version)

### Tailwind CSS
**Current:** 3.4.18
**Latest:** 4.1.17
**Impact:** Major version with breaking changes
**Action:** Review migration guide before updating

## Security Audit

Run regularly:
```bash
npm audit
npm audit fix
```

## Update Strategy

1. **Patch/Minor Updates:** Update immediately
2. **Major Updates:** 
   - Review changelog
   - Test in development
   - Update incrementally
   - Run full test suite

## Notes

- React Navigation v7 has significant API changes
- Tailwind CSS v4 requires configuration changes
- Testing library updates may require test updates

