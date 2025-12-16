import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Star, Send, ThumbsUp, MessageSquare,
  CheckCircle, Package, Edit2, Trash2, Flag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SellerRating } from './SellerRating';
import * as db from '../../services/database';
import type { SellerReview, MarketplaceListing } from '../../types';
import toast from 'react-hot-toast';

// ==========================================
// Star Rating Input Component
// ==========================================
interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, label, size = 'md', disabled = false }: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const sizes = { sm: 16, md: 24, lg: 32 };

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            className={`transition-transform ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          >
            <Star
              size={sizes[size]}
              className={`transition-colors ${
                star <= (hoverValue || value)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value > 0 ? `${value}/5` : 'Select rating'}
        </span>
      </div>
    </div>
  );
}

// ==========================================
// Review Form Modal
// ==========================================
interface ReviewFormProps {
  sellerId: string;
  sellerName: string;
  listing?: MarketplaceListing;
  existingReview?: SellerReview;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewForm({ sellerId, sellerName, listing, existingReview, onClose, onSuccess }: ReviewFormProps) {
  const { user } = useAuth();
  const isEditing = !!existingReview;

  const [formData, setFormData] = useState({
    overallRating: existingReview?.overallRating || 0,
    qualityRating: existingReview?.qualityRating || 0,
    communicationRating: existingReview?.communicationRating || 0,
    deliveryRating: existingReview?.deliveryRating || 0,
    title: existingReview?.title || '',
    comment: existingReview?.comment || '',
    productName: existingReview?.productName || listing?.productName || '',
    quantity: existingReview?.quantity || listing?.quantity || 0,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }

    if (formData.overallRating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    if (!formData.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && existingReview) {
        await db.updateSellerReview(existingReview.id, {
          overallRating: formData.overallRating,
          qualityRating: formData.qualityRating || formData.overallRating,
          communicationRating: formData.communicationRating || formData.overallRating,
          deliveryRating: formData.deliveryRating || formData.overallRating,
          title: formData.title,
          comment: formData.comment,
        });
        toast.success('Review updated successfully');
      } else {
        await db.addSellerReview({
          sellerId,
          buyerId: user.id,
          buyerName: user.user_metadata?.name || user.email || 'Anonymous',
          listingId: listing?.id,
          overallRating: formData.overallRating,
          qualityRating: formData.qualityRating || formData.overallRating,
          communicationRating: formData.communicationRating || formData.overallRating,
          deliveryRating: formData.deliveryRating || formData.overallRating,
          title: formData.title,
          comment: formData.comment,
          productName: formData.productName,
          quantity: formData.quantity,
          isVerifiedPurchase: !!listing,
        });
        toast.success('Review submitted successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Review' : 'Leave a Review'}
            </h2>
            <p className="text-sm text-gray-500">for {sellerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product info if from listing */}
          {listing && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
              <Package className="text-gray-400" size={20} />
              <div>
                <p className="font-medium text-gray-900">{listing.productName}</p>
                <p className="text-sm text-gray-500">
                  {listing.quantity} {listing.unit} • KES {listing.pricePerUnit.toLocaleString()}/{listing.unit}
                </p>
              </div>
            </div>
          )}

          {/* Overall Rating - Required */}
          <div className="bg-green-50 rounded-lg p-4">
            <StarRatingInput
              value={formData.overallRating}
              onChange={(v) => setFormData(prev => ({ ...prev, overallRating: v }))}
              label="Overall Rating *"
              size="lg"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StarRatingInput
              value={formData.qualityRating}
              onChange={(v) => setFormData(prev => ({ ...prev, qualityRating: v }))}
              label="Quality"
              size="sm"
            />
            <StarRatingInput
              value={formData.communicationRating}
              onChange={(v) => setFormData(prev => ({ ...prev, communicationRating: v }))}
              label="Communication"
              size="sm"
            />
            <StarRatingInput
              value={formData.deliveryRating}
              onChange={(v) => setFormData(prev => ({ ...prev, deliveryRating: v }))}
              label="Delivery"
              size="sm"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Review Title (optional)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Summarize your experience"
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Review *
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Share details about your experience with this seller..."
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.comment.length}/500 characters
            </p>
          </div>

          {/* Product details if not from listing */}
          {!listing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Purchased
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Tomatoes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || formData.overallRating === 0}
              className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  {isEditing ? 'Update Review' : 'Submit Review'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// Review Card Component
// ==========================================
interface ReviewCardProps {
  review: SellerReview;
  isOwnReview?: boolean;
  isSeller?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRespond?: () => void;
  onMarkHelpful?: () => void;
}

export function ReviewCard({
  review,
  isOwnReview,
  isSeller,
  onEdit,
  onDelete,
  onRespond,
  onMarkHelpful
}: ReviewCardProps) {
  const [showFullComment, setShowFullComment] = useState(false);
  const commentTooLong = review.comment.length > 200;

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{review.buyerName}</span>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle size={12} />
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <SellerRating rating={review.overallRating} showCount={false} size="sm" />
            <span className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isOwnReview && (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit review"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!isOwnReview && !isSeller && (
            <button
              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
              title="Report review"
            >
              <Flag size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Rating Breakdown */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span>Quality: <strong className="text-gray-700">{review.qualityRating}/5</strong></span>
        <span>Communication: <strong className="text-gray-700">{review.communicationRating}/5</strong></span>
        <span>Delivery: <strong className="text-gray-700">{review.deliveryRating}/5</strong></span>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-800">{review.title}</h4>
      )}

      {/* Comment */}
      <p className="text-gray-600 text-sm">
        {showFullComment || !commentTooLong
          ? review.comment
          : `${review.comment.slice(0, 200)}...`}
        {commentTooLong && (
          <button
            onClick={() => setShowFullComment(!showFullComment)}
            className="text-green-600 hover:underline ml-1"
          >
            {showFullComment ? 'Show less' : 'Read more'}
          </button>
        )}
      </p>

      {/* Product info */}
      {review.productName && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Package size={12} />
          <span>
            {review.productName}
            {review.quantity && ` • ${review.quantity} units`}
          </span>
        </div>
      )}

      {/* Seller Response */}
      {review.sellerResponse && (
        <div className="ml-4 mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
          <p className="text-xs font-medium text-blue-800 mb-1">Seller Response:</p>
          <p className="text-sm text-blue-900">{review.sellerResponse}</p>
          {review.sellerResponseAt && (
            <p className="text-xs text-blue-600 mt-1">
              {new Date(review.sellerResponseAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Actions Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <button
          onClick={onMarkHelpful}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
        >
          <ThumbsUp size={14} />
          Helpful ({review.helpful})
        </button>

        {isSeller && !review.sellerResponse && (
          <button
            onClick={onRespond}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <MessageSquare size={14} />
            Respond
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Seller Response Modal
// ==========================================
interface SellerResponseFormProps {
  review: SellerReview;
  onClose: () => void;
  onSuccess: () => void;
}

export function SellerResponseForm({ review, onClose, onSuccess }: SellerResponseFormProps) {
  const [response, setResponse] = useState(review.sellerResponse || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!response.trim()) {
      toast.error('Please write a response');
      return;
    }

    setSubmitting(true);
    try {
      await db.addSellerResponse(review.id, response);
      toast.success('Response added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding response:', error);
      toast.error(error.message || 'Failed to add response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Respond to Review</h3>

          {/* Original Review Preview */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{review.buyerName}</span>
              <SellerRating rating={review.overallRating} showCount={false} size="sm" />
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Thank the customer and address their feedback professionally..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send size={16} />
                    Send Response
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==========================================
// Review List Component
// ==========================================
interface ReviewListProps {
  sellerId: string;
  reviews: SellerReview[];
  currentUserId?: string;
  isSellerView?: boolean;
  onReviewChange: () => void;
}

export function ReviewList({ sellerId, reviews, currentUserId, isSellerView, onReviewChange }: ReviewListProps) {
  const [editingReview, setEditingReview] = useState<SellerReview | null>(null);
  const [respondingToReview, setRespondingToReview] = useState<SellerReview | null>(null);
  const [_isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setIsDeleting(true);
    try {
      await db.deleteSellerReview(reviewId);
      toast.success('Review deleted');
      onReviewChange();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await db.markReviewHelpful(reviewId);
      onReviewChange();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <Star className="mx-auto text-gray-300 mb-3" size={48} />
        <p className="text-gray-500">No reviews yet</p>
        <p className="text-sm text-gray-400 mt-1">Be the first to leave a review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwnReview={currentUserId === review.buyerId}
          isSeller={isSellerView && currentUserId === sellerId}
          onEdit={() => setEditingReview(review)}
          onDelete={() => handleDelete(review.id)}
          onRespond={() => setRespondingToReview(review)}
          onMarkHelpful={() => handleMarkHelpful(review.id)}
        />
      ))}

      {/* Edit Review Modal */}
      <AnimatePresence>
        {editingReview && (
          <ReviewForm
            sellerId={sellerId}
            sellerName=""
            existingReview={editingReview}
            onClose={() => setEditingReview(null)}
            onSuccess={onReviewChange}
          />
        )}
      </AnimatePresence>

      {/* Seller Response Modal */}
      <AnimatePresence>
        {respondingToReview && (
          <SellerResponseForm
            review={respondingToReview}
            onClose={() => setRespondingToReview(null)}
            onSuccess={onReviewChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// Leave Review Button (for use in listings/profiles)
// ==========================================
interface LeaveReviewButtonProps {
  sellerId: string;
  sellerName: string;
  listing?: MarketplaceListing;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function LeaveReviewButton({ sellerId, sellerName, listing, variant = 'primary', size = 'md' }: LeaveReviewButtonProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // Don't show if viewing own profile
  if (user?.id === sellerId) return null;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border-2 border-green-600 text-green-600 hover:bg-green-50',
  };

  return (
    <>
      <button
        onClick={() => {
          if (!user) {
            toast.error('Please sign in to leave a review');
            return;
          }
          setShowForm(true);
        }}
        className={`rounded-lg font-medium transition-colors flex items-center gap-2 ${sizeClasses[size]} ${variantClasses[variant]}`}
      >
        <Star size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        Leave Review
      </button>

      <AnimatePresence>
        {showForm && (
          <ReviewForm
            sellerId={sellerId}
            sellerName={sellerName}
            listing={listing}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              // Could trigger a refresh of reviews
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default ReviewForm;
