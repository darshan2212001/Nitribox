import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-border hover:shadow-md transition-all duration-200 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="p-2 sm:p-3 bg-primary/10 rounded-lg"
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </motion.div>
        {trend && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-xs sm:text-sm font-semibold ${
              trend.isPositive ? 'text-[#22C55E]' : 'text-[#FF6B6B]'
            }`}
          >
            {trend.value}
          </motion.span>
        )}
      </div>
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xl sm:text-2xl font-bold text-foreground mb-1"
        data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {value}
      </motion.h3>
      <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}
