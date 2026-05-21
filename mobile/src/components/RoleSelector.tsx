import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { } = Dimensions.get('window');

interface RoleSelectorProps {
  onRoleSelect: (role: string) => void;
}

export default function RoleSelector({ onRoleSelect }: RoleSelectorProps) {
  const roles = [
    {
      id: 'client',
      title: 'Client Portal',
      description: 'Browse meal plans, track orders, and manage your nutrition journey',
      icon: 'person-outline',
      color: ['#10B981', '#059669'],
    },
    {
      id: 'kitchen',
      title: 'Kitchen Portal',
      description: 'Manage orders, track preparation, and coordinate meal production',
      icon: 'restaurant-outline',
      color: ['#F59E0B', '#D97706'],
    },
    {
      id: 'nutritionist',
      title: 'Nutritionist Portal',
      description: 'Manage clients, track progress, and provide nutritional guidance',
      icon: 'medical-outline',
      color: ['#8B5CF6', '#7C3AED'],
    },
    {
      id: 'delivery',
      title: 'Delivery Portal',
      description: 'Track deliveries, manage routes, and update order status',
      icon: 'car-outline',
      color: ['#3B82F6', '#2563EB'],
    },
    {
      id: 'admin',
      title: 'Admin Portal',
      description: 'System management, analytics, and platform oversight',
      icon: 'settings-outline',
      color: ['#6B46C1', '#5B21B6'],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>ZyaeL NutriBox</Text>
        <Text style={styles.subtitle}>Home-Cooked Goodness, Perfected by Nutritionists</Text>
      </View>

      <View style={styles.rolesContainer}>
              {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.roleCard}
            onPress={() => onRoleSelect(role.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={role.color as [string, string]}
              style={styles.roleGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.roleContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={role.icon as any} size={32} color="#fff" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Select your role to access the appropriate portal
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#006442',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  rolesContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  roleCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleGradient: {
    padding: 20,
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
