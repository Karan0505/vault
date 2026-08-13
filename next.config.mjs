/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    //ppr: "incremental",
    typedRoutes: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.utfs.io" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  typescript: {
    // Type errors must fail CI. Never ignore build errors.
    ignoreBuildErrors: false,
  },
};

export default async () => {
  if (process.env.ANALYZE === "true") {
    try {
      const createBundleAnalyzer = (await import("@next/bundle-analyzer")).default;
      return createBundleAnalyzer({ enabled: true })(nextConfig);
    } catch {
      console.warn("@next/bundle-analyzer module not found. Run `npm install` to install missing packages.");
    }
  }
  return nextConfig;
};

