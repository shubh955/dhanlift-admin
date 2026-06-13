"use client";

import { use } from "react";
import { TestimonialForm } from "../../_components/TestimonialForm";

export default function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TestimonialForm mode="edit" testimonialId={parseInt(id, 10)} />;
}
