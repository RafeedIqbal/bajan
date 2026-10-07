import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browsers also request the legacy favicon URL, even with the app/icon.png metadata.
  redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.png", permanent: true }];
  },
  // No framing: a hostile page must not be able to trick a click on "Get help" or the wake toggle.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
