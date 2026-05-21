import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { log } from '../lib/logger';

interface AccessibilitySettings {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isBoldTextEnabled: boolean;
  isGrayscaleEnabled: boolean;
  isInvertColorsEnabled: boolean;
  isHighContrastEnabled: boolean;
  fontSize: number;
  preferredLanguage: string;
}

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isBoldTextEnabled: false,
    isGrayscaleEnabled: false,
    isInvertColorsEnabled: false,
    isHighContrastEnabled: false,
    fontSize: 1.0,
    preferredLanguage: 'en',
  });

  useEffect(() => {
    const updateAccessibilitySettings = async () => {
      try {
        const [
          isScreenReaderEnabled,
          isReduceMotionEnabled,
          isBoldTextEnabled,
          isGrayscaleEnabled,
          isInvertColorsEnabled,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          AccessibilityInfo.isReduceMotionEnabled(),
          AccessibilityInfo.isBoldTextEnabled(),
          AccessibilityInfo.isGrayscaleEnabled(),
          AccessibilityInfo.isInvertColorsEnabled(),
        ]);

        setSettings(prev => ({
          ...prev,
          isScreenReaderEnabled,
          isReduceMotionEnabled,
          isBoldTextEnabled,
          isGrayscaleEnabled,
          isInvertColorsEnabled,
        }));
      } catch (error) {
        log.error('Error getting accessibility settings', error);
      }
    };

    updateAccessibilitySettings();

    // Listen for accessibility changes
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (isEnabled) => {
        setSettings(prev => ({ ...prev, isScreenReaderEnabled: isEnabled }));
      }
    );

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setSettings(prev => ({ ...prev, isReduceMotionEnabled: isEnabled }));
      }
    );

    const boldTextSubscription = AccessibilityInfo.addEventListener(
      'boldTextChanged',
      (isEnabled) => {
        setSettings(prev => ({ ...prev, isBoldTextEnabled: isEnabled }));
      }
    );

    const grayscaleSubscription = AccessibilityInfo.addEventListener(
      'grayscaleChanged',
      (isEnabled) => {
        setSettings(prev => ({ ...prev, isGrayscaleEnabled: isEnabled }));
      }
    );

    const invertColorsSubscription = AccessibilityInfo.addEventListener(
      'invertColorsChanged',
      (isEnabled) => {
        setSettings(prev => ({ ...prev, isInvertColorsEnabled: isEnabled }));
      }
    );

    // Note: highContrastChanged is not available in all React Native versions

    return () => {
      screenReaderSubscription?.remove();
      reduceMotionSubscription?.remove();
      boldTextSubscription?.remove();
      grayscaleSubscription?.remove();
      invertColorsSubscription?.remove();
    };
  }, []);

  const announceForAccessibility = (message: string) => {
    if (settings.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  const setAccessibilityFocus = (reactTag: number) => {
    if (settings.isScreenReaderEnabled) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  };

  const getAccessibilityProps = (options: {
    label?: string;
    hint?: string;
    role?: string;
    state?: any;
    actions?: any[];
  }) => {
    const baseProps = {
      accessible: true,
      accessibilityLabel: options.label,
      accessibilityHint: options.hint,
      accessibilityRole: options.role,
      accessibilityState: options.state,
      accessibilityActions: options.actions,
    };

    // Add high contrast support
    if (settings.isHighContrastEnabled) {
      return {
        ...baseProps,
        style: {
          borderWidth: 2,
          borderColor: '#000',
        },
      };
    }

    return baseProps;
  };

  const getScaledFontSize = (baseSize: number): number => {
    return baseSize * settings.fontSize;
  };

  const getAccessibilityStyles = () => {
    const styles: any = {};

    if (settings.isBoldTextEnabled) {
      styles.fontWeight = 'bold';
    }

    if (settings.isGrayscaleEnabled) {
      styles.filter = 'grayscale(100%)';
    }

    if (settings.isInvertColorsEnabled) {
      styles.filter = 'invert(100%)';
    }

    if (settings.isHighContrastEnabled) {
      styles.borderWidth = 2;
      styles.borderColor = '#000';
    }

    return styles;
  };

  const isAccessibilityEnabled = () => {
    return settings.isScreenReaderEnabled || 
           settings.isReduceMotionEnabled || 
           settings.isBoldTextEnabled ||
           settings.isGrayscaleEnabled ||
           settings.isInvertColorsEnabled ||
           settings.isHighContrastEnabled;
  };

  const getAccessibilityInstructions = () => {
    const instructions = [];

    if (settings.isScreenReaderEnabled) {
      instructions.push('Screen reader is enabled. Use swipe gestures to navigate.');
    }

    if (settings.isReduceMotionEnabled) {
      instructions.push('Reduced motion is enabled. Animations are minimized.');
    }

    if (settings.isHighContrastEnabled) {
      instructions.push('High contrast mode is enabled for better visibility.');
    }

    return instructions;
  };

  return {
    settings,
    announceForAccessibility,
    setAccessibilityFocus,
    getAccessibilityProps,
    getScaledFontSize,
    getAccessibilityStyles,
    isAccessibilityEnabled,
    getAccessibilityInstructions,
  };
}
