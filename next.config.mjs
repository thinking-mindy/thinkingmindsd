import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isTauriBuild = process.env.TAURI_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: !isTauriBuild,
  productionBrowserSourceMaps: false,

  ...(isTauriBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
        typescript: { ignoreBuildErrors: true },
      }
    : {}),

  experimental: {
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/lab",
      "@mui/x-charts",
      "@mui/x-data-grid",
      "@mui/x-date-pickers",
    ],
  },

  webpack: (config, { isServer }) => {
    if (isTauriBuild) {
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.join(__dirname, "src/lib/auth/server.ts")]: path.join(
          __dirname,
          "src/lib/auth/server-shim.ts"
        ),
        [path.join(__dirname, "src/lib/auth/server")]: path.join(
          __dirname,
          "src/lib/auth/server-shim.ts"
        ),
      };
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        fs: false,
        dns: false,
        child_process: false,
        "mongodb-client-encryption": false,
        "timers/promises": false,
        timers: false,
        mongodb: false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        mongodb: "commonjs mongodb",
        "timers/promises": "commonjs timers/promises",
      });
    }
    return config;
  },
};

export default nextConfig;
