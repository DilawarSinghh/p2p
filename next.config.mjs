/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The bundled model JSON is large; allow it to be imported server-side.
  experimental: {
    largePageDataBytes: 128 * 100000,
  },
  // CRITICAL for Vercel: the /api/classify* serverless functions read the
  // model + dataset JSON from disk at runtime via process.cwd(). Next.js file
  // tracing cannot detect these dynamic path.join() reads, so without this they
  // are omitted from the serverless bundle and the functions 500 with ENOENT.
  // This explicitly includes them in the traced output for those routes.
  outputFileTracingIncludes: {
    "/api/classify": ["./src/data/model/**"],
    "/api/classify-test": ["./src/data/model/**", "./src/data/datasets/waste_events_test.json"],
  },
};

export default nextConfig;
