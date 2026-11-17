"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { TrendingUp, Package, ArrowUpRight, Activity, ArrowLeft, Award, PieChart as PieIcon } from "lucide-react";
import Link from "next/link";

export default function AdminAnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    verifiedRevenue: 0,
    verifiedProfit: 0,
    totalOrders: 0,
    pendingOrders: 0,
    verifiedOrders: 0,
    upiCount: 0,
    cashCount: 0,
    sliceCount: 0,
    roundSquareCount: 0,
    topCakes: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    const authStatus = sessionStorage.getItem("cake_admin_auth");
    if (authStatus === "true") {
      setIsAuthenticated(true);
      fetchAnalyticsData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          total_amount,
          payment_mode,
          created_at,
          order_items (
            quantity,
            unit_price,
            cake_variants (weight, church_rate),
            cakes (name)
          )
        `);

      if (error) throw error;

      if (orders) {
        let vRev = 0;
        let vProfit = 0;
        let pending = 0;
        let verified = 0;
        let upi = 0;
        let cash = 0;
        let slices = 0;
        let roundSquares = 0;
        const cakeSales: Record<string, number> = {};

        orders.forEach((ord) => {
          if (ord.status === "pending") pending++;
          
          // Strict focus: Process analytics ONLY for verified orders
          if (ord.status === "verified") {
            verified++;
            vRev += ord.total_amount;

            if (ord.payment_mode?.toUpperCase() === "UPI") upi++;
            else cash++;

            ord.order_items?.forEach((item: any) => {
              const churchRate = item.cake_variants?.church_rate || item.unit_price * 0.85;
              const itemProfit = (item.unit_price - churchRate) * item.quantity;
              vProfit += itemProfit;

              const weight = item.cake_variants?.weight || "";
              const cakeName = item.cakes?.name || "Unknown Cake";
              const isSlice = weight.toLowerCase().includes("slice") || cakeName.toLowerCase().includes("slice");
              
              if (isSlice) {
                slices += item.quantity;
              } else {
                roundSquares += item.quantity;
              }

              cakeSales[cakeName] = (cakeSales[cakeName] || 0) + item.quantity;
            });
          }
        });

        const sortedCakes = Object.entries(cakeSales)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setMetrics({
          verifiedRevenue: vRev,
          verifiedProfit: vProfit,
          totalOrders: orders.length,
          pendingOrders: pending,
          verifiedOrders: verified,
          upiCount: upi,
          cashCount: cash,
          sliceCount: slices,
          roundSquareCount: roundSquares,
          topCakes: sortedCakes,
        });
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFFBE9] flex items-center justify-center p-4">
        <div className="bg-[#FFECC5] border border-[#562400]/15 rounded-[28px] max-w-md w-full p-8 text-center space-y-4 shadow-xl">
          <h2 className="font-serif text-2xl font-bold text-[#044529]">Admin Access Required</h2>
          <p className="text-xs text-[#562400]/70">Please sign in through the main staff admin portal first to view analytics.</p>
          <Link href="/admin" className="inline-block w-full py-3 rounded-xl bg-[#8F0500] text-[#FFFBE9] text-xs font-bold uppercase tracking-wider">
            Go to Admin Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#044529] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#FFECC5] border-t-transparent" />
          <p className="font-serif text-lg text-[#FFECC5]">Loading verified analytics...</p>
        </div>
      </div>
    );
  }

  const totalItemCount = metrics.sliceCount + metrics.roundSquareCount || 1;
  const slicePercentage = Math.round((metrics.sliceCount / totalItemCount) * 100);
  const roundSquarePercentage = 100 - slicePercentage;
  const verifiedPercentage = metrics.totalOrders ? Math.round((metrics.verifiedOrders / metrics.totalOrders) * 100) : 0;
  
  const totalVerifiedPayments = metrics.upiCount + metrics.cashCount || 1;
  const upiPercentage = Math.round((metrics.upiCount / totalVerifiedPayments) * 100);
  const cashPercentage = 100 - upiPercentage;

  const maxCakeCount = metrics.topCakes.length > 0 ? Math.max(...metrics.topCakes.map(c => c.count)) : 1;

  return (
    <div className="min-h-screen bg-[#044529] text-[#FFFBE9] p-4 sm:p-8 lg:p-12 selection:bg-[#8F0500] selection:text-[#FFFBE9]">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#FFFBE9]/15">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBE9]/10 hover:bg-[#FFFBE9]/20 transition-colors">
              <ArrowLeft className="h-5 w-5 text-[#FFECC5]" />
            </Link>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#FFECC5]">Altar Angels · Verified Intelligence</p>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#FFFBE9]">Verified Analytics</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#FFFBE9]/10 px-4 py-2 text-xs font-semibold text-[#FFECC5]">
            <Activity className="h-4 w-4 text-[#C1FF72]" /> Verified Orders Stream
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Bento Box 1: Verified Order Mix Breakdown */}
          <div className="md:col-span-1 lg:col-span-1 bg-[#121E18] border border-[#FFFBE9]/10 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-[#C1FF72]/10 text-[#C1FF72] text-[9px] font-bold uppercase tracking-widest">
                Verified Mix
              </span>
              <p className="text-xs text-[#FFFBE9]/60 pt-2">By category (verified only)</p>
            </div>

            <div className="my-8 flex flex-col items-center justify-center">
              <div className="w-44 h-44 rounded-full border-8 border-[#FFFBE9]/10 border-t-[#C1FF72] border-r-[#A259FF] border-b-[#00E599] flex flex-col items-center justify-center p-4 text-center">
                <span className="font-serif text-3xl font-black text-[#FFFBE9]">{metrics.verifiedOrders}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#FFFBE9]/60">Verified Orders</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#FFFBE9]/10 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#FFFBE9]/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E599]" /> Slices (400g)
                </span>
                <span className="font-bold tabular-nums">{slicePercentage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#FFFBE9]/80">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A259FF]" /> Round & Square</span>
                <span className="font-bold tabular-nums">{roundSquarePercentage}%</span>
              </div>
            </div>
          </div>

          {/* Right Columns */}
          <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* Metric Card: Verified Revenue */}
            <div className="bg-[#121E18] border border-[#FFFBE9]/10 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-full bg-[#C1FF72] text-[#044529] flex items-center justify-center font-bold">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-[#C1FF72] bg-[#C1FF72]/10 px-2.5 py-1 rounded-full">Verified Only</span>
              </div>
              <div className="my-6">
                <p className="font-sans text-3xl sm:text-4xl font-black text-[#FFFBE9] tabular-nums">
                  ₹{metrics.verifiedRevenue.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-[#FFFBE9]/60 mt-1">Verified Storefront Revenue</p>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#C1FF72] font-semibold">
                Realized Sales Value
              </div>
            </div>

            {/* Metric Card: Verification Progress */}
            <div className="bg-[#121E18] border border-[#FFFBE9]/10 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <p className="text-xs text-[#FFFBE9]/60 font-medium">Verification Progress</p>
                <h3 className="font-sans text-3xl font-black text-[#FFFBE9] mt-2 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-[#00E599]" /> {verifiedPercentage}%
                </h3>
              </div>
              <div className="my-4">
                <div className="w-full bg-[#FFFBE9]/10 h-3 rounded-full overflow-hidden">
                  <div className="bg-[#00E599] h-full rounded-full transition-all duration-500" style={{ width: `${verifiedPercentage}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#FFFBE9]/70 pt-2 border-t border-[#FFFBE9]/10">
                <span>Verified: <strong className="text-[#00E599]">{metrics.verifiedOrders}</strong></span>
                <span>Pending: <strong className="text-[#FFD233]">{metrics.pendingOrders}</strong></span>
              </div>
            </div>

            {/* Metric Card: Verified UPI vs Cash Pie Chart Breakdown */}
            <div className="bg-[#A259FF] text-[#FFFBE9] rounded-[32px] p-6 flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                  Verified Payments
                </span>
                <PieIcon className="h-5 w-5 text-white/80" />
              </div>

              {/* Pie Chart Visual Representation */}
              <div className="my-3 flex items-center justify-center gap-6">
                <div 
                  className="w-24 h-24 rounded-full border-4 border-white/20 shadow-inner relative flex items-center justify-center"
                  style={{
                    background: `conic-gradient(#C1FF72 0% ${upiPercentage}%, rgba(255,255,255,0.4) ${upiPercentage}% 100%)`
                  }}
                >
                  <div className="w-14 h-14 rounded-full bg-[#A259FF] flex items-center justify-center font-bold text-xs">
                    {upiPercentage}%
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#C1FF72]" />
                    <span>UPI: <strong>{metrics.upiCount}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white/50" />
                    <span>Cash: <strong>{metrics.cashCount}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/20 flex items-center justify-between text-[11px] font-semibold">
                <span>UPI Ratio: {upiPercentage}%</span>
                <span>Cash Ratio: {cashPercentage}%</span>
              </div>
            </div>

            {/* Top Selling Flavour Cakes Bar Graph Card (Verified Only) */}
            <div className="sm:col-span-2 lg:col-span-3 bg-[#121E18] border border-[#FFFBE9]/10 rounded-[32px] p-6 flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#FFECC5]">Verified Best Sellers</span>
                  <h3 className="font-serif text-2xl font-bold text-[#FFFBE9] mt-1 flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#C1FF72]" /> Top Selling Cakes (Verified Units)
                  </h3>
                </div>
                <span className="text-xs text-[#FFFBE9]/60">Ranked by verified volume</span>
              </div>

              {/* Bar Graph Visualizer */}
              {metrics.topCakes.length === 0 ? (
                <p className="text-xs text-[#FFFBE9]/60 py-8 text-center">No verified cake orders recorded yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end h-44 pt-6 px-2">
                  {metrics.topCakes.map((cake, idx) => {
                    const heightPercent = Math.max(Math.round((cake.count / maxCakeCount) * 100), 20);
                    const colors = ["bg-[#C1FF72]", "bg-[#A259FF]", "bg-[#00E599]", "bg-[#FFD233]", "bg-[#FF7272]"];
                    const barColor = colors[idx % colors.length];

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <span className="text-[10px] font-bold text-[#FFFBE9]/90 tabular-nums">{cake.count} u</span>
                        <div 
                          className={`w-full rounded-2xl ${barColor} transition-all duration-500 shadow-md group-hover:brightness-110`} 
                          style={{ height: `${heightPercent}%` }} 
                        />
                        <span className="text-[10px] font-semibold text-[#FFFBE9]/70 truncate max-w-full text-center" title={cake.name}>
                          {cake.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Total Verified Profit Card */}
            <div className="sm:col-span-2 lg:col-span-3 bg-[#C1FF72] text-[#044529] rounded-[32px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#044529] text-[#C1FF72] text-[9px] font-bold uppercase tracking-wider">
                    Verified Earnings
                  </span>
                  <span className="text-xs font-semibold">Realized Fundraiser Profit</span>
                </div>
                <p className="font-serif text-4xl sm:text-5xl font-black">₹{metrics.verifiedProfit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-[#044529]/70">Total net profit accumulated strictly from verified payment orders.</p>
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <Link href="/admin" className="px-6 py-3 rounded-2xl bg-[#044529] text-[#C1FF72] text-xs font-bold uppercase tracking-wider text-center hover:bg-[#033620] transition-colors">
                  Back to Orders Table
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}