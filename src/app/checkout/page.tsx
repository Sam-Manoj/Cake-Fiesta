"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase/client";
import { ShoppingBag, CheckCircle, ArrowRight, Trash2 } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, batchId, totalAmount, removeItem, clearCart } = useCart();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedCustomer = localStorage.getItem("cake_customer");
    if (!savedCustomer) {
      router.push("/login");
      return;
    }
    setCustomer(JSON.parse(savedCustomer));
  }, [router]);

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setError("");

    try {
      // 1. Create the main order record
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            customer_id: customer.id,
            batch_id: batchId || null,
            status: "pending",
            total_amount: totalAmount,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert all individual variant order items
      const orderItemsPayload = items.map((item) => ({
        order_id: order.id,
        cake_id: item.cakeId,
        quantity: item.quantity,
        unit_price: item.mrp, // Customer storefront price
        // Note: churchRate is stored silently for backend fundraising analytics reference
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      clearCart();
      setOrderPlaced(true);
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-border p-8 rounded-2xl shadow-sm space-y-4">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="font-serif text-2xl font-medium">Order Placed Successfully!</h1>
          <p className="text-sm text-muted">Thank you for supporting our parish cake fiesta. We will notify you once verified.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Storefront
          </button>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white border border-border p-8 rounded-2xl shadow-sm space-y-4">
          <ShoppingBag className="w-12 h-12 text-muted mx-auto" />
          <h1 className="font-serif text-2xl font-medium">Your Cart is Empty</h1>
          <p className="text-sm text-muted">Select some delicious cakes from the catalogue to get started.</p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse Catalogue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <div className="bg-white border border-border p-8 rounded-2xl shadow-sm">
        <h1 className="font-serif text-2xl font-medium mb-1">Review & Checkout</h1>
        <p className="text-sm text-muted mb-6">
          Logged in as <span className="font-semibold text-foreground">{customer?.name}</span> (+91 {customer?.phone})
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Cart Items List */}
        <div className="space-y-4 border-t border-b border-border py-4 mb-6 max-h-72 overflow-y-auto">
          {items.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-sm text-foreground">{item.cakeName}</h4>
                <span className="text-xs text-muted">{item.weight} × {item.quantity}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-sans font-medium text-sm tabular-nums">
                  ₹{(item.mrp * item.quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem(item.variantId)}
                  className="text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold text-foreground">Total Payable</span>
          <span className="font-sans font-bold text-xl tabular-nums text-foreground">
            ₹{totalAmount.toFixed(2)}
          </span>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full py-3 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? "Processing Order..." : "Confirm & Place Order"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}