import HeroBanner from '../HeroBanner';
const bannerImage = "/images/generated/Home-cooked_comfort_food_banner_9590a8d1.png";

export default function HeroBannerExample() {
  return (
    <HeroBanner
      title="Home-Cooked Goodness, Inspired by Mom"
      subtitle="Every meal is thoughtfully crafted by expert nutritionists, inspired by the warmth of a mother's kitchen"
      ctaText="Start Today →"
      backgroundImage={bannerImage}
      onCtaClick={() => console.log('CTA clicked')}
    />
  );
}
