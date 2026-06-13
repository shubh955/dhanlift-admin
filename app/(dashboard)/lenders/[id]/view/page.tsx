"use client";

import { use } from "react";
import { LenderForm } from "@/app/(dashboard)/lenders/_components/LenderForm";

export default function ViewLenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LenderForm mode="view" lenderId={parseInt(id, 10)} />;
}
