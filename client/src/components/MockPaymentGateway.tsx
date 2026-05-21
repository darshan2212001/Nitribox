import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Lock, CheckCircle, XCircle, Loader2, Smartphone, Building2, Tag } from "lucide-react";

interface MockPaymentGatewayProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentSuccess: (paymentData: PaymentData) => void;
  onPaymentFailure: (error: string) => void;
}

interface PaymentData {
  transactionId: string;
  amount: number;
  method: string;
  timestamp: string;
  status: 'success' | 'failed';
  subscription?: boolean;
  couponCode?: string;
}

export default function MockPaymentGateway({
  isOpen,
  onClose,
  totalAmount,
  onPaymentSuccess,
  onPaymentFailure,
}: MockPaymentGatewayProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [isSubscription, setIsSubscription] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    upiId: '',
    selectedBank: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const finalAmount = totalAmount - discountAmount;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (paymentMethod === 'card') {
      if (!formData.cardNumber || formData.cardNumber.length < 16) {
        newErrors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = 'Please enter expiry date in MM/YY format';
      }
      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = 'Please enter a valid CVV';
      }
      if (!formData.cardholderName.trim()) {
        newErrors.cardholderName = 'Please enter cardholder name';
      }
    } else if (paymentMethod === 'upi') {
      if (!formData.upiId || !/^[\w.-]+@[\w]+$/.test(formData.upiId)) {
        newErrors.upiId = 'Please enter a valid UPI ID (e.g., name@paytm)';
      }
    } else if (paymentMethod === 'netbanking') {
      if (!formData.selectedBank) {
        newErrors.selectedBank = 'Please select a bank';
      }
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Invalid Coupon",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }
    
    // Mock coupon validation - in real app, this would call an API
    const validCoupons: Record<string, number> = {
      'WELCOME10': 10,
      'SAVE20': 20,
      'FIRST50': 50,
    };
    
    const discount = validCoupons[couponCode.toUpperCase()];
    if (discount) {
      const discountValue = (totalAmount * discount) / 100;
      setDiscountAmount(discountValue);
      toast({
        title: "Coupon Applied!",
        description: `You saved ₹${discountValue.toFixed(2)}`,
      });
    } else {
      toast({
        title: "Invalid Coupon",
        description: "The coupon code you entered is not valid",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const simulatePayment = async () => {
    if (!validateForm()) {
      return;
    }

    setStep('processing');

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate random success/failure (90% success rate)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      const methodNames: Record<string, string> = {
        'card': 'Credit/Debit Card',
        'upi': 'UPI',
        'netbanking': 'Net Banking',
      };
      
      const paymentData: PaymentData = {
        transactionId: `TXN${Date.now()}`,
        amount: finalAmount,
        method: methodNames[paymentMethod] || paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'success',
        subscription: isSubscription,
        couponCode: couponCode || undefined,
      };
      
      setStep('success');
      onPaymentSuccess(paymentData);
      
      toast({
        title: "Payment Successful!",
        description: `Your order has been placed successfully. Transaction ID: ${paymentData.transactionId}`,
      });
    } else {
      setStep('failed');
      const errorMessage = 'Payment failed. Please try again or use a different payment method.';
      onPaymentFailure(errorMessage);
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setStep('form');
    setPaymentMethod('card');
    setIsSubscription(false);
    setCouponCode('');
    setDiscountAmount(0);
    setFormData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      email: '',
      upiId: '',
      selectedBank: '',
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CreditCard className="w-6 h-6 text-primary" />
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Secure Payment</CardTitle>
              <p className="text-muted-foreground text-sm">
                Complete your order with secure payment
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Payment Amount */}
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                {discountAmount > 0 ? (
                  <div>
                    <p className="text-sm text-muted-foreground line-through">₹{totalAmount.toLocaleString()}</p>
                    <p className="text-2xl font-bold text-primary">₹{finalAmount.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 mt-1">You saved ₹{discountAmount.toFixed(2)}!</p>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary">₹{totalAmount.toLocaleString()}</p>
                )}
              </div>

              {/* Coupon Code */}
              <div className="space-y-2">
                <Label htmlFor="coupon" className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Coupon / Referral Code
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim()}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">Card</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'upi' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('upi')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">UPI</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'netbanking' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('netbanking')}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Building2 className="w-5 h-5" />
                    <span className="text-xs">Net Banking</span>
                  </Button>
                </div>
              </div>

              {/* Payment Form */}
              {step === 'form' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Card Payment Form */}
                  {paymentMethod === 'card' && (
                    <>
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input
                          id="cardNumber"
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={formData.cardNumber}
                          onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                          className={errors.cardNumber ? 'border-destructive' : ''}
                          maxLength={19}
                        />
                        {errors.cardNumber && (
                          <p className="text-xs text-destructive mt-1">{errors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            type="text"
                            placeholder="MM/YY"
                            value={formData.expiryDate}
                            onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                            className={errors.expiryDate ? 'border-destructive' : ''}
                            maxLength={5}
                          />
                          {errors.expiryDate && (
                            <p className="text-xs text-destructive mt-1">{errors.expiryDate}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="cvv">CVV</Label>
                          <Input
                            id="cvv"
                            type="text"
                            placeholder="123"
                            value={formData.cvv}
                            onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                            className={errors.cvv ? 'border-destructive' : ''}
                            maxLength={4}
                          />
                          {errors.cvv && (
                            <p className="text-xs text-destructive mt-1">{errors.cvv}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="cardholderName">Cardholder Name</Label>
                        <Input
                          id="cardholderName"
                          type="text"
                          placeholder="John Doe"
                          value={formData.cardholderName}
                          onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                          className={errors.cardholderName ? 'border-destructive' : ''}
                        />
                        {errors.cardholderName && (
                          <p className="text-xs text-destructive mt-1">{errors.cardholderName}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* UPI Payment Form */}
                  {paymentMethod === 'upi' && (
                    <div>
                      <Label htmlFor="upiId">UPI ID</Label>
                      <Input
                        id="upiId"
                        type="text"
                        placeholder="yourname@paytm"
                        value={formData.upiId}
                        onChange={(e) => handleInputChange('upiId', e.target.value)}
                        className={errors.upiId ? 'border-destructive' : ''}
                      />
                      {errors.upiId && (
                        <p className="text-xs text-destructive mt-1">{errors.upiId}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your UPI ID (e.g., name@paytm, name@phonepe, name@googlepay)
                      </p>
                    </div>
                  )}

                  {/* Netbanking Payment Form */}
                  {paymentMethod === 'netbanking' && (
                    <div>
                      <Label htmlFor="selectedBank">Select Bank</Label>
                      <Select
                        value={formData.selectedBank}
                        onValueChange={(value) => handleInputChange('selectedBank', value)}
                      >
                        <SelectTrigger id="selectedBank" className={errors.selectedBank ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Choose your bank" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sbi">State Bank of India</SelectItem>
                          <SelectItem value="hdfc">HDFC Bank</SelectItem>
                          <SelectItem value="icici">ICICI Bank</SelectItem>
                          <SelectItem value="axis">Axis Bank</SelectItem>
                          <SelectItem value="kotak">Kotak Mahindra Bank</SelectItem>
                          <SelectItem value="pnb">Punjab National Bank</SelectItem>
                          <SelectItem value="bob">Bank of Baroda</SelectItem>
                          <SelectItem value="canara">Canara Bank</SelectItem>
                          <SelectItem value="union">Union Bank of India</SelectItem>
                          <SelectItem value="indian">Indian Bank</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.selectedBank && (
                        <p className="text-xs text-destructive mt-1">{errors.selectedBank}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Subscription Toggle */}
                  <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                    <Checkbox
                      id="subscription"
                      checked={isSubscription}
                      onCheckedChange={(checked) => setIsSubscription(checked === true)}
                    />
                    <Label
                      htmlFor="subscription"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      Enable auto-renewal subscription
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Your plan will automatically renew at the end of each billing cycle
                      </span>
                    </Label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={simulatePayment}
                      className="flex-1 bg-primary text-primary-foreground"
                    >
                      Pay ₹{finalAmount.toLocaleString()}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Processing */}
              {step === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 py-8"
                >
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Processing Payment
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Please wait while we process your payment securely...
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Success */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 py-8"
                >
                  <CheckCircle className="w-16 h-16 text-success mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Payment Successful 🎉
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Your Zyael NutriBox plan is now active!
                    </p>
                    <div className="bg-muted/50 rounded-lg p-3 text-left mb-4">
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="text-sm font-mono">TXN{Date.now()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      onClick={handleClose}
                      className="w-full bg-success text-success-foreground"
                    >
                      Go to My Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full"
                    >
                      View Consultation Details
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Failed */}
              {step === 'failed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-4 py-8"
                >
                  <XCircle className="w-16 h-16 text-destructive mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Payment Failed
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Please try again or use a different payment method.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={resetForm}
                      className="flex-1 bg-primary text-primary-foreground"
                    >
                      Try Again
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Security Notice */}
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Secure Payment
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is a mock payment gateway for testing purposes
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
