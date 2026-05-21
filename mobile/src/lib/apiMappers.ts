/**
 * API Response Mappers
 * 
 * Transform backend API responses to match mobile app data structures
 * Handles field name conversions, computed fields, and data type conversions
 */

import { log } from './logger';
import { DeliveryOrder, Session, Client, Nutritionist } from '../types';

// KitchenOrder interface (not in types yet, define inline)
interface KitchenOrder {
  id: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  mealType: string;
  dietPlan: string;
  quantity: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  estimatedTime?: number;
  createdAt: string;
  specialInstructions?: string;
  kitchenStatus?: string;
}

// MealPlan interface (not in types yet, define inline)
interface MealPlan {
  id: string;
  name: string;
  price: string;
  image: string;
  description: string;
}

/**
 * Map backend order response to mobile app KitchenOrder format
 */
export function mapKitchenOrder(order: any): KitchenOrder {
  try {
    const orderId = order?.id || order?.orderId || '';
    return {
      id: orderId || String(Date.now()),
      orderNumber: orderId ? orderId.substring(0, 8).toUpperCase() : 'N/A',
      clientName: order.clientName || order.client_name || 'Unknown',
      clientPhone: order.clientPhone || order.client_phone || '',
      mealType: order.mealType || order.meal_type || 'Unknown',
      dietPlan: order.dietPlan || order.diet_plan || 'Standard',
      quantity: order.quantity || 1,
      status: (order.status || order.kitchenStatus || order.kitchen_status || 'pending') as 'pending' | 'preparing' | 'ready' | 'completed',
      priority: (order.priority || 'medium') as 'low' | 'medium' | 'high',
      estimatedTime: 30, // Default estimate, can be calculated from prep_time_minutes if available
      createdAt: order.createdAt || order.created_at || new Date().toISOString(),
      specialInstructions: order.specialInstructions || order.special_instructions || order.notes || undefined,
      kitchenStatus: order.kitchenStatus || order.kitchen_status || order.status,
    };
  } catch (error) {
    log.error('Error mapping kitchen order', error);
    // Return safe default instead of throwing
    return {
      id: String(Date.now()),
      orderNumber: 'N/A',
      clientName: 'Unknown',
      clientPhone: '',
      mealType: 'Unknown',
      dietPlan: 'Standard',
      quantity: 1,
      status: 'pending',
      priority: 'medium',
      estimatedTime: 30,
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Map backend delivery order response to mobile app DeliveryOrder format
 */
export function mapDeliveryOrder(order: any): DeliveryOrder {
  try {
    // Normalize status: convert 'picked-up' to 'picked_up', 'in-transit' to 'in_transit'
    let normalizedStatus = (order.status || 'assigned').replace(/-/g, '_');
    if (normalizedStatus === 'picked_up' || normalizedStatus === 'picked-up') {
      normalizedStatus = 'picked_up';
    } else if (normalizedStatus === 'in_transit' || normalizedStatus === 'in-transit') {
      normalizedStatus = 'in_transit';
    }
    
    // Parse coordinates from current_location or address
    let coords: { latitude: number; longitude: number } | undefined = undefined;
    if (order.currentLocation && typeof order.currentLocation === 'object') {
      const lat = parseFloat(String(order.currentLocation.latitude || 0));
      const lng = parseFloat(String(order.currentLocation.longitude || 0));
      if (lat !== 0 || lng !== 0) {
        coords = { latitude: lat, longitude: lng };
      }
    } else if (order.current_location && typeof order.current_location === 'object') {
      const lat = parseFloat(String(order.current_location.latitude || 0));
      const lng = parseFloat(String(order.current_location.longitude || 0));
      if (lat !== 0 || lng !== 0) {
        coords = { latitude: lat, longitude: lng };
      }
    }
    
    // Parse estimated delivery time
    const estTime = order.estimatedDeliveryTime || order.estimated_delivery_time
      ? new Date(order.estimatedDeliveryTime || order.estimated_delivery_time).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      : 'N/A';
    
    const orderId = order?.orderId || order?.order_id || order?.id || '';
    return {
      id: orderId || String(Date.now()),
      orderId: orderId || undefined,
      orderNumber: orderId ? orderId.substring(0, 8).toUpperCase() : 'N/A',
      clientName: order.clientName || order.client_name || 'Unknown',
      clientPhone: order.clientPhone || order.client_phone || '',
      clientAddress: order.clientAddress || order.client_address || '',
      mealType: order.mealType || order.meal_type || 'Unknown',
      quantity: order.quantity || 1,
      status: normalizedStatus as 'assigned' | 'picked_up' | 'in_transit' | 'delivered',
      priority: (order.priority || 'medium') as 'low' | 'medium' | 'high',
      estimatedDeliveryTime: estTime,
      actualDeliveryTime: order.actualDeliveryTime || order.actual_delivery_time || order.deliveredAt || order.delivered_at,
      distance: order.distance || 0,
      deliveryFee: order.deliveryFee || order.delivery_fee || 0,
      specialInstructions: order.specialInstructions || order.special_instructions || order.notes || undefined,
      coordinates: coords,
      currentLocation: order.currentLocation || order.current_location || undefined,
    };
  } catch (error) {
    log.error('Error mapping delivery order', error);
    // Return safe default instead of throwing
    const orderId = String(Date.now());
    return {
      id: orderId,
      orderId: orderId,
      orderNumber: 'N/A',
      clientName: 'Unknown',
      clientPhone: '',
      clientAddress: '',
      mealType: 'Unknown',
      quantity: 1,
      status: 'assigned',
      priority: 'medium',
      estimatedDeliveryTime: 'N/A',
      distance: 0,
      deliveryFee: 0,
    };
  }
}

/**
 * Map backend consultation response to mobile app format
 */
export function mapConsultation(consultation: any, clients?: Client[]): Session {
  try {
    // Find client name from clients list if provided
    const client = clients?.find((c: any) => c.id === consultation.clientId || c.id === consultation.client_id);
    
    return {
      id: consultation.id,
      clientId: consultation.clientId || consultation.client_id,
      clientName: client?.name || 'Unknown Client',
      type: (consultation.type || 'consultation') as 'consultation' | 'follow-up' | 'assessment',
      scheduledAt: consultation.date || consultation.scheduledAt || consultation.scheduled_at || new Date().toISOString(),
      duration: consultation.durationMinutes || consultation.duration_minutes || 60,
      status: consultation.status || 'scheduled',
      notes: consultation.notes || '',
    };
  } catch (error) {
    log.error('Error mapping consultation', error);
    // Return safe default instead of throwing
    return {
      id: String(Date.now()),
      clientId: '',
      clientName: 'Unknown Client',
      type: 'consultation',
      scheduledAt: new Date().toISOString(),
      duration: 60,
      status: 'scheduled',
      notes: '',
    };
  }
}

/**
 * Map backend client response to mobile app format
 */
export function mapClient(client: any): Client {
  try {
    return {
      id: client.id,
      name: client.name || 'Unknown',
      email: client.email || '',
      age: client.age || 0,
      gender: client.gender || 'unknown',
      bmi: client.bmi || 0,
      status: (client.status || 'active') as 'completed' | 'active' | 'inactive',
      goal: client.goal || 'weight_loss',
      progress: client.progress || 0,
      weightStart: client.weightStart || client.weight_start || 0,
      currentWeight: client.currentWeight || client.weight_current || client.weightCurrent || 0,
      weightGoal: client.weightGoal || client.weight_goal || client.weightGoal || 0,
      height: client.height || 0,
      lastSession: client.lastSession || client.last_session || 'Never',
      nextSession: client.nextSession || client.next_session || 'Never',
    };
  } catch (error) {
    log.error('Error mapping client', error);
    // Return safe default instead of throwing
    return {
      id: String(Date.now()),
      name: 'Unknown',
      email: '',
      age: 0,
      gender: 'unknown',
      weightStart: 0,
      weightGoal: 0,
      currentWeight: 0,
      height: 0,
      bmi: 0,
      goal: 'weight_loss',
      lastSession: 'Never',
      nextSession: 'Never',
      progress: 0,
      status: 'active',
    };
  }
}

/**
 * Map backend meal plan response to mobile app format
 */
export function mapMealPlan(plan: any): MealPlan {
  try {
    return {
      id: plan.id || plan.mealPlanId || String(Math.random()),
      name: plan.name || plan.title || 'Meal Plan',
      price: plan.price ? `₹${plan.price}` : plan.currentPrice ? `₹${plan.currentPrice}` : '₹2,999',
      image: plan.imageUrl || plan.image_url || '🥗',
      description: plan.description || plan.details || 'Customized meal plan',
    };
  } catch (error) {
    log.error('Error mapping meal plan', error);
    // Return safe default instead of throwing
    return {
      id: String(Date.now()),
      name: 'Meal Plan',
      price: '₹2,999',
      image: '🥗',
      description: 'Customized meal plan',
    };
  }
}

/**
 * Map backend nutritionist response to mobile app format
 */
export function mapNutritionist(nutri: any): Nutritionist {
  try {
    return {
      id: nutri.id || String(Math.random()),
      name: nutri.name || 'Nutritionist',
      specialization: nutri.specialization || nutri.expertise || 'General Nutrition',
      experience: nutri.experience || '5+ years experience',
      rating: nutri.rating || nutri.avgRating || 4.5,
      image: nutri.imageUrl || nutri.image_url || nutri.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200',
      price: nutri.consultationFee ? `₹${nutri.consultationFee}/session` : '₹500/session',
      available: nutri.available !== false,
      reviewCount: nutri.reviewCount || nutri.review_count || 0,
      consultationFee: nutri.consultationFee || nutri.consultation_fee || 500,
      availability: nutri.available !== false ? 'available' : 'unavailable',
    };
  } catch (error) {
    log.error('Error mapping nutritionist', error);
    // Return safe default instead of throwing
    return {
      id: String(Date.now()),
      name: 'Nutritionist',
      specialization: 'General Nutrition',
      experience: '5+ years experience',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200',
      price: '₹500/session',
      available: true,
      reviewCount: 0,
      consultationFee: 500,
      availability: 'available',
    };
  }
}

