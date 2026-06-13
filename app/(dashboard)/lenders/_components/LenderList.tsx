"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { GenericDataTable } from "@/components/shared/GenericDataTable";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getAccessToken } from "@/lib/tokens";
import { swalSuccess, swalError } from "@/lib/swal";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Lender {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export function LenderList() {
  const router = useRouter();
  const [data, setData] = useState<Lender[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setFetchError(null);
    const token = getAccessToken();
    fetch(`${API}/v1/admin/lenders?page=${page}&limit=${limit}`, {
      headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { const rows = json.data ?? json.items ?? (Array.isArray(json) ? json : []); setData(rows); setTotal(json.meta?.total ?? json.total ?? rows.length); })
      .catch((err) => { if (err.name === "AbortError") return; setFetchError(err instanceof Error ? err.message : "Failed to load lenders"); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [page, refreshKey]);

  async function handleDelete() {
    if (deleteTarget == null) return;
    setDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/v1/admin/lenders/${deleteTarget}`, {
        method: "DELETE",
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
      swalSuccess("Deleted!", "Lender has been deleted.");
    } catch (err) {
      swalError("Delete Failed", err instanceof Error ? err.message : "Failed to delete lender");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<ColumnDef<Lender>[]>(
    () => [
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
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? (
            <span className="text-muted-foreground text-sm line-clamp-2">{val}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Created At",
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? (
            <span>
              {new Date(val).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    [page, limit]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lenders</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage lender profiles and partnerships.
          </p>
        </div>
        <Button onClick={() => router.push("/lenders/add")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lender
        </Button>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {fetchError}
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
        onView={(row) => router.push(`/lenders/${row.id}/view`)}
        onEdit={(row) => router.push(`/lenders/${row.id}/edit`)}
        onDelete={(row) => setDeleteTarget(row.id)}
        controls={{
          showSearch: true,
          showExport: true,
          showPagination: true,
          showViewAction: true,
          showEditAction: true,
          showDeleteAction: true,
        }}
      />

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lender</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The lender will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
