import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      tailwindcss: path.join(projectRoot, "node_modules", "tailwindcss"),
      "@tailwindcss/postcss": path.join(projectRoot, "node_modules", "@tailwindcss", "postcss"),
    };
    return config;
  },
};

export default nextConfig;
