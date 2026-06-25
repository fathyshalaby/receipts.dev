import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This Next.js app lives in `web/` inside a larger monorepo. Pin the file-tracing
  // root to this directory so builds don't pick up the repo-root lockfile/workspace.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
