import { NextJsLamPlugin, withLam } from '../src/index';

describe('NextJsLamPlugin', () => {
    describe('constructor', () => {
        it('should create plugin with default options', () => {
            const plugin = new NextJsLamPlugin();
            expect(plugin).toBeInstanceOf(NextJsLamPlugin);
        });

        it('should create plugin with custom options', () => {
            const options = {
                lamHost: 'custom-host',
                lamPort: 8080,
                projectName: 'test-project',
                useProxy: false
            };
            const plugin = new NextJsLamPlugin(options);
            expect(plugin).toBeInstanceOf(NextJsLamPlugin);
        });
    });

    describe('getProjectName', () => {
        it('should return project name from package.json', () => {
            const plugin = new NextJsLamPlugin();
            const projectName = (plugin as any).getProjectName();
            expect(typeof projectName).toBe('string');
            expect(projectName).toBe('nextjs-lam-plugin');
        });
    });

    describe('withLam helper', () => {
        it('should return a next config function', () => {
            const config = withLam({
                reactStrictMode: true,
            });
            expect(typeof config).toBe('object');
            expect(config.reactStrictMode).toBe(true);
        });

        it('should handle empty config', () => {
            const config = withLam();
            expect(typeof config).toBe('object');
        });

        it('should include webpack configuration', () => {
            const config = withLam({
                reactStrictMode: true,
            });
            expect(typeof config.webpack).toBe('function');
        });

        it('should include headers function', () => {
            const config = withLam({
                reactStrictMode: true,
            });
            expect(typeof config.headers).toBe('function');
        });

        it('should configure allowedDevOrigins for cross-origin requests', () => {
            const config = withLam({
                reactStrictMode: true,
            });
            expect(config.allowedDevOrigins).toContain('nextjs-lam-plugin.local');
        });

        it('should merge with existing allowedDevOrigins', () => {
            const config = withLam({
                allowedDevOrigins: ['existing-domain.com'],
                reactStrictMode: true,
            });
            expect(config.allowedDevOrigins).toContain('existing-domain.com');
            expect(config.allowedDevOrigins).toContain('nextjs-lam-plugin.local');
        });

        it('should allow custom project name for allowedDevOrigins', () => {
            const config = withLam({
                reactStrictMode: true,
            }, {
                projectName: 'my-custom-app'
            });
            expect(config.allowedDevOrigins).toContain('my-custom-app.local');
        });
    });
});
