/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The bundled model JSON is large; allow it to be imported server-side.
  experimental: {
    largePageDataBytes: 128 * 100000,
  },
};

export default nextConfig;
