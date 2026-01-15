import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: '',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (animation === 'wave') {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} ${className} overflow-hidden relative`}
        style={style}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={{ translateX: ['calc(-100%)', 'calc(100%)'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton components for common UI patterns
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="circular" className="w-10 h-10" />
      </div>
      <Skeleton variant="text" className="h-8 w-32 mb-2" />
      <Skeleton variant="text" className="h-3 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 flex gap-4">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <Skeleton variant="text" className="h-6 w-48 mb-4" />
      <div className="flex items-end justify-center gap-4 h-48">
        {[60, 80, 45, 90, 70, 55].map((height, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            className="w-8"
            height={`${height}%`}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg">
          <Skeleton variant="circular" className="w-10 h-10" />
          <div className="flex-1">
            <Skeleton variant="text" className="h-4 w-3/4 mb-2" />
            <Skeleton variant="text" className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPieChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>
      <Skeleton variant="text" className="h-6 w-48 mb-4" />
      <div className="flex justify-center">
        <Skeleton variant="circular" className="w-48 h-48" />
      </div>
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton variant="circular" className="w-3 h-3" />
              <Skeleton variant="text" className="h-3 w-20" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
