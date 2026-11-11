import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        port: 3000,
        proxy: {
            '/api': 'http://localhost:8000',
            '/sanctum': 'http://localhost:8000',
        },
    },
    plugins: [
        tsConfigPaths({ projects: ['./tsconfig.json'] }),
        tailwindcss(),
        tanstackStart({
            srcDirectory: 'resources/js',
            router: {
                routesDirectory: 'routes',
            },
            server: {
                entry: './resources/js/server.ts',
            },
        }),
        react(),
    ],
});
