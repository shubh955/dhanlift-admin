"use client";

import { use } from "react";
import { CategoryForm } from "@/app/(dashboard)/settings/category/_components/CategoryForm";

export default function ViewCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CategoryForm mode="view" categoryId={parseInt(id, 10)} />;
}
