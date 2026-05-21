import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationSearchProps {
  location?: string;
  onLocationClick?: () => void;
  onSearch?: (query: string) => void;
}

export default function LocationSearch({ 
  location = "Mumbai, Maharashtra", 
  onLocationClick,
  onSearch 
}: LocationSearchProps) {
  return (
    <div className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 md:py-4">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center">
          {/* Location Selector */}
          <button
            onClick={onLocationClick}
            className="flex items-center gap-2 text-xs md:text-sm hover-elevate px-3 md:px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 transition-all w-full md:w-auto justify-center md:justify-start min-w-0"
            data-testid="button-select-location"
          >
            <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
            <span className="font-medium hidden sm:inline">Delivering to</span>
            <span className="font-medium sm:hidden">To</span>
            <span className="font-semibold truncate" data-testid="text-current-location">{location}</span>
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search meals, nutrition plans, or experts..."
              className="pl-10 md:pl-12 pr-3 md:pr-4 rounded-full border-border bg-background h-10 md:h-11 text-sm md:text-base"
              onChange={(e) => onSearch?.(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
