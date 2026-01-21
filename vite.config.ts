/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/build.ts'),
            formats: ['es'],
            fileName: 'build',
        },
        outDir: 'dist',
        minify: 'esbuild',
    },
    test: {
        globals: true,
        environment: 'node',
    },
});
