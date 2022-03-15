/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    // Will only be available on the server side
    secret: process.env.serverRuntimeConfigSecret,
    pepper: process.env.PEPPER,
    mongoUri: process.env.MONGO_URI,
  },
  publicRuntimeConfig: {
    baseURL: 'http://localhost:3000',
  },
}

module.exports = nextConfig
