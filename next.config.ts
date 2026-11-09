import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: a self-contained server under .next/standalone —
  // what the Docker image runs. Local `npm run build` / `npm start` keep
  // working exactly as before.
  output: "standalone",
};

export default nextConfig;
