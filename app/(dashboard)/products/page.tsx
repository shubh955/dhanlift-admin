"use client";

import { ProductList } from "./_components/ProductList";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Product Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add, edit, and manage loan or financial products offered on the platform.
        </p>
      </div>
      <ProductList />
    </div>
  );
}
