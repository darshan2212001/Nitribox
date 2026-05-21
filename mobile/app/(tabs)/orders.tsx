import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const orders = [
  {
    id: 1,
    orderNumber: '#NB001',
    status: 'Preparing',
    items: ['Weight Loss Plan - Lunch', 'Weight Loss Plan - Dinner'],
    total: '₹299',
    date: 'Today, 2:30 PM',
    estimatedDelivery: '4:30 PM',
    statusColor: '#FF9800',
  },
  {
    id: 2,
    orderNumber: '#NB002',
    status: 'Delivered',
    items: ['Muscle Gain Plan - Breakfast', 'Muscle Gain Plan - Lunch'],
    total: '₹399',
    date: 'Yesterday, 1:15 PM',
    estimatedDelivery: 'Delivered at 3:15 PM',
    statusColor: '#4CAF50',
  },
  {
    id: 3,
    orderNumber: '#NB003',
    status: 'Out for Delivery',
    items: ['Balanced Plan - Dinner'],
    total: '₹199',
    date: 'Today, 6:00 PM',
    estimatedDelivery: '7:30 PM',
    statusColor: '#2196F3',
  },
];

const statusSteps = [
  { id: 1, title: 'Ordered', completed: true },
  { id: 2, title: 'Preparing', completed: true },
  { id: 3, title: 'Ready', completed: false },
  { id: 4, title: 'Out for Delivery', completed: false },
  { id: 5, title: 'Delivered', completed: false },
];

export default function OrdersScreen() {
  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>{item.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.statusColor }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <Text style={styles.orderDate}>{item.date}</Text>
        <Text style={styles.estimatedDelivery}>Est. Delivery: {item.estimatedDelivery}</Text>
      </View>
      
      <View style={styles.itemsContainer}>
        {item.items.map((orderItem: string, index: number) => (
          <Text key={index} style={styles.orderItem}>• {orderItem}</Text>
        ))}
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>Total: {item.total}</Text>
        <TouchableOpacity style={styles.trackButton}>
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStatusStep = ({ item }: { item: any; index: number }) => (
    <View style={styles.statusStep}>
      <View style={[
        styles.statusStepCircle,
        { backgroundColor: item.completed ? '#4CAF50' : '#E0E0E0' }
      ]}>
        <Text style={[
          styles.statusStepNumber,
          { color: item.completed ? '#fff' : '#666' }
        ]}>
          {item.id}
        </Text>
      </View>
      <Text style={[
        styles.statusStepTitle,
        { color: item.completed ? '#4CAF50' : '#666' }
      ]}>
        {item.title}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Orders</Text>
      
      {/* Status Timeline */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Order Status</Text>
        <FlatList
          data={statusSteps}
          renderItem={renderStatusStep}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusList}
        />
      </View>
      
      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.ordersList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5016',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
    marginBottom: 12,
  },
  statusList: {
    paddingRight: 20,
  },
  statusStep: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 80,
  },
  statusStepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusStepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusStepTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  ordersList: {
    padding: 20,
    paddingTop: 0,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#2d5016',
    fontWeight: '600',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  orderItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d5016',
  },
  trackButton: {
    backgroundColor: '#2d5016',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
