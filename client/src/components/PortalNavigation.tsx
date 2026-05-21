import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Menu, 
  X, 
  Users, 
  Utensils, 
  Package, 
  Settings, 
  Activity,
  Calendar,
  FileText,
  MapPin,
  TrendingUp,
  Database,
  ShoppingCart,
  ShoppingBag,
  ChefHat,
  Truck,
  UserCheck,
  BarChart3,
  DollarSign,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  onClick: () => void;
}

interface PortalNavigationProps {
  items: NavigationItem[];
  activeItem: string;
  portalTheme?: any; // Portal theme object from ui-config
  variant?: "sidebar" | "tabs" | "bottom";
  className?: string;
}

export default function PortalNavigation({
  items,
  activeItem,
  portalTheme,
  variant = "sidebar",
  className,
}: PortalNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sidebar variant (desktop)
  if (variant === "sidebar") {
    return (
      <>
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-white shadow-lg h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile menu overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-64 sm:w-72 bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Navigation</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="p-4 space-y-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem === item.id;
                    return (
                  <motion.button
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("[Navigation] Mobile menu item clicked:", item.id, item.label);
                      item.onClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-200 z-30">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="flex-1 px-3 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("[Navigation] Desktop sidebar item clicked:", item.id, item.label);
                      item.onClick();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>
      </>
    );
  }

  // Tabs variant
  if (variant === "tabs") {
    return (
      <div className={cn("w-full border-b border-gray-200 bg-white", className)}>
        <div className="flex overflow-x-auto scrollbar-hide">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[Navigation] Tabs variant item clicked:", item.id, item.label);
                  item.onClick();
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Bottom variant
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50",
        className
      )}
    >
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[Navigation] Bottom nav item clicked:", item.id, item.label);
                item.onClick();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 relative",
                isActive ? "text-primary" : "text-gray-600"
              )}
              whileTap={{ scale: 0.9 }}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="h-5 w-5 relative z-10" />
              <span className="text-xs font-medium relative z-10">{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// Helper function to get navigation items for each portal
export function getClientNavigationItems(
  onTabChange: (tab: string) => void,
  cartItemCount?: number
): NavigationItem[] {
  return [
    { id: "home", label: "Home", icon: Home, onClick: () => onTabChange("home") },
    { id: "my-plan", label: "My Plan", icon: Calendar, onClick: () => onTabChange("my-plan") },
    { id: "todays-meals", label: "Today", icon: Utensils, onClick: () => onTabChange("todays-meals") },
    { id: "track", label: "Track", icon: MapPin, onClick: () => onTabChange("track") },
    { id: "nutrimarket", label: "NutriMarket", icon: ShoppingBag, onClick: () => onTabChange("nutrimarket") },
    { id: "cart", label: "Cart", icon: ShoppingCart, badge: cartItemCount, onClick: () => onTabChange("cart") },
    { id: "orders", label: "Orders", icon: Package, onClick: () => onTabChange("orders") },
    { id: "progress-report", label: "Progress", icon: TrendingUp, onClick: () => onTabChange("progress-report") },
    { id: "profile", label: "Profile", icon: UserCheck, onClick: () => onTabChange("profile") },
  ];
}

export function getKitchenNavigationItems(
  onTabChange: (tab: string) => void
): NavigationItem[] {
  return [
    { id: "overview", label: "Overview", icon: Activity, onClick: () => onTabChange("overview") },
    { id: "production", label: "Production", icon: ChefHat, onClick: () => onTabChange("production") },
    { id: "packing", label: "Packing", icon: Package, onClick: () => onTabChange("packing") },
    { id: "dispatch", label: "Dispatch", icon: Truck, onClick: () => onTabChange("dispatch") },
    { id: "queue", label: "Queue", icon: Package, onClick: () => onTabChange("queue") },
    { id: "preparing", label: "Preparing", icon: ChefHat, onClick: () => onTabChange("preparing") },
    { id: "packed", label: "Packed", icon: Package, onClick: () => onTabChange("packed") },
    { id: "ready", label: "Ready", icon: TrendingUp, onClick: () => onTabChange("ready") },
  ];
}

export function getNutritionistNavigationItems(
  onTabChange: (tab: string) => void
): NavigationItem[] {
  return [
    { id: "overview", label: "Overview", icon: Home, onClick: () => onTabChange("overview") },
    { id: "clients", label: "Clients", icon: Users, onClick: () => onTabChange("clients") },
    { id: "sessions", label: "Sessions", icon: Calendar, onClick: () => onTabChange("sessions") },
    { id: "meal-plans", label: "Meal Plans", icon: Utensils, onClick: () => onTabChange("meal-plans") },
    { id: "progress", label: "Progress", icon: TrendingUp, onClick: () => onTabChange("progress") },
    { id: "alerts", label: "Alerts", icon: Activity, onClick: () => onTabChange("alerts") },
    { id: "analytics", label: "Analytics", icon: BarChart3, onClick: () => onTabChange("analytics") },
    { id: "messaging", label: "Messaging", icon: MessageSquare, onClick: () => onTabChange("messaging") },
    { id: "settings", label: "Settings", icon: Settings, onClick: () => onTabChange("settings") },
  ];
}

export function getDeliveryNavigationItems(
  onTabChange: (tab: string) => void
): NavigationItem[] {
  return [
    { id: "home", label: "Home", icon: Home, onClick: () => onTabChange("home") },
    { id: "issues", label: "Issues", icon: AlertCircle, onClick: () => onTabChange("issues") },
    { id: "earnings", label: "Earnings", icon: DollarSign, onClick: () => onTabChange("earnings") },
    { id: "profile", label: "Profile", icon: UserCheck, onClick: () => onTabChange("profile") },
  ];
}

export function getAdminNavigationItems(
  onTabChange: (tab: string) => void
): NavigationItem[] {
  return [
    { id: "dashboard", label: "Dashboard", icon: Home, onClick: () => onTabChange("dashboard") },
    { id: "meal-plans", label: "Meal Plans", icon: Utensils, onClick: () => onTabChange("meal-plans") },
    { id: "nutritionists", label: "Nutritionists", icon: Users, onClick: () => onTabChange("nutritionists") },
    { id: "clients", label: "Clients", icon: UserCheck, onClick: () => onTabChange("clients") },
    { id: "nutritionist-allocation", label: "Allocation", icon: UserCheck, onClick: () => onTabChange("nutritionist-allocation") },
    { id: "orders", label: "Orders", icon: Package, onClick: () => onTabChange("orders") },
    { id: "payments", label: "Payments & Refunds", icon: DollarSign, onClick: () => onTabChange("payments") },
    { id: "reports", label: "Reports", icon: BarChart3, onClick: () => onTabChange("reports") },
    { id: "settings", label: "Settings", icon: Settings, onClick: () => onTabChange("settings") },
  ];
}

