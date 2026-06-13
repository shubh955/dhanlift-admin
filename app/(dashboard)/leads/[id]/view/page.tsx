"use client";

import { use } from "react";
import { LeadView } from "../../_components/LeadView";

export default function LeadViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <LeadView leadId={parseInt(id, 10)} />;
}
