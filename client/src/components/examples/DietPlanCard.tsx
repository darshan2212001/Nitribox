import DietPlanCard from '../DietPlanCard';
const weightLossMeal = "/images/generated/Healthy_balanced_meal_food_36201b9b.png";

export default function DietPlanCardExample() {
  return (
    <div className="max-w-sm">
      <DietPlanCard
        title="Weight Loss"
        description="Balanced meals to help shed fat effectively"
        originalPrice={17000}
        currentPrice={15000}
        rating={4.8}
        reviewCount={3200}
        badge="Bestseller"
        image={weightLossMeal}
        onSubscribe={() => console.log('Subscribe clicked')}
      />
    </div>
  );
}
