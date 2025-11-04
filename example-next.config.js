// Example next.config.js showing how to use the LAM plugin

const { withLam } = require('nextjs-lam-plugin');

module.exports = withLam({
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
    projectName: null,       // Auto-detect from package.json (recommended)
    useProxy: true           // Use proxy mode for HMR support
});

/*
Alternative manual configuration:

const NextJsLamPlugin = require('nextjs-lam-plugin');

module.exports = {
  // Your Next.js config
  reactStrictMode: true,

  webpack: (config, options) => {
    if (options.dev) {
      config.plugins.push(new NextJsLamPlugin({
        lamHost: 'localhost',
        lamPort: 80,
        useProxy: true
      }));
    }
    return config;
  }
};
*/
