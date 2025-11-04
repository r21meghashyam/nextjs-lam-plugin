import * as http from 'http';
import * as path from 'path';

// Type definitions
export interface LamPluginOptions {
    /** LAM server hostname */
    lamHost?: string;
    /** LAM server port */
    lamPort?: number;
    /** Override project name (auto-detected from package.json) */
    projectName?: string | null;
    /** Use LAM proxy mode (recommended for HMR) */
    useProxy?: boolean;
}

export interface NextConfig {
    [key: string]: any;
}

export interface WebpackConfig {
    plugins?: any[];
    devServer?: {
        allowedHosts?: string[];
    };
}

export interface WebpackOptions {
    dev: boolean;
    [key: string]: any;
}

export interface Compiler {
    options: {
        mode?: string;
        devServer?: {
            port?: number;
        };
    };
    hooks: {
        done: {
            tap: (name: string, callback: () => void) => void;
        };
    };
}

// Main plugin class
export class NextJsLamPlugin {
    private options: Required<LamPluginOptions>;

    constructor(options: LamPluginOptions = {}) {
        this.options = {
            lamHost: 'localhost',
            lamPort: 80,
            projectName: null,
            useProxy: true,
            ...options
        };
    }

    apply(compiler: Compiler): void {
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

    private getProjectName(): string | null {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJson = require(packageJsonPath);
            return packageJson.name || null;
        } catch (error) {
            return null;
        }
    }

    private registerWithLam(projectName: string, port: number): void {
        const domain = `${projectName}.local`;
        const lamUrl = `http://${this.options.lamHost}:${this.options.lamPort}`;

        const postData = JSON.stringify({
            project: projectName,
            port: port,
            https: false,
            proxy: this.options.useProxy
        });

        const options: http.RequestOptions = {
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

        req.on('error', (error: NodeJS.ErrnoException) => {
            console.warn(`[LAM Plugin] ⚠️  Could not connect to LAM: ${error.message}`);
            console.warn(`[LAM Plugin] Make sure LAM is running on ${lamUrl}`);
        });

        req.write(postData);
        req.end();
    }

    private unregisterFromLam(projectName: string): void {
        const domain = `${projectName}.local`;

        const options: http.RequestOptions = {
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

// Helper function for easy configuration
export function withLam(
    nextConfig: NextConfig = {},
    lamOptions: LamPluginOptions = {}
): NextConfig {
    const lamPlugin = new NextJsLamPlugin(lamOptions);

    // Get project name for allowed origins
    const projectName = lamOptions.projectName || lamPlugin['getProjectName']();
    const localDomain = projectName ? `${projectName}.local` : null;

    return {
        ...nextConfig,
        // Configure allowed dev origins for cross-origin requests (Next.js 15+)
        ...(localDomain && {
            allowedDevOrigins: [
                ...(nextConfig.allowedDevOrigins || []),
                localDomain
            ]
        }),
        // Turbopack configuration (must be an object, not a function)
        turbopack: {
            ...nextConfig.turbopack,
        },
        // Use headers function to trigger LAM registration during development
        async headers() {
            // This runs during development server startup
            if (process.env.NODE_ENV === 'development') {
                // Set environment variables for LAM
                process.env.LAM_PLUGIN_ENABLED = 'true';
                process.env.LAM_HOST = lamOptions.lamHost || 'localhost';
                process.env.LAM_PORT = String(lamOptions.lamPort || 80);
                process.env.LAM_PROJECT_NAME = lamOptions.projectName || '';
                process.env.LAM_USE_PROXY = String(lamOptions.useProxy ?? true);

                // Trigger Turbopack registration
                try {
                    const { initTurbopackLamRegistration } = require('./turbopack-registration');
                    initTurbopackLamRegistration();
                } catch (error) {
                    // Silently fail if turbopack registration fails
                }
            }

            // Return empty headers array (required by Next.js)
            return [];
        },
        // Webpack configuration (for backward compatibility)
        webpack: (config: WebpackConfig, options: WebpackOptions) => {
            // Apply the LAM plugin for webpack
            if (options.dev) {
                config.plugins = config.plugins || [];
                config.plugins.push(lamPlugin);
            }

            // Configure allowed dev origins for HMR
            if (options.dev && config.devServer) {
                const projectName = lamOptions.projectName || lamPlugin['getProjectName']();
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
}

// Default export
export default NextJsLamPlugin;
