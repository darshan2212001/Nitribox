import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center py-12 md:py-16 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center mb-4 md:mb-6">
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground max-w-md mb-6 md:mb-8 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="touch-manipulation">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

