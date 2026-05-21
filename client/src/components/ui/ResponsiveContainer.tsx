import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export default function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = 'xl'
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn(
      'w-full mx-auto px-4 sm:px-6 lg:px-8',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({ 
  children, 
  columns = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const getGridClasses = () => {
    const baseClasses = 'grid';
    
    // Default columns
    if (columns.default) {
      baseClasses += ` grid-cols-${columns.default}`;
    }
    
    // Responsive columns
    if (columns.sm) baseClasses += ` sm:grid-cols-${columns.sm}`;
    if (columns.md) baseClasses += ` md:grid-cols-${columns.md}`;
    if (columns.lg) baseClasses += ` lg:grid-cols-${columns.lg}`;
    if (columns.xl) baseClasses += ` xl:grid-cols-${columns.xl}`;
    
    return baseClasses;
  };

  return (
    <div className={cn(getGridClasses(), gapClasses[gap])}>
      {children}
    </div>
  );
}

interface ResponsiveTextProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'small';
  className?: string;
}

export function ResponsiveText({ 
  children, 
  variant = 'body',
  className 
}: ResponsiveTextProps) {
  const variantClasses = {
    h1: 'text-3xl sm:text-4xl lg:text-5xl font-bold',
    h2: 'text-2xl sm:text-3xl lg:text-4xl font-semibold',
    h3: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    h4: 'text-lg sm:text-xl lg:text-2xl font-medium',
    body: 'text-base sm:text-lg',
    small: 'text-sm sm:text-base',
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
}
