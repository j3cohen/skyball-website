const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["hebbkx1anhila5yf.public.blob.vercel-storage.com",  "jbcpublicbucket.s3.us-east-1.amazonaws.com"],
  },
  async redirects() {
    return [
      {
        source: "/faq",
        destination: "/faq",
        permanent: true,
      },
      {
        source: "/community-guidelines",
        destination: "/community-guidelines",
        permanent: true,
      },
      {
        source: "/become-a-host",
        destination: "/become-a-host",
        permanent: true,
      },
      {
        source: "/skyball-for-schools",
        destination: "/skyball-for-schools",
        permanent: true,
      },
      {
        source: "/tournaments",
        destination: "/tournaments",
        permanent: true,
      },
      {
        source: "/rules",
        destination: "/rules",
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig

