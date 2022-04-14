/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    // Will only be available on the server side
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    pepper: process.env.PEPPER,
    mongoUri: process.env.MONGO_URI,
    ipDataApiKey: process.env.IPDATA_API_KEY,
  },
  publicRuntimeConfig: {
    baseURL: 'http://localhost:3000',
  },
}

module.exports = nextConfig
