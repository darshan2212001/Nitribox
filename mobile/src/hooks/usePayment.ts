import { useState } from 'react';
import { Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { log } from '../lib/logger';

// Type definitions for react-native-razorpay
interface RazorpayOptions {
  description: string;
  image?: string;
  currency: string;
  key: string;
  amount: number;
  name: string;
  order_id?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Type assertion for RazorpayCheckout
const Razorpay = RazorpayCheckout as any as {
  open: (options: RazorpayOptions) => Promise<RazorpayResponse>;
};

interface PaymentOptions {
  amount: number;
  currency?: string;
  description: string;
  orderId?: string;
  customerDetails?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace with your actual Razorpay key
  const RAZORPAY_KEY_ID = 'rzp_test_your_key_id_here';

  const processPayment = async (options: PaymentOptions): Promise<PaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const razorpayOptions = {
        description: options.description,
        image: 'https://your-logo-url.com/logo.png',
        currency: options.currency || 'INR',
        key: RAZORPAY_KEY_ID,
        amount: options.amount * 100, // Razorpay expects amount in paise
        name: 'ZyaeL NutriBox',
        order_id: options.orderId,
        prefill: {
          email: options.customerDetails?.email,
          contact: options.customerDetails?.contact,
          name: options.customerDetails?.name,
        },
        theme: {
          color: '#10B981',
        },
      };

      const data = await Razorpay.open(razorpayOptions);

      // Verify payment on your backend
      const verificationResult = await verifyPayment({
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
        signature: data.razorpay_signature,
      });

      if (verificationResult.success) {
        return {
          success: true,
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id,
        };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      const errorMessage = error.description || error.message || 'Payment failed';
      setError(errorMessage);
      
      Alert.alert('Payment Failed', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (paymentData: {
    paymentId: string;
    orderId: string;
    signature: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call your backend API to verify the payment
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      log.error('Payment verification error', error);
      return { success: false, error: 'Verification failed' };
    }
  };

  const createOrder = async (amount: number, currency: string = 'INR'): Promise<string | null> => {
    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, currency }),
      });

      const result = await response.json();
      return result.order_id;
    } catch (error) {
      log.error('Order creation error', error);
      return null;
    }
  };

  return {
    processPayment,
    verifyPayment,
    createOrder,
    isLoading,
    error,
  };
}