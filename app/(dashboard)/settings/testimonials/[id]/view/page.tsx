"use client";

import { use } from "react";
import { TestimonialForm } from "../../_components/TestimonialForm";

export default function ViewTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TestimonialForm mode="view" testimonialId={parseInt(id, 10)} />;
}
