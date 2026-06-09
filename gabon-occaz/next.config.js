/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Autoriser les images depuis placehold.co pour les maquettes
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' }
    ]
  }
};

module.exports = nextConfig;
