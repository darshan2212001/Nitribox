import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmartNotificationProps {
  delayMs?: number;
  onChatNow?: () => void;
  onLater?: () => void;
}

export default function SmartNotification({ 
  delayMs = 120000, // 2 minutes default
  onChatNow,
  onLater 
}: SmartNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  const handleClose = () => {
    setIsVisible(false);
    onLater?.();
  };

  const handleChatNow = () => {
    setIsVisible(false);
    onChatNow?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 max-w-sm"
          data-testid="smart-notification"
        >
          <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 relative">
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-notification-close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Need Help Choosing?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Need help choosing the right plan? Speak to our Nutritionist Now!
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={handleClose}
                data-testid="button-notification-later"
              >
                Later
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground rounded-full hover-elevate active-elevate-2"
                onClick={handleChatNow}
                data-testid="button-notification-chat-now"
              >
                Chat Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
