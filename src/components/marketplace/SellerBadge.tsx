import { CheckCircle, Shield, Star, Award, Leaf, Globe, Users } from 'lucide-react';
import type { VerificationBadge, VerificationStatus, UserRole } from '../../types';
import { getBadgeInfo, getStatusInfo, getRoleInfo } from '../../constants/userRoles';

interface SellerBadgeProps {
  badge: VerificationBadge;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const badgeIcons: Record<VerificationBadge, React.ComponentType<{ size?: number; className?: string }>> = {
  verified_seller: CheckCircle,
  verified_buyer: CheckCircle,
  trusted_trader: Star,
  premium_seller: Award,
  certified_organic: Leaf,
  export_certified: Globe,
  cooperative_member: Users,
};

export function SellerBadge({ badge, size = 'sm', showLabel = false }: SellerBadgeProps) {
  const info = getBadgeInfo(badge);
  if (!info) return null;

  const Icon = badgeIcons[badge] || Shield;
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  const iconSizes = { sm: 12, md: 14, lg: 16 };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${info.bgColor} ${info.color} ${sizeClasses[size]}`}
      title={info.description}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{info.name}</span>}
    </span>
  );
}

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function VerificationStatusBadge({ status, size = 'sm' }: VerificationStatusBadgeProps) {
  const info = getStatusInfo(status);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${info.bgColor} ${info.color} ${sizeClasses[size]}`}
      title={info.description}
    >
      {status === 'verified' && <CheckCircle size={12} />}
      {info.name}
    </span>
  );
}

interface UserRoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
}

export function UserRoleBadge({ role, size = 'sm' }: UserRoleBadgeProps) {
  const info = getRoleInfo(role);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    teal: 'bg-teal-100 text-teal-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colorClasses[info.color] || colorClasses.green} ${sizeClasses[size]}`}
      title={info.description}
    >
      <span>{info.icon}</span>
      <span>{info.name}</span>
    </span>
  );
}

interface SellerBadgeListProps {
  badges: VerificationBadge[];
  maxShow?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function SellerBadgeList({ badges, maxShow = 3, size = 'sm' }: SellerBadgeListProps) {
  if (!badges || badges.length === 0) return null;

  const visibleBadges = badges.slice(0, maxShow);
  const remainingCount = badges.length - maxShow;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleBadges.map((badge) => (
        <SellerBadge key={badge} badge={badge} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="text-xs text-gray-500">+{remainingCount} more</span>
      )}
    </div>
  );
}
