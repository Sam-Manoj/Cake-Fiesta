"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShoppingBag, Phone, User, Calendar, Layers, Plus, Minus, Check, LogOut, ArrowRight, Trash2, History, X, Menu, Filter, CreditCard, Upload } from "lucide-react";

export const cakeImageMap: Record<string, string> = {
  "christmas-cake-hero": "/christmas-cake-hero.png",
  "Carrot & Dates Cake": "/Carrot & Dates Cake.png",
  "Chocolate Cake": "/Chocolate Cake.png",
  "Coconut Cake": "/Coconut Cake.png",
  "Date & Walnut Cake": "/Date & Walnut Cake.png",
  "Marble Cake": "/Marble Cake.png",
  "Mawa Cake": "/Mawa Cake.png",
  "Pineapple Cake": "/Pineapple Cake.png",
  "Butterscotch Cake": "/Butterscotch cake.png",
  "Plum Cake": "/Plum Cake.png",
  "Dates Plum Cake": "/Dates Plum Cake.png",
  "Jackfruit Cake": "/Jackfruit Cake.png",
};

export function getCakeImage(cakeName: string): string {
  return cakeImageMap[cakeName] || "/placeholder-cake.png";
}

interface Variant {
  id: string;
  weight: string;
  mrp: number;
  egg_type: string;
}

interface Cake {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shelf_life: string;
  cake_variants: Variant[];
}

interface Batch {
  id: string;
  name: string;
  cutoff_date: string;
  date?: string;
}

interface CartItem {
  cakeId: string;
  cakeName: string;
  variantId: string;
  weight: string;
  eggType: string;
  mrp: number;
  quantity: number;
}

