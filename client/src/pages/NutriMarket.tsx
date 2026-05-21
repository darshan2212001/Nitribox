import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { pageTransitionVariants } from "@/lib/animations";
import ProductCard from "@/components/NutriMarket/ProductCard";
import ProductDetailDialog from "@/components/NutriMarket/ProductDetailDialog";
import ProductFilters from "@/components/NutriMarket/ProductFilters";
interface NutriMarketProps {
  onNavigateToCart?: () => void;
}

export default function NutriMarket({ onNavigateToCart }: NutriMarketProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("popular");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { addToCart, getTotalItems } = useCart();
  const { toast } = useToast();

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products", selectedCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      if (sortBy) params.append("sort", sortBy);
      params.append("page", "1");
      params.append("page_size", "50");
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/products?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/products/categories"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const products = productsData?.products || [];
  const categories = categoriesData || [];

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    
    addToCart({
      id: selectedProduct.id,
      title: selectedProduct.name,
      duration: "One-time",
      image: selectedProduct.imageUrl || selectedProduct.image_url || "",
      originalPrice: selectedProduct.price,
      price: selectedProduct.price,
      category: selectedProduct.category,
      description: selectedProduct.description,
    });

    toast({
      title: "Added to Cart",
      description: `${selectedProduct.name} has been added to your cart`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setIsDetailOpen(false);
    onNavigateToCart?.();
  };

  // Get related products (exclude current product)
  const relatedProducts = useMemo(() => {
    if (!selectedProduct || !productsData) return [];
    return products
      .filter((p: any) => p.id !== selectedProduct.id)
      .slice(0, 3)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl || p.image_url,
      }));
  }, [selectedProduct, products]);

  return (
    <motion.div
      {...pageTransitionVariants}
      className="min-h-screen bg-background pb-24 sm:pb-20"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 md:py-8 lg:py-12 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2 leading-tight">NutriMarket</h1>
              <p className="text-primary-foreground/80 text-sm md:text-base leading-relaxed">
                Curated nutrition products, verified by experts.
              </p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="relative ml-3 md:ml-4 flex-shrink-0 h-11 md:h-12 px-3 md:px-4 touch-manipulation"
              onClick={() => onNavigateToCart?.()}
            >
              <ShoppingCart className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline">Cart</span>
              {getTotalItems() > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-semibold bg-destructive text-destructive-foreground border-2 border-white rounded-full">
                  {getTotalItems() > 9 ? '9+' : getTotalItems()}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search supplements, snacks, vitamins…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 md:h-14 bg-background text-foreground border-border rounded-full text-base md:text-lg touch-manipulation"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ProductFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No products found</p>
            <p className="text-muted-foreground text-sm mt-2">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {products.map((product: any) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  shortBenefit: product.shortBenefit || product.short_benefit,
                  price: product.price,
                  imageUrl: product.imageUrl || product.image_url,
                  rating: product.rating,
                  reviewCount: product.reviewCount || product.review_count,
                  tags: product.tags,
                }}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Dialog */}
      {selectedProduct && (
        <ProductDetailDialog
          open={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            shortBenefit: selectedProduct.shortBenefit || selectedProduct.short_benefit,
            price: selectedProduct.price,
            imageUrl: selectedProduct.imageUrl || selectedProduct.image_url,
            rating: selectedProduct.rating,
            reviewCount: selectedProduct.reviewCount || selectedProduct.review_count,
            tags: selectedProduct.tags,
            keyBenefits: selectedProduct.keyBenefits || selectedProduct.key_benefits,
            nutritionalHighlights: selectedProduct.nutritionalHighlights || selectedProduct.nutritional_highlights,
            suitableFor: selectedProduct.suitableFor || selectedProduct.suitable_for,
            nutritionistEndorsements: selectedProduct.nutritionistEndorsements || selectedProduct.nutritionist_endorsements,
          }}
          relatedProducts={relatedProducts}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onRelatedProductClick={(productId) => {
            const product = products.find((p: any) => p.id === productId);
            if (product) {
              setSelectedProduct(product);
            }
          }}
        />
      )}
    </motion.div>
  );
}

