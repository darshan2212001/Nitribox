import { Home, ShoppingCart, Package, User, ShoppingBag, Calendar, Utensils, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartItemCount?: number;
}

export default function BottomNavigation({
  activeTab,
  onTabChange,
  cartItemCount = 0,
}: BottomNavigationProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'my-plan', label: 'My Plan', icon: Calendar },
    { id: 'todays-meals', label: "Today's Meals", icon: Utensils },
    { id: 'track', label: 'Track', icon: MapPin },
    { id: 'nutrimarket', label: 'Market', icon: ShoppingBag },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, badge: cartItemCount },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-border shadow-2xl z-50 px-2 md:px-0 safe-area-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex justify-around items-center h-16 md:h-18 max-w-screen-xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 md:gap-1 px-2 md:px-3 py-2 md:py-2 relative min-w-[44px] min-h-[44px] touch-manipulation ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              data-testid={`button-nav-${tab.id}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="relative z-10"
              >
                <div className="relative">
                  <Icon className="w-5 h-5 md:w-5 md:h-5" />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 p-0 flex items-center justify-center text-[10px] font-semibold bg-destructive text-destructive-foreground rounded-full border-2 border-white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Badge>
                  )}
                </div>
              </motion.div>
              <span className="text-[10px] md:text-xs font-medium relative z-10 hidden sm:block leading-tight">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
