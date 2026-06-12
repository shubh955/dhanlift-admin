"use client";

import { use } from "react";
import { BlogForm } from "@/app/(dashboard)/blog/_components/BlogForm";

export default function ViewBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BlogForm mode="view" blogId={parseInt(id, 10)} />;
}
