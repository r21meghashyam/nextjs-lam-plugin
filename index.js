const http = require('http');
const path = require('path');

class NextJsLamPlugin {
    constructor(options = {}) {
        this.options = {
            lamHost: 'localhost',
            lamPort: 80,
            projectName: null,
            useProxy: true,
            ...options
        };
    }

    apply(compiler) {
        // Only run in development mode
        if (compiler.options.mode !== 'development') {
            return;
        }

        // Get project name from package.json or use provided name
        const projectName = this.options.projectName || this.getProjectName();

        if (!projectName) {
            console.warn('[LAM Plugin] Could not determine project name. Skipping LAM registration.');
            return;
        }

        // Get the dev server port from Next.js config
        const devPort = compiler.options.devServer?.port || 3000;

        // Register with LAM when compilation starts
        compiler.hooks.done.tap('NextJsLamPlugin', () => {
            this.registerWithLam(projectName, devPort);
        });

        // Clean up on exit
        process.on('SIGINT', () => {
            this.unregisterFromLam(projectName);
            process.exit();
        });

        process.on('SIGTERM', () => {
            this.unregisterFromLam(projectName);
            process.exit();
        });
    }

    getProjectName() {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJson = require(packageJsonPath);
            return packageJson.name || null;
        } catch (error) {
            return null;
        }
    }

    registerWithLam(projectName, port) {
        const domain = `${projectName}.local`;
        const lamUrl = `http://${this.options.lamHost}:${this.options.lamPort}`;

        const postData = JSON.stringify({
            project: projectName,
            port: port,
            https: false,
            proxy: this.options.useProxy
        });

        const options = {
            hostname: this.options.lamHost,
            port: this.options.lamPort,
            path: '/api/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    const result = JSON.parse(data);
                    console.log(`[LAM Plugin] ✅ Registered ${domain} → localhost:${port}`);
                    console.log(`[LAM Plugin] 🌐 Visit: http://${domain}`);
                    if (this.options.useProxy) {
                        console.log(`[LAM Plugin] 🔄 Mode: Proxy (with WebSocket support)`);
                    } else {
                        console.log(`[LAM Plugin] ↪️  Mode: Redirect`);
                    }
                } else {
                    console.warn(`[LAM Plugin] ⚠️  Failed to register with LAM: ${res.statusCode}`);
                    console.warn(`[LAM Plugin] Make sure LAM is running on ${lamUrl}`);
                }
            });
        });

        req.on('error', (error) => {
            console.warn(`[LAM Plugin] ⚠️  Could not connect to LAM: ${error.message}`);
            console.warn(`[LAM Plugin] Make sure LAM is running on ${lamUrl}`);
        });

        req.write(postData);
        req.end();
    }

    unregisterFromLam(projectName) {
        const domain = `${projectName}.local`;

        const options = {
            hostname: this.options.lamHost,
            port: this.options.lamPort,
            path: `/api/mappings/${domain}`,
            method: 'DELETE'
        };

        const req = http.request(options, (res) => {
            if (res.statusCode === 200) {
                console.log(`[LAM Plugin] 🗑️  Unregistered ${domain}`);
            }
        });

        req.on('error', () => {
            // Silently fail on cleanup
        });

        req.end();
    }
}

// Export for Next.js config
module.exports = NextJsLamPlugin;

// Helper function for easy configuration
module.exports.withLam = (nextConfig = {}, lamOptions = {}) => {
    const lamPlugin = new NextJsLamPlugin(lamOptions);

    return {
        ...nextConfig,
        webpack: (config, options) => {
            // Apply the LAM plugin
            if (options.dev) {
                config.plugins.push(lamPlugin);
            }

            // Configure allowed dev origins for HMR
            if (options.dev && config.devServer) {
                const projectName = lamOptions.projectName || lamPlugin.getProjectName();
                if (projectName) {
                    const allowedOrigins = config.devServer.allowedHosts || [];
                    allowedOrigins.push(`${projectName}.local`);
                    config.devServer.allowedHosts = allowedOrigins;
                }
            }

            // Call original webpack config if it exists
            if (nextConfig.webpack) {
                return nextConfig.webpack(config, options);
            }

            return config;
        }
    };
};
