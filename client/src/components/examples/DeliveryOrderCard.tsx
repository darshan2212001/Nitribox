import { useState } from 'react';
import DeliveryOrderCard from '../DeliveryOrderCard';
const userImage = "/images/generated/Happy_customer_testimonial_photo_4e688e5c.png";

export default function DeliveryOrderCardExample() {
  const [status, setStatus] = useState<'pickup' | 'delivering' | 'delivered'>('pickup');

  return (
    <div className="max-w-md">
      <DeliveryOrderCard
        userName="Priya Menon"
        userImage={userImage}
        address="Flat 204, Green Park Apartments, Koramangala 5th Block, Bengaluru - 560095"
        phone="+91 98765 43210"
        mealType="Breakfast - Weight Loss Plan"
        status={status}
        onStatusChange={(newStatus) => {
          console.log('Status changed to:', newStatus);
          setStatus(newStatus as 'pickup' | 'delivering' | 'delivered');
        }}
      />
    </div>
  );
}
