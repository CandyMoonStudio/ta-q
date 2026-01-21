import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.vitest,
            },
        },
        rules: {
            'no-unused-vars': 'off', // tseslint handles this
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            'prefer-const': 'warn',
            'no-case-declarations': 'warn',
            'no-prototype-builtins': 'warn',
            'no-console': 'off',
            'no-undef': 'warn',
            'no-empty': 'off',
        },
    },
    {
        ignores: ['dist', 'node_modules', 'out', 'docs'],
    }
);
