import NutritionistCard from '../NutritionistCard';
const nutritionistImage = "/images/generated/Female_nutritionist_professional_portrait_a8930d89.png";

export default function NutritionistCardExample() {
  return (
    <div className="max-w-md">
      <NutritionistCard
        name="Dr. Priya Sharma"
        specialization="Clinical Nutritionist & Dietitian"
        experience="12 years experience"
        rating={4.9}
        image={nutritionistImage}
        onConsult={() => console.log('Consult clicked')}
      />
    </div>
  );
}
