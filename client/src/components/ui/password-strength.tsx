import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps) {
  const calculateStrength = (pwd: string): {
    score: number;
    label: string;
    color: string;
    checks: { label: string; passed: boolean }[];
  } => {
    const checks = [
      { label: 'At least 8 characters', passed: pwd.length >= 8 },
      { label: 'One uppercase letter', passed: /[A-Z]/.test(pwd) },
      { label: 'One lowercase letter', passed: /[a-z]/.test(pwd) },
      { label: 'One number', passed: /[0-9]/.test(pwd) },
      { label: 'One special character', passed: /[^A-Za-z0-9]/.test(pwd) },
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const score = passedCount;

    let label = 'Weak';
    let color = 'bg-red-500';

    if (score <= 2) {
      label = 'Weak';
      color = 'bg-red-500';
    } else if (score === 3 || score === 4) {
      label = 'Medium';
      color = 'bg-yellow-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    return { score, label, color, checks };
  };

  const { score, label, color, checks } = calculateStrength(password);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`space-y-2 ${className}`}
    >
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(score / 5) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`h-full ${color} rounded-full`}
          />
        </div>
        <span className={`text-xs font-medium ${
          score <= 2 ? 'text-red-600' : 
          score === 3 || score === 4 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {label}
        </span>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        {checks.map((check, index) => (
          <motion.div
            key={check.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2 text-xs"
          >
            {check.passed ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <XCircle className="w-3 h-3 text-gray-400" />
            )}
            <span className={check.passed ? 'text-green-600' : 'text-gray-500'}>
              {check.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default PasswordStrength;
