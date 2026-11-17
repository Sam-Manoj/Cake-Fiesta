"use client";
import { useRouter } from "next/navigation";
import CustomerAuth from "@/components/storefront/CustomerAuth";

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = (customer: any) => {
    // Save customer session in localStorage or state management
    localStorage.setItem("cake_customer", JSON.stringify(customer));
    router.push("/");
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-20">
      <CustomerAuth onLoginSuccess={handleSuccess} />
    </main>
  );
}