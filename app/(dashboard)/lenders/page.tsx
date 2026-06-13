"use client";

import { LenderList } from "./_components/LenderList";

export default function LendersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lender Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage lender profiles, partnerships, and their associated products.
        </p>
      </div>
      <LenderList />
    </div>
  );
}
