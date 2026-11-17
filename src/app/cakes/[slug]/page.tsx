import { Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { notFound } from "next/navigation";
import ProductConfigurator from "@/components/storefront/ProductConfigurator";

export const instant = false; // Allow blocking route for dynamic params in Next.js 16

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function CakeDetailContent({ slug }: { slug: string }) {
  const { data: cake, error } = await supabase
    .from("cakes")
    .select("*, cake_variants(*)")
    .eq("slug", slug)
    .single();

  if (error || !cake) {
    notFound();
  }

  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("active", true)
    .order("cutoff_date");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 bg-white border border-border p-8 rounded-2xl shadow-sm">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-accent/10 text-accent inline-block mb-4">
          {cake.category}
        </span>
        <h1 className="font-serif text-3xl md:text-4xl font-medium mb-4 text-foreground">
          {cake.name}
        </h1>
        <p className="text-muted leading-relaxed mb-6">
          {cake.description}
        </p>

        <div className="border-t border-border pt-4 space-y-3">
          <div>
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Shelf Life</span>
            <p className="text-sm text-muted mt-0.5">{cake.shelf_life}</p>
          </div>
        </div>
      </div>

      <ProductConfigurator cake={cake} batches={batches || []} />
    </div>
  );
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 md:py-16">
      <Suspense fallback={<div className="text-center text-muted py-20">Loading product details...</div>}>
        <CakeDetailContent slug={slug} />
      </Suspense>
    </main>
  );
}