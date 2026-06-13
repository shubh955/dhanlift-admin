"use client";

import { use } from "react";
import { CategoryForm } from "@/app/(dashboard)/settings/category/_components/CategoryForm";

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CategoryForm mode="edit" categoryId={parseInt(id, 10)} />;
}
