"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Phone, User } from "lucide-react";

export default function CustomerAuth({ onLoginSuccess }: { onLoginSuccess: (customer: any) => void }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanPhone = phone.trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      let { data: customer, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", cleanPhone)
        .single();

      if (!customer) {
        if (!isRegistering) {
          setIsRegistering(true);
          setLoading(false);
          return;
        }

        if (!name.trim()) {
          setError("Please enter your full name for registration.");
          setLoading(false);
          return;
        }

        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert([{ phone: cleanPhone, name: name.trim() }])
          .select()
          .single();

        if (insertError) throw insertError;
        customer = newCustomer;
      }

      onLoginSuccess(customer);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-border p-8 rounded-2xl shadow-sm">
      <h2 className="font-serif text-2xl font-medium mb-2 text-foreground">Customer Login</h2>
      <p className="text-sm text-muted mb-6">Enter your 10-digit mobile number to view orders and checkout.</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-accent" />
            Mobile Number
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-secondary/30 text-muted text-sm font-medium">
              +91
            </span>
            <input
              type="tel"
              required
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full bg-secondary/20 border border-border rounded-r-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 tabular-nums"
            />
          </div>
        </div>

        {isRegistering && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-foreground mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent" />
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="Sam Manoj"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-secondary/20 border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || phone.length !== 10}
          className="w-full py-3 rounded-xl font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : isRegistering ? "Complete Registration" : "Continue with Phone"}
        </button>
      </form>
    </div>
  );
}