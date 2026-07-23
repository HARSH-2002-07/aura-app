import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@imgly/background-removal-node",
    "onnxruntime-node",
    "sharp"
  ],
  webpack: (config, { dev }) => {
    // Forcefully exclude native binaries from Webpack bundling
    config.externals = [...(config.externals || []), "sharp", "onnxruntime-node", "@imgly/background-removal-node"];
    
    // Completely disable webpack persistent disk caching in dev mode.
    // This permanently prevents the 'Array buffer allocation failed' 
    // and 'GC during deserialization' out-of-memory crashes on Windows.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
