/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["hebbkx1anhila5yf.public.blob.vercel-storage.com", "jbcpublicbucket.s3.us-east-1.amazonaws.com"],
  },
  async redirects() {
    return [
      // Retired legacy static tournaments system → the live /play system.
      { source: "/tournaments", destination: "/play", permanent: true },
      { source: "/tournaments/:path*", destination: "/play", permanent: true },
    ]
  },
}

module.exports = nextConfig

