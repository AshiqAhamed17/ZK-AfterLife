/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for better performance
  output: "standalone",

  // Optimize images
  images: {
    domains: ["localhost"],
    unoptimized: true,
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },

  // Webpack configuration for crypto libraries
  webpack: (config, { isServer }) => {
    // Handle Node.js modules that are not available in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
        os: require.resolve("os-browserify/browser"),
        path: require.resolve("path-browserify"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        assert: require.resolve("assert"),
        url: require.resolve("url"),
        zlib: require.resolve("browserify-zlib"),
      };
    }

    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: "raw-loader",
    });

    return config;
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
