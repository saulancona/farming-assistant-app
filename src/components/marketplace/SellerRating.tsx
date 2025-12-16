import { Star } from 'lucide-react';

interface SellerRatingProps {
  rating: number;
  totalRatings?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export function SellerRating({ rating, totalRatings = 0, size = 'sm', showCount = true }: SellerRatingProps) {
  const sizeClasses = {
    sm: { star: 12, text: 'text-xs' },
    md: { star: 14, text: 'text-sm' },
    lg: { star: 16, text: 'text-base' },
  };

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={`flex items-center gap-1 ${sizeClasses[size].text}`}>
      <div className="flex items-center">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={sizeClasses[size].star}
            className="text-yellow-400 fill-yellow-400"
          />
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star size={sizeClasses[size].star} className="text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star size={sizeClasses[size].star} className="text-yellow-400 fill-yellow-400" />
            </div>
          </div>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={sizeClasses[size].star}
            className="text-gray-300"
          />
        ))}
      </div>
      <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
      {showCount && totalRatings > 0 && (
        <span className="text-gray-500">({totalRatings})</span>
      )}
    </div>
  );
}

interface RatingBreakdownProps {
  ratings: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  totalRatings: number;
}

export function RatingBreakdown({ ratings, totalRatings }: RatingBreakdownProps) {
  const getPercentage = (count: number) => {
    if (totalRatings === 0) return 0;
    return Math.round((count / totalRatings) * 100);
  };

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => (
        <div key={stars} className="flex items-center gap-2 text-sm">
          <span className="w-3 text-gray-600">{stars}</span>
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all duration-300"
              style={{ width: `${getPercentage(ratings[stars as keyof typeof ratings])}%` }}
            />
          </div>
          <span className="w-8 text-right text-gray-500 text-xs">
            {getPercentage(ratings[stars as keyof typeof ratings])}%
          </span>
        </div>
      ))}
    </div>
  );
}

interface ReviewSummaryProps {
  overallRating: number;
  totalRatings: number;
  qualityRating?: number;
  communicationRating?: number;
  deliveryRating?: number;
}

export function ReviewSummary({
  overallRating,
  totalRatings,
  qualityRating,
  communicationRating,
  deliveryRating
}: ReviewSummaryProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{overallRating.toFixed(1)}</div>
          <SellerRating rating={overallRating} showCount={false} size="md" />
          <div className="text-sm text-gray-500 mt-1">{totalRatings} reviews</div>
        </div>
      </div>

      {(qualityRating || communicationRating || deliveryRating) && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          {qualityRating && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Quality</span>
              <SellerRating rating={qualityRating} showCount={false} size="sm" />
            </div>
          )}
          {communicationRating && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Communication</span>
              <SellerRating rating={communicationRating} showCount={false} size="sm" />
            </div>
          )}
          {deliveryRating && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Delivery</span>
              <SellerRating rating={deliveryRating} showCount={false} size="sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
