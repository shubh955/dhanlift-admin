"use client";

import { useEffect, useState, useCallback } from "react";
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

const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
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
];

export default function LeadsPage() {
  const [data, setData] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/admin/leads?page=${page}&limit=${limit}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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
