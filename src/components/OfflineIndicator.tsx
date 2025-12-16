import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {showNotification && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 ${
            isOnline
              ? 'bg-green-600 text-white'
              : 'bg-orange-600 text-white'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi size={20} />
              <span className="font-medium">Back Online - Syncing data...</span>
            </>
          ) : (
            <>
              <WifiOff size={20} />
              <span className="font-medium">Offline - Changes will sync when reconnected</span>
            </>
          )}
        </motion.div>
      )}

      {/* Persistent indicator in corner when offline */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 z-50 bg-orange-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm"
        >
          <WifiOff size={16} />
          <span className="hidden sm:inline">Offline Mode</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
