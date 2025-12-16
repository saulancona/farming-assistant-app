import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Check, Clock, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVideoProgress, useUpdateVideoProgress, useMarkVideoComplete } from '../../hooks/useLearningProgress';
import type { LearningVideo } from '../../types';

interface VideoPlayerProps {
  video: LearningVideo;
  userId: string | undefined;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  video,
  userId,
  onComplete,
  autoPlay = false,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const { data: progressData } = useVideoProgress(userId, video.id);
  const updateProgress = useUpdateVideoProgress();
  const markComplete = useMarkVideoComplete();

  // Get progress for single video (when videoId is passed, it returns single object)
  const progress = progressData && !Array.isArray(progressData) ? progressData : null;

  // Parse duration string to seconds
  const parseDuration = (durationStr: string): number => {
    if (video.durationSeconds) return video.durationSeconds;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const totalDuration = parseDuration(video.duration);
  const progressPercentage = progress?.percentageWatched || 0;
  const isCompleted = progress?.completed || false;

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Save progress periodically
  const saveProgress = useCallback(() => {
    if (!userId || !videoRef.current || !hasStarted) return;

    const currentSeconds = Math.floor(videoRef.current.currentTime);
    const totalSeconds = Math.floor(videoRef.current.duration) || totalDuration;

    updateProgress.mutate({
      userId,
      videoId: video.id,
      watchTimeSeconds: currentSeconds,
      totalDurationSeconds: totalSeconds,
      resumePositionSeconds: currentSeconds,
    });
  }, [userId, video.id, hasStarted, totalDuration, updateProgress]);

  // Resume from last position
  useEffect(() => {
    if (progress?.resumePositionSeconds && videoRef.current && !hasStarted) {
      videoRef.current.currentTime = progress.resumePositionSeconds;
    }
  }, [progress, hasStarted]);

  // Set up progress save interval
  useEffect(() => {
    if (isPlaying && userId) {
      progressIntervalRef.current = setInterval(saveProgress, 10000); // Save every 10 seconds
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, userId, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (hasStarted) {
        saveProgress();
      }
    };
  }, [hasStarted, saveProgress]);

  // Handle video events
  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
        setHasStarted(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (userId && !isCompleted) {
      markComplete.mutate({
        userId,
        videoId: video.id,
        totalDurationSeconds: Math.floor(duration) || totalDuration,
      });
    }
    onComplete?.();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        videoRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMarkComplete = () => {
    if (userId && !isCompleted) {
      markComplete.mutate({
        userId,
        videoId: video.id,
        totalDurationSeconds: totalDuration,
      });
    }
  };

  // Check if it's a YouTube/Vimeo embed or direct video
  const isEmbed = video.videoUrl.includes('youtube') || video.videoUrl.includes('vimeo');

  if (isEmbed) {
    // For embedded videos, show iframe with completion button
    return (
      <div className="space-y-4">
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={video.videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Info & Completion */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {video.title}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {video.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {video.views.toLocaleString()}
                </span>
                {video.instructor && (
                  <span>{video.instructor}</span>
                )}
              </div>
            </div>

            <button
              onClick={handleMarkComplete}
              disabled={isCompleted || !userId}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isCompleted ? (
                <>
                  <Check className="w-4 h-4" />
                  {t('learning.completed', 'Completed')}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('learning.markComplete', 'Mark Complete')}
                </>
              )}
            </button>
          </div>

          {/* Progress indicator for embedded videos */}
          {progressPercentage > 0 && !isCompleted && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{t('learning.progress', 'Progress')}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Direct video player with custom controls
  return (
    <div className="space-y-4">
      <div
        className="relative aspect-video rounded-xl overflow-hidden bg-black group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => !isPlaying && setShowControls(true)}
      >
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          autoPlay={autoPlay}
          playsInline
        />

        {/* Play button overlay */}
        {!hasStarted && !isPlaying && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40"
          >
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-900 ml-1" />
            </div>
          </motion.button>
        )}

        {/* Custom controls */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
        >
          {/* Progress bar */}
          <input
            type="range"
            min={0}
            max={duration || totalDuration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 mb-3 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlay}
                className="text-white hover:text-emerald-400 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>

              <button
                onClick={restartVideo}
                className="text-white hover:text-emerald-400 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:text-emerald-400 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration || totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!isCompleted && userId && (
                <button
                  onClick={handleMarkComplete}
                  className="text-white hover:text-emerald-400 transition-colors text-sm flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  {t('learning.markComplete', 'Mark Complete')}
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-emerald-400 transition-colors"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Check className="w-4 h-4" />
            {t('learning.completed', 'Completed')}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {video.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {video.description}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {video.duration}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {video.views.toLocaleString()}
          </span>
          {video.instructor && (
            <span>{video.instructor}</span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs ${
            video.difficulty === 'beginner'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : video.difficulty === 'intermediate'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {video.difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact video card for lists
export function VideoCard({
  video,
  userId,
  onClick,
}: {
  video: LearningVideo;
  userId: string | undefined;
  onClick: () => void;
}) {
  const { data: progressData } = useVideoProgress(userId, video.id);
  const progress = progressData && !Array.isArray(progressData) ? progressData : null;
  const isCompleted = progress?.completed || false;
  const progressPercentage = progress?.percentageWatched || 0;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {video.duration}
        </span>

        {/* Completion badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full">
            <Check className="w-3 h-3" />
          </div>
        )}

        {/* Progress bar */}
        {progressPercentage > 0 && !isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-400/50">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-gray-900 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm">
          {video.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{video.views.toLocaleString()} views</span>
          {video.instructor && (
            <>
              <span>•</span>
              <span>{video.instructor}</span>
            </>
          )}
        </div>
      </div>
    </motion.button>
  );
}
