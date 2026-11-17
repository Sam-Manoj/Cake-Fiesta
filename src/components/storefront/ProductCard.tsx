import Link from "next/link";
import { ShoppingBag } from "lucide-react";

interface Cake {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  weight?: string;
  mrp: number;
  price?: number;
  stock: number;
  is_available: boolean;
}

export default function ProductCard({ cake }: { cake: Cake }) {
  const isSoldOut = !cake.is_available || cake.stock <= 0;
  // Use mrp primarily, with fallback to price or 0
  const displayPrice = cake.mrp ?? cake.price ?? 0;

  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent/10 text-accent">
          {cake.category}
        </span>
        {cake.weight && (
          <span className="text-xs font-medium text-muted bg-secondary px-2 py-0.5 rounded">
            {cake.weight}
          </span>
        )}
      </div>

      <h3 className="font-serif text-xl font-medium mb-2 text-foreground">
        {cake.name}
      </h3>
      
      <p className="text-muted text-sm mb-6 line-clamp-2 flex-grow">
        {cake.description}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
        <span className="font-sans font-medium text-lg tabular-nums text-foreground">
          ₹{displayPrice.toFixed(2)}
        </span>
        
        <button 
          disabled={isSoldOut}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
            isSoldOut 
              ? "bg-secondary text-muted cursor-not-allowed" 
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {isSoldOut ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}