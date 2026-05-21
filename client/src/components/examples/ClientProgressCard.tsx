import ClientProgressCard from '../ClientProgressCard';
const clientImage = "/images/generated/Business_professional_customer_testimonial_18fae654.png";

export default function ClientProgressCardExample() {
  return (
    <div className="max-w-md">
      <ClientProgressCard
        clientName="Rohan Sharma"
        clientImage={clientImage}
        nextSession="Dec 15, 3:00 PM"
        mealCompletion={92}
        avgCalories={{ current: 1480, target: 1500 }}
        proteinIntake={85}
        waterIntake={{ current: 2.5, target: 3 }}
        weightProgress={{ start: 85, current: 82 }}
        onViewDetails={() => console.log('View details clicked')}
      />
    </div>
  );
}
