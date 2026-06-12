"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Blog {
  id: number;
  title: string;
  category?: string;
  published_at?: string;
  excerpt?: string;
  is_active: boolean;
  [key: string]: unknown;
}

export default function BlogPage() {
  const router = useRouter();
  const [data, setData] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API}/v1/admin/blogs?page=${page}&limit=${limit}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to load blogs"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  async function handleDelete() {
    if (deleteTarget == null) return;
    setDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API}/v1/admin/blogs/${deleteTarget}`, {
        method: "DELETE",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteTarget(null);
      fetchBlogs();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<ColumnDef<Blog>[]>(
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
        accessorKey: "title",
        header: "Title",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? (
            <span className="text-sm">{val}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "published_at",
        header: "Published At",
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? (
            new Date(val).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "excerpt",
        header: "Excerpt",
        cell: ({ getValue }) => {
          const val = getValue<string>();
          return val ? (
            <span className="line-clamp-2 text-sm text-muted-foreground max-w-xs block">
              {val}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        size: 90,
        cell: ({ getValue }) => {
          const active = getValue<boolean>();
          return (
            <span
              className={
                active
                  ? "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700"
                  : "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500"
              }
            >
              {active ? "Active" : "Deactive"}
            </span>
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
          <h2 className="text-2xl font-bold tracking-tight">
            Blog Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and publish blog posts.
          </p>
        </div>
        <Button onClick={() => router.push("/blog/add")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Blog
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
        onView={(row) => router.push(`/blog/${row.id}/view`)}
        onEdit={(row) => router.push(`/blog/${row.id}/edit`)}
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
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The blog post will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
