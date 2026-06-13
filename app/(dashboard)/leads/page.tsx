"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { GenericDataTable } from "@/components/shared/GenericDataTable";
import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/tokens";

interface Lead {
  id: number;
  full_name: string;
  email: string;
  mobile_number: string;
  status: string;
  amount_required: number;
  created_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
  in_review: "secondary",
};

export default function LeadsPage() {
  const router = useRouter();
  const [data, setData] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    const token = getAccessToken();
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/admin/leads?page=${page}&limit=${limit}`, {
      headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`Request failed: ${r.status}`); return r.json(); })
      .then((json) => { setData(json.data ?? []); setTotal(json.meta?.total ?? 0); })
      .catch((err) => { if (err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Failed to load leads"); setData([]); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [page]);

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      id: "sr_no",
      header: "Sr.No",
      size: 64,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {(page - 1) * limit + row.index + 1}
        </span>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Name",
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "mobile_number",
      header: "Mobile",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const status = getValue<string>();
        return (
          <Badge variant={STATUS_VARIANT[status?.toLowerCase()] ?? "outline"}>
            {status ?? "—"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount_required",
      header: "Amount Required",
      cell: ({ getValue }) => {
        const amount = getValue<number>();
        if (amount == null) return "—";
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amount);
      },
    },
    {
      accessorKey: "created_at",
      header: "Created At",
      cell: ({ getValue }) => {
        const val = getValue<string>();
        if (!val) return "—";
        return new Date(val).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      },
    },
  ], [page, limit]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lead / Enquiry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage all incoming leads and enquiries.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <GenericDataTable
        data={data}
        columns={columns}
        total={total}
        page={page}
        limit={limit}
        isLoading={isLoading}
        onPaginationChange={(p) => setPage(p)}
        onView={(row) => router.push(`/leads/${row.id}/view`)}
        controls={{
          showSearch: true,
          showExport: true,
          showPagination: true,
          showViewAction: true,
          showEditAction: false,
          showDeleteAction: false,
        }}
      />
    </div>
  );
}
