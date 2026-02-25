import { X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export function WelcomeHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the hint before
    const hasSeenHint = localStorage.getItem('bom-evolution-hint-seen');
    if (!hasSeenHint) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('bom-evolution-hint-seen', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-6 z-40 max-w-sm"
        >
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 shadow-xl p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-1">Welcome! 👋</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Start by uploading a BOM file, then watch as AI identifies components,
                  generates requirements, and helps you achieve 100% compliance.
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <kbd className="rounded bg-blue-100 px-1.5 py-0.5 font-mono">⌘K</kbd>
                  <span>Open command palette anytime</span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
