import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    // Completely disable webpack persistent disk caching in dev mode.
    // This permanently prevents the 'Array buffer allocation failed' 
    // and 'GC during deserialization' out-of-memory crashes on Windows.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
