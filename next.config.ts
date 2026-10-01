import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  typedRoutes: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // Honor PptxGenJS's browser exclusions before webpack handles node: URLs.
      // Server builds and every other package retain their normal resolution.
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:(fs|https)$/,
          contextRegExp: /[\\/]node_modules[\\/]pptxgenjs[\\/]/,
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
