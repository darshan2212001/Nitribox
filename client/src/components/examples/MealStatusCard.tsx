import { MealStatusCard } from '../MealStatusCard';

export default function MealStatusCardExample() {
  return (
    <div className="max-w-md space-y-3">
      <MealStatusCard
        orderId="order-1"
        mealType="breakfast"
        mealItem="Oats with fruits"
        calories={350}
        status="delivered"
        kitchenStatus="completed"
      />
      <MealStatusCard
        orderId="order-2"
        mealType="lunch"
        mealItem="Grilled chicken salad"
        calories={450}
        status="delivered"
        kitchenStatus="completed"
      />
      <MealStatusCard
        orderId="order-3"
        mealType="dinner"
        mealItem="Vegetable curry with rice"
        calories={500}
        status="in-transit"
        kitchenStatus="ready"
      />
    </div>
  );
}
