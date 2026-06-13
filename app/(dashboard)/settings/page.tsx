"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CategoryList } from "./category/_components/CategoryList";
import { TestimonialList } from "./testimonials/_components/TestimonialList";

type Tab = "category" | "testimonials";

const TABS: { id: Tab; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "testimonials", label: "Testimonials" },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("category");

  useEffect(() => {
    const tab = searchParams.get("tab") as Tab | null;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure global platform settings, categories, and lookup values.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "category" && <CategoryList />}
      {activeTab === "testimonials" && <TestimonialList />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
