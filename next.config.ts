import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ["ckeditor5", "@ckeditor/ckeditor5-react"],
};

export default nextConfig;
