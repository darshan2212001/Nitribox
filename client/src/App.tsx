import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import AuthForm from "@/components/AuthForm";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import RoleSelector from "@/components/RoleSelector";
import ClientPortal from "@/pages/ClientPortal";
import KitchenPortal from "@/pages/KitchenPortal";
import NutritionistPortal from "@/pages/NutritionistPortal";
import DeliveryPortal from "@/pages/DeliveryPortal";
import AdminPortal from "@/pages/AdminPortal";
import CheckoutPage from "@/pages/CheckoutPage";
import NutriMarket from "@/pages/NutriMarket";
import NotFound from "@/pages/not-found";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  const handleRoleSelect = (role: string) => {
    setLocation(`/${role}`);
  };

  // Routes that should not trigger automatic role-based redirects
  const isPortalRoute = ['/client', '/kitchen', '/nutritionist', '/delivery', '/admin', '/checkout', '/nutrimarket'].includes(location);

  // Handle automatic redirection based on user role
  // Only redirect if user is authenticated and route is not a portal/checkout route
  useEffect(() => {
    if (isAuthenticated && user && !isPortalRoute) {
      if (user.role === 'client') {
        setLocation('/client');
      } else if (user.role === 'kitchen') {
        setLocation('/kitchen');
      } else if (user.role === 'delivery') {
        setLocation('/delivery');
      } else if (user.role === 'nutritionist') {
        setLocation('/nutritionist');
      } else if (user.role === 'admin') {
        setLocation('/admin');
      }
    }
  }, [isAuthenticated, user, isPortalRoute, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  // Show loading while redirecting
  if (isAuthenticated && user && !isPortalRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isPortalRoute && (
        <div className="fixed top-2 right-2 md:top-4 md:right-4 z-50 flex flex-col sm:flex-row gap-2 max-w-[calc(100vw-1rem)] md:max-w-none">
          <div className="px-2 md:px-3 py-1 md:py-2 bg-white text-foreground rounded-full shadow-md text-xs md:text-sm font-medium border border-border truncate">
            {user?.name} ({user?.role})
          </div>
          <button
            onClick={() => setLocation('/')}
            className="px-2 md:px-4 py-1 md:py-2 bg-white text-foreground rounded-full shadow-md hover:bg-gray-50 text-xs md:text-sm font-medium border border-border whitespace-nowrap"
            data-testid="button-back-to-roles"
          >
            <span className="hidden sm:inline">← Back to Roles</span>
            <span className="sm:hidden">← Back</span>
          </button>
          <button
            onClick={logout}
            className="px-2 md:px-4 py-1 md:py-2 bg-red-600 text-white rounded-full shadow-md hover:bg-red-700 text-xs md:text-sm font-medium whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      )}

      <Switch>
        <Route path="/">
          <RoleSelector onRoleSelect={handleRoleSelect} />
        </Route>
        <Route path="/client">
          <ProtectedRoute requiredRole="client">
            <ClientPortal />
          </ProtectedRoute>
        </Route>
        <Route path="/kitchen">
          <ProtectedRoute requiredRole="kitchen">
            <KitchenPortal />
          </ProtectedRoute>
        </Route>
        <Route path="/nutritionist">
          <ProtectedRoute requiredRole="nutritionist">
            <NutritionistPortal />
          </ProtectedRoute>
        </Route>
        <Route path="/delivery">
          <ProtectedRoute requiredRole="delivery">
            <DeliveryPortal />
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute requiredRole="admin">
            <AdminPortal />
          </ProtectedRoute>
        </Route>
        <Route path="/checkout">
          <ProtectedRoute requiredRole="client">
            <CheckoutPage />
          </ProtectedRoute>
        </Route>
        <Route path="/nutrimarket">
          <ProtectedRoute requiredRole="client">
            <NutriMarket />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <SessionTimeoutWarning />
              <Toaster />
              <Router />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
