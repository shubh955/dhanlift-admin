"use client";

import { use } from "react";
import { BlogForm } from "@/app/(dashboard)/blog/_components/BlogForm";

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BlogForm mode="edit" blogId={parseInt(id, 10)} />;
}
