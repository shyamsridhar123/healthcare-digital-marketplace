import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(configDir, "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "storage.azure.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api",
    NEXT_PUBLIC_AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID ?? "",
    NEXT_PUBLIC_AZURE_TENANT_ID: process.env.AZURE_TENANT_ID ?? "",
  },
  async rewrites() {
    // Use 127.0.0.1 (not "localhost") so Node's undici proxy doesn't try IPv6 (::1)
    // first and fail with AggregateError — Azure Functions Core Tools only binds IPv4.
    const apiBackend = process.env.API_BASE_URL ?? "http://127.0.0.1:7071/api";
    return {
      // "fallback" rewrites only fire when no Next.js page or API route matches
      fallback: [
        {
          source: "/api/:path*",
          destination: `${apiBackend}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;