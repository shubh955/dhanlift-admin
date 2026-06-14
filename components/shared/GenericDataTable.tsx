"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

export interface TableControls {
  showSearch?: boolean;
  showExport?: boolean;
  showPagination?: boolean;
  showViewAction?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showToggleAction?: boolean;
}

interface GenericDataTableProps<T extends object> {
  data: T[];
  columns: ColumnDef<T>[];
  total: number;
  page: number;
  limit: number;
  onPaginationChange: (page: number, limit: number) => void;
  controls?: TableControls;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onToggle?: (row: T) => void;
  isToggleActive?: (row: T) => boolean;
  isLoading?: boolean;
}

export function GenericDataTable<T extends object>({
  data,
  columns,
  total,
  page,
  limit,
  onPaginationChange,
  controls = {},
  onView,
  onEdit,
  onDelete,
  onToggle,
  isToggleActive,
  isLoading = false,
}: GenericDataTableProps<T>) {
  const {
    showSearch = false,
    showExport = false,
    showPagination = false,
    showViewAction = false,
    showEditAction = false,
    showDeleteAction = false,
    showToggleAction = false,
  } = controls;

  const [globalFilter, setGlobalFilter] = useState("");

  const hasActions = showViewAction || showEditAction || showDeleteAction || showToggleAction;

  const allColumns = useMemo<ColumnDef<T>[]>(() => {
    if (!hasActions) return columns;
    return [
      ...columns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const active = isToggleActive?.(row.original) ?? false;
          return (
            <div className="flex items-center gap-1">
              {showViewAction && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onView?.(row.original)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {showEditAction && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onEdit?.(row.original)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {showDeleteAction && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete?.(row.original)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {showToggleAction && (
                <button
                  title={active ? "Click to Deactivate" : "Click to Activate"}
                  onClick={() => onToggle?.(row.original)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    active ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      active ? "translate-x-[18px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [columns, hasActions, showViewAction, showEditAction, showDeleteAction, showToggleAction, onView, onEdit, onDelete, onToggle, isToggleActive]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    manualPagination: true,
    rowCount: total,
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleExport() {
    const keys = columns
      .filter((c) => "accessorKey" in c)
      .map((c) => String((c as { accessorKey: string }).accessorKey));

    const headers = columns
      .filter((c) => "accessorKey" in c)
      .map((c) => String(c.header ?? (c as { accessorKey: string }).accessorKey));

    const rows = data.map((row) =>
      keys
        .map((k) => {
          const v = (row as Record<string, unknown>)[k];
          const str = v == null ? "" : String(v);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(showSearch || showExport) && (
        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          {showExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-semibold text-foreground whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: limit > 5 ? 5 : limit }).map((_, i) => (
                <TableRow key={i}>
                  {allColumns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total === 0
              ? "No records"
              : `Showing ${from}–${to} of ${total} records`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPaginationChange(page - 1, limit)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="px-1 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPaginationChange(page + 1, limit)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
