import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
  categories: Array<{ category: string; count: number }>;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  protein_fitness: "Protein & Fitness",
  vitamins_minerals: "Vitamins & Minerals",
  gut_health: "Gut Health",
  healthy_snacks: "Healthy Snacks",
  diabetic_friendly: "Diabetic-Friendly",
  womens_health: "Women's Health",
};

export default function ProductFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}: ProductFiltersProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          className={cn(
            "rounded-full h-10 px-4 md:px-5 text-sm md:text-base font-medium flex-shrink-0 touch-manipulation",
            selectedCategory === null && "bg-primary text-primary-foreground"
          )}
          onClick={() => onCategoryChange(null)}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.category}
            variant={selectedCategory === cat.category ? "default" : "outline"}
            size="sm"
            className={cn(
              "rounded-full h-10 px-4 md:px-5 text-sm md:text-base font-medium flex-shrink-0 touch-manipulation whitespace-nowrap",
              selectedCategory === cat.category && "bg-primary text-primary-foreground"
            )}
            onClick={() => onCategoryChange(cat.category)}
          >
            {CATEGORY_LABELS[cat.category] || cat.category} <span className="text-xs md:text-sm opacity-80 ml-1">({cat.count})</span>
          </Button>
        ))}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm md:text-base text-muted-foreground font-medium">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full md:w-[200px] h-11 md:h-12 text-base touch-manipulation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular" className="text-base">Popular</SelectItem>
            <SelectItem value="new" className="text-base">New</SelectItem>
            <SelectItem value="price_low" className="text-base">Price (Low to High)</SelectItem>
            <SelectItem value="price_high" className="text-base">Price (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

