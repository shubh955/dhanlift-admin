"use client";

import { use } from "react";
import { ProductForm } from "@/app/(dashboard)/products/_components/ProductForm";

export default function ViewProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductForm mode="view" productId={parseInt(id, 10)} />;
}
