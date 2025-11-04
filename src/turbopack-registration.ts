import * as http from 'http';
import * as path from 'path';

// Turbopack-compatible LAM registration
// This runs when Turbopack is used instead of webpack plugins

function getProjectName(): string | null {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = require(packageJsonPath);
        return packageJson.name || null;
    } catch (error) {
        return null;
    }
}

function registerWithLam(projectName: string, port: number, lamHost: string, lamPort: number, useProxy: boolean): void {
    const domain = `${projectName}.local`;
    const lamUrl = `http://${lamHost}:${lamPort}`;

    const postData = JSON.stringify({
        project: projectName,
        port: port,
        https: false,
        proxy: useProxy
    });

    const options: http.RequestOptions = {
        hostname: lamHost,
        port: lamPort,
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
                if (useProxy) {
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

function unregisterFromLam(projectName: string, lamHost: string, lamPort: number): void {
    const domain = `${projectName}.local`;

    const options: http.RequestOptions = {
        hostname: lamHost,
        port: lamPort,
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

// Main registration logic for Turbopack
export function initTurbopackLamRegistration(): void {
    // Check if LAM plugin is enabled via environment variables
    if (process.env.LAM_PLUGIN_ENABLED !== 'true') {
        return;
    }

    const lamHost = process.env.LAM_HOST || 'localhost';
    const lamPort = parseInt(process.env.LAM_PORT || '80', 10);
    const customProjectName = process.env.LAM_PROJECT_NAME || null;
    const useProxy = process.env.LAM_USE_PROXY === 'true';

    // Get project name
    const projectName = customProjectName || getProjectName();

    if (!projectName) {
        console.warn('[LAM Plugin] Could not determine project name. Skipping LAM registration.');
        return;
    }

    // Get dev server port (default to 3000 for Next.js)
    const devPort = parseInt(process.env.PORT || '3000', 10);

    // Register with LAM
    registerWithLam(projectName, devPort, lamHost, lamPort, useProxy);

    // Clean up on exit
    const cleanup = () => {
        unregisterFromLam(projectName, lamHost, lamPort);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
}

// Auto-initialize if this script is run directly (for Turbopack)
if (require.main === module) {
    initTurbopackLamRegistration();
}
