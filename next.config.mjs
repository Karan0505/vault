import createBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.utfs.io" },
      { protocol: "https", hostname: "ufs.sh" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  typescript: {
    // Type errors must fail CI. Never ignore build errors.
    ignoreBuildErrors: false,
  },
};

const configWithAnalyzer = withBundleAnalyzer(nextConfig);

// Sentry's source-map upload only actually does anything with an auth
// token + org/project configured (CI secrets, not committed) — without
// them this wrapper is a harmless no-op, consistent with every other
// optional integration in this project being safe to run unconfigured.
export default withSentryConfig(configWithAnalyzer, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableLogger: true,
});
