"use client";

import { use } from "react";
import { LenderForm } from "@/app/(dashboard)/lenders/_components/LenderForm";

export default function EditLenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LenderForm mode="edit" lenderId={parseInt(id, 10)} />;
}
