/**
 * Script to replace console.log/error/warn with logger
 * Run with: node scripts/replace-console.js
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/hooks/useBiometricAuth.ts',
  'src/hooks/useNotifications.ts',
  'src/hooks/useOffline.ts',
  'src/hooks/useOfflineSupport.ts',
  'src/hooks/usePerformanceOptimization.ts',
  'src/hooks/usePushNotifications.ts',
  'src/hooks/usePayment.ts',
  'src/hooks/useRealtime.ts',
  'src/hooks/useAccessibility.ts',
  'src/hooks/useAnalytics.ts',
  'src/hooks/useLocation.ts',
  'src/hooks/useImagePicker.ts',
  'src/hooks/useCamera.ts',
];

const replacements = [
  { from: /console\.log\(/g, to: 'log.debug(' },
  { from: /console\.error\(/g, to: 'log.error(' },
  { from: /console\.warn\(/g, to: 'log.warn(' },
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if logger is already imported
    if (!content.includes("from '../lib/logger'") && !content.includes("from '../../lib/logger'")) {
      // Add import
      const importMatch = content.match(/^import .* from ['"]/m);
      if (importMatch) {
        const lastImportIndex = content.lastIndexOf('import ');
        const lastImportEnd = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, lastImportEnd + 1) + 
          "import { log } from '../lib/logger';\n" + 
          content.slice(lastImportEnd + 1);
      }
    }
    
    // Replace console statements
    replacements.forEach(({ from, to }) => {
      content = content.replace(from, to);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Done!');

