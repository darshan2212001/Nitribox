// import { 
//   FadeIn, 
//   FadeOut, 
//   SlideInUp, 
//   SlideInDown, 
//   SlideInLeft, 
//   SlideInRight,
//   BounceIn,
//   ZoomIn,
//   FlipInEasyX,
//   FlipInEasyY
// } from 'react-native-reanimated';

// Animation presets matching web app patterns
export const animations = {
  // Fade animations
  fadeIn: { duration: 600 },
  fadeInSlow: { duration: 1000 },
  fadeInFast: { duration: 300 },
  fadeOut: { duration: 300 },

  // Slide animations
  slideInUp: { duration: 600 },
  slideInDown: { duration: 600 },
  slideInLeft: { duration: 600 },
  slideInRight: { duration: 600 },

  // Bounce animations
  bounceIn: { duration: 800 },
  bounceInFast: { duration: 500 },

  // Zoom animations
  zoomIn: { duration: 600 },
  zoomInFast: { duration: 400 },

  // Flip animations
  flipInX: { duration: 600 },
  flipInY: { duration: 600 },

  // Staggered animations (for lists)
  stagger: (index: number, baseDelay: number = 100) => ({
    entering: { duration: 600, delay: index * baseDelay },
  }),

  // Card animations
  cardEnter: { duration: 600 },
  cardEnterStagger: (index: number) => ({ duration: 600, delay: index * 100 }),

  // Button animations
  buttonPress: { duration: 200 },
  buttonEnter: { duration: 400 },

  // Hero slider animations
  heroSlide: (index: number) => ({ duration: 800, delay: index * 200 }),
  heroContent: (index: number) => ({ duration: 600, delay: index * 200 + 400 }),

  // Modal animations
  modalEnter: { duration: 400 },
  modalExit: { duration: 300 },

  // Loading animations
  loadingPulse: { duration: 1000 },
  loadingSpin: { duration: 800 },
};

// Moti animation presets
export const motiAnimations = {
  // Spring animations
  springIn: {
    from: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  springInUp: {
    from: { opacity: 0, translateY: 20 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  springInDown: {
    from: { opacity: 0, translateY: -20 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  springInLeft: {
    from: { opacity: 0, translateX: -20 },
    animate: { opacity: 1, translateX: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  springInRight: {
    from: { opacity: 0, translateX: 20 },
    animate: { opacity: 1, translateX: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  // Hover animations
  hover: {
    from: { scale: 1 },
    animate: { scale: 1.05 },
    transition: { type: 'spring', damping: 15 },
  },

  // Press animations
  press: {
    from: { scale: 1 },
    animate: { scale: 0.95 },
    transition: { type: 'spring', damping: 15 },
  },

  // Pulse animations
  pulse: {
    from: { scale: 1 },
    animate: { scale: 1.1 },
    transition: { 
      type: 'timing', 
      duration: 1000,
      loop: true,
    },
  },

  // Shake animations
  shake: {
    from: { translateX: 0 },
    animate: { translateX: [0, -10, 10, -10, 10, 0] },
    transition: { type: 'timing', duration: 500 },
  },

  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing', duration: 600 },
  },

  fadeOut: {
    from: { opacity: 1 },
    animate: { opacity: 0 },
    transition: { type: 'timing', duration: 300 },
  },

  // Slide animations
  slideInUp: {
    from: { opacity: 0, translateY: 50 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  slideInDown: {
    from: { opacity: 0, translateY: -50 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  slideInLeft: {
    from: { opacity: 0, translateX: -50 },
    animate: { opacity: 1, translateX: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  slideInRight: {
    from: { opacity: 0, translateX: 50 },
    animate: { opacity: 1, translateX: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  // Staggered animations
  stagger: (index: number, baseDelay: number = 100) => ({
    from: { opacity: 0, translateY: 20 },
    animate: { opacity: 1, translateY: 0 },
    transition: { 
      type: 'spring', 
      damping: 15, 
      stiffness: 150,
      delay: index * baseDelay,
    },
  }),

  // Card animations
  cardEnter: {
    from: { opacity: 0, translateY: 20, scale: 0.95 },
    animate: { opacity: 1, translateY: 0, scale: 1 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  cardEnterStagger: (index: number) => ({
    from: { opacity: 0, translateY: 20, scale: 0.95 },
    animate: { opacity: 1, translateY: 0, scale: 1 },
    transition: { 
      type: 'spring', 
      damping: 15, 
      stiffness: 150,
      delay: index * 100,
    },
  }),

  // Button animations
  buttonPress: {
    from: { scale: 1 },
    animate: { scale: 0.95 },
    transition: { type: 'spring', damping: 15 },
  },

  buttonEnter: {
    from: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  // Hero slider animations
  heroSlide: (index: number) => ({
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing', duration: 800, delay: index * 200 },
  }),

  heroContent: (index: number) => ({
    from: { opacity: 0, translateY: 20 },
    animate: { opacity: 1, translateY: 0 },
    transition: { 
      type: 'spring', 
      damping: 15, 
      stiffness: 150,
      delay: index * 200 + 400,
    },
  }),

  // Modal animations
  modalEnter: {
    from: { opacity: 0, translateY: 50 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring', damping: 15, stiffness: 150 },
  },

  modalExit: {
    from: { opacity: 1, translateY: 0 },
    animate: { opacity: 0, translateY: 50 },
    transition: { type: 'timing', duration: 300 },
  },

  // Loading animations
  loadingPulse: {
    from: { opacity: 0.5 },
    animate: { opacity: 1 },
    transition: { 
      type: 'timing', 
      duration: 1000,
      loop: true,
    },
  },

  loadingSpin: {
    from: { rotate: '0deg' },
    animate: { rotate: '360deg' },
    transition: { 
      type: 'timing', 
      duration: 1000,
      loop: true,
    },
  },
};

// Animation timing presets
export const timing = {
  fast: 200,
  normal: 400,
  slow: 600,
  slower: 800,
  slowest: 1000,
};

// Animation delays for staggered effects
export const delays = {
  none: 0,
  short: 100,
  medium: 200,
  long: 300,
  longer: 500,
};

// Easing functions
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'spring',
};
