# Next.js LAM Plugin

A Next.js plugin that automatically integrates with LAM (Localhost Apps Manager) to provide custom `.local` domains for your development server.

## Features

- 🚀 **Automatic Registration**: Automatically registers your Next.js dev server with LAM
- 🔄 **Proxy Mode**: Uses LAM's proxy mode with WebSocket support for HMR
- 🛡️ **HMR Support**: Configures Next.js to allow HMR from custom domains
- 🧹 **Auto Cleanup**: Automatically unregisters when the dev server stops
- ⚙️ **Flexible Configuration**: Customizable LAM host, port, and proxy settings
- 📝 **TypeScript Support**: Full TypeScript definitions and ES6 imports
- ⚡ **Turbopack Compatible**: Fully works with Next.js 16's default Turbopack bundler

## Installation

```bash
npm install --save-dev nextjs-lam-plugin
```

## Usage

### Basic Setup (JavaScript)

Update your `next.config.js`:

```javascript
const { withLam } = require('nextjs-lam-plugin');

module.exports = withLam({
  // Your Next.js config here
  reactStrictMode: true,
});
```

### TypeScript Setup

For TypeScript projects, use ES6 imports:

```typescript
import { withLam, NextJsLamPlugin } from 'nextjs-lam-plugin';

const nextConfig = withLam({
  reactStrictMode: true,
  // Your Next.js config here
});

export default nextConfig;
```

Or use the plugin directly:

```typescript
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
```

That's it! When you run `npm run dev`, the plugin will:

1. Detect your project name from `package.json`
2. Register your dev server with LAM
3. Configure Next.js to allow HMR from your custom domain

### Advanced Configuration

```javascript
const { withLam } = require('nextjs-lam-plugin');

module.exports = withLam({
  // Your Next.js config
  reactStrictMode: true,
}, {
  // LAM plugin options
  lamHost: 'localhost',     // LAM server host (default: 'localhost')
  lamPort: 80,             // LAM server port (default: 80)
  projectName: 'my-app',   // Override project name (default: from package.json)
  useProxy: true           // Use proxy mode (default: true)
});
```

## How It Works

1. **Development Mode Detection**: Only runs in development mode
2. **Project Name Detection**: Reads project name from `package.json`
3. **LAM Registration**: Registers with LAM using your project name and dev server port
4. **HMR Configuration**: Adds your `.local` domain to Next.js's allowed hosts for HMR
5. **Proxy Mode**: Uses LAM's proxy mode for full WebSocket and HMR support

## Example Output

When you start your dev server, you'll see:

```
[LAM Plugin] ✅ Registered my-app.local → localhost:3000
[LAM Plugin] 🌐 Visit: http://my-app.local
[LAM Plugin] 🔄 Mode: Proxy (with WebSocket support)
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lamHost` | string | `'localhost'` | LAM server hostname |
| `lamPort` | number | `80` | LAM server port |
| `projectName` | string | `null` | Override project name (auto-detected from package.json) |
| `useProxy` | boolean | `true` | Use LAM proxy mode (recommended for HMR) |

## Requirements

- **LAM Server**: Must be running and accessible
- **Next.js 12+**: Required for webpack 5 support
- **Development Mode**: Only works in development

## Troubleshooting

### LAM Connection Failed

```
[LAM Plugin] ⚠️  Could not connect to LAM: ECONNREFUSED
```

**Solution**: Make sure LAM is running on the configured host/port.

### Project Name Not Found

```
[LAM Plugin] Could not determine project name. Skipping LAM registration.
```

**Solution**: Add a `name` field to your `package.json` or specify `projectName` in options.

### HMR Not Working

Make sure you're using proxy mode (`useProxy: true`) and that your `.local` domain is properly configured in your hosts file.

### Turbopack Error (Next.js 16)

```
⚠ Invalid next.config.ts options detected:
⚠     Expected object, received function at "turbopack"
```

**Solution**: The plugin is fully compatible with Turbopack. The error occurs because Next.js expects `turbopack` to be an object, not a function. The `withLam` helper automatically handles this correctly.

If you see this error, ensure you're using the `withLam` helper:

```javascript
const { withLam } = require('nextjs-lam-plugin');

module.exports = withLam({
  reactStrictMode: true,
  // turbopack config is handled automatically
});
```

The plugin works seamlessly with both webpack and Turbopack without any additional configuration!

## Manual Plugin Usage

If you prefer not to use the `withLam` helper:

```javascript
const NextJsLamPlugin = require('nextjs-lam-plugin');

module.exports = {
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
```

## License

MIT
