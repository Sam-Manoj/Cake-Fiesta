"use client";
import { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  cakeId: string;
  cakeName: string;
  variantId: string;
  weight: string;
  mrp: number;
  churchRate: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  batchId: string;
  setBatchId: (id: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [batchId, setBatchId] = useState<string>("");

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variantId === newItem.variantId);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += newItem.quantity;
        return copy;
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, batchId, setBatchId, addItem, removeItem, clearCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}