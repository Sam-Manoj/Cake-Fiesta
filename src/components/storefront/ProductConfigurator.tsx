"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Calendar, Layers, Plus, Minus, Check } from "lucide-react";

interface Variant {
  id: string;
  weight: string;
  mrp: number;
  church_rate: number;
  stock: number;
}

interface Batch {
  id: string;
  name: string;
  cutoff_date: string;
}

interface Cake {
  id: string;
  name: string;
  cake_variants: Variant[];
}

export default function ProductConfigurator({ cake, batches }: { cake: Cake; batches: Batch[] }) {
  const { addItem, batchId, setBatchId } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Default to first batch if global batch isn't set yet
  const activeBatchId = batchId || batches[0]?.id || "";

  const handleQuantityChange = (variantId: string, delta: number, maxStock: number) => {
    setQuantities((prev) => {
      const current = prev[variantId] || 0;
      const updated = Math.max(0, Math.min(maxStock, current + delta));
      if (updated === 0) {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      }
      return { ...prev, [variantId]: updated };
    });
  };

  const totalPrice = cake.cake_variants.reduce((sum, variant) => {
    const qty = quantities[variant.id] || 0;
    return sum + variant.mrp * qty;
  }, 0);

  const totalItemsCount = Object.values(quantities).reduce((a, b) => a + b, 0);
  const isCartEmpty = totalItemsCount === 0;

  const handleAddToCart = () => {
    if (isCartEmpty) return;

    // Set batch globally in cart context
    setBatchId(activeBatchId);

    // Add each selected variant quantity to the cart
    cake.cake_variants.forEach((variant) => {
      const qty = quantities[variant.id] || 0;
      if (qty > 0) {
        addItem({
          cakeId: cake.id,
          cakeName: cake.name,
          variantId: variant.id,
          weight: variant.weight,
          mrp: variant.mrp,
          churchRate: variant.church_rate,
          quantity: qty,
        });
      }
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 2000);
  };

  return (
    <div className="flex flex-col justify-between bg-secondary/30 p-6 rounded-xl border border-border">
      <div className="space-y-6">
        {/* Delivery Batch Selection */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            Select Delivery Batch
          </label>
          <select
            value={activeBatchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full bg-white border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} (Cutoff: {batch.cutoff_date})
              </option>
            ))}
          </select>
        </div>

        {/* Multi-Variant Weight & Quantity Selection */}
        <div>
          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent" />
            Select Weights & Quantities
          </label>
          
          <div className="space-y-3">
            {cake.cake_variants.map((variant) => {
              const qty = quantities[variant.id] || 0;
              const isSoldOut = variant.stock <= 0;

              return (
                <div 
                  key={variant.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border bg-white transition-all ${
                    qty > 0 ? "border-primary shadow-xs ring-1 ring-primary/10" : "border-border"
                  }`}
                >
                  <div>
                    <span className="font-medium text-sm text-foreground block">{variant.weight}</span>
                    <span className="text-xs text-muted">₹{variant.mrp.toFixed(2)} each</span>
                    {isSoldOut && <span className="text-xs text-red-500 block">Sold Out</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(variant.id, -1, variant.stock)}
                          className="w-8 h-8 rounded-md border border-border bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-sans font-semibold text-sm w-6 text-center tabular-nums">
                          {qty}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(variant.id, 1, variant.stock)}
                          disabled={qty >= variant.stock}
                          className="w-8 h-8 rounded-md border border-border bg-secondary/50 flex items-center justify-center text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleQuantityChange(variant.id, 1, variant.stock)}
                        disabled={isSoldOut}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary & Add to Cart Action */}
      <div className="mt-8 pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs text-muted block">Selected Items: {totalItemsCount}</span>
            <span className="text-sm font-semibold text-foreground">Combined Total</span>
          </div>
          <span className="font-sans font-bold text-2xl tabular-nums text-foreground">
            ₹{totalPrice.toFixed(2)}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isCartEmpty || addedAnimation}
          className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm ${
            addedAnimation
              ? "bg-green-600 text-white"
              : isCartEmpty
              ? "bg-secondary text-muted cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {addedAnimation ? (
            <>
              <Check className="w-4 h-4" /> Added to Cart Successfully!
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              {isCartEmpty ? "Select Quantities to Add" : `Add ${totalItemsCount} Item(s) to Cart`}
            </>
          )}
        </button>
      </div>
    </div>
  );
}