async function compressImage(file: File, maxSizeMB = 3): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        const maxDimension = 1600;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas blob compression failed."));
                return;
              }
              if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.1) {
                resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
              } else {
                quality -= 0.1;
                tryCompress();
              }
            },
            "image/jpeg",
            quality
          );
        };
        tryCompress();
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export default function StorefrontPage() {
  const [cakes, setCakes] = useState<Cake[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedShape, setSelectedShape] = useState<string>("all");
  const [selectedEggType, setSelectedEggType] = useState<string>("all");

  const [customer, setCustomer] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({});
  const [batchId, setBatchId] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cake_customer");
    if (saved) {
      try { setCustomer(JSON.parse(saved)); } catch (e) { console.error(e); }
    }

    async function fetchData() {
      const { data: cakeData } = await supabase.from("cakes").select("*, cake_variants(id, weight, mrp, egg_type)").order("name");
      const { data: batchData } = await supabase
        .from("batches")
        .select("*")
        .eq("is_active", true)
        .order("cutoff_date", { ascending: true });
      
      if (cakeData) setCakes(cakeData);
      if (batchData) {
        setBatches(batchData);
        if (batchData[0]) setBatchId(batchData[0].id);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setAuthLoading(true);
    try {
      let { data: found } = await supabase.from("customers").select("*").eq("phone", cleanPhone).maybeSingle();
      if (!found) {
        if (!isRegistering) {
          setIsRegistering(true);
          setAuthLoading(false);
          return;
        }
        if (!name.trim()) {
          setAuthError("Please enter your full name.");
          setAuthLoading(false);
          return;
        }
        const { data: created, error } = await supabase.from("customers").insert([{ phone: cleanPhone, name: name.trim() }]).select().single();
        if (error) throw error;
        found = created;
      }
      localStorage.setItem("cake_customer", JSON.stringify(found));
      setCustomer(found);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cake_customer");
    setCustomer(null);
    setShowHistory(false);
  };

  const fetchOrderHistory = async () => {
    if (!customer) return;
    setHistoryLoading(true);
    setShowHistory(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_amount,
          payment_mode,
          created_at,
          batches!orders_batch_id_fkey (name, cutoff_date, date),
          order_items (
            quantity,
            unit_price,
            cakes (name),
            cake_variants (weight, egg_type)
          ),
          payments (id, screenshot_url, payment_mode)
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (err: any) {
      console.error("Order history fetch error:", err);
      alert("Failed to load order history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleQuantityChange = (cakeId: string, variantId: string, delta: number) => {
    setQuantities((prev) => {
      const cakeQtys = prev[cakeId] || {};
      const current = cakeQtys[variantId] || 0;
      const updated = Math.max(0, current + delta);
      
      const newCakeQtys = { ...cakeQtys, [variantId]: updated };
      if (updated === 0) delete newCakeQtys[variantId];

      return { ...prev, [cakeId]: newCakeQtys };
    });
  };
  
  const handleAddToCart = (cake: Cake) => {
    const cakeQtys = quantities[cake.id] || {};
    const newItems = [...cartItems];

    cake.cake_variants.forEach((v) => {
      const qty = cakeQtys[v.id] || 0;
      if (qty > 0) {
        const existingIdx = newItems.findIndex((i) => i.variantId === v.id);
        if (existingIdx > -1) {
          newItems[existingIdx].quantity += qty;
        } else {
          newItems.push({
            cakeId: cake.id,
            cakeName: cake.name,
            variantId: v.id,
            weight: v.weight,
            eggType: v.egg_type || "Egg",
            mrp: v.mrp,
            quantity: qty,
          });
        }
      }
    });

    setCartItems(newItems);
    setQuantities((prev) => ({ ...prev, [cake.id]: {} }));
  };

  const removeCartItem = (variantId: string) => {
    setCartItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const totalCartAmount = cartItems.reduce((sum, i) => sum + i.mrp * i.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!customer || cartItems.length === 0) return;
    
    if (paymentMode === "UPI" && !paymentScreenshot) {
      alert("Please upload your UPI payment screenshot to proceed.");
      return;
    }

    setCheckoutLoading(true);

    try {
      const { data: order, error: orderErr } = await supabase.from("orders").insert([{
        customer_id: customer.id,
        batch_id: batchId || null,
        status: "pending",
        total_amount: totalCartAmount,
        payment_mode: paymentMode,
      }]).select().single();

      if (orderErr) throw orderErr;

      const itemsPayload = cartItems.map((i) => ({
        order_id: order.id,
        cake_id: i.cakeId,
        variant_id: i.variantId,
        quantity: i.quantity,
        unit_price: i.mrp,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      let screenshotUrl = null;

      if (paymentMode === "UPI" && paymentScreenshot) {
        const compressedFile = await compressImage(paymentScreenshot, 3);
        const fileName = `${customer.id}_${order.id}.jpg`;
        
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, compressedFile, { upsert: true });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from("payment-proofs")
            .getPublicUrl(fileName);
          
          screenshotUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        }
      }

      const { error: paymentErr } = await supabase.from("payments").insert([{
        order_id: order.id,
        customer_id: customer.id,
        payment_mode: paymentMode,
        screenshot_url: screenshotUrl,
        amount: totalCartAmount,
        status: "pending"
      }]);

      if (paymentErr) throw paymentErr;

      setCartItems([]);
      setPaymentScreenshot(null);
      setOrderPlaced(true);
    } catch (err: any) {
      alert(err.message || "Failed to place order.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const filteredCakes = cakes.map((cake) => {
    const filteredVariants = cake.cake_variants.filter((v) => {
      const cakeNameLower = cake.name.toLowerCase();
      let matchesShape = true;
      if (selectedShape === "Square") {
        matchesShape = cakeNameLower.includes("butterscotch") || cakeNameLower.includes("pineapple");
      } else if (selectedShape === "Round") {
        matchesShape = cakeNameLower.includes("plum") || cakeNameLower.includes("marble");
      } else if (selectedShape === "Slice") {
        matchesShape = v.weight.toLowerCase().includes("400");
      }
      
      const matchesEgg = selectedEggType === "all" || (v.egg_type && v.egg_type.toLowerCase() === selectedEggType.toLowerCase());
      return matchesShape && matchesEgg;
    });
    return { ...cake, filteredVariants };
  }).filter((cake) => cake.filteredVariants.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBE9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#8F0500] border-t-transparent" />
          <p className="font-serif text-xl text-[#562400]">Preparing something sweet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBE9] text-[#562400] pb-16 selection:bg-[#8F0500] selection:text-[#FFFBE9]">
      <header className="sticky top-0 z-40 border-b border-[#562400]/10 bg-[#FFFBE9]/95 backdrop-blur-md">
        <div className="relative mx-auto flex min-h-[68px] max-w-[1400px] items-center justify-between gap-2 px-3 sm:px-5 lg:h-[76px] lg:px-10">
          <button
            type="button"
            onClick={() => setShowMobileMenu((open) => !open)}
            aria-label="Open navigation menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#562400]/15 text-[#044529] transition-colors hover:bg-[#FFECC5] lg:hidden"
          >
            {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <a href="#" className="min-w-0 flex-1 text-center lg:absolute lg:left-1/2 lg:flex-none lg:-translate-x-1/2">
            <span className="block whitespace-nowrap font-serif text-[18px] font-black leading-[0.9] tracking-[-0.07em] text-[#044529] min-[380px]:text-[21px] sm:text-[25px] lg:text-[30px]">
              CAKE FIESTA
            </span>
            <span className="mt-1.5 hidden whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.2em] text-[#562400] min-[380px]:block sm:text-[8px] sm:tracking-[0.34em]">
              Altar Angels · Christmas 2026
            </span>
          </a>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-3 lg:gap-6">
            {customer ? (
              <>
                <button onClick={fetchOrderHistory} className="hidden items-center gap-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.13em] hover:text-[#8F0500] sm:flex">
                  <History className="h-4 w-4" /> Orders
                </button>
                <div className="flex max-w-[112px] items-center gap-1.5 rounded-full bg-[#FFECC5] px-2 py-2 text-[10px] sm:max-w-none sm:gap-2 sm:px-3 sm:text-[11px]">
                  <User className="h-3.5 w-3.5 shrink-0 text-[#044529]" />
                  <span className="max-w-[52px] truncate font-semibold sm:max-w-[90px]">{customer.name}</span>
                  <button onClick={handleLogout} title="Logout" aria-label="Logout" className="ml-0.5 shrink-0 text-[#562400]/60 hover:text-[#8F0500]">
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <a href="#signin" className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em] hover:text-[#8F0500] sm:text-[10px] sm:tracking-[0.13em]">Sign in</a>
            )}
            <a href="#cart" aria-label="Shopping cart" className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] hover:text-[#8F0500] sm:gap-2">
              <ShoppingBag className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Cart</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#8F0500] px-1.5 text-[10px] text-[#FFFBE9]">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </a>
          </div>
        </div>

        {showMobileMenu && (
          <nav className="border-t border-[#562400]/10 bg-[#FFFBE9] px-4 py-3 shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-[1400px] flex-col">
              <a href="#shop" onClick={() => setShowMobileMenu(false)} className="border-b border-[#562400]/[0.07] py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#562400]">Shop</a>
              {customer && (
                <button onClick={() => { setShowMobileMenu(false); fetchOrderHistory(); }} className="py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[#562400]">
                  Order history
                </button>
              )}
            </div>
          </nav>
        )}
      </header>

      {showHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#562400]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-xl space-y-6 overflow-y-auto rounded-[28px] border border-[#562400]/10 bg-[#FFFBE9] p-6 shadow-2xl md:p-8">
            <div className="flex items-center justify-between border-b border-[#562400]/15 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8F0500]">Your account</p>
                <h3 className="mt-1 font-serif text-3xl text-[#562400]">Order history</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="rounded-full p-2 hover:bg-[#FFECC5]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {historyLoading ? (
              <p className="py-8 text-center text-sm text-[#562400]/60">Loading your orders...</p>
            ) : customerOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#562400]/60">No previous orders found.</p>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((ord) => (
                  <div key={ord.id} className="space-y-3 rounded-2xl border border-[#562400]/10 bg-[#FFECC5]/40 p-5">
                    <div className="flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold">Order ID: {ord.id.slice(0, 8)}...</span>
                        <span className="mt-1 block text-[#562400]/60">Date: {new Date(ord.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${ord.status === "verified" ? "bg-[#044529]/10 text-[#044529]" : "border border-[#562400]/10 bg-[#FFFBE9] text-[#562400]"}`}>
                        {ord.status}
                      </span>
                    </div>
                    {ord.batches && (
                      <div className="rounded-xl border border-[#562400]/10 bg-[#FFFBE9] p-3 text-xs text-[#562400]/70">
                        <strong className="text-[#562400]">Delivery batch:</strong> {ord.batches.name} · Cutoff: {ord.batches.cutoff_date}
                      </div>
                    )}
                    <div className="text-xs font-semibold text-[#562400]">
                      Payment Mode: <span className="uppercase text-[#8F0500]">{ord.payment_mode || "UPI"}</span>
                    </div>
                    <div className="space-y-2 border-t border-[#562400]/10 pt-3">
                      {ord.order_items?.map((item: any, idx: number) => {
                        const isEggless = item.cake_variants?.egg_type && item.cake_variants.egg_type.toLowerCase() === "eggless";
                        return (
                          <div key={idx} className="flex justify-between gap-3 text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{item.cakes?.name}</span>
                                {item.cake_variants?.egg_type && (
                                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                    isEggless ? "bg-[#044529]/10 text-[#044529]" : "bg-[#8F0500]/10 text-[#8F0500]"
                                  }`}>
                                    {item.cake_variants.egg_type}
                                  </span>
                                )}
                              </div>
                              <span className="block text-[11px] text-[#562400]/60">{item.cake_variants?.weight || "Standard"}</span>
                            </div>
                            <span className="font-semibold tabular-nums">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between border-t border-[#562400]/10 pt-3 text-sm font-bold">
                      <span>Total amount</span>
                      <span className="text-[#8F0500]">₹{ord.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main>
        <section className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 md:px-10 lg:px-14 lg:py-12">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[minmax(180px,1fr)_minmax(180px,1fr)] md:gap-4 lg:grid-rows-[220px_220px]">
            <div className="col-span-2 row-span-1 overflow-hidden rounded-2xl bg-[#ad010b] shadow-sm md:row-span-2">
              <img src="/6.png" alt="Cake Fiesta Christmas logo" className="aspect-square h-full w-full object-contain md:aspect-auto" />
            </div>
            <div className="col-span-2 overflow-hidden rounded-2xl bg-[#005f2c] shadow-sm">
              <img src="/10.png" alt="Bulk orders of tin-box packaging available" className="aspect-[16/9] h-full w-full object-contain md:aspect-auto" />
            </div>
            <div className="overflow-hidden rounded-2xl bg-[#005f2c] shadow-sm">
              <img src="/8.png" alt="Special discounts available on bulk orders" className="aspect-[4/3] h-full w-full object-contain md:aspect-auto" />
            </div>
            <div className="overflow-hidden rounded-2xl bg-[#090428] shadow-sm">
              <img src="/9.png" alt="Make this Christmas merrier, brighter and sweeter" className="aspect-[4/3] h-full w-full object-contain md:aspect-auto" />
            </div>
          </div>
        </section>

        <section id="shop" className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
          <div className="mb-9 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8F0500]">The Christmas collection</p>
              <h2 className="max-w-xs font-serif text-4xl font-black leading-[0.98] text-[#044529] md:text-5xl">
                Good things come in cake.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-[#FFECC5] p-3 rounded-2xl border border-[#562400]/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#044529] px-2">
                <Filter className="h-3.5 w-3.5" /> Filter by:
              </div>
              <select
                value={selectedShape}
                onChange={(e) => setSelectedShape(e.target.value)}
                className="rounded-xl border border-[#562400]/15 bg-[#FFFBE9] px-3 py-2 text-xs font-semibold text-[#562400] outline-none"
              >
                <option value="all">All Shapes / Types</option>
                <option value="Slice">Slice</option>
                <option value="Round">Round (Plum, Marble)</option>
                <option value="Square">Square (Butterscotch, Pineapple)</option>
              </select>

              <select
                value={selectedEggType}
                onChange={(e) => setSelectedEggType(e.target.value)}
                className="rounded-xl border border-[#562400]/15 bg-[#FFFBE9] px-3 py-2 text-xs font-semibold text-[#562400] outline-none"
              >
                <option value="all">All Egg Types</option>
                <option value="Egg">Egg</option>
                <option value="Eggless">Eggless</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCakes.map((cake) => {
              const cakeQtys = quantities[cake.id] || {};
              const cakeTotalQty = Object.values(cakeQtys).reduce((a, b) => a + b, 0);
              const cakeImgSrc = getCakeImage(cake.name);
              return (
                <article key={cake.id} className="group flex flex-col overflow-hidden rounded-[22px] border border-[#562400]/[0.07] bg-[#FFECC5]/55 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative w-full aspect-square overflow-hidden bg-[#E9D8B8]">
                    <img src={cakeImgSrc} alt={cake.name} className="h-full w-full object-cover aspect-square drop-shadow-md group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute left-4 top-4 rounded-full bg-[#FFFBE9]/90 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#044529] backdrop-blur">
                      {cake.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <div className="flex-1">
                      <h3 className="font-serif text-2xl font-bold leading-tight text-[#044529]">{cake.name}</h3>
                      <p className="mt-2 min-h-[40px] text-xs leading-5 text-[#562400]/70">{cake.description}</p>
                      <p className="mt-3 text-[10px] text-[#562400]/60">
                        <span className="font-bold uppercase tracking-wider">Shelf life:</span> {cake.shelf_life}
                      </p>
                      <div className="my-5 h-px bg-[#562400]/10" />
                      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#044529]">
                        <Layers className="h-3.5 w-3.5" /> Variants & quantities
                      </div>
                      <div className="space-y-2">
                        {cake.filteredVariants.map((v) => {
                          const qty = cakeQtys[v.id] || 0;
                          const isEggless = v.egg_type && v.egg_type.toLowerCase() === "eggless";
                          return (
                            <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#562400]/10 bg-[#FFFBE9]/75 px-3 py-2.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="block text-xs font-bold text-[#562400]">{v.weight}</span>
                                  {v.egg_type && (
                                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                      isEggless ? "bg-[#044529]/10 text-[#044529]" : "bg-[#8F0500]/10 text-[#8F0500]"
                                    }`}>
                                      {v.egg_type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] tabular-nums text-[#562400]/65">MRP: ₹{v.mrp.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {qty > 0 ? (
                                  <>
                                    <button onClick={() => handleQuantityChange(cake.id, v.id, -1)} aria-label="Decrease" className="flex h-7 w-7 items-center justify-center rounded-full border border-[#562400]/20 hover:bg-[#FFECC5]">
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-4 text-center text-xs font-bold tabular-nums">{qty}</span>
                                    <button onClick={() => handleQuantityChange(cake.id, v.id, 1)} aria-label="Increase" className="flex h-7 w-7 items-center justify-center rounded-full border border-[#562400]/20 hover:bg-[#FFECC5]">
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => handleQuantityChange(cake.id, v.id, 1)} className="rounded-full bg-[#044529]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#044529] transition hover:bg-[#044529] hover:text-[#FFFBE9]">
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddToCart(cake)}
                      disabled={cakeTotalQty === 0}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#8F0500] py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFFBE9] transition hover:bg-[#720400] disabled:opacity-35"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {cakeTotalQty === 0 ? "Choose a quantity" : `Add ${cakeTotalQty} to cart`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {!customer && (
          <section id="signin" className="mx-auto max-w-3xl px-5 py-16 md:py-20">
            <div className="grid overflow-hidden rounded-[26px] border border-[#562400]/10 bg-[#FFECC5]/60 md:grid-cols-[0.8fr_1.2fr]">
              <div className="flex flex-col justify-center bg-[#044529] p-7 text-[#FFFBE9] md:p-9">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#FFECC5]">Your festive order</p>
                <h2 className="mt-3 font-serif text-3xl font-bold leading-tight">A sweet little step before checkout.</h2>
                <p className="mt-3 text-xs leading-5 text-[#FFFBE9]/75">Use your mobile number to find your account or create one.</p>
              </div>
              <div className="p-7 md:p-9">
                <h3 className="font-serif text-2xl font-bold text-[#562400]">Customer sign in</h3>
                <p className="mb-6 mt-2 text-xs leading-5 text-[#562400]/65">Enter your 10-digit mobile number to continue.</p>
                {authError && <div className="mb-4 rounded-xl border border-[#8F0500]/20 bg-[#8F0500]/10 p-3 text-xs text-[#8F0500]">{authError}</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#562400]">
                      <Phone className="h-3.5 w-3.5 text-[#044529]" /> Mobile number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-xl border border-r-0 border-[#562400]/15 bg-[#FFFBE9] px-4 text-xs text-[#562400]/60">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className="w-full rounded-r-xl border border-[#562400]/15 bg-[#FFFBE9] p-3.5 text-sm tabular-nums outline-none"
                      />
                    </div>
                  </div>
                  {isRegistering && (
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#562400]">
                        <User className="h-3.5 w-3.5 text-[#044529]" /> Full name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-[#562400]/15 bg-[#FFFBE9] p-3.5 text-sm outline-none"
                      />
                    </div>
                  )}
                  <button type="submit" disabled={authLoading || phone.length !== 10} className="flex w-full items-center justify-center gap-3 rounded-md bg-[#8F0500] py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFFBE9] transition hover:bg-[#720400] disabled:opacity-40">
                    {authLoading ? "Please wait..." : isRegistering ? "Complete registration" : "Continue with phone"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {customer && (
          <section id="cart" className="mx-auto max-w-3xl scroll-mt-28 px-5 py-16 md:py-20">
            <div className="overflow-hidden rounded-[26px] border border-[#562400]/10 bg-[#FFECC5]/60">
              <div className="flex items-center justify-between gap-4 bg-[#044529] px-6 py-6 text-[#FFFBE9] md:px-8">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#FFECC5]">Your selection</p>
                  <h2 className="mt-1 font-serif text-3xl font-bold">The cake basket</h2>
                </div>
                <ShoppingBag className="h-7 w-7 text-[#FFECC5]" />
              </div>
              <div className="space-y-6 p-6 md:p-8">
                {orderPlaced ? (
                  <div className="space-y-4 py-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#044529]/10 text-[#044529]">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="font-serif text-3xl font-bold text-[#044529]">Your order is in!</h3>
                    <p className="text-sm text-[#562400]/65">Thank you for supporting our parish cake fiesta.</p>
                    <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                      <button onClick={() => setOrderPlaced(false)} className="flex-1 rounded-md bg-[#FFECC5] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#562400]">Continue shopping</button>
                      <button onClick={() => { setOrderPlaced(false); fetchOrderHistory(); }} className="flex-1 rounded-md bg-[#8F0500] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#FFFBE9]">View order history</button>
                    </div>
                  </div>
                ) : cartItems.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShoppingBag className="mx-auto h-8 w-8 text-[#044529]/50" />
                    <p className="mt-3 font-serif text-xl font-bold text-[#044529]">Your basket is waiting.</p>
                    <p className="mt-2 text-xs text-[#562400]/60">Choose your favourite cakes above to get started.</p>
                    <a href="#shop" className="mt-5 inline-flex items-center gap-2 border-b border-[#8F0500] pb-1 text-[10px] font-bold uppercase tracking-wider text-[#8F0500]">Browse cakes <ArrowRight className="h-3 w-3" /></a>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {/* Payment Mode Selector */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#562400]">
                          <CreditCard className="h-4 w-4 text-[#044529]" /> Select payment mode
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {["UPI", "Cash"].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setPaymentMode(mode);
                                if (mode === "Cash") setPaymentScreenshot(null);
                              }}
                              className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                paymentMode === mode
                                  ? "bg-[#044529] text-[#FFFBE9] border-[#044529] shadow-xs"
                                  : "bg-[#FFFBE9] text-[#562400] border-[#562400]/20 hover:bg-[#FFECC5]/50"
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* UPI Payment Flow */}
                      {paymentMode === "UPI" && totalCartAmount > 0 && (
                        <div className="space-y-3 rounded-2xl border border-[#562400]/15 bg-[#FFFBE9] p-4 text-center">
                          <p className="text-xs font-bold text-[#044529] uppercase tracking-wider">UPI Payment Details</p>
                          <p className="text-[11px] text-[#562400]/70">Payee: <strong className="text-[#562400]">Emmanuval Anthony</strong> (UPI ID: <code className="bg-[#FFECC5] px-1.5 py-0.5 rounded text-[#8F0500]">emmanuvalanthony2@oksbi</code>)</p>

                          <div className="my-3 hidden sm:flex flex-col items-center justify-center space-y-2">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-[#562400]/10">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                  `upi://pay?pa=emmanuvalanthony2@oksbi&pn=Emmanuval%20Anthony&am=${totalCartAmount.toFixed(2)}&cu=INR`
                                )}`}
                                alt="Scan to pay via UPI"
                                className="h-44 w-44 object-contain"
                              />
                            </div>
                            <p className="text-[10px] text-[#562400]/60">Scan with GPay, PhonePe, Paytm or any UPI app on PC</p>
                          </div>

                          <div className="space-y-2 pt-1 sm:hidden">
                            <p className="text-[10px] font-bold uppercase text-[#562400]/70">Tap to pay with your phone app:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { name: "Google Pay", scheme: `tez://upi/pay?pa=emmanuvalanthony2@oksbi&pn=Emmanuval%20Anthony&am=${totalCartAmount.toFixed(2)}&cu=INR` },
                                { name: "PhonePe", scheme: `phonepe://pay?pa=emmanuvalanthony2@oksbi&pn=Emmanuval%20Anthony&am=${totalCartAmount.toFixed(2)}&cu=INR` },
                                { name: "Paytm", scheme: `paytmmp://pay?pa=emmanuvalanthony2@oksbi&pn=Emmanuval%20Anthony&am=${totalCartAmount.toFixed(2)}&cu=INR` },
                                { name: "Any UPI App", scheme: `upi://pay?pa=emmanuvalanthony2@oksbi&pn=Emmanuval%20Anthony&am=${totalCartAmount.toFixed(2)}&cu=INR` },
                              ].map((app) => (
                                <a
                                  key={app.name}
                                  href={app.scheme}
                                  className="rounded-xl bg-[#044529] py-2.5 px-3 text-[11px] font-bold text-[#FFFBE9] shadow-xs hover:bg-[#033620] block text-center"
                                >
                                  Pay via {app.name}
                                </a>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-[#562400]/10 text-left">
                            <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#562400] mb-1.5">
                              <Upload className="inline h-3.5 w-3.5 mr-1 text-[#044529]" /> Upload Payment Screenshot * <span className="text-[#8F0500]">(Required)</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              required
                              onChange={(e) => {
                                if (e.target.files?.[0]) setPaymentScreenshot(e.target.files[0]);
                              }}
                              className="w-full text-xs text-[#562400] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#044529] file:text-[#FFFBE9] hover:file:bg-[#033620]"
                            />
                            {paymentScreenshot && (
                              <p className="mt-1 text-[10px] text-[#044529] font-medium">Selected: {paymentScreenshot.name}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delivery Batch Selector */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#562400]">
                          <Calendar className="h-4 w-4 text-[#044529]" /> Select delivery batch
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {batches.slice(0, 2).map((b, index) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setBatchId(b.id)}
                              aria-pressed={batchId === b.id}
                              className={`relative flex min-h-[88px] flex-col items-start justify-center rounded-xl border p-4 text-left transition-all ${
                                batchId === b.id
                                  ? "border-[#044529] bg-[#044529] text-[#FFFBE9] shadow-sm"
                                  : "border-[#562400]/15 bg-[#FFFBE9] text-[#562400] hover:border-[#044529]/50 hover:bg-[#FFECC5]/50"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase tracking-wider">{b.name}</span>
                              <span className={`mt-2 text-[10px] ${batchId === b.id ? "text-[#FFFBE9]/80" : "text-[#562400]/60"}`}>
                                Cutoff: {b.cutoff_date}
                              </span>
                              {batchId === b.id && (
                                <Check className="absolute right-3 top-3 h-4 w-4" />
                              )}
                            </button>
                          ))}
                        </div>
                        {batches.length === 0 && (
                          <p className="text-xs text-[#8F0500]">No delivery batches are currently available.</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-y border-[#562400]/10 py-4">
                      {cartItems.map((item) => {
                        const isCartEggless = item.eggType && item.eggType.toLowerCase() === "eggless";
                        return (
                          <div key={item.variantId} className="flex items-center justify-between gap-3 rounded-xl bg-[#FFFBE9]/80 p-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="block text-xs font-bold text-[#562400]">{item.cakeName}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                  isCartEggless ? "bg-[#044529]/10 text-[#044529]" : "bg-[#8F0500]/10 text-[#8F0500]"
                                }`}>
                                  {item.eggType}
                                </span>
                              </div>
                              <span className="mt-1 block text-[10px] text-[#562400]/60">{item.weight} × {item.quantity}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold tabular-nums">₹{(item.mrp * item.quantity).toFixed(2)}</span>
                              <button onClick={() => removeCartItem(item.variantId)} aria-label="Remove item" className="rounded-lg p-2 text-[#562400]/45 hover:bg-[#8F0500]/10 hover:text-[#8F0500]">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider">Total payable</span>
                      <span className="font-serif text-3xl font-bold text-[#8F0500]">₹{totalCartAmount.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={checkoutLoading || !batchId || (paymentMode === "UPI" && !paymentScreenshot)}
                      className="flex w-full items-center justify-center gap-3 rounded-md bg-[#8F0500] py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#FFFBE9] shadow-sm transition hover:bg-[#720400] disabled:opacity-40"
                    >
                      {checkoutLoading ? "Processing..." : paymentMode === "UPI" && !paymentScreenshot ? "Upload Screenshot to Place Order" : "Confirm & place order"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-[#562400] px-5 py-10 text-[#FFFBE9] md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-[1.2fr_1fr_1fr] md:items-end">
          <div>
            <p className="font-serif text-3xl font-black tracking-[-0.04em]">CAKE FIESTA</p>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#FFECC5]">Altar Angels · Christmas 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}