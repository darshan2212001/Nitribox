import TestimonialCard from '../TestimonialCard';
const customerImage = "/images/generated/Happy_customer_testimonial_photo_4e688e5c.png";

export default function TestimonialCardExample() {
  return (
    <div className="max-w-md">
      <TestimonialCard
        name="Meera"
        role="Content Writer"
        location="Bengaluru"
        testimonial="I signed up after seeing their Instagram ad saying 'Meals made with care.' True to that, I got a call from their nutritionist a few days in. She spoke with me about my stress, eating gaps, and even sleep. It felt like therapy through food."
        image={customerImage}
        rating={5}
      />
    </div>
  );
}
