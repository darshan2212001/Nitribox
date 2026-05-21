import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { PasswordStrength } from './ui/password-strength';
import { 
  Loader2, Mail, Lock, User, Phone, Shield, AlertCircle, CheckCircle, 
  Wifi, WifiOff, Eye, EyeOff, ArrowRight
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// Error types for better categorization
type AuthError = {
  type: 'network' | 'credentials' | 'server' | 'validation' | 'unknown';
  message: string;
  details?: string;
  retryable?: boolean;
};

export default function AuthForm() {
  const { login, register, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState<AuthError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Navigate when user becomes available after login/register
  useEffect(() => {
    if (shouldRedirect && user) {
      if (user.role === 'client') {
        navigate('/client');
      } else if (user.role === 'nutritionist') {
        navigate('/nutritionist');
      } else if (user.role === 'kitchen') {
        navigate('/kitchen');
      } else if (user.role === 'delivery') {
        navigate('/delivery');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/client');
      }
      setShouldRedirect(false);
    }
  }, [user, shouldRedirect, navigate]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'client' as const,
  });

  // Email validation state
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Error categorization function
  const categorizeError = (error: any): AuthError => {
    if (!navigator.onLine) {
      return {
        type: 'network',
        message: 'No internet connection. Please check your network and try again.',
        details: 'You appear to be offline.',
        retryable: true
      };
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return {
        type: 'network',
        message: 'Unable to connect to the server. Please check your internet connection.',
        details: 'The server may be temporarily unavailable.',
        retryable: true
      };
    }

    if (error.message?.includes('401') || error.message?.includes('Invalid credentials')) {
      const isEmailInput = loginData.username.includes('@') && loginData.username.includes('.');
      
      return {
        type: 'credentials',
        message: isEmailInput 
          ? 'Email not found or invalid password. Please use your username instead of email, or check your password.'
          : 'Invalid username or password. Please check your credentials and try again.',
        details: isEmailInput 
          ? 'Try logging in with your username instead of email address.'
          : 'Double-check your username and password for typos.',
        retryable: false
      };
    }

    if (error.message?.includes('400') || error.message?.includes('validation')) {
      return {
        type: 'validation',
        message: 'Please check your input and try again.',
        details: 'Make sure all required fields are filled correctly.',
        retryable: false
      };
    }

    // Do not match on the word "server" — API messages often say "database server" / "API server"
    // and would incorrectly become a generic toast. Prefer the message from useAuth (API detail).

    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred. Please try again.',
      details: 'If this problem persists, please contact support.',
      retryable: true
    };
  };

  // Show error notification
  const showErrorNotification = (authError: AuthError) => {
    toast({
      title: "Authentication Failed",
      description: authError.message,
      variant: "destructive",
      duration: 5000,
    });
  };

  // Show success notification
  const showSuccessNotification = (message: string, description?: string) => {
    setSuccessAnimation(true);
    setTimeout(() => setSuccessAnimation(false), 3000);
    
    toast({
      title: message,
      description: description,
      duration: 3000,
    });
  };

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailValid(email ? isValid : null);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate input
    if (!loginData.username.trim() || !loginData.password.trim()) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Please enter both username and password.',
        details: 'All fields are required.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Attempting login with:', loginData);
      const result = await login(loginData.username, loginData.password);
      
      if (result.success) {
        setRetryCount(0);
        showSuccessNotification(
          "Login Successful!",
          "Welcome back! Redirecting to your dashboard..."
        );
        
        // Set flag to trigger navigation when user becomes available
        setShouldRedirect(true);
      } else {
        const authError = categorizeError({ message: result.error });
        setError(authError);
        showErrorNotification(authError);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const authError = categorizeError(err);
      setError(authError);
      showErrorNotification(authError);
      
      if (authError.retryable) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate input
    if (!registerData.username.trim() || !registerData.name.trim() || 
        !registerData.email.trim() || !registerData.password.trim()) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Please fill in all required fields.',
        details: 'Username, name, email, and password are required.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    // Email validation
    if (!validateEmail(registerData.email)) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Please enter a valid email address.',
        details: 'The email format is incorrect.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    // Password match validation
    if (registerData.password !== registerData.confirmPassword) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Passwords do not match.',
        details: 'Please make sure both password fields match.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    // Password strength validation
    if (registerData.password.length < 8) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Password must be at least 8 characters long.',
        details: 'Please choose a stronger password.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(registerData.password)) {
      const validationError: AuthError = {
        type: 'validation',
        message: 'Password must include at least one letter and one number.',
        details: 'This matches the server requirements.',
        retryable: false
      };
      setError(validationError);
      showErrorNotification(validationError);
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Attempting registration with:', registerData);
      const phoneTrim = registerData.phone.trim();
      const result = await register({
        username: registerData.username,
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        ...(phoneTrim ? { phone: phoneTrim } : {}),
        role: registerData.role,
      });
      
      if (result.success) {
        setRetryCount(0);
        showSuccessNotification(
          "Registration Successful!",
          "Account created successfully. Redirecting to your dashboard..."
        );
        
        // Set flag to trigger navigation when user becomes available
        setShouldRedirect(true);
        
        setRegisterData({
          username: '',
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
          role: 'client',
        });
      } else {
        const authError = categorizeError({ message: result.error });
        setError(authError);
        showErrorNotification(authError);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const authError = categorizeError(err);
      setError(authError);
      showErrorNotification(authError);
      
      if (authError.retryable) {
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Retry function for retryable errors
  const handleRetry = () => {
    if (activeTab === 'login') {
      handleLogin(new Event('submit') as any);
    } else {
      handleRegister(new Event('submit') as any);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
    setRetryCount(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-green-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 relative z-10"
      >
        {/* Header with Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <span className="text-2xl">🥗</span>
            </div>
          </motion.div>
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent mb-2">
            ZyaeL NutriBox
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to your account or create a new one
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0 rounded-2xl overflow-hidden">
            {/* Success Animation Overlay */}
            <AnimatePresence>
              {successAnimation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center z-50"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white pb-8">
              <CardTitle className="text-2xl text-center">Authentication</CardTitle>
              <CardDescription className="text-emerald-50 text-center">
                Access your account or create a new one
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-lg p-1">
                  <TabsTrigger 
                    value="login"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* Browser network only — API must still be running separately */}
                <div
                  className="flex items-center justify-center space-x-2 text-sm mb-4"
                  title="This shows your device’s network. It does not verify the NutriBox API is running."
                >
                  {isOnline ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center space-x-1 text-emerald-600"
                    >
                      <Wifi className="h-4 w-4" />
                      <span>Network connected</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center space-x-1 text-red-600"
                    >
                      <WifiOff className="h-4 w-4" />
                      <span>Offline</span>
                    </motion.div>
                  )}
                </div>

                {/* Enhanced Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Alert className={`mb-4 ${
                        error.type === 'network' ? 'border-orange-200 bg-orange-50' : 
                        error.type === 'credentials' ? 'border-red-200 bg-red-50' :
                        error.type === 'validation' ? 'border-yellow-200 bg-yellow-50' :
                        error.type === 'server' ? 'border-purple-200 bg-purple-50' :
                        'border-gray-200 bg-gray-50'
                      }`}>
                        <AlertCircle className={`h-4 w-4 ${
                          error.type === 'network' ? 'text-orange-600' :
                          error.type === 'credentials' ? 'text-red-600' :
                          error.type === 'validation' ? 'text-yellow-600' :
                          error.type === 'server' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                        <AlertDescription className="space-y-2">
                          <div className="font-medium">{error.message}</div>
                          {error.details && (
                            <div className="text-sm opacity-75">{error.details}</div>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex space-x-2">
                              {error.retryable && retryCount < 3 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRetry}
                                  disabled={isSubmitting}
                                  className="text-xs"
                                >
                                  Retry ({retryCount}/3)
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearError}
                                className="text-xs"
                              >
                                Dismiss
                              </Button>
                            </div>
                            {retryCount >= 3 && error.retryable && (
                              <div className="text-xs text-gray-500">
                                Max retries reached. Please try again later.
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <TabsContent value="login" className="space-y-4 mt-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2"
                    >
                      <label htmlFor="login-username" className="text-sm font-medium text-gray-700">
                        Username or Email
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="login-username"
                          type="text"
                          placeholder="Enter your username or email"
                          value={loginData.username}
                          onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                          className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                          required
                        />
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-2"
                    >
                      <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                        />
                        <label htmlFor="remember-me" className="text-gray-600 cursor-pointer">
                          Remember me
                        </label>
                      </div>
                      <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                        Forgot password?
                      </a>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={isSubmitting || isLoading}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4 mt-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-username" className="text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-username"
                          type="text"
                          placeholder="Choose a username"
                          value={registerData.username}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                          className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                          required
                        />
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-name" className="text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Enter your full name"
                          value={registerData.name}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                          className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                          required
                        />
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-email" className="text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="Enter your email"
                          value={registerData.email}
                          onChange={(e) => {
                            setRegisterData(prev => ({ ...prev, email: e.target.value }));
                            validateEmail(e.target.value);
                          }}
                          className={`pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors ${
                            emailValid === false ? 'border-red-300' : 
                            emailValid === true ? 'border-green-300' : ''
                          }`}
                          required
                        />
                      </div>
                      {emailValid === false && (
                        <p className="text-xs text-red-500">Please enter a valid email address</p>
                      )}
                      {emailValid === true && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Valid email format
                        </p>
                      )}
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-phone" className="text-sm font-medium text-gray-700">
                        Phone (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="Enter your phone number"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                          className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                        />
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-password" className="text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={registerData.password}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <PasswordStrength password={registerData.password} />
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-confirm-password" className="text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="register-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 transition-colors ${
                            registerData.confirmPassword && registerData.password !== registerData.confirmPassword 
                              ? 'border-red-300' 
                              : registerData.confirmPassword && registerData.password === registerData.confirmPassword
                              ? 'border-green-300'
                              : ''
                          }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {registerData.confirmPassword && registerData.password !== registerData.confirmPassword && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                      {registerData.confirmPassword && registerData.password === registerData.confirmPassword && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Passwords match
                        </p>
                      )}
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="space-y-2"
                    >
                      <label htmlFor="register-role" className="text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                        <Select
                          value={registerData.role}
                          onValueChange={(value) => setRegisterData(prev => ({ ...prev, role: value as any }))}
                        >
                          <SelectTrigger className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                            <SelectItem value="nutritionist">Nutritionist</SelectItem>
                            <SelectItem value="delivery">Delivery Agent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={isSubmitting || isLoading}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}