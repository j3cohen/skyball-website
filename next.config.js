/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["hebbkx1anhila5yf.public.blob.vercel-storage.com", "jbcpublicbucket.s3.us-east-1.amazonaws.com"],
  },
  async redirects() {
    return []
  },
}

module.exports = nextConfig

