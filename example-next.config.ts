// Example next.config.ts showing how to use the LAM plugin with TypeScript

import { withLam, NextJsLamPlugin } from 'nextjs-lam-plugin';

const nextConfig = withLam({
    // Your regular Next.js configuration
    reactStrictMode: true,
    swcMinify: true,

    // Images configuration
    images: {
        domains: ['localhost'],
    },

    // Any other Next.js config options...
}, {
    // LAM plugin configuration
    lamHost: 'localhost',     // LAM server host
    lamPort: 80,             // LAM server port
    projectName: undefined,  // Auto-detect from package.json (recommended)
    useProxy: true           // Use proxy mode for HMR support
});

export default nextConfig;

/*
Alternative manual configuration:

import { NextJsLamPlugin } from 'nextjs-lam-plugin';

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    if (options.dev) {
      config.plugins?.push(new NextJsLamPlugin({
        lamHost: 'localhost',
        lamPort: 80,
        useProxy: true
      }));
    }
    return config;
  }
};

export default nextConfig;
*/
