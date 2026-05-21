import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { usePayment } from '../hooks/usePayment';
import Card from './ui/Card';
import Button from './ui/Button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export default function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const { processPayment, isLoading } = usePayment();
  const [isProcessing, setIsProcessing] = useState(false);

  // Utility functions
  const formatAmount = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const calculateTax = (subtotal: number): number => {
    return subtotal * 0.18; // 18% GST
  };

  const calculateTotal = (subtotal: number): number => {
    return subtotal + calculateTax(subtotal);
  };

  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const tax = calculateTax(subtotal);
  const total = calculateTotal(subtotal);

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }

    try {
      setIsProcessing(true);
      
      const orderId = `ORD-${Date.now()}`;
      const itemNames = items.map(item => item.name).join(', ');
      
      const paymentResult = await processPayment({
        amount: total,
        description: `Order ${orderId}: ${itemNames}`,
        orderId,
        customerDetails: {
          email: 'user@nutribox.com',
          name: 'User',
        },
      });

      if (paymentResult.success) {
        Alert.alert(
          'Payment Successful',
          `Order ${orderId} has been placed successfully!`,
          [
            { text: 'OK', onPress: onCheckout }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <TouchableOpacity
          onPress={() => onRemoveItem(item.id)}
          style={styles.removeButton}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      {item.description && (
        <Text style={styles.itemDescription}>{item.description}</Text>
      )}
      
      <View style={styles.itemFooter}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            onPress={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.itemPrice}>
          {formatAmount(item.price * item.quantity)}
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shopping Cart</Text>
      
      {items.length === 0 ? (
        <Card style={styles.emptyCart}>
          <Text style={styles.emptyCartText}>Your cart is empty</Text>
          <Text style={styles.emptyCartSubtext}>Add some items to get started</Text>
        </Card>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.itemsList}
          />
          
          <Card style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (18%)</Text>
              <Text style={styles.summaryValue}>{formatAmount(tax)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatAmount(total)}</Text>
            </View>
            
            <Button
              title={isProcessing ? "Processing..." : "Checkout"}
              onPress={handleCheckout}
              disabled={isProcessing || isLoading}
              loading={isProcessing || isLoading}
            />
          </Card>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 16,
  },
  emptyCart: {
    padding: 32,
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
  },
  itemsList: {
    flex: 1,
  },
  cartItem: {
    marginBottom: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2d5016',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  summary: {
    padding: 16,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  checkoutButton: {
    marginTop: 16,
  },
});
