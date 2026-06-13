"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/tokens";
import { FileText, Users, BookOpen, Building2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

interface StatCard {
  label: string;
  value: number | null;
  icon: React.ElementType;
  color: string;
}

function fetchTotal(endpoint: string): Promise<number> {
  const token = getAccessToken();
  return fetch(`${API}${endpoint}`, {
    headers: { accept: "application/json", Authorization: `Bearer ${token}` },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((json) => json.meta?.total ?? json.total ?? 0)
    .catch(() => 0);
}

export default function DashboardPage() {
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null);
  const [blogsTotal, setBlogsTotal] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchTotal("/v1/admin/leads?page=1&limit=1"),
      fetchTotal("/v1/admin/blogs?page=1&limit=1"),
    ]).then(([leads, blogs]) => {
      if (controller.signal.aborted) return;
      setLeadsTotal(leads);
      setBlogsTotal(blogs);
    });
    return () => controller.abort();
  }, []);

  const cards: StatCard[] = [
    { label: "Total Leads",  value: leadsTotal, icon: Users,     color: "text-blue-600" },
    { label: "Active Loans", value: null,       icon: FileText,  color: "text-green-600" },
    { label: "Blog Posts",   value: blogsTotal, icon: BookOpen,  color: "text-purple-600" },
    { label: "Lenders",      value: null,       icon: Building2, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome to the Dhanlift admin panel.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold">
              {value === null ? (
                <span className="text-muted-foreground text-2xl">—</span>
              ) : (
                value.toLocaleString("en-IN")
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
