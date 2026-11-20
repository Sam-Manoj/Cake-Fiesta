"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShieldCheck, TrendingUp, Package, CheckCircle, Clock, Filter, XCircle, Download, FileSpreadsheet, Lock, User, LogOut, KeyRound, CreditCard, Eye, X, MessageSquare } from "lucide-react";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  payment_mode: string;
  created_at: string;
  updated_by: string;
  customers: { name: string; phone: string };
  batches: { name: string; cutoff_date: string };
  order_items: { 
    quantity: number; 
    unit_price: number;
    cake_variants?: { weight: string; church_rate: number; egg_type: string };
    cakes: { name: string; category?: string };
  }[];
}

const ORDERS_PER_PAGE = 10;

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [profitEggFilter, setProfitEggFilter] = useState("all");
  const [profitTypeFilter, setProfitTypeFilter] = useState("all");
  const [profitWeightFilter, setProfitWeightFilter] = useState("all");

  useEffect(() => {
    const authStatus = sessionStorage.getItem("cake_admin_auth");
    const savedUser = sessionStorage.getItem("cake_admin_user");
    if (authStatus === "true" && savedUser) {
      setIsAuthenticated(true);
      setCurrentAdminUser(savedUser);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const cleanUsername = username.trim();
      const { data: staff, error } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("username", cleanUsername)
        .single();

      if (error || !staff || staff.password !== password.trim()) {
        setLoginError("Invalid admin username or password.");
      } else {
        sessionStorage.setItem("cake_admin_auth", "true");
        sessionStorage.setItem("cake_admin_user", cleanUsername);
        setCurrentAdminUser(cleanUsername);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setLoginError("Authentication failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    if (newPassword.trim().length < 6) {
      setPasswordMessage("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }

    try {
      const { error } = await supabase
        .from("staff_profiles")
        .update({ password: newPassword.trim() })
        .eq("username", currentAdminUser);

      if (error) throw error;
      setPasswordMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage("");
      }, 1500);
    } catch (err: any) {
      setPasswordMessage(err.message || "Failed to update password.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cake_admin_auth");
    sessionStorage.removeItem("cake_admin_user");
    setIsAuthenticated(false);
    setCurrentAdminUser("");
  };

const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        payment_mode,
        created_at,
        updated_by,
        customers (name, phone),
        batches (name, cutoff_date),
        order_items (
          quantity,
          unit_price,
          cakes (name),
          cake_variants (weight, church_rate, egg_type)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else if (data) {
      const formattedOrders = data.map((order: any) => ({
        ...order,
        customers: Array.isArray(order.customers) ? order.customers[0] : order.customers,
        batches: Array.isArray(order.batches) ? order.batches[0] : order.batches,
      }));
      setOrders(formattedOrders);
    }
    setLoading(false);
  };
  
  const handleViewScreenshot = async (orderId: string) => {
    setScreenshotLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("screenshot_url")
        .eq("order_id", orderId)
        .single();

      if (error || !data || !data.screenshot_url) {
        alert("No payment screenshot found for this order.");
      } else {
        setSelectedScreenshotUrl(data.screenshot_url);
      }
    } catch (err) {
      alert("Failed to retrieve payment screenshot.");
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'cancelled') {
      const confirmed = window.confirm("Are you sure you want to cancel this order?");
      if (!confirmed) return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ 
        status: newStatus,
        updated_by: currentAdminUser 
      })
      .eq("id", orderId);

    if (error) {
      alert(`Failed to update order status to ${newStatus}.`);
    } else {
      await supabase.from("verification_logs").insert([{ 
        order_id: orderId, 
        status: newStatus,
        updated_by: currentAdminUser
      }]);
      fetchOrders();
    }
  };

  const sendWhatsAppNotification = (order: Order) => {
    const customerPhone = order.customers?.phone || "9004900871";
    const paymentMode = order.payment_mode || "UPI";
    const batchName = order.batches?.name || "Selected Batch";
    const totalAmount = order.total_amount || 0;

    const itemsText = order.order_items
      ?.map((item, index) => {
        const cakeName = item.cakes?.name || "Cake";
        const variantWeight = item.cake_variants?.weight || "Standard";
        const eggType = item.cake_variants?.egg_type ? ` [${item.cake_variants.egg_type}]` : "";
        return `${index + 1}. ${cakeName} | ${variantWeight}${eggType} | Qty: ${item.quantity}`;
      })
      .join("\n");

    const message = 
      `Thank you for ordering from Cake Fiesta 2026!\n\n` +
      `Your order of:\n` +
      `${itemsText}\n\n` +
      `has been placed and the payment of ₹${totalAmount.toFixed(2)} is done via ${paymentMode}.\n\n` +
      `You can collect the cakes on ${batchName}.`;

    const desktopUrl = `whatsapp://send?phone=91${customerPhone}&text=${encodeURIComponent(message)}`;
    window.open(desktopUrl, "_self");
  };

  const filteredOrders = orders.filter(ord => {
    const matchesBatch = filterBatch === "all" || ord.batches?.name === filterBatch;
    const matchesStatus = filterStatus === "all" || ord.status === filterStatus;
    return matchesBatch && matchesStatus;
  });

  // Client-side pagination: display only 10 filtered orders at a time.
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  // Return to the first page whenever the batch or status filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBatch, filterStatus]);

  // Keep the current page valid if orders are removed or filters reduce results.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalOrdersCount = filteredOrders.length;
  const totalStorefrontRevenue = filteredOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0);
  const pendingCount = filteredOrders.filter(o => o.status === 'pending').length;
  const verifiedCount = filteredOrders.filter(o => o.status === 'verified').length;

  const exportOrdersCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders to export for the selected filter.");
      return;
    }

    const headers = ["Order ID", "Customer Name", "Phone", "Batch Name", "Cutoff Date", "Payment Mode", "Cake Name", "Weight", "Egg Type", "Quantity", "Unit Price (INR)", "Total Price (INR)", "Status", "Updated By", "Created At"];
    const rows: string[][] = [];

    filteredOrders.forEach(ord => {
      ord.order_items?.forEach(item => {
        const weight = item.cake_variants?.weight || "Standard";
        const eggType = item.cake_variants?.egg_type || "Egg";
        rows.push([
          ord.id,
          `"${ord.customers?.name || "Guest"}"`,
          `"${ord.customers?.phone || ""}"`,
          `"${ord.batches?.name || "Unassigned"}"`,
          ord.batches?.cutoff_date || "",
          `"${ord.payment_mode || "Cash"}"`,
          `"${item.cakes?.name || "Unknown Cake"}"`,
          `"${weight}"`,
          `"${eggType}"`,
          String(item.quantity),
          item.unit_price.toFixed(2),
          (item.unit_price * item.quantity).toFixed(2),
          ord.status,
          `"${ord.updated_by || "System"}"`,
          ord.created_at
        ]);
      });
    });

    downloadCSV(headers, rows, `orders_all_export_${filterBatch === 'all' ? 'all_batches' : filterBatch.replace(/\s+/g, '_')}.csv`);
  };

  const exportSlicesCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available for slice export.");
      return;
    }

    const aggregateMap: Record<string, { cakeName: string; eggStatus: string; totalQty: number }> = {};

    filteredOrders.forEach(ord => {
      if (ord.status === 'cancelled') return;
      ord.order_items?.forEach(item => {
        const weight = item.cake_variants?.weight || "";
        const cakeName = item.cakes?.name || "";
        const eggType = item.cake_variants?.egg_type || "Egg";
        const isSlice = weight.toLowerCase().includes("400") || weight.toLowerCase().includes("slice") || cakeName.toLowerCase().includes("slice");
        
        if (isSlice) {
          const key = `${cakeName}_${eggType}`;
          if (!aggregateMap[key]) {
            aggregateMap[key] = { cakeName, eggStatus: eggType, totalQty: 0 };
          }
          aggregateMap[key].totalQty += item.quantity;
        }
      });
    });

    const headers = ["Cake Name", "Egg / Eggless", "Total Quantity"];
    const rows: string[][] = [];

    Object.values(aggregateMap).forEach(item => {
      rows.push([
        `"${item.cakeName}"`,
        `"${item.eggStatus}"`,
        String(item.totalQty)
      ]);
    });

    if (rows.length === 0) {
      alert("No slice orders found for the current filter.");
      return;
    }

    downloadCSV(headers, rows, `slice_cakes_summary_${filterBatch === 'all' ? 'all_batches' : filterBatch.replace(/\s+/g, '_')}.csv`);
  };

  const exportRoundSquareCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available for round & square export.");
      return;
    }

    const aggregateMap: Record<string, { cakeName: string; numericWeight: string; eggStatus: string; totalQty: number }> = {};

    filteredOrders.forEach(ord => {
      if (ord.status === 'cancelled') return;
      ord.order_items?.forEach(item => {
        const weightStr = item.cake_variants?.weight || "";
        const cakeName = item.cakes?.name || "";
        const eggType = item.cake_variants?.egg_type || "Egg";
        const weightLower = weightStr.toLowerCase();

        const isRoundOrSquare = !weightLower.includes("400") && !weightLower.includes("slice");
        
        if (isRoundOrSquare) {
          const weightMatch = weightStr.match(/\d+g?/i);
          const numericWeight = weightMatch ? weightMatch[0] : weightStr;

          const key = `${cakeName}_${numericWeight}_${eggType}`;
          if (!aggregateMap[key]) {
            aggregateMap[key] = { cakeName, numericWeight, eggStatus: eggType, totalQty: 0 };
          }
          aggregateMap[key].totalQty += item.quantity;
        }
      });
    });

    const headers = ["Cake Name", "Weight", "Egg Type", "Total Quantity"];
    const rows: string[][] = [];

    Object.values(aggregateMap).forEach(item => {
      rows.push([
        `"${item.cakeName}"`,
        `"${item.numericWeight}"`,
        `"${item.eggStatus}"`,
        String(item.totalQty)
      ]);
    });

    if (rows.length === 0) {
      alert("No round or square cake orders found for the current filter.");
      return;
    }

    downloadCSV(headers, rows, `round_square_cakes_summary_${filterBatch === 'all' ? 'all_batches' : filterBatch.replace(/\s+/g, '_')}.csv`);
  };

  const exportFilteredProfitCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No data available for profit report export.");
      return;
    }

    const cakeMap: Record<string, { weight: string; eggType: string; totalQty: number; totalMRP: number; totalChurchRate: number }> = {};
    
    filteredOrders.forEach(ord => {
      if (ord.status === 'cancelled') return;
      ord.order_items?.forEach(item => {
        const cakeName = item.cakes?.name || "Unknown Cake";
        const weight = item.cake_variants?.weight || "Standard";
        const eggType = item.cake_variants?.egg_type || "Egg";
        const churchRate = item.cake_variants?.church_rate || item.unit_price * 0.85;
        
        const isEggless = eggType.toLowerCase() === "eggless";
        const isEgg = !isEggless;
        if (profitEggFilter === "egg" && !isEgg) return;
        if (profitEggFilter === "eggless" && !isEggless) return;

        const isSlice = weight.toLowerCase().includes("400") || weight.toLowerCase().includes("slice");
        const isRoundSquare = !isSlice;
        if (profitTypeFilter === "slice" && !isSlice) return;
        if (profitTypeFilter === "round_square" && !isRoundSquare) return;

        if (profitWeightFilter !== "all" && !weight.toLowerCase().includes(profitWeightFilter.toLowerCase())) return;

        const key = `${cakeName}_${weight}_${eggType}`;
        if (!cakeMap[key]) {
          cakeMap[key] = { weight, eggType, totalQty: 0, totalMRP: 0, totalChurchRate: 0 };
        }
        cakeMap[key].totalQty += item.quantity;
        cakeMap[key].totalMRP += item.unit_price * item.quantity;
        cakeMap[key].totalChurchRate += churchRate * item.quantity;
      });
    });

    const entries = Object.entries(cakeMap);
    if (entries.length === 0) {
      alert("No items match the selected profit export filters.");
      return;
    }

    const headers = ["Cake Name", "Weight / Variant", "Egg Type", "Total Quantity", "Total Storefront MRP (INR)", "Total Church Rate (INR)", "Estimated Profit (INR)"];
    const rows = entries.map(([key, stats]) => {
      const parts = key.split("_");
      const cakeName = parts[0];
      const profit = stats.totalMRP - stats.totalChurchRate;
      return [
        `"${cakeName}"`,
        `"${stats.weight}"`,
        `"${stats.eggType}"`,
        String(stats.totalQty),
        stats.totalMRP.toFixed(2),
        stats.totalChurchRate.toFixed(2),
        profit.toFixed(2)
      ];
    });

    const filename = `profit_report_egg_${profitEggFilter}_type_${profitTypeFilter}_weight_${profitWeightFilter}.csv`;
    downloadCSV(headers, rows, filename);
  };

  const downloadCSV = (headers: string[], rows: string[][], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center p-4">
        <div className="bg-white border border-[#562400]/10 rounded-2xl max-w-md w-full p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#044529]/10 text-[#044529] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-medium text-[#562400]">Staff Portal Login</h2>
            <p className="text-xs text-[#562400]/60">Enter database credentials to manage orders and view reports.</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-50 text-xs text-red-600 border border-red-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#562400] mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#562400] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-sm focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl font-medium text-sm bg-[#8F0500] text-[#FFFBE9] hover:bg-[#720400] transition-colors shadow-xs disabled:opacity-50"
            >
              {loginLoading ? "Authenticating..." : "Sign In to Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FFFBE9] text-[#562400]/60">Loading Admin Portal...</div>;
  }

  return (
    <div className="min-h-screen bg-[#FFFBE9] text-[#562400] pb-20 relative">
      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#562400]/10 rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#562400]/10 pb-3">
              <h3 className="font-serif text-xl font-medium">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-[#562400]/60 hover:text-[#562400]">✕</button>
            </div>
            {passwordMessage && (
              <div className={`p-3 rounded-lg text-xs ${passwordMessage.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                {passwordMessage}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-sm focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 rounded-xl bg-[#FFECC5] text-[#562400] text-xs font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl bg-[#8F0500] text-[#FFFBE9] text-xs font-medium hover:bg-[#720400]">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {selectedScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#562400]/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#562400]/10 pb-3">
              <h3 className="font-serif text-xl font-medium">UPI Payment Screenshot</h3>
              <button onClick={() => setSelectedScreenshotUrl(null)} className="rounded-full p-1.5 hover:bg-[#FFECC5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center bg-[#FFECC5]/30 rounded-xl p-3 max-h-[70vh] overflow-hidden">
              <img
                src={selectedScreenshotUrl}
                alt="Payment Proof"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <a
                href={selectedScreenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#FFECC5] text-[#562400] text-xs font-medium hover:bg-[#FFECC5]/80 transition-colors"
              >
                Open Full Image in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#562400]/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-medium text-[#044529]">Cake Fiesta Staff Portal</h1>
            <p className="text-xs text-[#562400]/60">Logged in as: <strong className="text-[#562400]">{currentAdminUser}</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#562400]/15 bg-white text-xs font-medium hover:bg-[#FFECC5]/40 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#8F0500]" /> Password
            </button>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#044529]/10 text-[#044529] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> Authorized
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#562400]/15 bg-white text-xs font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-[#562400]/10 p-6 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#562400]/60 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#8F0500]" /> Filtered Revenue (MRP)
            </span>
            <p className="font-sans font-bold text-3xl tabular-nums text-[#562400]">₹{totalStorefrontRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-[#562400]/10 p-6 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#562400]/60 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#8F0500]" /> Filtered Orders Count
            </span>
            <p className="font-sans font-bold text-3xl tabular-nums text-[#562400]">{totalOrdersCount}</p>
          </div>
          <div className="bg-white border border-[#562400]/10 p-6 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#562400]/60 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-yellow-600" /> Pending Verification
            </span>
            <p className="font-sans font-bold text-3xl tabular-nums text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white border border-[#562400]/10 p-6 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-[#562400]/60 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-600" /> Verified Orders
            </span>
            <p className="font-sans font-bold text-3xl tabular-nums text-green-600">{verifiedCount}</p>
          </div>
        </div>

        {/* Filterable Profit CSV Generator Section */}
        <div className="bg-white border border-[#562400]/10 rounded-2xl shadow-xs p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#562400]/10 pb-4">
            <div>
              <h3 className="font-serif text-xl font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#8F0500]" /> Advanced Filterable Profit CSV Generator
              </h3>
              <p className="text-xs text-[#562400]/60">Select specific parameters to generate a custom profit and quantity summary CSV report.</p>
            </div>
            <button
              onClick={exportFilteredProfitCSV}
              className="px-4 py-2.5 rounded-xl bg-[#8F0500] text-[#FFFBE9] text-xs font-medium hover:bg-[#720400] transition-colors shadow-xs flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Filtered Profit CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#562400] mb-1">Egg / Eggless</label>
              <select
                value={profitEggFilter}
                onChange={(e) => setProfitEggFilter(e.target.value)}
                className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-xs font-medium focus:outline-none"
              >
                <option value="all">All (Egg & Eggless)</option>
                <option value="egg">With Egg Only</option>
                <option value="eggless">Eggless Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#562400] mb-1">Cake Category / Type</label>
              <select
                value={profitTypeFilter}
                onChange={(e) => setProfitTypeFilter(e.target.value)}
                className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Types (Slices & Round/Square)</option>
                <option value="slice">Slice Cakes Only</option>
                <option value="round_square">Round & Square Cakes Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#562400] mb-1">Weight / Size</label>
              <select
                value={profitWeightFilter}
                onChange={(e) => setProfitWeightFilter(e.target.value)}
                className="w-full bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2.5 text-xs font-medium focus:outline-none"
              >
                <option value="all">All Weights</option>
                <option value="400g">400g (Slice)</option>
                <option value="350g">350g (Round)</option>
                <option value="700g">700g (Round)</option>
                <option value="500g">500g (Square)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table Section */}
        <div className="bg-white border border-[#562400]/10 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#562400]/10 pb-4">
            <div>
              <h3 className="font-serif text-xl font-medium">Customer Orders & Reports</h3>
              <p className="text-xs text-[#562400]/60">Filter orders by batch and status, verify payments, or export customized CSVs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className="bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2 text-xs font-medium focus:outline-none">
                <option value="all">All Batches</option>
                <option value="Batch 1 (Pre-Christmas)">Batch 1 (Pre-Christmas)</option>
                <option value="Batch 2 (Christmas & New Year)">Batch 2 (Christmas & New Year)</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#FFECC5]/30 border border-[#562400]/15 rounded-lg p-2 text-xs font-medium focus:outline-none">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button onClick={exportOrdersCSV} className="px-3 py-2 rounded-lg bg-[#FFECC5] text-[#562400] text-xs font-medium hover:bg-[#FFECC5]/80 transition-colors shadow-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> All Orders CSV
              </button>
              <button onClick={exportSlicesCSV} className="px-3 py-2 rounded-lg bg-[#044529] text-[#FFFBE9] text-xs font-medium hover:bg-[#033620] transition-colors shadow-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Slices Summary CSV
              </button>
              <button onClick={exportRoundSquareCSV} className="px-3 py-2 rounded-lg bg-[#8F0500] text-[#FFFBE9] text-xs font-medium hover:bg-[#720400] transition-colors shadow-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Round & Square Summary CSV
              </button>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-center text-[#562400]/60 py-12">No orders found matching the selected filters.</p>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#562400]/10 bg-[#FFECC5]/30 text-xs uppercase tracking-wider text-[#562400]/60">
                    <th className="p-3.5 font-semibold">Order ID / Date</th>
                    <th className="p-3.5 font-semibold">Customer</th>
                    <th className="p-3.5 font-semibold">Batch & Payment</th>
                    <th className="p-3.5 font-semibold">Items & Weights</th>
                    <th className="p-3.5 font-semibold">Total (MRP)</th>
                    <th className="p-3.5 font-semibold">Status & By</th>
                    <th className="p-3.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#562400]/10">
                  {paginatedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FFECC5]/20 transition-colors">
                      <td className="p-3.5 font-mono text-xs">
                        <span className="font-semibold">{ord.id.slice(0, 8)}</span>
                        <span className="text-[#562400]/60 block">{new Date(ord.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-medium block">{ord.customers?.name || "Guest"}</span>
                        <span className="text-xs text-[#562400]/60">+91 {ord.customers?.phone}</span>
                      </td>
                      <td className="p-3.5 text-xs space-y-1.5">
                        <span className="font-medium block">{ord.batches?.name || "Unassigned"}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFECC5] text-[#562400] font-semibold text-[10px] uppercase">
                            <CreditCard className="w-3 h-3 text-[#8F0500]" /> {ord.payment_mode || "Cash"}
                          </span>
                          {ord.payment_mode === "UPI" && (
                            <button
                              onClick={() => handleViewScreenshot(ord.id)}
                              disabled={screenshotLoading}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#044529]/10 text-[#044529] font-semibold text-[10px] hover:bg-[#044529]/20 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Proof
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs">
                        <ul className="space-y-1">
                          {ord.order_items?.map((item, idx) => {
                            const isEggless = item.cake_variants?.egg_type && item.cake_variants.egg_type.toLowerCase() === "eggless";
                            return (
                              <li key={idx} className="text-[#562400]/80">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[#044529]">{item.cakes?.name}</span>
                                  {item.cake_variants?.egg_type && (
                                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                      isEggless ? "bg-[#044529]/10 text-[#044529]" : "bg-[#8F0500]/10 text-[#8F0500]"
                                    }`}>
                                      {item.cake_variants.egg_type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-[#562400]/60">{item.cake_variants?.weight || "Standard"} × {item.quantity}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="p-3.5 font-sans font-bold tabular-nums">
                        ₹{ord.total_amount.toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-medium uppercase tracking-wider text-[10px] inline-block ${
                          ord.status === 'verified' 
                            ? 'bg-green-100 text-green-700' 
                            : ord.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {ord.status}
                        </span>
                        <span className="text-[11px] text-[#562400]/60 block mt-1">
                          By: <strong className="text-[#562400]">{ord.updated_by || "System"}</strong>
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ord.status !== 'verified' ? (
                            <button onClick={() => handleUpdateStatus(ord.id, 'verified')} className="px-3 py-1.5 rounded-lg bg-[#8F0500] text-[#FFFBE9] text-xs font-medium hover:bg-[#720400] transition-colors shadow-xs">
                              Verify
                            </button>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateStatus(ord.id, 'pending')} className="px-3 py-1.5 rounded-lg bg-[#FFECC5] text-[#562400] text-xs font-medium hover:bg-[#FFECC5]/80 transition-colors flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-red-500" /> Unverify
                              </button>
                              <button
                                onClick={() => sendWhatsAppNotification(ord)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#20ba5a] transition-colors"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                              </button>
                            </>
                          )}
                          {ord.status !== 'cancelled' && (
                            <button onClick={() => handleUpdateStatus(ord.id, 'cancelled')} className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#562400]/10 pt-5">
              <p className="text-xs text-[#562400]/60">
                Showing{" "}
                {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ORDERS_PER_PAGE + 1}
                {" "}to{" "}
                {Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}
                {" "}of {filteredOrders.length} orders
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-[#562400]/15 text-xs font-semibold text-[#562400] hover:bg-[#FFECC5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <span className="text-xs font-semibold text-[#562400] whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 rounded-lg bg-[#044529] text-xs font-semibold text-[#FFFBE9] hover:bg-[#033620] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
